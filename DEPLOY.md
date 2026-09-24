# Suchi AI — Vercel deployment

1. Add the server environment variables:
   - GOOGLE_CLIENT_ID
   - GOOGLE_CLIENT_SECRET
   - GEMINI_API_KEY
   - SESSION_SECRET (32+ random characters)
   - APP_URL (exact production origin, no trailing slash)
   - GEMINI_MODEL (optional)
2. Deploy from the Git repository.
3. Set the Google OAuth redirect URI to https://YOUR-DOMAIN/api/auth/callback.
4. Enable Calendar, Tasks, Gmail, Drive, Docs, Sheets, Slides and Forms APIs.