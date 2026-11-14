# Account Intelligence: thinking doc

Live CRM: https://account-intelligence-crm.vercel.app  ·  Code: https://github.com/srk-ch/account-intelligence-crm

## What it does, and for whom
A Monday-morning briefing for the customer success manager who inherits two accounts (Eastern Counties Police
Alliance, Aldermoor Industrial Group). For each account it answers five questions: what the book is worth, who
holds the power, what to do first, what is about to go wrong, and what we still do not know. It reads its data
live from the Account Quest MCP and keeps itself current.

## How it decides: the rules
1. **Nothing without a source.** Every row cites ids (fact, deal, offer, person, file, or `A/` `B/` paperwork path). Ids are checked against what exists before display, so none can be invented. A click on any id shows what it says and whether it is verified, told, or a claim.
2. **Backed value only.** The book counts a signed order (contract and invoices) plus offers actually won. Pipeline "worth up to" figures are ceilings, shown but not counted. Customer claims (for example "ROI is proven, about 1.2M a year", "the alliance has the budget") are set apart and never added in, with the fact that contradicts them.
3. **A claim never backs a number.** Evidence that is only a claim is dropped from a row's sources.
4. **Moves are ranked, owned and dated.** Ranking is by deadline pressure first (a person leaving, a public event, a contract term ending with no auto-renewal), then by deal value and how unblocked the deal is. Each move names one owner and a date inside the deadline it serves.
5. **Risks are computed, not asserted.** Stale requests (days open, no owner), contract end dates, usage computed from weekly usage (docks that never flew, docks that went quiet), single points of contact, and live events.
6. **Gaps are explicit.** Each unknown says why it matters and who could fill it.

## Staying live
The server watches `get_signals`, `whoami` and `list_notes` (one MCP call per refresh, inside the one-a-minute
limit). A new event is shown at once and flows into the risks, first moves and unknowns. A change to the
account, paperwork or file list queues a re-pull, one call a minute. Notes are written back with `write_note`.
The token lives only in a server environment variable.

## What it does not do yet
- Dock-to-site mapping is not in the data, so usage is per dock, not per force or plant.
- Value is not risk-weighted by probability; ranking is rule-based, not a model.
- Live-event handling matches the wording of known event types; an unfamiliar event is shown and logged as a risk but may not change the plan.
- The live feed shares one call a minute across all visitors.

## How I used AI
Claude (Claude Code) wrote and tested the code and the front end, pulled and read the paperwork, and drafted the
rules above. I directed the design, checked every figure against its source, and decided what counts as backed.
