# How AI was used

AI was used as a pair-programming assistant, not an autopilot. The usual loop was:
ask for a first draft or a diagnosis, then **change or replace** the parts that
were hard to read, wrong for this app, or unsafe — and lean on tests (or a quick
reproduction) to confirm the result before committing. The developer reviewed every
change and made all the commits.

Below are three real cases from this project. Each is visible in the code and the
Git history.

---

## Example 1 — Generating 10,000 fake employees: hand-rolled → Faker

**What I asked.** The seed had grown a custom random-number generator and
hand-written name lists, and it was getting hard to follow. I said something like
*"this seed logic looks very complex and I need to be able to explain it — maybe
Faker would be a better option,"* and asked for a simpler approach.

**What the tool suggested.** Use [`@faker-js/faker`][faker] for the realistic
filler — names and joined dates — with per-country locale instances
(`fakerEN_IN`, `fakerEN_US`, `fakerEN_GB`, `fakerDE`) and `faker.seed(...)` for
repeatable data. Keep the app-specific parts (which countries/currencies exist,
departments, job titles, and the `base × role multiplier × ±15%` salary formula) as
our own code, and delete the custom "avoid duplicate names" logic because Faker's
large name pool makes repeats rare.

**What I changed vs accepted.** Accepted Faker for names and dates. **Kept** the
salary math and reference data as our own code — Faker can't know this app's pay
rules. We iterated a couple of times to reduce repeated names and to guarantee
unique emails (a numeric suffix when a name collides).

**How I verified.** Ran the unit test [`seed/employees.test.ts`][seedtest] (exactly
10,000 rows, stable IDs, identical output on two runs, unique emails, low duplicate
names) and the seed integration test against a throwaway Postgres — both pass.
Reviewed the diff before committing.

## Example 2 — Caching reports in Redis without ever showing stale numbers

**What I asked.** Add Redis caching to the salary-report endpoint as one
self-contained change, with firm rules: Redis optional (via `REDIS_URL`),
**PostgreSQL stays the source of truth**, the app must keep working if Redis is
missing or unreachable, and a committed salary edit must show up in reports as soon
as they're fetched again.

**What the tool suggested.** Instead of finding-and-deleting cache keys on every
edit, keep a one-row **version counter** in PostgreSQL (`report_data_version`) and
put that version in the cache key. Bump the version **inside the same transaction**
as the salary update (and the seed insert). Because the key includes the version, a
change makes the next request build a different key, miss, and recompute — old keys
are just never read again and expire on their own. Fall back to PostgreSQL on any
Redis failure.

**What I changed vs accepted.** Accepted the version-keyed design. Added a guard so
a slow in-flight request only writes to Redis if the version hasn't moved since it
started (so it can't cache stale rows). Used a 60-second TTL and 1-second Redis
timeouts with no offline queue, so a bad Redis fails fast rather than hanging. I
deliberately **did not** add speed numbers because I never benchmarked it — the
decisions doc says so explicitly.

**How I verified.** Wrote unit tests for the cache
([`reports.cache.test.ts`][cachetest]) covering every branch — hit skips the SQL,
miss computes and caches, different filters/grouping get different keys, a new
version recomputes, no write when the version moved mid-request, and Redis
read/write failures (and "unconfigured") fall back to PostgreSQL. Added integration
tests that a **committed** update bumps the version and the report shows the new
figure with the same employee count, while a **rejected** update leaves the version
unchanged. All pass.

## Example 3 — Diagnosing the deployed "Could not load employees" error

**What I asked.** After deploying, the Employees tab was blank and showed *"Could
not load employees. Please try again,"* even though the API health check was fine. I
asked why.

**What the tool suggested.** It traced it to the session cookie: in production the
cookie is marked `Secure` (HTTPS-only), so over plain `http://localhost` the browser
never sends it back. Because login optimistically caches the signed-in user, the UI
*looked* logged in while every API call returned 401. It proposed a `COOKIE_SECURE`
environment override so the production build can be exercised over plain HTTP
locally, while real HTTPS deploys stay secure by default.

**What I changed vs accepted.** Accepted the `COOKIE_SECURE` toggle (defaults to
secure-in-production; set to `false` only for local HTTP testing), and documented it
in `.env.example` and `docs/deployment.md`.

**How I verified.** Reproduced both states with `curl` against the built server —
with the secure cookie, login returned `200` but `/api/employees` returned `401`;
with `COOKIE_SECURE=false`, login `200` and `/api/employees` `200` with rows.

---

## A note on honesty

These three are the cases where I have clear evidence of the prompt, the
suggestion, and the check. Other good decisions were also AI-assisted — the
hand-written migration runner → `node-pg-migrate`, and the hardcoded currency
`CHECK` → a `currencies` lookup table (both in [decisions.md](decisions.md) and the
Git history) — but I've left them out here because I don't want to overstate the
exact back-and-forth from memory. If you'd like either of those written up in the
same format, tell me and I'll add it.

If any detail above doesn't match how you remember it (for example, if a check was
done differently at the time), point it out and I'll correct it.

[faker]: https://fakerjs.dev/
[seedtest]: ../backend/src/seed/employees.test.ts
[cachetest]: ../backend/src/reports/reports.cache.test.ts
