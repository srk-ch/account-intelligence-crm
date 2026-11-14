# Account CRM (Account Quest)

A live CRM for two customer accounts (Eastern Counties Police Alliance, Aldermoor Industrial Group).
It reads its data from the Account Quest MCP and answers five questions per account:

1. What is the book worth? (backed value with sources; unbacked claims shown apart, never added in)
2. Who holds the power? (decides / pays / uses / could block, and standing)
3. What do you do first? (ranked moves with owner, date, deal)
4. What is about to go wrong? (deadlines, stale requests, quiet docks, live events)
5. What do you still not know? (gaps and who could fill them)

Every row carries source ids (fact ids, opportunity ids, files, or `A/` `B/` paperwork paths). Ids are
checked against what actually exists before they are shown, so none can be invented.

## How it works
- `mcp.js` calls the MCP, one call a minute (the per-token limit).
- `ingest.js` fetches accounts, schema, paperwork, team, feature requests and release notes **once** into
  `data/store.json`, then keeps re-reading `get_signals`, `whoami` and `list_notes`.
- `analysis.js` turns the stored data into the five answers. Live events (signals) are added to the
  risks, moves and gaps automatically, with no code change.
- `dev-server.js` serves the page, `/api/crm`, `/api/health`, and `POST /api/note` which saves notes back to
  the game with `write_note`.

## Run
Needs Node 20+ and no dependencies.

```
cp .env.example .env     # put your token in AQ_TOKEN (Build > Connect > Show my token)
node --env-file=.env dev-dev-server.js
# open http://localhost:3000
```
The first start fetches everything (about 10 minutes at one call a minute); the page fills in as data
arrives and refreshes itself every minute.

## Deploy
Any Node host (Render, Railway, Fly). Start command `node dev-dev-server.js`. Set `AQ_TOKEN` as a server
environment variable. The token is only read on the server and is never sent to the browser or stored in
this repository.
