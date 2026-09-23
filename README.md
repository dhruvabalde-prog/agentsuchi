# Suchi AI

Suchi AI is a mobile-first Gemini-powered workspace orchestrator for Google Workspace.

## Product behavior

- Suchi is the only initial agent.
- Specialist agents are created dynamically when a task needs sustained specialist handling.
- Existing matching specialists are reused instead of duplicated.
- General administrative work can stay with Suchi; Personal and Professional work can be delegated into Chats.
- Google OAuth creates an encrypted server-side session.
- Workspace data is synced after connection and can be refreshed with the header Sync button.
- Connected tools can be enabled or disabled from the Google connection panel.
- Gmail reply workflows prepare drafts; the app does not call Gmail send methods automatically.
- The UI is mobile-first and responsive on desktop.
- The same Suchi logo is used for the UI, favicon and phone/PWA icons.

## Environment variables

```text
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GEMINI_API_KEY=
SESSION_SECRET=
APP_URL=https://your-production-domain
GEMINI_MODEL=gemini-3.8-flash
```

`GEMINI_MODEL` is optional. The server retries temporary model availability errors and falls back to `gemini-2.5-flash`.

## Google OAuth callback

```text
https://YOUR-DOMAIN/api/auth/callback
```

## Deployment

Drop the ZIP into Vercel, add the environment variables, and deploy.

For the Google Workspace APIs used by the app, enable Calendar, Tasks, Gmail, Drive, Docs, Sheets, Slides and Forms in Google Cloud. Google Keep is linked from the app but its API is not requested by the normal OAuth flow because Google documents that API as enterprise-only.
