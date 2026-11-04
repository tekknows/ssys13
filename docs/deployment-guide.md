# Deployment guide

## Local testing

1. Create a Supabase project.
2. Run the SQL in `supabase/schema.sql` and `supabase/rls.sql`. Existing projects should rerun both scripts to add the Incognito control table and its read policy.
3. Copy `.env.example` to a local file and fill in real values.
4. Serve the dashboard locally:

   ```bash
   cd d:/sys13
   python -m http.server 8000
   ```

5. Open `http://localhost:8000/dashboard/` in a browser.
6. In Chrome, visit `chrome://extensions`, enable Developer mode, and load the `extension/` folder.
7. Open the extension options page and add the Supabase URL and anon key.
8. Register a device ID and then trigger a policy sync.
9. In Chrome/Edge extension settings, enable **Allow in Incognito** for the extension. The admin Incognito blocker cannot close tabs unless the browser grants this permission.

## Browser Web Store distribution

To distribute the extension through the Chrome Web Store:

- package the extension as a zip archive,
- create a Chrome Web Store developer account,
- upload the extension,
- configure permissions and listing details,
- publish after review.

## Enterprise-managed installation

Where supported, use Chrome enterprise policy to:

- force-install the extension,
- block removal by ordinary users,
- keep a controlled version across workstation fleets.

This is the recommended path when it must be enforced beyond developer testing.

## Developer mode note

Developer mode is appropriate for testing, but ordinary use should not rely on it. It should be disabled when the browser enters a production or managed environment.
