# Security

- Google OAuth credentials and Gemini API keys are server-only environment variables.
- `SESSION_SECRET` must be at least 32 characters and is used to encrypt the session cookie.
- OAuth uses a random state value stored in an HTTP-only cookie to protect the callback.
- Do not commit `.env.local`, production credentials, or generated Vercel environment files.
- Rotate any credential that has been pasted into a public repository, issue, screenshot, or shared chat.
- For a larger production rollout, move OAuth tokens and agent/chat state from encrypted cookies/localStorage into a durable database and add rate limiting.
