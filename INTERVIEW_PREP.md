# Mayfair Task Manager — Architecture & Code Defense Guide

Purpose: be able to answer *any* line, *any* "why," and *any* "how would you make this better" question about this codebase without hesitating. Organized as: mental model → line-by-line on the highest-value files → a tricky-question bank with sharp answers → what you'd change if pushed further.

---

## Part 1 — The mental model (say this first if asked "walk me through your architecture")

Three layers, each with exactly one job, each only able to talk to its neighbor:

```
Route  →  decides "is this request even well-formed and who is it from"
Controller  →  decides "what does this business action do"
Model  →  decides "how is this represented and constrained in the database"
```

A route never touches Sequelize. A controller never touches `req.headers`. A model never knows what HTTP is. If you can say that sentence unprompted, you've already answered the "explain your architecture" question better than most candidates.

The second load-bearing idea: **auth is stateless.** The server keeps zero session memory. Every request re-proves who it is via a JWT. This has one immediate consequence you should be ready to explain: `requireAuth` re-fetches `User.findByPk(payload.sub)` on *every single request* rather than trusting the decoded token payload. That's a deliberate cost (one extra DB round-trip per request) traded for one real benefit (a deleted or deactivated user's token stops working immediately, not just at expiry).

---

## Part 2 — Line-by-line on the files most likely to get picked apart

### `server/src/models/task.model.js` — every field, why it's shaped that way

```js
id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
```
UUID, not auto-increment integer. Two reasons, and know both: (1) it doesn't leak business information — an auto-increment ID tells an attacker "task #4,502 exists, so does #1 through #4,501," which reveals your total task volume; a UUID reveals nothing. (2) It lets the client generate IDs offline in theory (we don't use this, but it's the standard reason distributed systems prefer UUIDs — no coordination needed with a central counter).

```js
title: { type: DataTypes.STRING(200), allowNull: false, validate: { notEmpty: true, len: [1, 200] } },
```
`STRING(200)` maps to Postgres `VARCHAR(200)` — a hard DB-level cap, not just an app-level one. `notEmpty` catches `""`, but *not* whitespace-only strings like `"   "` — that's actually a real gap; Sequelize's `notEmpty` only checks for the empty string, not `.trim()`ed emptiness. (If asked "is there a bug here," this is a legitimate one to name yourself before they find it.)

```js
priority: { type: DataTypes.ENUM('low', 'medium', 'high'), allowNull: false, defaultValue: 'medium' },
```
Postgres `ENUM` is a real database type, not just an app-level check — you get free protection at the schema level even if someone writes directly to the DB. Trade-off worth knowing: **enum types are painful to alter later.** Adding a fourth priority value in Postgres later requires `ALTER TYPE ... ADD VALUE`, which can't run inside a transaction in older Postgres versions. This is why some teams use a plain `VARCHAR` + `CHECK` constraint instead — easier to evolve, marginally less type-safety. Be ready to say you chose ENUM for stronger guarantees and accepted the migration cost as a reasonable trade for a fixed, small set of values that's unlikely to change.

```js
due_date: { type: DataTypes.DATEONLY, allowNull: true },
```
`DATEONLY` → Postgres `DATE`, no time component. Deliberate: if this were a `DATETIME`, "is this overdue" comparisons would depend on what timezone the stored timestamp was written in versus the server's `new Date()` at query time — a task due "today" in Mumbai could show as overdue on a UTC server before midnight IST. Storing just the calendar date sidesteps that entirely.

