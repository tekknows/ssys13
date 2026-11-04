$ErrorActionPreference = 'Stop'
$ConfigPath = Join-Path $env:ProgramData 'Mindlock\agent.json'
$StatePath = Join-Path $env:ProgramData 'Mindlock\browser-policy-state.json'
$LogPath = Join-Path $env:ProgramData 'Mindlock\agent.log'
$PolicyValues = @(
  @{
    Path = 'HKLM:\SOFTWARE\Policies\Google\Chrome'
    Name = 'IncognitoModeAvailability'
  },
  @{
    Path = 'HKLM:\SOFTWARE\Policies\Microsoft\Edge'
    Name = 'InPrivateModeAvailability'
  }
)

function Write-AgentLog {
  param([Parameter(Mandatory)][string]$Message)
  $timestamp = [DateTime]::UtcNow.ToString('o')
  Add-Content -LiteralPath $LogPath -Value "$timestamp $Message" -Encoding UTF8
}

function Get-PolicyValue {
  param(
    [Parameter(Mandatory)][string]$Path,
    [Parameter(Mandatory)][string]$Name
  )

  $key = Get-Item -LiteralPath $Path -ErrorAction SilentlyContinue
  if (-not $key -or $key.GetValueNames() -notcontains $Name) {
    return @{ Exists = $false }
  }

  return @{
    Exists = $true
    Value = $key.GetValue($Name, $null, [Microsoft.Win32.RegistryValueOptions]::DoNotExpandEnvironmentNames)
    Kind = $key.GetValueKind($Name).ToString()
  }
}

function Set-PolicyValue {
  param(
    [Parameter(Mandatory)][string]$Path,
    [Parameter(Mandatory)][string]$Name,
    [Parameter(Mandatory)][int]$Value
  )

  New-Item -Path $Path -Force | Out-Null
  New-ItemProperty -LiteralPath $Path -Name $Name -PropertyType DWord -Value $Value -Force | Out-Null
}

function Get-PolicySnapshot {
  $values = @{}
  foreach ($policy in $PolicyValues) {
    $values[$policy.Name] = Get-PolicyValue -Path $policy.Path -Name $policy.Name
  }
  return @{ Values = $values }
}

function Test-RestoredPolicy {
  param(
    [Parameter(Mandatory)]$Expected,
    [Parameter(Mandatory)]$Actual
  )
  if ([bool]$Expected.Exists -ne [bool]$Actual.Exists) {
    return $false
  }
  if (-not $Expected.Exists) {
    return $true
  }
  if ([string]$Expected.Kind -ne [string]$Actual.Kind) {
    return $false
  }
  $expectedValue = ConvertTo-Json -InputObject $Expected.Value -Compress -Depth 5
  $actualValue = ConvertTo-Json -InputObject $Actual.Value -Compress -Depth 5
  return $expectedValue -ceq $actualValue
}

function Apply-IncognitoPolicy {
  param([Parameter(Mandatory)][bool]$Enabled)

  if ($Enabled) {
    if (-not (Test-Path -LiteralPath $StatePath)) {
      $snapshot = Get-PolicySnapshot
      $snapshot | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $StatePath -Encoding UTF8
    } else {
      $snapshot = Get-Content -LiteralPath $StatePath -Raw -Encoding UTF8 | ConvertFrom-Json
    }

    foreach ($policy in $PolicyValues) {
      $current = Get-PolicyValue -Path $policy.Path -Name $policy.Name
      if (-not $current.Exists -or $current.Kind -ne 'DWord' -or [int]$current.Value -ne 1) {
        $snapshot.Values | Add-Member -MemberType NoteProperty -Name $policy.Name -Value $current -Force
        $snapshot | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $StatePath -Encoding UTF8
      }
      Set-PolicyValue -Path $policy.Path -Name $policy.Name -Value 1
      $applied = Get-PolicyValue -Path $policy.Path -Name $policy.Name
      if (-not $applied.Exists -or $applied.Kind -ne 'DWord' -or [int]$applied.Value -ne 1) {
        throw "Failed to verify $($policy.Name) after applying the restriction."
      }
    }

    Write-AgentLog 'Incognito and InPrivate policies are enabled and verified.'
    return
  }

  if (-not (Test-Path -LiteralPath $StatePath)) {
    Write-AgentLog 'Global policy is disabled; no prior MINDLOCK policy values need restoring.'
    return
  }

  $snapshot = Get-Content -LiteralPath $StatePath -Raw -Encoding UTF8 | ConvertFrom-Json
  foreach ($policy in $PolicyValues) {
    $expected = $snapshot.Values.($policy.Name)
    $current = Get-PolicyValue -Path $policy.Path -Name $policy.Name

    if ($current.Exists -and $current.Kind -eq 'DWord' -and [int]$current.Value -eq 1) {
      if ($expected.Exists) {
        if ($expected.Kind -eq 'DWord') {
          Set-PolicyValue -Path $policy.Path -Name $policy.Name -Value ([int]$expected.Value)
        } else {
          New-ItemProperty -LiteralPath $policy.Path -Name $policy.Name -PropertyType $expected.Kind -Value $expected.Value -Force | Out-Null
        }
      } else {
        Remove-ItemProperty -LiteralPath $policy.Path -Name $policy.Name -ErrorAction Stop
      }
    }

    $restored = Get-PolicyValue -Path $policy.Path -Name $policy.Name
    if ($current.Exists -and $current.Kind -eq 'DWord' -and [int]$current.Value -eq 1) {
      if (-not (Test-RestoredPolicy -Expected $expected -Actual $restored)) {
        throw "Failed to verify the restored $($policy.Name) policy."
      }
    }
  }

  Remove-Item -LiteralPath $StatePath -Force
  Write-AgentLog 'Global Incognito policy is disabled; prior browser policy values were restored where still owned by MINDLOCK.'
}

function Get-GlobalPolicy {
  param([Parameter(Mandatory)]$Config)

  $deviceId = [Uri]::EscapeDataString([string]$Config.DeviceId)
  $baseUrl = ([string]$Config.ApiBaseUrl).TrimEnd('/')
  $uri = "$baseUrl/api/agent/incognito-policy?deviceId=$deviceId"
  return Invoke-RestMethod -Uri $uri -Method Get -Headers @{
    Authorization = "Bearer $($Config.AgentToken)"
  } -TimeoutSec 20
}

if (-not (Test-Path -LiteralPath $ConfigPath)) {
  throw "Agent configuration is missing: $ConfigPath"
}

$config = Get-Content -LiteralPath $ConfigPath -Raw -Encoding UTF8 | ConvertFrom-Json
if (-not $config.ApiBaseUrl -or -not $config.DeviceId -or -not $config.AgentToken) {
  throw 'Agent configuration is incomplete.'
}

[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$pollSeconds = [Math]::Max(15, [Math]::Min(300, [int]$config.PollSeconds))
while ($true) {
  try {
    $policy = Get-GlobalPolicy -Config $config
    if ($policy.policyName -ne 'incognito_blocking' -or $null -eq $policy.isEnabled) {
      throw 'The server returned an invalid Incognito policy.'
    }
    Apply-IncognitoPolicy -Enabled ([bool]$policy.isEnabled)
  } catch {
    Write-AgentLog "Policy check or application failed: $($_.Exception.Message)"
  }
  Start-Sleep -Seconds $pollSeconds
}
