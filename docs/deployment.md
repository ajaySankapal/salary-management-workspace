# Deployment

How to build and run Salary Workspace in production, where **one Node process
serves both the API and the built React frontend from a single origin**, backed
by a persistent PostgreSQL database.

## How it fits together

- The frontend is built to static files (`frontend/dist`).
- In production, the Express server (`backend/dist`) serves those files **and**
  the `/api/*` routes on the same port. Any non-`/api` path falls back to
  `index.html`, so client-side routes like `/reports` work on refresh. (In dev,
  the Vite dev server serves the frontend and proxies `/api` to the backend.)
- Because it's one origin, the session cookie is first-party — no CORS needed in
  production.
- Sessions and all app data live in **PostgreSQL** (the session table is created
  automatically on first run).

## Environment variables

Set these for the backend process (copy `backend/.env.example` to `backend/.env`
for local use; in a real deploy, set them in the platform's config).

| Variable           | Required | Example                                          | Purpose |
|--------------------|----------|--------------------------------------------------|---------|
| `DATABASE_URL`     | yes      | `postgres://user:pass@host:5432/salary_workspace`| PostgreSQL connection (app data **and** sessions). |
| `SESSION_SECRET`   | yes (prod) | a long random string                           | Signs the session cookie. Keep it secret; changing it logs everyone out. |
| `NODE_ENV`         | yes (prod) | `production`                                    | Turns on the Postgres session store, static frontend serving, the `secure` cookie, and `trust proxy`. |
| `PORT`             | no       | `4000`                                            | Port the server listens on (default `4000`). |
| `COOKIE_SECURE`    | no       | `false`                                           | Overrides the HTTPS-only session cookie. Set `false` only to try the production build locally over plain `http://localhost`; leave unset in a real HTTPS deploy. |
| `REDIS_URL`        | no (set in demo) | `redis://host:6379`                       | Enables the Redis cache for salary reports. **Set this in the deployed demo.** Leave unset to serve reports straight from PostgreSQL. PostgreSQL stays the source of truth; reports keep working if Redis is unset, unreachable, or times out. |
| `DEMO_HR_USERNAME` | no       | `hr@salary.demo`                                  | Username of the seeded demo HR account. |
| `DEMO_HR_PASSWORD` | no       | a password                                        | Password of the seeded demo HR account. |
| `TEST_DATABASE_URL`| tests only | `postgres://…/salary_workspace_test`            | Disposable DB for integration tests. Never the production DB. |

> **HTTPS:** in production the session cookie is `secure`, so the app must be
> served over HTTPS. `trust proxy` is enabled, so terminating TLS at a load
> balancer / reverse proxy in front of the app is fine.

## Commands

Run from the repository root. Install once with `npm install`.

```bash
# 1. Create the database schema (and the session table is auto-created at runtime)
npm run migrate

# 2. Seed reference data, the demo HR account, and 10,000 sample employees
npm run seed

# 3. Build the backend and the frontend
npm run build

# 4. Start the single-origin server (serves the API + the built frontend)
NODE_ENV=production npm run start
```

Then open the server's URL (e.g. `http://localhost:4000`, or your HTTPS domain).

Each command maps to a workspace script: `migrate`/`seed`/`build`/`start` run in
`backend` (build also builds `frontend`). `DATABASE_URL`, `SESSION_SECRET`, and
`NODE_ENV=production` must be present in the environment for `migrate`, `seed`,
and `start`.

## Verifying the production build locally

```bash
npm run build
NODE_ENV=production COOKIE_SECURE=false PORT=4100 npm run start
```

Open `http://localhost:4100` and run the checklist below. `COOKIE_SECURE=false` is
required here because the production session cookie is otherwise HTTPS-only and a
browser won't send it over plain `http://localhost` — login would appear to work
but API calls would return 401 ("Could not load employees."). Never set it in a
real deploy; serve over HTTPS instead.

## Post-deploy checklist (run against the live URL)

Use the demo account (`DEMO_HR_USERNAME` / `DEMO_HR_PASSWORD`, default
`hr@salary.demo` / `salary-demo-123`).

1. **Sign in** — open the URL; the sign-in screen appears. A wrong password shows
   "Incorrect username or password." Correct credentials land on **Employees**,
   with **Sign out** in the top bar.
2. **Find an employee** — search by name or ID, or use the country / department /
   job-title filters. Open an employee to see their details drawer.
3. **Save a salary update** — in the drawer, choose **Update salary record**, enter
   a new amount and a reason, and save. The displayed current salary updates.
4. **View history** — the salary history in the drawer now lists the change
   (previous → new amount, reason, and date).
5. **Check it in Reports** — go to **Salary Reports**, filter/group so the updated
   employee's group is shown, and confirm the count/median/average reflect the new
   amount (reports are per currency).
6. **Sign out** — click **Sign out**; you return to the sign-in screen, and the
   app data is no longer reachable without signing back in.

> Tip: do step 5 right after step 3 with a large salary change in a small group
> (e.g. filter to one country + job title) so the median/average visibly move.
