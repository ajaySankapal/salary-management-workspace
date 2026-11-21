# Decisions & notes

_Log of the choices we've made and why._

---

## Seeding: inline name lists, not Faker

Right now the seed makes up 10,000 fake employees using small lists of first and
last names written directly in the code (`backend/src/seed/employees.ts`), plus
our own country/department/job-title tables. We are **not** using Faker.

Why not Faker? A few reasons:

- The only thing Faker would really do for us is give fancier names. The parts
  that actually matter — which countries exist, the departments and job titles,
  and how salaries are calculated — are specific to this app and have to stay
  custom anyway (otherwise the salary reports wouldn't make sense). So Faker
  would only replace a line or two.
- We want the seed to be easy to read and explain. A short list of names right
  there in the file is about as clear as it gets.
- We want the same data every run (so tests and demos are predictable). Our
  little random generator is seeded with a fixed number, so it always produces
  the same people. Faker can do this too, but then it's a dependency doing what
  our few lines already do.
- We've already had npm trip over itself a couple of times during installs.
  Adding another package just for prettier names isn't worth the risk here.

When *would* Faker be the right call? If we needed lots of varied, realistic
fake data across many fields (emails, addresses, phone numbers, company names),
or if name variety really mattered. For 20-ish names feeding a salary model,
inline is simpler and does the job.

Rule of thumb we're following: **reference data → the database; small controlled
fake data → inline in the seed; large, varied, realistic fake data → Faker.**

## Seeding: our own tiny random generator

Salaries and the random picks use a small seedable random-number function (a
"linear congruential generator"). Plain JavaScript's `Math.random()` can't be
given a fixed starting point, and we need the seed to be repeatable, so we have
our own one-liner formula. We briefly used a fancier generator (mulberry32) but
swapped it for the simpler one because it's much easier to explain, and for
making up demo data the quality difference doesn't matter.

## Seeding: re-running never clobbers edits

The seed inserts employees with "do nothing if this ID already exists." So if HR
edits someone's salary and we run the seed again, the edit stays. The seed only
fills in people who are missing. The current salary lives on the employee row;
`salary_history` is a separate log for later.

## Backend structure: routes → controller → repository

We keep each feature in its own folder (e.g. `backend/src/employees/`) split into
three small files, instead of putting everything in `app.ts`:

- **routes** (`*.routes.ts`) — just maps URLs to handlers, nothing else.
- **controller** (`*.controller.ts`) — reads the request, validates input, calls
  the repository, and sends the response.
- **repository** (`*.repository.ts`) — the database access (the SQL).

`app.ts` only sets up middleware, mounts the routers, and wires the error
handler. This keeps each file short and easy to find, and it's the normal shape
for an Express app, so new features follow the same pattern.

A couple of conventions inside these layers:

- Repositories don't fetch the connection themselves. The db module
  (`db/pool.ts`) owns the shared pool and exposes a small `query()` helper, so a
  repository just calls `query(sql, params)` — no pool plumbing in each function.
- Controllers put the result in a named variable before sending it, e.g.
  `const result = await listEmployees(page); res.json(result);` rather than
  `res.json(await ...)`. It reads better and is easier to debug.

Errors are handled in one place: routes are wrapped so any thrown error reaches a
single error middleware (`errors.ts`), which turns it into a JSON response. A
route signals a specific status by throwing `new HttpError(400, '...')`; anything
unexpected becomes a 500.

## Database: plain `pg`, not an ORM

We talk to Postgres with the `pg` driver and write SQL ourselves, instead of
using an ORM like Prisma, Sequelize, or TypeORM. The heart of this app is the
salary reports — medians and averages, grouped and split by currency — and that
kind of thing is clean and clear in SQL but awkward through an ORM (you often
end up writing raw SQL inside the ORM anyway for the hard parts). It also keeps
the code transparent: the query that runs is right there in the file. ORMs are
great for CRUD-heavy apps; this one is query-heavy, so raw SQL fits better.

## Migrations: node-pg-migrate, not a hand-written runner

At first we hand-wrote a little script to run our `.sql` files. It worked, but it
kept growing (tracking what's run, ordering, etc.), so we switched to
**node-pg-migrate**, which is the standard migration tool for Node + Postgres.
It handles ordering, "run each migration once," and locking for us, so we don't
maintain that ourselves. It's a migration tool, not an ORM — we still write
plain SQL in the migration files.

Commands: `npm run migrate` to apply, `npm run migrate:down` to undo the last one.

## Currencies: a lookup table, not a hardcoded list

Early on, the allowed currencies were a fixed check right on the employees table
("currency must be one of INR/USD/..."). We moved to a small `currencies` table
that the employee row points at (a foreign key). Now adding a currency is just
inserting a row — no schema change — and the database still rejects anything
that isn't a real, known currency. Best of both: flexible *and* safe. (This is
also when we added SGD for Singapore.)

The actual list of currencies lives in the app code
(`backend/src/data/currencies.ts`) as the single source of truth, and the seed
loads it into the table. We deliberately keep this data *out* of the migration —
migrations describe structure, the seed puts data in.

## Salary: exact decimals, stored in local currency

Salary means annual base pay. We store it as an exact decimal (`numeric(12,2)`),
not a floating-point number, so money math is never slightly off. Each amount is
in the employee's own currency, and we calculate statistics separately per
currency. We do **not** convert between currencies — a wrong exchange rate would
quietly distort every report, and showing each result in its own currency is
honest and is exactly what the "same role in different countries" question needs.

## Tests: real database for schema/seed, fake-free

For the schema and seed we run **integration tests against a real, throwaway
Postgres database** (pointed at `TEST_DATABASE_URL`, never the app database).
They run the actual migration and check the real constraints, so we're testing
what we'll really ship. There's a guard so these tests can't accidentally touch
the app database. The plain unit tests (no database needed) cover the pure logic,
like the employee generator.

One day, if this goes to CI, the cleaner setup is a throwaway Postgres per run
(e.g. a CI service container or Testcontainers). For now, a local test database
created once is enough.

## Local setup bits worth remembering

- Postgres runs locally via Homebrew (`postgresql@16`).
- Connection strings live in `backend/.env` (git-ignored, so no secrets in Git);
  `backend/.env.example` shows the shape.
- Setup order on a fresh machine: create the databases → `npm run migrate` →
  `npm run seed`.

## Possible enhancement: cursor pagination

Right now the employees list uses "offset" pagination — page 1 is the first 25
rows, page 2 skips 25 and takes the next 25, and so on (`LIMIT 25 OFFSET ...` in
SQL). This is simple and perfectly fine for our 10,000 rows.

The catch with offset is that the database still has to walk past all the rows
before the page you asked for. Page 2 skips 25 rows, but the last page skips
almost 10,000 before handing back the final few. So the deeper the page, the more
work the database does, even though you only get 25 rows back. At our size this
is not noticeable, but on much bigger tables it gets slow, and rows can also
shift between requests (if someone adds an employee, "page 2" can show a row you
already saw).

The fix for that is **cursor (a.k.a. keyset) pagination**: instead of "give me
page 5," the client says "give me the next 25 after this employee" — using the
last row we saw as a bookmark (here that would be the last name + id, since
that's our sort order). The query becomes roughly:

```
WHERE (name, id) > (lastName, lastId)
ORDER BY name, id
LIMIT 25
```

Because the database jumps straight to that spot (using the index) and reads 25
rows, it stays fast no matter how deep you go, and it doesn't double-show rows
when data changes.

The trade-off: cursor pagination is "next / previous" style. You can't jump
straight to an arbitrary page number like "page 50" or show "page 5 of 400",
because there's no offset to count — you only ever move relative to where you
are. It's a great fit for infinite scroll or very large lists.

For this app we're keeping offset pagination (simpler, and 10k rows is small).
Cursor pagination is noted here as the upgrade path if the dataset grows a lot or
we switch the UI to infinite scroll.

## Small known annoyances (not bugs)

- `node-pg-migrate` pulls in a dev-only package with a moderate security notice.
  It never runs in the real app, and the "fix" is a breaking downgrade, so we're
  leaving it.
- A couple of times, installing a new package made npm quietly drop a build
  helper (esbuild) that `tsx` needs. Regenerating the lockfile fixes it. Once we
  commit a known-good lockfile it should settle down.
