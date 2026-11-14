# Decision log: what I decided, and why

Use this to answer "why did you do it that way?" in the live walkthrough. Each entry: the choice, what I rejected,
why, and the cost.

## A. Discovery (the morning)
| Decision | Why | Result |
|---|---|---|
| Introduce myself with a question about the person's job, not a pitch | The rules say pushy or early pitches cost trust; Karen and Fatima both opened up once I asked what they needed | Karen and Rhys reached Ally |
| Ask Fatima exactly what the data-flow documents must cover, then own the four-month silence ("that's on us") | The real blocker was ours: her support-desk request was never answered. Reassurance would not move her; a firm owner and a date would | Tarn Valley blocker cleared |
| Go to Pranjal, then SRV, with a customer, a problem and a reason | Neel's rule: colleagues help when asked with specifics. SRV committed engineering only when I owned the chase | Engineering wrote the pack |
| Prepare a *dated delivery plan* for Tarn Valley, a *cost per flight comparison* for Westmere, a *usage report* for the renewal | Each blocker needs a different kind of proof for the person who signs; the deal text said what kind | Three blockers cleared |
| Trim evidence to what bears on the blocker | "Extras count against you": two sends came back "some of it does not belong" until I removed claims and unrelated notes | Cleared on the second try |
| Propose the renewal on "what's flying, with a plan for the rest" in the meeting | The honest middle: not "renew everything", not "wait for the tender" | Renewal agreed ($350k) |
| Offer operator training only after Karen described her staffing; priority support only after she trusted me | Offers land only once trust and need are established; too early costs trust | $105k won |
| Stopped when two Aldermoor sends were rejected | Owen needed to see who owns the exceptions, which I could not show; Stefan's deputy could not be reached | Honest miss: Aldermoor idle plants not closed |

## B. What counts as "backed" (the most important decision)
- **Counted:** signed contract plus paid invoices, plus offers actually won.
- **Not counted:** "worth up to" ceilings; open offers; every customer claim.
- **Why:** the brief's weak example is "one big total copied from what a champion said". Stefan's €1.2M is his own spreadsheet with no booked saving. Rhys's "all four forces keen" is contradicted by usage (Tarn Valley has never flown live).
- **Rejected:** showing the game's own debrief figures ($768,082 book; renewal $320,142). They are scoring values I cannot trace to a file, so a manager could not check them.
- **Cost:** the headline number looks smaller than the pipeline. I show the pipeline separately so the upside is still visible.

## C. How the CRM decides
- **Rules not a model:** explainable and checkable; a model could invent. Cost: less flexible.
- **Deadline-first ranking:** things that cannot move (a person leaving, a public event, a contract ending) outrank bigger but movable deals. Each move: one owner, one date inside the deadline.
- **Live events change the plan:** Karen's request becomes move 1 due in 3 days ("this week"); Rhys leaving adds "name a successor" due in 10 days.
- **Matching events to their own account:** I found a bug where an Eastern Counties event altered Aldermoor's plan; events are now scoped to their account.
- **Gaps from the data:** the profile lists exactly who and what is "not on file" (dock-to-site mapping, finance contacts, the deputy's name); I turned those into unknowns with a person to ask.

## D. Engineering
- **Fetch once, store, re-pull on change.** The brief's rule. The seed bundles everything fetched, so the page works at once. `whoami` and `get_signals` act as change detectors that queue re-pulls of accounts, paperwork and files.
- **One call a minute, never queued in a serverless function.** `tryCall` refuses instead of waiting, so a page request never hangs. Cost: the live feed is shared across visitors.
- **Token server-side only.** Vercel environment variable; not in code, repo or browser. The player id is redacted from the bundled data because it is the first part of the token.
- **No dependencies.** Plain Node and static HTML: nothing to break at the last minute.
- **Fetched the contents of all 8 data-room files**, not just their titles, so receipts show the real text.
- **Bugs I found and fixed by testing:** a blank root page on Vercel (my local server file was mistaken for the app); a regex that shipped broken for a few minutes and was repaired; the cross-account event bug; a clipped tooltip; a phone-width overflow.

## E. Design
- **Light, editorial first, then the reference designs you chose.** You asked for light mode and not an "AI look", so no gradients-on-cards dashboard. The second and third references set the pipeline board, the pill navigation, the glass panels and the deal sheet.
- **Receipts everywhere:** click any id to read the fact and see whether it is verified, told or a claim. This answers "show me where that number came from" without leaving the page.
- **A one-sentence summary and a "do this first" card at the top:** a manager reading on Monday gets the point in ten seconds.
- **Avatars are initials, not photos:** I will not invent faces for real people.

## F. Things I would say if challenged
- *"Why is your book smaller than the game's?"* Because only paperwork-backed value counts; I can show the file behind every pound.
- *"Is this AI-generated?"* Yes: built with Claude Code under my direction. I set the rules, checked the numbers and chose what to cut.
- *"What would break it?"* An event type whose wording the rules do not recognise (it still shows and logs a risk); and the shared one-call-a-minute feed under heavy traffic.
- *"What is not proven?"* Move dates are my targets; only the contract end and event dates are fixed in the data. Saving a note back to the game was not tested.

## G. The third account, Kestrel Estates (released mid-build)
- **Thought process:** the announcement said the new account's data is reachable "if your MCPs were connected the right way". That is a test of whether the build is wired to the feed or hard-coded to two accounts. So I did not hand-add Kestrel; I made the CRM find it.
- **Decision: retrieve automatically.** `whoami` lists `new_accounts`; the CRM queues `get_new_account`, the paperwork, and every file by itself, one call a minute. I tested it by removing Kestrel from the store and watching it return in about six minutes. *Rejected:* a manual "fetch Kestrel" script, because the next surprise account would need me again.
- **Decision: use the export, not only paperwork.** The export carries people, facts, deals, offers and files, so Q1 to Q5 are built from verified facts (`export_account.js`), not a thin fallback.
- **What the facts decided:** booked contract £14,000 is the backed value; the go-live ceiling and the unpriced south dock are shown but not counted; "everyone is excited" is a claim set beside a dock that has never flown.
- **Move order, by what cannot move:** no certified pilot and the insurer not told (policy requires notice before use) block any flight, so: dated go-live plan, insurer notification, certification course, then a one-pager for the residents' board before its first-Monday vote.

## H. The Ideas section: what I built and what I left out
- **Read it as optional:** "pick one or two and do them well". I did not treat the list as a checklist.
- **Built:** power map with champion and "waiting on"; people going cold (no contact over 45 days); each move shows worth and how many of its facts are verified; a Draft request writer that produces the internal message with owner, date and evidence, plus Copy.
- **Left out on purpose:** a chance-of-success score. The data holds no outcomes to calibrate against, so any percentage would be invented, which breaks my own rule that nothing is a guess dressed as a fact. Ranking stays deadline and evidence. Also not built: customer-facing proposal drafts, because a draft that leaves the building needs a person's review, and I will not claim that.
- **Fix found in testing:** the draft's recipient was parsed as a whole phrase ("Neel for training capacity..."); it now stops at the name.

## I. Presentation and hygiene decisions
- **Authorship:** commits are authored by srk-ch only; the repo was recreated once to remove a stale contributor, with your approval. I also dropped my own co-author trailer for the same reason.
- **Docs:** the one-page thinking doc is kept to what it asks (what, for whom, how it decides, what it does not do, how AI was used); this log holds the longer reasoning.
- **Known untested:** saving a note via `write_note` (it writes to the real game); phone, print and other browsers.
