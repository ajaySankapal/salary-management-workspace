# Salary Workspace — Requirements

Stack and design choices are kept out of this doc and go in the design notes._

## The problem
An HR manager looks after salary data for about 10,000 employees across several
countries. Right now it all sits in spreadsheets. That makes it slow to find one
person, easy to break a cell by accident, and hard to answer simple pay questions.

This app does three things for that one HR user: help them **find** a record,
**keep it up to date**, and **answer pay questions** about the organization.

## What "salary" means
Salary here is **annual base pay**. It does not include bonus, equity, or
benefits. We store it as a plain whole number in the **employee's own currency**
(for example, an India salary is stored in rupees).

## The currency decision
We keep and show money in local currency, and we work out every statistic
**separately per currency**. We do not convert between currencies in v1.

The reason: converting needs an exchange rate and a date to use it on, and a
slightly wrong rate would quietly skew every number. Showing each result in its
own currency is honest, and it is exactly what the cross-country question needs —
"the same role in different countries, each in its local currency."

## The three workflows

### 1. Find an employee
HR searches by name or employee ID and filters by country, department, and job
title. The search and filters run over the **whole dataset first**, and only then
the results are split into pages by the server.

**It works if:** HR filters to India and Engineering and sees only India
Engineering people, a total count for that filtered set, and one page of them.
Going to the next page keeps the same filter and never shows someone outside it.

### 2. Keep a salary up to date
On a person's page, HR sees their current salary and currency. HR types in a
**new amount** and a short **reason**. This is a number HR already knows, and it
**takes effect the moment it is saved**. The history below shows the old amount,
the new amount, the reason, and the date.

**It works if:** after saving, the salary at the top changes to the new amount,
and a new history row shows the old amount, the new amount, the reason, and
today's date. The amount that was current a second ago now sits just below as the
previous entry.

### 3. Answer pay questions (reports)
HR filters by country, department, and job title, then **groups by one** of them.
For each group, HR sees the **number of employees, the median, and the average**
annual base pay, shown **per currency**.

**It works if:** grouping by department with country set to India gives one row
per department, each showing a count, a median, and an average in rupees, and the
counts on all the rows add up to the number of people in the filtered set.

## The questions this should answer
- What is the typical salary for software engineers in India?
- How does pay vary by department in India?
- What does the same role look like across different countries, each in its own
  currency?

Because the numbers are always worked out per currency, these answers never
quietly mix one currency into another.

## What we are not building yet, and why
- **Excel import** — we can prove the whole app with a repeatable set of 10,000
  made-up employees. A real importer means reading messy files, matching columns,
  and handling every bad row, which is a sizeable project on its own and would
  hold up the three main workflows.
- **Payroll** — actually paying people brings in money transfers, tax, and
  compliance, which is a much bigger and riskier thing than "write down a number
  HR already has." v1 is a place to **record** base pay, not to pay it out.

Also left for later: approvals, future-dated changes, and currency conversion.

## Assumptions we are going with (so the build can start)
- **One currency per country.** It keeps the data and the per-currency
  statistics simple, and it matches how the sample data is generated. If a
  country ever needs more than one currency, the per-currency rule already covers
  it, so nothing has to be redesigned.
- **Sample countries:** India (INR), United States (USD), United Kingdom (GBP),
  Germany (EUR), and Singapore (SGD). Five countries give a good spread of
  currencies for the cross-country reports without making the sample data noisy.
- **The current salary is simply the latest saved amount.** It is the easiest
  rule to explain and leaves a clear history trail; reports always use this one
  current amount per person, never the old history rows.
- **Median with an even count** is the average of the two middle values. This is
  the ordinary meaning of median and keeps the reports predictable.
- **A valid amount is a whole number greater than zero, and a reason is
  required.** This blocks obvious mistakes (blank, negative, or zero pay) without
  guessing at a realistic salary ceiling, which would only get in HR's way.
