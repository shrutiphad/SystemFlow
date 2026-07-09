# SystemFlow — Task & Job-Hunt Management

A full-stack task management app built for the Mayfair Worktops Full Stack Developer take-home assignment. Users register, log in, and manage personal tasks (create/read/update/delete) with filtering, sorting, and a summary dashboard.

**AI tool disclosure:** built with Claude (Anthropic) as a pair-programming assistant, per the assignment's explicit allowance for AI tool use. Every design decision below is one I can walk through line by line in a follow-up interview.

---

## 1. Tech stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | React 18 + Vite | Fast dev server, no framework magic hiding the client/server boundary the brief asks for |
| Frontend state | React Context (auth, theme) + Zustand (tasks) | Context for cross-cutting concerns that rarely change; Zustand for the task list, which updates on every filter/sort/CRUD action and would cause noisy re-renders under Context |
| Styling | Tailwind CSS | Utility-first, fast to build a consistent design system with dark mode support |
| Forms/validation | React Hook Form + Zod (task form), React Hook Form (auth forms) | Declarative client-side validation matching the backend rules |
| Backend | Node.js + Express | Explicitly requested in the brief |
| Database | PostgreSQL + Sequelize | Relational integrity for the user→tasks relationship, real indexes, and enum types for priority/status |
| Auth | JWT (stateless) + bcrypt | Required by the brief; see ARCHITECTURE.md for the full flow and trade-offs |

This is a **separate frontend/backend MERN-style app** (`/client` + `/server`), not a Next.js fullstack app — deliberately, because the brief calls out "a clear separation between frontend and backend" and grades API design as its own 15-point category.

---

## 2. Project structure

```
SystemFlow/
├── client/                 # React + Vite frontend
│   └── src/
│       ├── api/             # axios instance + thin API wrapper functions
│       ├── context/         # AuthContext, ThemeContext
│       ├── store/           # Zustand task store
│       ├── components/      # Navbar, TaskCard, TaskFormModal, etc.
│       └── pages/            # Login, Register, Dashboard, Tasks
├── server/                  # Express + PostgreSQL backend
│   ├── src/
│   │   ├── config/           # Sequelize connection
│   │   ├── models/           # User, Task
│   │   ├── middleware/       # auth, validation, error handling
│   │   ├── controllers/      # auth, task, dashboard
│   │   └── routes/
│   ├── seed/                 # demo data seed script
│   └── tests/                # Jest + Supertest integration tests
├── docker-compose.yml        # one-command local startup (db + server + client)
└── ARCHITECTURE.md
```

---

## 3. Local setup

### Prerequisites
- Node.js 20+
- PostgreSQL 14+ running locally (or use Docker — see §6)

### Backend

```bash
cd server
cp .env.example .env      # edit DB_* values if your local Postgres differs
npm install
npm run seed               # optional: creates a demo user + 8 sample tasks
npm run dev                 # http://localhost:5000
```

### Frontend

```bash
cd client
cp .env.example .env
npm install
npm run dev                 # http://localhost:5173
```

### Demo login
```
email:    demo@systemflow.dev
password: Demo1234
```
(created by `npm run seed` above)

---

## 4. Environment variables

**server/.env**
| Variable | Description |
|---|---|
| `PORT` | Port the Express server listens on (default 5000) |
| `NODE_ENV` | `development` / `production` / `test` |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | Discrete Postgres connection params for local dev |
| `DATABASE_URL` | Optional single connection string; if set, takes priority over the discrete `DB_*` vars (used by most managed Postgres providers) |
| `JWT_SECRET` | Secret used to sign JWTs — must be a long random string in production |
| `JWT_EXPIRES_IN` | Token lifetime, e.g. `7d` |
| `CLIENT_ORIGIN` | Comma-separated list of origins allowed by CORS |

**client/.env**
| Variable | Description |
|---|---|
| `VITE_API_URL` | Base URL of the backend API, e.g. `http://localhost:5000/api` |

---

## 5. API reference

All routes are prefixed with `/api`. Protected routes require `Authorization: Bearer <token>`.

### Auth
| Method | Route | Auth | Body | Notes |
|---|---|---|---|---|
| POST | `/auth/register` | – | `{ name, email, password }` | password ≥ 8 chars, ≥ 1 digit; returns `{ token, user }` |
| POST | `/auth/login` | – | `{ email, password }` | returns `{ token, user }` |
| GET | `/auth/me` | ✓ | – | returns the current user; used to re-validate a stored token on app load |
| POST | `/auth/logout` | ✓ | – | stateless — client discards the token |

