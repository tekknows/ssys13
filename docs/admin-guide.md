# Administrator guide for Incognito blocking

## Global Incognito setting

Use the single **Incognito blocker** toggle in the dashboard's existing Incognito blocker panel. It applies to all registered, assigned laptops that have a provisioned Windows management agent. The registered-laptop count is informational; there are no per-laptop policy toggles or sync-status badges.

Only an active administrator can change the setting. The backend stores the authoritative global value in `system_policies` under `incognito_blocking`. The legacy `incognito_control` row is retained only as a migration compatibility seed; current agents and extensions read the policy from the authenticated management API.

## Windows enforcement

The browser extension cannot write Windows policy. The elevated MINDLOCK agent applies these machine policies:

- Chrome: `HKLM\SOFTWARE\Policies\Google\Chrome\IncognitoModeAvailability`
- Edge: `HKLM\SOFTWARE\Policies\Microsoft\Edge\InPrivateModeAvailability`

Value `1` disables Incognito/InPrivate; value `0` allows it. On disable, the agent restores prior values only when the current value still matches the value MINDLOCK applied. This leaves unrelated policy values untouched. Existing browsers may need a restart to refresh policy.

The agent polls the backend after startup and periodically while connected. Successful authenticated polls update the existing laptop `last_sync` timestamp for the normal Online/Offline connection monitor; Incognito policy state remains separate. An offline device keeps its last applied registry state and retrieves the latest global value when it reconnects. A newly registered laptop is covered after it is assigned, provisioned with a per-device token, and the agent first connects.

## Verification

On an elevated Windows terminal, inspect the applied values:

```powershell
Get-ItemProperty 'HKLM:\SOFTWARE\Policies\Google\Chrome' -Name IncognitoModeAvailability
Get-ItemProperty 'HKLM:\SOFTWARE\Policies\Microsoft\Edge' -Name InPrivateModeAvailability
Get-ScheduledTask -TaskName 'Mindlock Browser Policy Agent'
Get-Content "$env:ProgramData\Mindlock\agent.log" -Tail 30
```

When enabled, both registry values should be `1`; when disabled, they should match the pre-MINDLOCK values (or be absent if no value existed). Normal browsing remains available. Verify by restarting Chrome/Edge and checking the browser's policy page (`chrome://policy` or `edge://policy`).

## Agent security

- Provision a separate random token for each registered device with `node backend/provision-agent.js <device-row-id>`.
- Store only the token hash in Supabase; the one-time plaintext token is entered during the elevated agent installation.
- The agent config is restricted to SYSTEM and local Administrators. Reprovisioning rotates the token and invalidates the previous one.
- Keep the API on HTTPS and the Supabase secret key on the backend only.
- An unmanaged user with local administrator rights can change registry settings or remove the task; use enterprise device management to harden company laptops.
