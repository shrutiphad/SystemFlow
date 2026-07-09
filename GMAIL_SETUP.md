# Gmail Connector — Google Cloud Setup Guide

The Gmail connector is fully built, but to actually connect a live inbox you need a Google Cloud OAuth app. This is a one-time, ~10-minute setup tied to your own Google account. Nothing here touches the codebase — it just produces three values you drop into `server/.env`.

## What you'll end up with
Three values for `server/.env`:
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `TOKEN_ENCRYPTION_KEY` (you generate this locally, not from Google)

## Step 1 — Create a Google Cloud project
1. Go to https://console.cloud.google.com/
2. Top bar → project dropdown → **New Project**. Name it anything (e.g. "taskframe-gmail"). Create, then select it.

## Step 2 — Enable the Gmail API
1. Left menu → **APIs & Services → Library**
2. Search **Gmail API** → open it → **Enable**.

## Step 3 — Configure the OAuth consent screen
1. **APIs & Services → OAuth consent screen**
2. User type: **External** → Create.
3. Fill the required fields (app name, your email for user support + developer contact). You can leave optional fields blank.
4. **Scopes** step → Add or Remove Scopes → search for and add:
   `https://www.googleapis.com/auth/gmail.readonly`
   (This is the only scope this app uses — read-only.)
5. **Test users** step → Add your own Gmail address as a test user.
   - Important: while the app is in **Testing** mode, only the test users you add here can connect — but there's **no Google verification review needed**, and it works immediately. This is exactly right for a personal/portfolio project. (Publishing the app for anyone to use would require Google's verification review; you don't need that.)
6. Save.

## Step 4 — Create OAuth credentials
1. **APIs & Services → Credentials → Create Credentials → OAuth client ID**
2. Application type: **Web application**.
3. Under **Authorized redirect URIs**, add exactly:
   `http://localhost:5000/api/integrations/gmail/callback`
   (This must match `GOOGLE_REDIRECT_URI` in your `.env`. If you deploy the backend, add the deployed URL too, e.g. `https://your-backend.onrender.com/api/integrations/gmail/callback`.)
4. Create. Google shows you a **Client ID** and **Client Secret** — copy both.

## Step 5 — Generate the token encryption key
OAuth tokens are stored encrypted at rest (AES-256-GCM). Generate a key locally:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Copy the 64-character hex string it prints.

## Step 6 — Fill in server/.env
```
GOOGLE_CLIENT_ID=<the client id from step 4>
GOOGLE_CLIENT_SECRET=<the client secret from step 4>
GOOGLE_REDIRECT_URI=http://localhost:5000/api/integrations/gmail/callback
TOKEN_ENCRYPTION_KEY=<the 64-char hex from step 5>
```

## Step 7 — Try it
1. Start the backend (`npm run dev` in `/server`) and frontend (`npm run dev` in `/client`).
2. Log in, look at the sidebar → click **Connect Gmail**.
3. You'll be redirected to Google's consent screen → approve.
4. You'll land back on the dashboard with a "Gmail connected" banner, and the sidebar pill will show your address.
5. Open the chat assistant and ask something like:
   - "Which companies did I email in the last 2 days?"
   - "Did I get any replies from recruiters this week?"

## Notes on security / behavior
- The scope is **read-only**. This app can never send, delete, or modify your mail.
- Tokens are stored **encrypted** in `gmail_connections`; the raw tokens never sit in plaintext in the DB.
- The OAuth `state` parameter is a short-lived signed JWT tying the callback to your user — this is the CSRF protection for the flow, and forged/expired state is rejected.
- The chat tool only ever pulls sender/recipient/subject/date + a short snippet — never full email bodies.
- Disconnecting (sidebar → Disconnect) deletes the stored connection row entirely.

## If something goes wrong
- **"redirect_uri_mismatch"**: the URI in Step 4 must exactly match `GOOGLE_REDIRECT_URI` (protocol, host, port, path — all of it).
- **"access blocked / app not verified"**: make sure your Gmail address is added as a Test user (Step 3.5) and the app is in Testing mode.
- **Banner says "connection failed"**: check the backend logs; most often it's a missing `TOKEN_ENCRYPTION_KEY` or a wrong client secret.
