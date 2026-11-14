# Account Intelligence: thinking doc

Live CRM: https://account-intelligence-crm.vercel.app  ·  Code: https://github.com/srk-ch/account-intelligence-crm

## What it does, and for whom
A Monday-morning briefing for the customer success manager who inherits three accounts (Eastern Counties Police Alliance, Aldermoor Industrial Group, and Kestrel Estates, released mid-build). For each it answers five questions: what the book is worth, who holds the power, what to do first, what is about to go wrong, and what we still do not know. It reads live from the MCP and keeps itself current. The reader will challenge every number, so nothing on the page may be a guess dressed as a fact.

## How it decides: the rules, and why
1. **Backed value only.** The book counts a signed order plus offers actually won (£455,000, €140,000, £14,000). Pipeline "worth up to" values are ceilings, shown but never counted. *Why:* a total copied from a champion is the weak answer, and in discovery the claims fell apart: Stefan's "€1.2M saved" is his own spreadsheet with no saving booked; Rhys's "the alliance has the budget" is contradicted by "each force's CFO signs its own call-off"; Kestrel's "everyone is excited" sits beside a dock that has never flown. Claims are set apart beside the fact that contradicts them.
2. **Every row cites ids, and the ids are checked.** A claim never backs a number; a row with no source says so in red. Click an id to read the fact, file or email behind it and whether it is verified, told or a claim.
3. **Rules, not a model.** A manager can read a rule and a judge can check it; a model could invent. The cost is flexibility.
4. **Deadlines rank the moves.** A person leaving, a public event, a board vote or a contract ending outranks deal size, because those cannot move. Each move has one owner and a date inside its deadline, plus its worth and how many of its facts are verified. A "Draft request" button writes the internal message with the owner, date and evidence.
5. **Power and risk come from the record:** who decides, pays, uses, blocks and champions each deal and what it is waiting on; request age, usage (18 of 35 docks flew in four weeks), people going cold, contract and board dates.
6. **Gaps are explicit:** each unknown says why it matters and who could close it.

**Kestrel, decided from its facts.** The dock cannot fly: no certified pilot, never commissioned, and the insurer has not been told (the policy requires notice before use). So the first moves are a dated go-live plan, insurer notification, then certification, and a one-pager for the residents' board before its first-Monday vote.

## Staying live, with no code change
One MCP call per refresh, never faster than the one-a-minute limit, watching events, `whoami` and notes. A new event shows at once, with its dates and records, and changes the risks, moves and unknowns. When `whoami` lists a new account, the CRM pulls its export, paperwork and files by itself (tested: Kestrel was removed and re-found within about six minutes). Notes go back with `write_note`. The token lives only in a server variable.

## What it does not do yet
- No chance-of-success score: the data does not support an honest number, so ranking is by deadline and evidence.
- The draft writer drafts internal requests, not customer proposals.
- Dock-to-site mapping is not in the data, so usage is per dock. Move dates are my targets; contract, board and event dates are fixed.
- Live-event handling recognises known wording; an unfamiliar event is shown and logged as a risk but may not change the plan. The feed shares one call a minute across visitors.

## How I used AI
Claude (Claude Code) did most of the work under my direction: it played the discovery game in the browser, read the paperwork, wrote and tested the code and built the front end. I set the judgement calls: only paperwork-backed value counts, the page is light and editorial, which designs to follow, and what to cut. I checked the figures against their sources. The game's debrief scores some deals differently (the renewal at $320,142); I kept the figures I can prove from a file.
