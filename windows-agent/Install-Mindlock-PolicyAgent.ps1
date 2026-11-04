param(
  [Parameter(Mandatory = $true)]
  [string]$ApiBaseUrl,

  [Parameter(Mandatory = $true)]
  [string]$DeviceId,

  [int]$PollSeconds = 60
)

$ErrorActionPreference = 'Stop'
$principal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  throw 'Run this installer from an elevated PowerShell session.'
}

$baseUri = [Uri]$ApiBaseUrl
if ($baseUri.Scheme -ne 'https' -and $baseUri.Host -notin @('localhost', '127.0.0.1', '::1')) {
  throw 'Use an HTTPS management API URL, or localhost for local testing.'
}
if ([string]::IsNullOrWhiteSpace($DeviceId) -or $DeviceId.Length -gt 128) {
  throw 'A valid registered device ID is required.'
}

$secureToken = Read-Host 'Paste the one-time agent token generated for this registered laptop' -AsSecureString
$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureToken)
try {
  $agentToken = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
} finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
}
if ([string]::IsNullOrWhiteSpace($agentToken)) {
  throw 'The agent token cannot be empty.'
}

$root = Join-Path $env:ProgramFiles 'Mindlock'
$dataRoot = Join-Path $env:ProgramData 'Mindlock'
New-Item -ItemType Directory -Path $root -Force | Out-Null
New-Item -ItemType Directory -Path $dataRoot -Force | Out-Null
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'Mindlock-PolicyAgent.ps1') -Destination (Join-Path $root 'Mindlock-PolicyAgent.ps1') -Force

$configPath = Join-Path $dataRoot 'agent.json'
$configuration = @{
  ApiBaseUrl = $baseUri.GetLeftPart([UriPartial]::Authority).TrimEnd('/')
  DeviceId = $DeviceId.Trim()
  AgentToken = $agentToken
  PollSeconds = [Math]::Max(15, [Math]::Min(300, $PollSeconds))
}
$configuration | ConvertTo-Json | Set-Content -LiteralPath $configPath -Encoding UTF8
$agentToken = $null
$configuration.AgentToken = $null

$dataAcl = Get-Acl -LiteralPath $dataRoot
$dataAcl.SetAccessRuleProtection($true, $false)
$dataAcl.SetOwner([Security.Principal.NTAccount]::new('BUILTIN\Administrators'))
$dataAcl.Access | ForEach-Object { [void]$dataAcl.RemoveAccessRule($_) }
$systemRule = New-Object Security.AccessControl.FileSystemAccessRule('NT AUTHORITY\SYSTEM', 'FullControl', 'ContainerInherit,ObjectInherit', 'None', 'Allow')
$adminRule = New-Object Security.AccessControl.FileSystemAccessRule('BUILTIN\Administrators', 'FullControl', 'ContainerInherit,ObjectInherit', 'None', 'Allow')
$dataAcl.AddAccessRule($systemRule)
$dataAcl.AddAccessRule($adminRule)
Set-Acl -LiteralPath $dataRoot -AclObject $dataAcl

$configAcl = New-Object System.Security.AccessControl.FileSecurity
$configAcl.SetAccessRuleProtection($true, $false)
$configAcl.SetOwner([Security.Principal.NTAccount]::new('BUILTIN\Administrators'))
$configAcl.AddAccessRule((New-Object Security.AccessControl.FileSystemAccessRule('NT AUTHORITY\SYSTEM', 'FullControl', 'Allow')))
$configAcl.AddAccessRule((New-Object Security.AccessControl.FileSystemAccessRule('BUILTIN\Administrators', 'FullControl', 'Allow')))
Set-Acl -LiteralPath $configPath -AclObject $configAcl

$agentPath = Join-Path $root 'Mindlock-PolicyAgent.ps1'
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -NonInteractive -ExecutionPolicy Bypass -File `"$agentPath`""
$trigger = New-ScheduledTaskTrigger -AtStartup
$taskPrincipal = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -ExecutionTimeLimit ([TimeSpan]::Zero) -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)
Register-ScheduledTask -TaskName 'Mindlock Browser Policy Agent' -Action $action -Trigger $trigger -Principal $taskPrincipal -Settings $settings -Force | Out-Null
Start-ScheduledTask -TaskName 'Mindlock Browser Policy Agent'

Write-Output "Installed and started the MINDLOCK policy agent for device $DeviceId."
