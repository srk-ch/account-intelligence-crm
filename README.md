# Account Intelligence: live CRM for two accounts

**Live:** https://account-intelligence-crm.vercel.app

A live CRM for two customer accounts (Eastern Counties Police Alliance, Aldermoor Industrial Group). It reads
its data from the Account Quest MCP and answers five questions per account:

1. **What is the book worth?** Backed value only (signed contract + won offers); ceilings and unbacked claims are shown apart and never added in.
2. **Who holds the power?** Per deal: who decides, pays, uses it, could block it, and where each person stands with us.
3. **What do we do first?** Ranked moves, each with an owner, a date and the deal it moves.
4. **What is about to go wrong?** Deadlines, stale requests, quiet docks and live events, with when each turns bad.
5. **What do we still not know?** Gaps the plan rests on, and who could fill each.

Every row carries source ids (fact, opportunity, offer, person, file, or `A/` `B/` paperwork paths). Ids are checked
against what exists before they are shown, so none can be invented; click a chip in the UI to read what is behind it.

## How it works
- `seed/store.json`: everything fetched from the MCP during the build (accounts, schema, paperwork, team, requests, release notes). Personal ids are redacted.
- `live.js`: starts from the seed and lays live reads on top (`get_signals`, `list_notes`), at most one call a minute, the game's per-token limit. Calls are never queued or retried in a way that could break the limit.
- `analysis.js`: turns the data into the five answers. New live events flow into the risks, moves and gaps without a code change.
- `api/crm.js`, `api/note.js`: Vercel functions. `POST /api/note` saves a note back to the game with `write_note`.
- `public/index.html`: the dashboard.
- `dev-server.js`: the same logic as a plain Node server for local use.

## Run locally
Node 20+, no dependencies.

```
cp .env.example .env          # put your token in AQ_TOKEN
node --env-file=.env dev-server.js
# open http://localhost:3000
```

## Deploy (Vercel)
```
vercel deploy --prod
vercel env add AQ_TOKEN production
```
`AQ_TOKEN` is only read in the server functions. It is never sent to the browser and is not in this repository.

## What it does not do yet
- Dock-to-site mapping is not in the source data, so usage is shown per dock, not per force or plant.
- The live feed refreshes about once a minute; several simultaneous visitors share that budget.
- Move dates are relative to today and the deadlines on file; they are not yet recalculated per owner's calendar.
