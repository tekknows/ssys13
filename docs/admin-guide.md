# Administrator guide for Incognito restrictions and deployment

## Incognito restriction status

A normal browser extension cannot disable Incognito mode on all platforms or all browser builds. The implementation therefore documents the supported enterprise-managed approach and clearly reports the restriction status only when it can be verified.

### Supported option: managed Chrome policy

When the browser is managed by enterprise policy, Chrome administrators can configure `IncognitoModeAvailability` to restrict Incognito mode. A common pattern is to set the policy value to `Disabled` or a managed equivalent in a Chrome policy template.

Example policy payload:

```json
{
  "IncognitoModeAvailability": "Disabled"
}
```

This method requires browser or OS-level administrator control. If the browser is unmanaged, the extension cannot reliably enforce this behavior.

### Verification

The extension can detect the configured restriction only when the browser exposes a supported enterprise status or config signal. If the browser does not provide a reliable signal, the dashboard should show `'unknown'` or `'not verifiable'` instead of claiming the browser is unrestricted.

### Administrator note

This is a policy-level setting, not a capability of a regular extension. The extension should never claim it disables Incognito mode on a single unmanaged machine.

## Developer mode and Chrome controls

The Chrome Reload button and the Developer mode controls belong to the Chrome extension management interface. They are not part of the extension and cannot be hidden by a normal extension. For routine use, administrators should turn off Developer mode when the browser is used outside a testing environment.

## Deployment and force-install

For managed environments, administrators can:

- use Chrome Enterprise policies to force-install the extension,
- prevent standard users from removing the extension,
- keep the policy and package version controlled centrally.

This is not the same as hiding developer controls. It is a real management mechanism but depends on enterprise controls and the managed browser environment.

## Important limitation

The extension is not tamper-proof on unmanaged computers. The code avoids false claims and documents the boundary between supportable enforcement and local-user control.