### Tasks
| Method | Route | Auth | Notes |
|---|---|---|---|
| GET | `/tasks?status=&priority=&sortBy=&order=` | ✓ | `status`: `todo\|in_progress\|done`, `priority`: `low\|medium\|high`, `sortBy`: `due_date\|created_at`, `order`: `asc\|desc` |
| GET | `/tasks/:id` | ✓ | 404 if the task doesn't belong to the caller |
| POST | `/tasks` | ✓ | body: `{ title, description?, priority?, status?, due_date? }` |
| PUT | `/tasks/:id` | ✓ | any subset of the same fields |
| DELETE | `/tasks/:id` | ✓ | confirmation prompt is handled client-side |

### Dashboard
| Method | Route | Auth | Returns |
|---|---|---|---|
| GET | `/dashboard/summary` | ✓ | `{ total, byStatus: { todo, in_progress, done }, overdue }` |

All error responses follow `{ message, errors? }`. Standard status codes: `200/201` success, `400` validation, `401` auth, `404` not found, `409` conflict (duplicate email), `500` unexpected.

---

## 6. Running with Docker

```bash
docker compose up --build
```
This starts Postgres, the backend (port 5000), and the frontend (port 5173) together. Update `JWT_SECRET` in `docker-compose.yml` before using this anywhere but your own machine.

---

## 7. Tests

