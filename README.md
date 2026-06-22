# Meridian Lab — Broken Access Control & IDOR training

A deliberately vulnerable, **domain-pluggable** web app for practicing Broken
Access Control (OWASP A01) and IDOR the way they actually appear in real
applications — UUIDs, sequential business references, reversible tokens, header
quirks, GraphQL, mass assignment — instead of the textbook `/user/123`.

> ⚠️ **Intentionally insecure. Run on localhost only.** Never deploy this or
> expose it to a network. It is a practice target, not production code.

## What "domain-pluggable" means

One engine, three skins. The access-control flaws are identical; only the
business objects change, so you learn the *technique* (the thing that transfers
to real targets), not a specific app.

```bash
npm install

npm run fintech      # NeoBank Console  — statements, account holders
npm run health       # MedPort Portal   — encounters, patients (PHI)
npm run ecommerce    # ShopLab Seller   — orders, customers
# or: MERIDIAN_DOMAIN=health PORT=4000 node server.js
```

Then open **http://localhost:4000** and log in. The exact demo login is printed
in the server console at startup:

| Domain      | Brand           | Login email           | Password        |
|-------------|-----------------|-----------------------|-----------------|
| `fintech`   | NeoBank Console | `alice@northwind.test`| `Sunshine2026!` |
| `health`    | MedPort Portal  | `alice@cedar.test`    | `Sunshine2026!` |
| `ecommerce` | ShopLab Seller  | `alice@acme.test`     | `Sunshine2026!` |

You start as **Alice**, a low-privilege `member` of the *first* tenant. Two
other tenants exist (one of them, "Globex", holds the juicy cross-tenant data).

Object vocabulary changes per domain:

| Engine concept      | fintech        | health           | ecommerce        |
|---------------------|----------------|------------------|------------------|
| billing record      | Statement (STM)| Encounter (ENC)  | Order (ORD)      |
| account / person    | Account holder | Patient          | Customer         |
| shared document     | Document       | Report           | Invoice          |

## How to play

1. Browse the app normally — it only ever calls the *intended* endpoints.
2. Put a proxy in front of your browser (**Burp**) and manipulate the requests.
3. Each flaw, when exploited, yields a flag `MW{...}`.
4. Submit flags on the **★ Missions** page (or `POST /api/scoreboard/submit`).
5. Objectives + hints are in **`MISSIONS.md`**. No walkthrough there.

> Progress (solved flags) is in-memory and **resets when you restart** the
> server. Mutations you make (e.g. promoting yourself) also reset on restart.

## Stuck?

There is a sealed **`SOLUTIONS.md`** with full walkthroughs. It is a spoiler —
open it only when you want the answer. (In tutor mode I won't paste it for you
unless you explicitly ask.)

## Layout

```
server.js              wiring + the edge-gateway middleware
core/
  store.js             in-memory seed data (built from the active domain)
  auth.js              session JWT, unsigned ctx cookie, middlewares
  challenges.js        flag <-> weakness catalog
  routes/              auth, resources (IDOR), admin (vertical/BFLA), graphql, scoreboard
domains/               fintech.js · health.js · ecommerce.js  (the skins)
public/                login + single-page UI
lab-fs/                sandboxed fake filesystem (path-traversal target)
```

## Reset / restart

```bash
# Ctrl-C the server, then start again — fresh data, empty scoreboard.
```
