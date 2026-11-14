# Account Intelligence: thinking doc

Live CRM: https://account-intelligence-crm.vercel.app  ·  Code: https://github.com/srk-ch/account-intelligence-crm

## What it does, and for whom
A Monday-morning briefing for the customer success manager who inherits two accounts (Eastern Counties Police
Alliance, Aldermoor Industrial Group) and has to act on them. For each account it answers five questions: what the
book is worth, who holds the power, what to do first, what is about to go wrong, and what we still do not know.
It reads live from the Account Quest MCP and keeps itself current. The reader is a manager who will challenge every
number, so the design goal is that nothing on the page can be a guess dressed up as a fact.

## How it decides: the rules, and why
1. **Backed value only.** The book counts a signed order (contract and paid invoices) plus offers actually won: £455,000 for Eastern Counties, €140,000 for Aldermoor. *Why:* the brief marks "one big total copied from what a champion said" as weak. In discovery both customers' headline claims fell apart (Stefan's "€1.2M saved" is his own guard-hours spreadsheet with no contract reduced and no saving booked; Rhys's "the alliance has the budget" is contradicted by "no pooled budget, each force's CFO signs its own call-off"). Pipeline "worth up to" values are ceilings, shown but never counted. Claims are set apart with the fact that contradicts them.
2. **A claim never backs a number.** If a deal's evidence is only a claim, it is dropped from the row's sources. *Why:* the judging rule is "nothing rests on a claim alone".
3. **Every row cites ids, and the ids are checked.** Sources are filtered against what actually exists, so none can be invented; a row with no source says "no source" in red instead of hiding. A click shows the fact, whether it is verified, told or a claim.
4. **Rules, not a model.** Ranking and risk are deterministic rules. *Why:* a manager can read the rule and a judge can check it; a model would be harder to defend and could invent. The cost is that it is less flexible (see below).
5. **Moves are ranked by deadline first.** A person leaving, a public event, or a contract ending with no auto-renewal outranks deal size, because those cannot be moved. Each move has one owner and a date inside the deadline it serves.
6. **Risks are computed from the paperwork:** request age with no reply, contract end dates, usage from the weekly logs (18 of 35 docks flew in the last four weeks; 8 went quiet), single points of contact, and live events.
7. **Gaps are explicit:** each unknown says why it matters and who could close it.

## Staying live
The server watches `get_signals`, `whoami` and `list_notes`, one MCP call per refresh, never faster than the
one-a-minute limit. A new event shows at once and flows into the risks, first moves and unknowns. A change to the
accounts, paperwork or files queues a re-pull, one call a minute. Notes are written back with `write_note`. The
token lives only in a server environment variable. *Why this way:* fetch-once-and-store is the brief's rule, and a
bundled snapshot means the page works instantly even before the live feed answers.

## What it does not do yet
- Dock-to-site mapping is not in the data, so usage is per dock, not per force or plant.
- Ranking is rule-based, not weighted by probability of success.
- Live-event handling recognises the wording of known event types; an unfamiliar event is shown and logged as a risk but may not change the plan.
- The live feed shares one call a minute across all visitors.
- Move dates are my proposed targets; only the contract ends and event dates are fixed in the data.

## How I used AI
I used Claude (Claude Code) throughout, and I want that to be clear. It played the discovery game in the browser
under my direction, pulled and read the paperwork, wrote and tested the code, and built the front end. I set the
direction and made the judgement calls: that only paperwork-backed value counts, that the page is light and
editorial, which reference designs to follow, and what to cut. I checked the figures against their sources. The
game's own debrief scores some deals differently (for example the renewal at $320,142); I kept the paperwork-backed
figures because those are the ones I can prove.
