# Deploy Suchi AI to Vercel — step by step

No `npm install`, no terminal. Just upload and paste env vars.

## What changed so this works on Vercel
Vercel's servers don't have a real, permanent hard disk — anything the app
"saves to a file" disappears between requests. The original build saved
your Google login tokens and WhatsApp drafts to local files, which would
silently break on Vercel (you'd get logged out constantly). I fixed that by
moving that storage to **Supabase** (a free hosted Postgres database — a
few clicks to create, one bit of SQL to run once — see Step 2). Nothing
else about how the app works or looks has changed.

**Note on the Gemini API key**: this codebase doesn't currently call Gemini
anywhere — the master spec mentions it as a planned feature, but no route in
`server.js` uses it yet. So you don't need to add `GEMINI_API_KEY` for this
build to work. Keep the key handy for when that feature actually gets built.

---

## Step 1 — Zip and upload
Zip the **contents** of this folder (not the folder itself — `api/`,
`public/`, `server.js`, `package.json`, `vercel.json` should be at the top
level of the zip). Go to vercel.com → **Add New → Project** → drag in the
zip (or upload it when prompted). Vercel auto-detects it as a Node project.
Don't click Deploy yet — do Step 2 and 3 first, or you'll just redeploy after.

## Step 2 — Create the Supabase database
1. supabase.com → New project (free tier is plenty). Wait ~2 min for it to spin up.
2. Left sidebar → **SQL Editor → New query** → paste this and click Run:
   ```sql
   create table kv_store (
     key text primary key,
     value jsonb not null
   );
   ```
3. Left sidebar → **Settings → API** → copy the **Project URL** and the
   **`service_role` secret key** (not the `anon` key — the service role key
   is needed so the server can read/write without a logged-in Supabase user).

## Step 3 — Add your own environment variables
Project → **Settings → Environment Variables**. Add these:

| Name | Value |
|---|---|
| `SUPABASE_URL` | Project URL from Step 2.3 |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key from Step 2.3 |
| `GOOGLE_CLIENT_ID` | from Google Cloud Console (see Step 4) |
| `GOOGLE_CLIENT_SECRET` | from Google Cloud Console |
| `GOOGLE_REDIRECT_URI` | `https://YOUR-APP.vercel.app/api/auth/google/callback` |
| `SESSION_SECRET` | any long random string you make up |
| `TOKEN_ENC_KEY` | any other long random string you make up |
| `NODE_ENV` | `production` |
| `WHATSAPP_TOKEN` | from Meta (only if using WhatsApp — see Step 5) |
| `WHATSAPP_PHONE_NUMBER_ID` | from Meta |
| `WHATSAPP_VERIFY_TOKEN` | any random string you make up |
| `WHATSAPP_OWNER_EMAIL` | your Google account email |

Keep the `service_role` key secret — it bypasses all database security, which
is fine here since only your server uses it, but never put it in frontend code.

You won't know your exact `.vercel.app` domain until after the first
deploy — deploy once, copy the domain it gives you, then come back and fill
in `GOOGLE_REDIRECT_URI` for real and redeploy (Deployments tab → ⋯ →
Redeploy). That's the only "do it twice" step.

## Step 4 — Google Cloud setup (unavoidable, but one-time)
1. console.cloud.google.com → new project.
2. **APIs & Services → Library** → enable: Gmail API, Google Calendar API,
   Google Sheets API, Google Docs API, Google Slides API, Tasks API.
3. **APIs & Services → OAuth consent screen** → External → fill in app
   name/logo (use `suchi-logo.png` from this zip) → add your own Google
   account as a **test user** (required while unverified; shows a scary
   "unverified app" warning, that's normal — click Advanced → Go to app).
4. **APIs & Services → Credentials → Create Credentials → OAuth client ID**
   → type "Web application".
5. **Authorized redirect URIs** → add exactly:
   `https://YOUR-APP.vercel.app/api/auth/google/callback`
6. Copy the Client ID and Client Secret into Vercel's env vars (Step 3).

## Step 5 — WhatsApp setup (optional, skip if you don't need it yet)
1. business.facebook.com → create a Meta app → add the **WhatsApp** product.
2. **WhatsApp → API Setup** → copy the temporary access token and test
   Phone Number ID into Vercel's env vars. (Temporary tokens expire in 24h —
   for real use, generate a permanent token via a System User in Meta
   Business Settings.)
3. **Configuration → Webhook** → callback URL:
   `https://YOUR-APP.vercel.app/api/whatsapp/webhook`, verify token: same
   string you put in `WHATSAPP_VERIFY_TOKEN`. Subscribe to `messages`.

## Step 6 — Deploy
Back in Vercel: **Deploy**. Once it's live, open the URL, click **Connect
Google** in Settings, sign in. Done.

## Things to know
- This is a single-user app by design (that's how the original was built —
  one Google account, one owner). Multiple people signing in would each get
  their own data in KV, but the UI/flows weren't built for multi-tenant use.
- Supabase's free tier (500MB, generous request limits) is far more than
  one person's use of this app needs.
- If OAuth ever throws `redirect_uri_mismatch`, it means the URL in Google
  Cloud Console (Step 4.5) doesn't exactly match `GOOGLE_REDIRECT_URI` —
  they must be character-for-character identical, including `https://`.
