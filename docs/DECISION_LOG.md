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
