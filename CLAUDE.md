# CLAUDE.md — SystemFlow conventions

SystemFlow is a task + job-hunt management product: React/Vite client (`/client`)
and Express/PostgreSQL/Sequelize server (`/server`), run as two separate processes.
Read `ARCHITECTURE.md` for design rationale and `SETUP_GUIDE.md` for env/run steps.

## Run

```bash
# terminal 1                     # terminal 2
cd server && npm run dev         cd client && npm run dev
# :5000                          # :5173
```

Backend tests: `cd server && npm test` (Jest + Supertest; **wipes the DB in
`server/.env` via `sync({ force: true })`** — re-run `npm run seed` after).
Frontend tests: `cd client && npm test` (Vitest; needs the backend running;
the chat/gmail tests additionally need a real `GROQ_API_KEY`).

## Non-negotiable rules

1. **Layering:** route → middleware (auth, validate) → controller → Sequelize model.
   Routes never touch Sequelize; models never know about HTTP.
2. **Ownership:** every table has `user_id`; every query is scoped by
   `req.user.id` from the JWT — never from the request body. Child records
   (e.g. a contact under a job) must verify the parent belongs to the user.
3. **LLM safety:** the chat LLM only calls fixed, named tools in
   `server/src/services/chatTools.js`; `userId` is injected by the controller and
   never appears in a tool schema. The LLM never writes to the DB — mutations
   happen only through REST endpoints the *user* triggers.
4. **Gmail is read-only** (`gmail.readonly`); OAuth tokens are AES-256-GCM
   encrypted at rest (`crypto.util.js`); email bodies are never persisted.
5. **Additive changes:** don't rewrite working code; existing tests keep passing.
6. **Every new table/endpoint/chat tool ships with tests**, including an
   ownership-isolation test (user A cannot reach user B's data).

## Conventions

- **Validation is duplicated deliberately:** zod client-side (fast feedback),
  express-validator server-side (source of truth), Sequelize validators as backstop.
- **DB naming:** UUID PKs, `underscored: true`, `created_at`/`updated_at`,
  `onDelete: 'CASCADE'` on FKs. Enums for small fixed sets central to the UI
  (e.g. `status`); STRING + `isIn` for sets that may grow (e.g. `source`).
- **Dates that are calendar dates use `DATEONLY`**, not timestamps.
- **No new runtime dependencies** without strong justification — drag-drop is
  native HTML5, charts are hand-rolled SVG. Match this bar.
- **Frontend layers:** `api/` is the only place that knows axios; `store/`
  (Zustand) owns server state; `context/` only for auth/theme; components don't
  call APIs directly.
- **Aggregations happen in SQL** (`COUNT`/`GROUP BY`), never by fetching rows
  and counting in JS.
- Schema changes go through `sequelize.sync({ alter: true })` in dev (no
  migration files yet); new columns must be nullable or defaulted so existing
  rows survive.
- Brand name is **SystemFlow** everywhere user-visible (UI, titles, chat prompt,
  seed data `demo@systemflow.dev`).
