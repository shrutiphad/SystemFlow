# Setup & Workflow Guide — All Three Phases

This is the "put it in VS Code and make it run" guide. It answers three things:
1. **What you add from your side** (env vars, keys, one Google setup).
2. **Which files belong to which phase** (so you're not confused about what's what).
3. **The exact run order** for a smooth workflow.

First, the important reassurance, verified by extracting the shipped zip fresh and running everything from scratch: **the three phases do not clash.** They share one database but use four separate tables, separate routes, separate frontend pages/components. Phase 2 and 3 are purely additive on top of Phase 1, which is additive on top of the base app. All 22 backend + 10 frontend tests pass from a clean install.

**One thing you must know:** the base app (tasks, jobs) runs with **zero AI setup**. Groq and Gmail are optional add-ons. If you don't set `GROQ_API_KEY`, everything still works — the chat just replies "not configured." If you don't set the Google vars, everything still works — Gmail just stays disconnected. So you can bring this up in stages.

---

## Part A — What YOU add from your side (the complete list)

### A1. Prerequisites (install once)
- **Node.js 20+**
- **PostgreSQL 14+** running locally

### A2. Backend env file: `server/.env`
Copy `server/.env.example` to `server/.env` and fill it in. Here's every variable and whether it's required:

| Variable | Required? | What to put |
|---|---|---|
| `PORT` | no | `5000` (default) |
| `NODE_ENV` | no | `development` |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | **yes** | your local Postgres details |
| `JWT_SECRET` | **yes** | any long random string (e.g. run the generator below) |
| `JWT_EXPIRES_IN` | no | `7d` |
| `CLIENT_ORIGIN` | **yes** | `http://localhost:5173` |
| `GROQ_API_KEY` | only for chat | your Groq key from console.groq.com |
| `GROQ_CHAT_MODEL` | no | `llama-3.3-70b-versatile` (default) |
| `GOOGLE_CLIENT_ID` | only for Gmail | from Google Cloud (see GMAIL_SETUP.md) |
| `GOOGLE_CLIENT_SECRET` | only for Gmail | from Google Cloud |
| `GOOGLE_REDIRECT_URI` | only for Gmail | `http://localhost:5000/api/integrations/gmail/callback` |
| `TOKEN_ENCRYPTION_KEY` | only for Gmail | 64-char hex, generate with the command below |

Generate the two secrets:
```bash
# JWT_SECRET (any length, this is a good default)
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
# TOKEN_ENCRYPTION_KEY (MUST be exactly 64 hex chars = 32 bytes)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### A3. Frontend env file: `client/.env`
Copy `client/.env.example` to `client/.env`:
```
VITE_API_URL=http://localhost:5000/api
```
That's the only frontend variable.

### A4. Your Groq key (for Phase 1 chat)
1. Go to https://console.groq.com/ → create an API key.
2. Paste into `server/.env` as `GROQ_API_KEY`.
That's it — the chat, and the job/Gmail tools inside the chat, all use this one key.

### A5. Your Google Cloud setup (for Phase 3 Gmail) — the only involved step
This is fully documented step-by-step in **`GMAIL_SETUP.md`**. Summary of what you produce: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and you add yourself as a test user. ~10 minutes, one time. You can skip this entirely and the rest of the app is unaffected.

---

## Part B — Which files belong to which phase

You said there's confusion about what's what. Here's the exact map. **Base app** = the original task manager. Each phase only *adds* files, plus a tiny number of *additive edits* to shared files (never rewrites).

### Base app (tasks, dashboard, auth)
```
server/src/
  config/database.js
  models/{user,task}.model.js, index.js
  middleware/{auth,error,validate}.middleware.js
  controllers/{auth,task,dashboard}.controller.js
  routes/{auth,task,dashboard}.routes.js
  utils/{jwt,asyncHandler}.util.js
  app.js, server.js
  seed/seed.js
client/src/
  api/{axios,auth.api,task.api}.js
  context/{AuthContext,ThemeContext}.jsx
  store/taskStore.js
  components/{Navbar,TaskCard,TaskFormModal,FilterSortBar,DashboardStats,StatusBadge,PriorityBadge,ConfirmDialog,ProtectedRoute}.jsx
  pages/{Login,Register,Dashboard,Tasks}.jsx
  App.jsx, main.jsx