**Backend:**
```bash
cd server
npm test
```
15 Jest/Supertest integration tests covering registration, login, weak-password rejection, task CRUD, filtering, ownership isolation (user A cannot read/edit/delete user B's tasks), and dashboard aggregation — run against a real PostgreSQL instance, not mocks.

**Frontend:**
```bash
# with the backend already running on :5000
cd client
npm test
```
3 Vitest + React Testing Library integration tests that render the actual `<App />` component tree and drive it with real user interactions (typing, clicking, selecting) against the real running backend — register → dashboard, a full task create → edit → filter → delete lifecycle, and a client-side validation rejection path. These are genuine integration tests, not mocked-API unit tests, which is why the backend needs to already be running for `npm test` to pass.

---

## 8. Screenshots / demo

Not included in this generated deliverable — run the app locally (§3) and record your own screenshots/GIF of: login, dashboard, task list with filters, and the create/edit modal, then drop them in a `/docs` folder and link them here before submitting.

---

## 9. Known trade-offs

See `ARCHITECTURE.md` for the full write-up. Short version: JWT is stored in `localStorage` rather than an httpOnly cookie (simpler CORS story for a 72-hour build; documented as a production hardening item), and `sequelize.sync({ alter: true })` is used instead of versioned migrations (fine for a take-home, would be replaced by `sequelize-cli` migrations in a real rollout).

---

## 10. AI add-on: task assistant chat sidebar (Phase 1)

A floating chat widget (bottom-right of every authenticated page) that answers natural-language questions about *your own* tasks — e.g. "Is the GPMorgan QA test done?", "What's overdue?", "How many tasks are in progress?".

**How it works (and why it's safe):** the LLM (Groq, `llama-3.3-70b-versatile`) never touches the database or writes SQL. It's given three fixed, named *tools* (`searchTasksByCompany`, `getOverdueOrUpcomingTasks`, `getTaskCountsByStatus`), each of which is a real parameterised Sequelize query scoped to the authenticated user. The tool-calling loop:

1. `POST /api/chat` (protected by the same `requireAuth` as everything else) sends the question + tool definitions to Groq.
2. If Groq requests a tool call, the server runs the *real* function — with `userId` injected from `req.user.id`, never from anything the model supplies (the tool schemas don't even expose a `userId` parameter).
3. The tool result goes back to Groq, which phrases the final answer.

This mirrors how production tools like Shortwave handle "chat with your data" — tool-calling over a fixed, safe surface rather than giving an LLM raw database access. Ownership isolation is enforced exactly as in the REST API: every tool query filters by `user_id`, verified by an automated test that confirms one user's chat cannot surface another user's tasks.

**New env vars:** `GROQ_API_KEY` (required for this feature), `GROQ_CHAT_MODEL` (optional, defaults to `llama-3.3-70b-versatile`). The rest of the app runs fine without them — the chat is purely additive.

**Nothing in the original task CRUD, dashboard, or auth flow was modified** beyond two additive lines in `app.js` (mount the route) and two in the client (mount the widget, reset chat state on auth change).

---

## 11. Job-hunt CRM with Kanban board (Phase 2)

A separate `/jobs` page: a Kanban board tracking job applications through a pipeline (Wishlist → Applied → Online Assessment → Interviewing → Offer → Rejected → Withdrawn). Drag a card between columns to change its stage; add/edit/delete applications with company, role, portal, outreach-sent flag, applied/follow-up dates, and notes.

**Data model:** a `job_applications` table that is a deliberate *sibling* of `tasks` — separate table, same ownership pattern (`user_id` from the token, never the body; every query scoped to the owner). Job applications and tasks are different domain objects with different lifecycles, so they aren't forced into one table.

**Design choices worth noting:**
- `status` is an ENUM (fixed, small, central to the board's structure) while `portal` is free-text STRING (open-ended, changes often) — the inverse trade-off, and a deliberate one.
- Kanban drag-drop uses native HTML5 drag events, no extra library — keeping the dependency footprint identical to the rest of the app.
- A dedicated `PATCH /api/jobs/:id/status` endpoint handles drag-drop moves, so a drag only sends the status change, not the whole record. Moves are optimistic in the UI (the card jumps immediately, reconciled with the server, rolled back on failure).

**Chat integration:** the assistant sidebar gained three job-aware tools (`searchJobsByCompany`, `getJobsNeedingFollowUp`, `getJobCountsByStatus`), so you can ask "did I apply to Stripe?" or "which companies do I need to follow up with?" — same safe tool-calling pattern as the task tools, same per-user scoping.

**API surface (all under `/api/jobs`, all requiring auth):** `GET /`, `GET /:id`, `POST /`, `PUT /:id`, `PATCH /:id/status`, `DELETE /:id`.

**Nothing in Phases 0–1 was modified** beyond additive lines: two in `app.js` (import + mount), two in the client (`App.jsx` route, `Navbar.jsx` link), and the chat-tools file gained job tools alongside the existing task tools.

**Tests:** 7 new backend integration tests (job CRUD, PATCH-status, invalid-status rejection, ownership isolation) bringing the backend suite to 22, plus 3 new rendered frontend tests (create-appears-in-column, status-move path, delete) bringing the frontend suite to 8.

## Phase 3 (Gmail RAG connector) — not built

Deliberately deferred. It requires a Google Cloud OAuth app tied to a real Google account, which is a setup step outside this repo. The architecture is designed (read-only `gmail.readonly` scope, encrypted token storage, a `searchGmail` tool where the LLM builds a live Gmail search query at question-time) but not implemented in this deliverable.

---

## 12. Gmail RAG connector (Phase 3)

Connect a Gmail account (read-only) and ask the chat assistant about your actual email — e.g. "which companies did I email in the last 2 days?", "did I get a reply from Stripe?". Useful for job-hunt follow-up tracking without manually digging through your inbox.

**Setup:** requires a one-time Google Cloud OAuth app. Full step-by-step in `GMAIL_SETUP.md`. Without it, the rest of the app (tasks, jobs, task/job chat) works normally — the Gmail tool simply reports "not connected."

**How it works:**
- **Connection** lives in a sidebar control ("Connect Gmail" button / status pill), because OAuth needs a full-page redirect to Google. Clicking it hits `GET /api/integrations/gmail/connect`, which returns a Google consent URL; after consent, Google redirects to `GET /api/integrations/gmail/callback`, which exchanges the code for tokens and stores them.
- **Querying** lives entirely in the chat assistant, as a fourth tool (`searchGmail`). The LLM constructs a real Gmail search query using Gmail's own operators (`from:`, `to:`, `after:`, `newer_than:`, etc.) and the backend runs it live against the inbox at question-time — no pre-indexing, no local email storage. This mirrors how production tools like Shortwave do "chat with your inbox."

**Security:**
- Scope is **`gmail.readonly`** only — least privilege; the app can never send/delete/modify mail.
- OAuth tokens are stored **encrypted at rest** (AES-256-GCM via `crypto.util.js`) in the `gmail_connections` table — never plaintext.
- The OAuth `state` param is a short-lived **signed JWT** tying the callback to the right user; this is the CSRF defense, and forged/expired state is rejected (redirects to an error, verified by test).
- The tool returns only sender/recipient/subject/date + snippet — never full bodies.
- Access tokens auto-refresh transparently and the refreshed token is re-encrypted and persisted.

**New env vars:** `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `TOKEN_ENCRYPTION_KEY` (all documented in `.env.example` and `GMAIL_SETUP.md`).

**What's verified vs. not:** the OAuth endpoint behavior (consent URL generation with correct scope + state, forged-state rejection, status/disconnect), token encryption round-trip + tamper detection, the `gmail_connections` table, and the not-connected chat path are all tested against the real backend. The **live Google consent handshake and real inbox fetch** can only be exercised on your machine after the Google Cloud setup — no automated test can cover those without a real OAuth app and network egress to Google.

**Additive only:** two lines in `app.js` (import + mount), the chat-tools file gained one tool, `Navbar.jsx` gained the connect control, `Dashboard.jsx` gained OAuth-redirect handling, and `AuthContext.jsx` resets the new store on logout. No existing task/job/auth logic changed.
