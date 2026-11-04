# Privacy and security audit

## Scope

The extension must collect only the minimum amount of data necessary to enforce website blocking and generate usage analytics.

## Data collected

The design collects only:

- device ID
- website domain
- timestamp
- visit duration in seconds
- blocking status
- policy identifier

The implementation avoids full URL logging, query strings, URL fragments, and credentials.

## Explicitly not collected

The code does not intentionally access or store:

- passwords
- login form content
- typed text or keystrokes
- authentication cookies or session tokens
- payment data
- messages or page content
- screenshots or screen recording

## Implementation notes

- The extension uses `declarativeNetRequest` instead of a broad content script model.
- There is no login-form injection or password field read in the extension code.
- It records only the domain and limited metadata from navigation events.
- It does not transmit browsing information to unapproved external services.
- Supabase secret keys are configured on the backend only; the browser dashboard and extension use only the publishable key.
- The Windows policy agent sends only its registered device ID and an authenticated policy request; it does not collect browsing data. The backend stores a hash of each device token, and the agent keeps the token in an ACL-protected machine configuration file.
- For Incognito enforcement, the agent reads or writes only the Chrome `IncognitoModeAvailability` and Edge `InPrivateModeAvailability` registry values. It snapshots and restores their prior values rather than resetting other browser policy.

## RLS and access control

The Supabase schema requires authentication and enforces Row Level Security. Admins are restricted to authorized records, and limited device-scoped permissions are required for device-owned data.

The new `system_policies` and `device_agent_credentials` tables have RLS enabled without anon/authenticated access policies. Privileged access is limited to the server-side service role; administrator requests also require a short-lived signed session validated against the current employee and credential records.

## Known limitations

- Domain-level analytics can still reveal browsing habits under a given device and time window.
- Decoding the exact user activity from domain names is not equivalent to reading page contents.
- Unmanaged devices cannot be treated as fully tamper-proof.

## Recommendation

Use enterprise policy for extension management, maintain RLS enforcement, and keep all analytics collection documented and limited to the minimum required data.