```

### Phase 1 — Chat sidebar (Groq). NEW files:
```
server/src/services/groq.client.js          <- Groq client (lazy; safe without key)
server/src/services/chatTools.js            <- tool definitions + real DB queries
server/src/controllers/chat.controller.js   <- the tool-calling loop
server/src/routes/chat.routes.js
client/src/api/chat.api.js
client/src/store/chatStore.js
client/src/components/ChatSidebar.jsx        <- the floating widget
```
Phase 1 ADDITIVE edits to shared files:
- `server/src/app.js` — 2 lines (import + mount `/api/chat`)
- `client/src/App.jsx` — 2 lines (import + render `<ChatSidebar/>`)
- `client/src/context/AuthContext.jsx` — reset chat store on login/logout

### Phase 2 — Job-hunt Kanban. NEW files:
```
server/src/models/jobApplication.model.js
server/src/controllers/jobApplication.controller.js
server/src/routes/jobApplication.routes.js
client/src/api/job.api.js
client/src/store/jobStore.js
client/src/components/{JobCard,JobFormModal}.jsx
client/src/pages/JobHunt.jsx                 <- the Kanban board
```
Phase 2 ADDITIVE edits:
- `server/src/models/index.js` — export JobApplication
- `server/src/app.js` — 2 lines (mount `/api/jobs`)
- `server/src/services/chatTools.js` — 3 job tools added alongside task tools
- `client/src/App.jsx` — 1 route
- `client/src/components/Navbar.jsx` — 1 nav link

### Phase 3 — Gmail connector. NEW files:
```
server/src/models/gmailConnection.model.js
server/src/services/gmail.client.js          <- OAuth + Gmail API
server/src/controllers/gmail.controller.js
server/src/routes/gmail.routes.js
server/src/utils/crypto.util.js              <- AES-256-GCM token encryption
client/src/api/gmail.api.js
client/src/store/gmailStore.js
client/src/components/GmailConnect.jsx        <- sidebar connect control
```
Phase 3 ADDITIVE edits:
- `server/src/models/index.js` — export GmailConnection
- `server/src/app.js` — 2 lines (mount `/api/integrations/gmail`)
- `server/src/services/chatTools.js` — 1 Gmail tool added
- `server/src/controllers/chat.controller.js` — system prompt mentions email
- `client/src/components/Navbar.jsx` — render `<GmailConnect/>`
- `client/src/pages/Dashboard.jsx` — handle the `?gmail=connected` redirect
- `client/src/context/AuthContext.jsx` — reset gmail store on logout

**Since you have an older version:** the simplest, safest path is to **replace your whole folder with this new zip** rather than hand-merging. Every phase's changes are already integrated and tested together here. Hand-merging file-by-file is where things break; a clean replace can't.

---

## Part C — The run order (smooth workflow)

### First-time setup
```bash
# 1. Database (once)
createdb task_manager          # or use your GUI / psql

# 2. Backend
cd server
cp .env.example .env           # then fill in DB_*, JWT_SECRET, CLIENT_ORIGIN (see Part A)
npm install
npm run seed                   # optional: demo user + sample tasks
npm run dev                    # http://localhost:5000

# 3. Frontend (new terminal)
cd client
cp .env.example .env
npm install
npm run dev                    # http://localhost:5173
```
Log in with the seeded demo account: `demo@systemflow.dev` / `Demo1234`.

At this point **tasks, dashboard, and job-hunt Kanban all work** with no AI keys.

### Turning on the chat (Phase 1)
- Add `GROQ_API_KEY` to `server/.env`, restart the backend (`npm run dev`).
- The floating chat bubble now answers task and job questions.

### Turning on Gmail (Phase 3)
- Do the Google Cloud setup in `GMAIL_SETUP.md`, add the four Google/token vars to `server/.env`, restart.
- Click "Connect Gmail" in the sidebar → approve on Google → ask the chat about your email.

### Running the tests
```bash
# Backend (needs Postgres running; does NOT need any AI keys)
cd server && npm test              # 22 tests

# Frontend (needs the backend running; the 4 chat/gmail tests need a
# reachable Groq — your real GROQ_API_KEY set in server/.env)
cd client && npm test              # 10 tests
```

---

## Part D — Things that WILL trip you up (learn from the verification)

These are real issues found by installing the shipped zip fresh and running it — now fixed in the code, but worth knowing:

1. **The app boots fine without a Groq key.** (Earlier it would have crashed on startup if `GROQ_API_KEY` was missing, because the Groq client was created at import time. Now it's lazy — the chat endpoint returns a clean "not configured" 503 and everything else runs normally.)
2. **`TOKEN_ENCRYPTION_KEY` must be exactly 64 hex characters.** Not 32, not a random passphrase — 64 hex chars (which is 32 bytes). Use the generator in Part A2. A wrong length throws a clear error on the first Gmail action.
3. **Google `redirect_uri` must match exactly.** The URI in your Google Cloud OAuth client must be character-for-character identical to `GOOGLE_REDIRECT_URI` in `.env`, including `http`, `localhost`, the port `5000`, and the full path.
4. **Frontend chat/gmail tests need a reachable Groq.** The 4 tests that exercise the chat assistant make a real call through your backend to Groq. With your real `GROQ_API_KEY` in `server/.env` and the backend running, they pass. Without a key, those 4 will fail (the other 6 still pass) — that's expected, not a broken build.
5. **Two terminals.** Backend and frontend are separate processes — run each in its own terminal. Closing one doesn't stop the other.

---

## Part E — Quick sanity checklist before you demo

- [ ] Postgres running, `task_manager` DB exists
- [ ] `server/.env` has DB creds + `JWT_SECRET` + `CLIENT_ORIGIN`
- [ ] `client/.env` has `VITE_API_URL`
- [ ] `npm install` run in **both** `server/` and `client/`
- [ ] Backend up on :5000 (`curl localhost:5000/api/health` → `{"status":"ok"}`)
- [ ] Frontend up on :5173, can log in
- [ ] (Chat) `GROQ_API_KEY` set → chat bubble answers "what's overdue?"
- [ ] (Gmail) Google setup done → "Connect Gmail" works, chat answers an email question
