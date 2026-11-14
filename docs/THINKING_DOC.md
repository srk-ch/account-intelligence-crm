# Account Intelligence: thinking doc

Live CRM: https://account-intelligence-crm.vercel.app  ·  Code: https://github.com/srk-ch/account-intelligence-crm

## What it does, and for whom
A Monday-morning briefing for the customer success manager who inherits three accounts (Eastern Counties Police Alliance, Aldermoor Industrial Group, and Kestrel Estates, which arrived mid-build with paperwork only). For each it answers five questions: what the book is worth, who holds the power, what to do first, what is about to go wrong, and what we still do not know. It reads live from the MCP and keeps itself current. The reader will challenge every number, so nothing on the page may be a guess dressed as a fact.

## How it decides: the rules, and why
1. **Backed value only.** The book counts a signed order plus offers actually won (£455,000 and €140,000). Pipeline "worth up to" values are ceilings, shown but never counted. *Why:* the brief calls a total copied from a champion weak, and in discovery the claims fell apart: Stefan's "€1.2M saved" is his own spreadsheet with no saving booked; Rhys's "the alliance has the budget" is contradicted by "no pooled budget, each force's CFO signs its own call-off". Claims are set apart beside the fact that contradicts them.
2. **Every row cites ids, and the ids are checked.** A claim never backs a number, and a row with no source says so in red. A click shows the fact and whether it is verified, told or a claim.
3. **Rules, not a model.** A manager can read a rule and a judge can check it; a model could invent. The cost is flexibility.
4. **Deadlines rank the moves.** A person leaving, a public event, or a contract ending with no auto-renewal outranks deal size because those cannot move. Each move has one owner and a date inside its deadline.
5. **Risks are computed from the paperwork:** request age, contract ends, weekly usage (18 of 35 docks flew in the last four weeks), single points of contact, live events.
6. **Gaps are explicit:** each unknown says why it matters and who could close it.

**Staying live.** One MCP call per refresh, never faster than the one-a-minute limit, watching events, `whoami` and notes. A new event shows at once and changes the risks, moves and unknowns; a change in the data queues a re-pull. Notes go back with `write_note`. The token lives only in a server variable.

## What it does not do yet
- Dock-to-site mapping is not in the data, so usage is per dock, not per force or plant. The third account has no discovery export, so its plan comes from paperwork alone and is less certain than the other two.
- Ranking is rule-based, not weighted by probability; move dates are my targets, only contract ends and event dates are fixed.
- Live-event handling recognises known wording; an unfamiliar event is shown and logged as a risk but may not change the plan.
- The live feed shares one call a minute across visitors.

## How I used AI
Claude (Claude Code) did most of the work under my direction: it played the discovery game in the browser, read the paperwork, wrote and tested the code and built the front end. I set the judgement calls: only paperwork-backed value counts, the page is light and editorial, which designs to follow, and what to cut. I checked the figures against their sources. The game's own debrief scores some deals differently (the renewal at $320,142); I kept the figures I can prove from a file.
