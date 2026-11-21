# Decisions & notes

_Log of the choices we've made and why._

---

## Seeding: Faker for names, custom code for salaries

The seed makes up 10,000 fake employees. It uses **Faker** (`@faker-js/faker`)
for the names and joined dates, and our own code for the parts that are specific
to this app — which countries exist, their currencies, the departments and job
titles, and how salaries are worked out.

We started with hand-written name lists and our own random-number generator, but
the name/repeat/random logic got hard to read and explain. Faker replaced all of
that with one-liners anyone can follow: `faker.seed(...)` for repeatable data,
`faker.person.firstName()` for a realistic name, `faker.date.between(...)` for a
joined date. Because Faker has thousands of names, duplicate full names are rare
on their own — so we deleted the custom code that used to avoid repeats.

**Coherent names per country.** We use Faker's regional versions (`fakerEN_IN`,
`fakerEN_US`, `fakerEN_GB`, `fakerDE`) so Indian employees get Indian names,
German employees German names, and so on. We seed employees for four countries
(India, US, UK, Germany) — all of which Faker has locales for, so the generator
has no special cases. (We dropped Singapore from the sample because Faker has no
Singapore locale; SGD is still a valid currency, just unused by the seed.)

The salary model stays custom because Faker can't know our pay logic:
`country base × role multiplier × a random ±15%`, rounded to a clean thousand.
Emails are built from the name, with a number added if one is already taken, so
every email is unique.

Rule of thumb: **reference data → the database; app-specific data (salaries,
departments) → our own code; realistic filler like names and dates → Faker.**

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
