# Security

- Google OAuth credentials and Gemini API keys are server-only environment variables.
- SESSION_SECRET must be at least 32 characters.
- OAuth uses a random state value stored in an HTTP-only cookie.
- Never commit .env.local or production credentials.