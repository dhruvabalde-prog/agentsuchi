# Suchi AI — Vercel deployment

1. Drop the ZIP into Vercel.
2. Add these server environment variables:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `GEMINI_API_KEY`
   - `SESSION_SECRET` (32+ random characters)
   - `APP_URL` (your exact production origin, no trailing slash)
   - `GEMINI_MODEL` (optional; defaults to `gemini-3.8-flash` and falls back to `gemini-2.5-flash` when the primary model is temporarily unavailable)
3. Deploy.
4. In Google Cloud, set the OAuth redirect URI to:
   `https://YOUR-DOMAIN/api/auth/callback`
5. Enable the Google Workspace APIs used by the app: Calendar, Tasks, Gmail, Drive, Docs, Sheets, Slides and Forms.
6. Google Keep is available as a direct app link. Its API is not requested by the normal OAuth flow because Google documents the Keep API as an enterprise-only API.

After OAuth succeeds, Suchi automatically loads the signed-in Google account, syncs the enabled Workspace surfaces, and shows the account email as Connected. A **Sync** button is available in the header for manual refresh.

The app starts with only Suchi AI. Specialist agents are created dynamically by Suchi and reused when a later task matches an existing specialist.
