# Architecture

## 1. Folder structure rationale

The repo is split into two independently runnable, independently deployable projects: `/client` and `/server`. This isn't just a style choice — the assignment explicitly grades "Backend/API Design" and "Frontend/UI/UX" as separate 15-point categories, which implies the grader wants to look at a standalone Express service and a standalone React app, not routes folded into a single Next.js project.

**Backend** follows a conventional layered structure:
```
routes → middleware (auth, validation) → controllers → models
```
Routes only wire URLs to validation rules and controllers. Controllers hold business logic and talk to Sequelize models directly — there's no separate "service layer," because the logic here (CRUD + one aggregation query) doesn't yet justify the extra indirection. If the app grew (e.g. multi-tenant workspaces, task assignment to other users, notifications), I'd introduce a service layer between controllers and models.

**Frontend** separates:
- `api/` — the only place that knows about HTTP/axios
- `context/` — long-lived, rarely-changing global state (who's logged in, light/dark theme)
- `store/` — Zustand store for tasks, which changes on every filter/sort/CRUD action
- `components/` — presentational + some local state, no direct API calls
- `pages/` — compose components + store into a screen, own the routing-level logic

## 2. Database schema

```
users
  id            UUID PK
  name          VARCHAR(100)
  email         VARCHAR(255) UNIQUE, indexed
  password_hash VARCHAR
  created_at / updated_at

tasks
  id            UUID PK
  title         VARCHAR(200)
  description   TEXT, nullable
  priority      ENUM(low, medium, high)
  status        ENUM(todo, in_progress, done)
  due_date      DATE, nullable
  user_id       UUID FK → users.id, ON DELETE CASCADE
  created_at / updated_at
```

**Indexing decisions:** every task query in this app is scoped to `user_id` (a user only ever sees their own tasks), so `user_id` is indexed on its own, and again as the lead column in a composite index `(user_id, status, due_date)` — that composite covers the single most common query shape: "my tasks, optionally filtered by status, sorted by due date." `status`, `priority`, and `due_date` also each get their own index since they're independently filterable/sortable. `email` is uniquely indexed since login is a lookup by email.

**Why UUID over auto-increment integers:** avoids leaking sequential IDs (how many users/tasks exist, in what order) through the API, and matches how most managed Postgres setups are provisioned today.

**Why `DATEONLY` for due_date:** due dates are calendar dates, not timestamps — storing time-of-day would just invite timezone bugs when comparing "is this overdue" across users in different timezones.

## 3. Authentication flow

1. **Register** — password is hashed with bcrypt (cost factor 10) before storage; the plaintext password never touches the database. A JWT is issued immediately so the user is logged in right after registering, matching how most modern task apps behave.
2. **Login** — email is looked up (case-insensitively; emails are lowercased on write), password compared against the stored hash via `bcrypt.compare`. On mismatch, the API returns the same generic "Invalid email or password" whether the email exists or not, to avoid leaking which emails are registered.
3. **Protected routes** — a middleware (`requireAuth`) reads `Authorization: Bearer <token>`, verifies it, and re-fetches the user from the database on every request (rather than trusting the JWT payload alone) so that a deleted user's old token stops working immediately.
4. **Client-side** — the JWT is stored in `localStorage` and attached to every request via an axios interceptor. A second interceptor watches for `401` responses globally and force-logs-out + redirects to `/login`, so an expired token is handled in exactly one place instead of being checked in every component.
5. **Logout** — JWTs are stateless, so logout is really just the client discarding the token. The `/auth/logout` endpoint exists mainly for a consistent API surface and as a hook point if token revocation (e.g. a server-side denylist) is ever needed.

### Trade-off: localStorage vs httpOnly cookie
Storing the JWT in `localStorage` is simpler to wire up across two different origins in local dev (no CORS-with-credentials dance, no CSRF token needed) and is what most small full-stack take-homes ship. The real cost: it's readable by any JS that runs on the page, so it's vulnerable to XSS in a way an httpOnly cookie isn't. For a production system I'd move to httpOnly, SameSite cookies with a CSRF token, at the cost of more CORS/deployment complexity between separately-hosted frontend and backend.

## 4. Filtering, sorting, and the dashboard

Filtering and sorting happen entirely server-side via query params (`?status=&priority=&sortBy=&order=`) rather than client-side array filtering, so the behavior stays correct as task lists grow — the client never has to download tasks it isn't going to show. `sortBy` is restricted to an allow-list (`due_date`, `created_at`) rather than passed straight into the `ORDER BY` clause, to avoid arbitrary column injection.

The dashboard summary (`/dashboard/summary`) is one aggregation query using `COUNT`/`GROUP BY` in Postgres rather than fetching all tasks and counting them in JavaScript — this keeps the payload small and the counts accurate even if the task list itself is paginated in the future.

## 5. Validation strategy

Validation happens in two layers that mirror each other but serve different purposes:
- **Client (React Hook Form + Zod / inline rules):** fast feedback, prevents obviously-bad requests from ever hitting the network.
- **Server (express-validator):** the actual source of truth — the client can always be bypassed (curl, Postman, a modified frontend), so every rule enforced client-side is re-enforced server-side. Sequelize model-level validators (`isEmail`, `len`, enum constraints) are a third, final backstop at the data layer.

## 6. What I'd change for a larger/production version
- Replace `sequelize.sync({ alter: true })` with versioned migrations (`sequelize-cli`) — `sync({ alter: true })` is convenient for a 72-hour build but is not safe for a production database with real data in it.
- Move the JWT to an httpOnly cookie (see trade-off above).
- Add pagination to `GET /tasks` once task lists grow past a page or two.
- Add rate limiting on `/auth/login` and `/auth/register` to slow down credential-stuffing attempts.