```js
user_id: { type: DataTypes.UUID, allowNull: false, references: { model: User, key: 'id' }, onDelete: 'CASCADE' },
```
`onDelete: 'CASCADE'` at the DB level: if a `User` row is deleted, Postgres itself deletes all their `Task` rows — this isn't application logic, it's a foreign-key constraint enforced by the database engine. Know the alternative: `onDelete: 'SET NULL'` would orphan tasks instead of deleting them (only possible if `user_id` were nullable, which it isn't here — deliberately, since a task with no owner makes no sense in a single-tenant-per-user model).

```js
indexes: [
  { fields: ['user_id'] },
  { fields: ['status'] },
  { fields: ['priority'] },
  { fields: ['due_date'] },
  { fields: ['user_id', 'status', 'due_date'] },
],
```
This is the single most interview-bait part of the file. Know the **leftmost-prefix rule**: a composite index on `(user_id, status, due_date)` can serve queries filtering on `user_id` alone, or `user_id + status`, or all three — but *cannot* efficiently serve a query filtering on `status` alone (that's why `status` also gets its own single-column index). This is the exact reasoning to give if asked "why do you have both a composite index and individual indexes that seem to overlap with it."

### `server/src/controllers/task.controller.js` — every function

```js
const ALLOWED_SORT_FIELDS = { due_date: 'due_date', created_at: 'created_at' };
...
const sortField = ALLOWED_SORT_FIELDS[sortBy] || 'created_at';
```
This line is a security control, not just a default value. If `sortBy` were passed straight into `order: [[sortBy, sortOrder]]`, a client could pass any string — at minimum it'd throw a Sequelize error on an invalid column, at worst (depending on how a raw query were built elsewhere) it's the shape of a SQL-injection-adjacent bug. The allow-list means only two literal, hardcoded column names can ever reach the query. **This is the answer to "how do you prevent injection in dynamic sort/filter parameters."**

```js
const createTask = asyncHandler(async (req, res) => {
  const { title, description, priority, status, due_date } = req.body;
  const task = await Task.create({ title, description, priority, status, due_date, user_id: req.user.id });
```
Notice `user_id: req.user.id` is *not* taken from `req.body`. Even if a malicious client sent `{ title: "x", user_id: "someone-elses-uuid" }` in the POST body, it's destructured out separately and overwritten with the authenticated user's real ID. This is the actual mechanism — not a "trust me" comment — that makes ownership unforgeable. Know this cold, it's the number one "could a user hack another user's data" question.

```js
const updateTask = asyncHandler(async (req, res) => {
  const task = await Task.findOne({ where: { id: req.params.id, user_id: req.user.id } });
  if (!task) return res.status(404).json({ message: 'Task not found' });
```
Same pattern for update/delete/getById: the `WHERE` clause filters by **both** `id` AND `user_id` in a single query. This is deliberate over the alternative of "fetch by id, then check `if (task.user_id !== req.user.id)`" — that alternative would need to return `403 Forbidden` and would leak the fact that a task with that ID exists at all (just belonging to someone else). Returning `404` in both the "doesn't exist" and "exists but isn't yours" cases means an attacker enumerating task IDs learns nothing.

```js
await task.update({
  ...(title !== undefined && { title }),
  ...(description !== undefined && { description }),
  ...
});
```
This spread-with-conditional pattern is how PATCH-style partial updates work with `PUT`: only fields actually present in the request body get included in the `.update()` call, so `PUT { status: 'done' }` doesn't accidentally null out `title`/`description`/etc. Be ready to explain why this isn't a "real" PATCH semantically (REST purists would say partial-update-via-PUT is technically not idempotent-safe in the same way) — a fair critique, and the honest answer is a dedicated `PATCH` route would be the more correct REST design; `PUT` was used here to keep the surface area smaller for a 72-hour build.

### `server/src/controllers/dashboard.controller.js` — the one query worth defending in depth

```js
const [total, byStatusRaw, overdue] = await Promise.all([
  Task.count(...),
  Task.findAll({ ..., group: ['status'], raw: true }),
  Task.count(...),
]);
```
Two things to be ready to explain:
1. **Why `Promise.all` and not three sequential `await`s.** These three queries are fully independent — none depends on another's result — so running them sequentially would triple the latency for no reason. `Promise.all` fires all three at once and waits for the slowest.
2. **Why one `GROUP BY` query instead of three separate `.count()` calls (one per status).** `Task.findAll({ attributes: ['status', [fn('COUNT', col('status')), 'count']], group: ['status'] })` produces one SQL query with a single `GROUP BY status`, returning all three counts in one round-trip — versus running `Task.count({ where: { status: 'todo' } })`, then again for `in_progress`, then `done`. Same conceptual data, one query instead of three. This is the direct answer to "how would you optimize this dashboard endpoint" — **it's already optimized this way**, so say so and explain why.

```js
Task.count({
  where: { user_id: userId, status: { [Op.ne]: 'done' }, due_date: { [Op.lt]: new Date().toISOString().slice(0, 10) } },
})
```
`Op.ne` = "not equal," `Op.lt` = "less than" — Sequelize operator symbols that get translated into `!=` and `<` in the generated SQL. `.toISOString().slice(0, 10)` truncates a JS `Date` down to `YYYY-MM-DD` to compare against the `DATEONLY` column correctly (comparing a full ISO timestamp against a date-only column would work in Postgres via implicit cast, but truncating explicitly makes the comparison intent obvious and avoids relying on implicit coercion).

### `server/src/middleware/auth.middleware.js` — the security-critical file

```js
const header = req.headers.authorization || '';
const [scheme, token] = header.split(' ');
if (scheme !== 'Bearer' || !token) { ... 401 ... }
```
Manually parses `"Bearer <token>"` rather than trusting any header shape. If someone sends just the raw token with no `Bearer ` prefix, or sends `Basic ...`, this rejects it — matches the actual HTTP auth-scheme spec rather than being lenient.

```js
const payload = verifyToken(token);
const user = await User.findByPk(payload.sub);
if (!user) return res.status(401).json({ message: 'User no longer exists' });
req.user = user;
```
Already covered the "why re-fetch" reasoning above — the cost/benefit trade to have ready: **cost** = one extra indexed primary-key lookup per authenticated request (cheap — `id` is the PK, this is the fastest possible query); **benefit** = immediate revocation on user deletion, and `req.user` downstream always has fresh data (e.g., if you added a "user can be suspended" flag later, this is the one place you'd check it).

```js
} catch (err) {
  if (err.name === 'TokenExpiredError') { ... 'Session expired, please log in again' ... }
  return res.status(401).json({ message: 'Invalid token' });
}
```
Distinguishes an expired token from a malformed/tampered one only in the *message*, not the *status code* — both return `401`. This is deliberate: don't give an attacker probing your API more information than necessary about *why* their forged token failed, while still giving a legitimate user a helpful "please log in again" instead of a cryptic error.

### `client/src/api/axios.js` — the actual client/server bridge

```js
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
```
Every single outgoing request passes through here before it leaves the browser. This is *why* no component or API-wrapper function ever manually sets an auth header — centralizing it here means there's exactly one place that could get it wrong, instead of thirty.

```js
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```
The mirror-image interceptor on the way back. Any `401` from *any* endpoint, at *any* point in the app's lifetime, triggers global logout-and-redirect. Notice `Promise.reject(error)` at the end — the interceptor still re-throws after handling the side effect, so the calling code's own `.catch()` (e.g., in `Login.jsx`'s `setServerError`) still fires too. If you removed that line, every failed request would resolve as `undefined` instead of rejecting, silently breaking every error-handling call site in the app.

### `client/src/store/taskStore.js` — why Zustand, and the exact update mechanics

```js
addTask: async (payload) => {
  const { task } = await taskApi.createTask(payload);
  set((state) => ({ tasks: [task, ...state.tasks] }));
  get().loadSummary();
  return task;
},
```
`set((state) => ...)` — functional update form, not `set({ tasks: [...] })` directly. This matters: using the functional form guarantees you're operating on the *current* state at the time this runs, not a stale closure captured when `addTask` was first called — relevant if multiple state updates could be in flight (they aren't heavily here, but it's the correct default habit and worth explaining unprompted).

`get().loadSummary()` — note this is **fire-and-forget**, not awaited. The task list updates instantly (optimistic-ish, though it's using the real server response, not a guess), and the dashboard numbers catch up a beat later without blocking the UI on a second network round-trip. If asked "why not `await` it," the honest answer: there's no correctness reason to block the user from seeing their new task while the summary count refreshes — it's a deliberate perceived-performance choice.

---

## Part 3 — Tricky / optimization question bank (with answers you can give cold)

**Q: What happens if two browser tabs edit the same task at the same time?**
Last write wins — there's no optimistic concurrency control (no version/`updated_at` check before overwrite). Whoever's `PUT` reaches the server last silently overwrites the other's change with no conflict warning. A real fix: include the row's current `updated_at` in the update request and reject with `409 Conflict` if it doesn't match what's in the DB anymore (classic optimistic locking). Say plainly this isn't implemented — it's a legitimate gap, not a hidden feature.

**Q: How do you prevent SQL injection here?**
Two layers: (1) Sequelize parameterizes every query it builds from `where`/`.create`/`.update` calls — user input never gets string-concatenated into raw SQL, so there's no injection surface in normal use. (2) The one place that takes a "column name" from user input (`sortBy`) is explicitly allow-listed against a fixed object rather than interpolated directly, because parameterization protects *values*, not *identifiers* like column names — you can't parameterize `ORDER BY $1`, so an allow-list is the correct defense there specifically.

**Q: Why bcrypt with cost factor 10, not something higher?**
Cost factor controls how many rounds of hashing happen — higher is more resistant to brute force but slower for every legitimate login too. 10 is bcrypt's commonly-cited reasonable default as of recent guidance (~100ms per hash on typical hardware) — high enough to make offline brute-forcing a stolen hash expensive, low enough not to visibly slow down login. If this were a higher-security context (banking), you'd push it higher and accept the latency cost, or move to Argon2.

**Q: Your JWT is stored in localStorage. Isn't that an XSS risk?**
Yes, and I'd say so directly if asked, not defend it as ideal. Any injected script can read `localStorage` and steal the token. The safer alternative is an httpOnly cookie, which JS can't read at all — but that comes with real added complexity here: CSRF protection becomes necessary (cookies get sent automatically on every request, even ones you didn't initiate), and cross-origin cookie handling between a separately-hosted frontend and backend needs careful `SameSite`/`credentials` configuration. I chose localStorage for a 72-hour build's simplicity and documented the trade-off in ARCHITECTURE.md rather than pretending it doesn't exist.

**Q: How would this scale if a user had 50,000 tasks?**
`GET /tasks` currently returns the *entire* filtered set with no pagination — `Task.findAll` with no `limit`/`offset`. At 50,000 rows that's a slow query and a huge JSON payload rendered all at once client-side (also a React rendering-cost problem — 50,000 `<TaskCard>`s mounted). The fix is standard: add `limit`/`offset` (or cursor-based pagination for correctness under concurrent inserts) to the query, and either paginate the UI or virtualize the list (e.g., `react-window`) so only visible rows actually mount. Not implemented here because the assignment's scope didn't call for it, but I know exactly where it'd go.

**Q: Why re-hit the database for `req.user` on every request instead of trusting the JWT payload?**
Already covered above — instant revocation on deletion vs. one extra indexed lookup. If pushed further: "what if you had a million requests a second and that lookup became the bottleneck" — the answer is a short-TTL in-memory/Redis cache keyed by user ID, invalidated on user deletion/update, so you get the revocation guarantee back without a DB hit on every single request. Not needed at this app's scale, but the right escalation path to name.

**Q: Why three separate validation layers (Zod/RHF on the client, express-validator on the server, Sequelize model validators)? Isn't that redundant?**
They protect against different things and none of them is optional: client-side validation is about UX (instant feedback, no network round trip for an obvious mistake) and is trivially bypassable (curl, Postman, a patched frontend) so it can never be trusted as the real gate. `express-validator` in the routes is the actual authoritative gate — it runs no matter what client sent the request. Sequelize's model-level validators are the last resort — even a hypothetical second entry point into this code (a script, a background job, a different route added later) that skipped `express-validator` would still be constrained at the point where the row is actually written.

**Q: Explain `asyncHandler` — why does Express need this?**
Express (version 4, what this project uses) doesn't natively await async route handlers or catch their rejected promises. If an `async (req, res) => {...}` function throws inside a `try`-less `await`, that becomes an unhandled promise rejection — Express never calls your error middleware, and depending on Node's config the process could even crash or the request could just hang forever with no response sent. `asyncHandler` wraps every controller in `Promise.resolve(fn(...)).catch(next)`, so any thrown error is funneled into `next(err)` → `errorHandler` middleware → a real HTTP error response. (Worth knowing: Express 5, not used here, fixes this natively — a fair "what would change if you upgraded" follow-up.)

**Q: Why does `getTasks` use `Task.findAll` and not raw SQL for performance?**
At this data scale (a single user's own tasks, indexed on `user_id`), Sequelize's generated query is exactly the same shape a hand-written query would be — `SELECT * FROM tasks WHERE user_id = $1 [AND status = $2] [AND priority = $3] ORDER BY ... `. There's no ORM overhead penalty worth avoiding here; raw SQL would only be justified for genuinely complex queries (multi-table joins, window functions, recursive CTEs) where the ORM's query builder becomes awkward or the generated SQL is provably suboptimal — neither is true for anything in this app.

**Q: What's the actual difference between `401` and `403` in this API, and where would `403` apply?**
This API never returns `403` at all — every authorization failure (wrong password, expired token, accessing another user's task) is `401` or `404`. That's a deliberate simplification for a single-tenant-per-user model where there's no concept of "authenticated but not permitted" (e.g., a regular user hitting an admin-only route) — if roles/permissions were added later, `403` would be the correct code for "you're logged in, but not allowed to do this specific thing," distinct from `401`'s "you're not logged in at all, or your credentials are invalid."

**Q: Why `Promise.all` in the dashboard controller but sequential `await`s everywhere else?**
Because those three queries are independent of each other (none needs another's result first) — that's specifically what makes `Promise.all` safe and beneficial. Everywhere else in the codebase, operations are inherently sequential — e.g., in `updateTask` you must `findOne` the task before you can `.update()` it (you need the row instance to call `.update` on it) — so there's nothing to parallelize.

---

## Part 4 — If they push into "what would you change for production"

Have three ready, in priority order, and be ready to justify the order:
1. **Versioned migrations** (`sequelize-cli`) instead of `sequelize.sync({ alter: true })` — `sync({ alter })` can drop/recreate columns in ways that lose data; it's fine for a fresh dev DB, unacceptable once real user data exists.
2. **httpOnly cookie + CSRF token** instead of localStorage JWT — closes the XSS token-theft gap discussed above.
3. **Pagination on `GET /tasks`** — the unbounded-result-set gap discussed above, the first thing that would actually break under real usage growth.

Naming these unprompted, in this order, with the *reason* for the order (security-adjacent data-loss risk > security gap > scale gap that hasn't hit yet), reads as someone who understands trade-offs rather than someone reciting a checklist.
