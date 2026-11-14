# Handoff: Account Quest CRM (continue in Claude Code CLI)

Paste this to Claude Code: "Read HANDOFF.md and finish the build. Start with section 6."

## 1. Situation
- Event: Account Quest, https://questathon.aihackerscollective.com (player is a solo CSM "Kartheek" for two accounts).
- Discovery is done. Final discovery state: closed $455,000 (alliance renewal $350k, priority support $60k, operator training $45k), Insight 150.
- Now in the **Build** phase. Hand in by **03:47**. Hand-in is four links, entered by the human in the game's Build > Hand in tab:
  1. Live CRM link (hosted, works in a private window, covers both accounts)
  2. Public GitHub repo (README with how to run, no token in code)
  3. Thinking doc (one page, Google Doc: what it does and for whom, the rules it decides by, what it does not do yet, how AI was used)
  4. Walkthrough video (3 min, Google Drive: five answers for one account, one number traced to its source, it picking up something new, the code briefly)
- Claude cannot do items 3 and 4 or the final submit. The human does those.

## 2. What the CRM must answer, per account (A and B)
1. What is the book worth? Each deal at a value you can back, with file/person behind it. Unbacked value shown apart (never summed in).
2. Who holds the power? Per deal: decides, pays, uses, could block, and standing with us.
3. What do you do first? First 3 moves, ranked, each with owner, date, and the deal it moves.
4. What is about to go wrong? Deadlines at risk, people going cold, stuck deals, and when each turns bad.
5. What do you still not know? Gaps the plan rests on, and who could fill each.

Judging: every number cites an id; nothing rests on a claim alone; no invented ids; moves are ranked, owned, dated inside every deadline; honest about gaps; stays live (takes in new data itself, writes notes back with write_note).

Rules: never show a number without its source; never invent an id/fact/person; solo; keep token server-side only; one MCP call per minute per token; fetch once and store.

## 3. Code state (this folder, own git repo, branch inside parent repo was feat/account-quest-crm)
Zero-dependency Node (>=20) app.
- `mcp.js`: MCP client, serial queue, 62s gap, token from `process.env.AQ_TOKEN`.
- `store.js`: JSON store `data/store.json`; `once(key,tool,args)` caches, `refresh()` re-reads live data.
- `ingest.js`: `bootstrap()` fetches accounts, schema, paperwork_A/B (get_all_paperwork), team, feature_requests, release_notes once; `liveLoop()` cycles get_signals, whoami, list_notes. NOTE: liveLoop does the 3 live reads before bootstrap. Better: bootstrap first, then live.
- `server.js`: routes `/`, `/api/crm`, `/api/health`, `POST /api/note` (calls write_note). Starts `liveLoop()` if AQ_TOKEN set.
- `analysis.js`: **STUB**. Must implement `buildCrm(store)`.
- `public/index.html`: DONE front end. It expects the `/api/crm` shape in section 5.
- `.gitignore` has `.env`, `data/`. `.env` holds `AQ_TOKEN` (human: Build > Connect > Show my token). `.env.example` exists.
- `data/store.json` already contains a full ingest (accounts, schema, paperwork A and B, team, feature requests, release notes, signals=[], whoami, notes=[]). Copy `data/` along if you want to skip the ~10 min ingest; otherwise delete it and rerun.
- Run: `node --env-file=.env server.js` (port 3000).

## 4. Data shape (verified from the stored export)
`accounts` = `{format, player, exported_at, minute, world_closed, accounts:[...], files:[...]}`
Per account: `id, name, official_story, stakeholders[{id,name,role,relationship(guarded|neutral|warm|ally),available}], facts[{id,text,said_by,status(claim|told|verified),verified_by?,learned_at_minute}], opportunities[{id,title,stage,worth_up_to,size,blocker{text,status},evidence[ids],deadline}], offers[{id,title,value,pitch_to,status(won|open)}], deadlines[{text,passed}]`.
`files` = `[{id,title,path,account}]` (e.g. flight_log_force_month, support_ticket_history, helicopter_cost_overtime, dataflow_pack for A; roi_spreadsheet, insurer_premium_letter, plant7_checklist, network_plan for B). Fetch content with `get_file {id}` only if needed (1 call/min).
Paperwork `records` array of `{path, kind, text|data}`: calls/*.txt, calls_index.json, contract.txt, deal_history.json, device_events.csv, devices.json, emails/*.txt, flights.csv, internal_notes.json, invoices.json, mail_log.json, profile.json, requests.csv, tickets.json, usage_weekly.csv (week_start,dock_id,flights,days_online), users.json.
Ids you may cite: fact ids, opportunity ids, offer ids, stakeholder ids, file ids, paperwork paths. Filter every `sources` array through a known-id set so no id is ever invented.

Stage vocabulary seen: identified, qualified, agreed. A: a_renewal=agreed ($350,000, evidence rc_appetite_0, rc_appetite_2, km_usage_1, km_value_2, flight_log_force_month), a_tarn qualified ($200k, blocker open: DPIA needs data-flow docs), a_westmere qualified ($250k, blocker open: no cost per flight vs helicopter hours), a_tender identified (no value). Offers: a_priority_support $60k won, a_training $45k won, a_extra_docks $180k open. B: b_renewal identified (no worth_up_to; contract 140,000 EUR, term ends 2027-01-31), b_idle qualified ($180k, blocker open, deadline: Stefan's deputy leaves), b_insurance qualified ($90k, blocker open), b_sister identified. Offers (all open): b_priority_support 50k, b_reporting 70k, b_more_plants 160k.

## 5. `/api/crm` shape the front end renders
```
{ generatedAt, fetched:[...],
  live:{ signals:[{id,account,date,title,detail,effect}] },
  accounts:[{ id, name,
    q1:{ backed:[{deal,value,stage,sources[]}], backedTotal, unbacked:[{deal,value,why,sources[]}], unbackedTotal },
    q2:[{deal,decides,pays,uses,blocks,standing,sources[]}],
    q3:[{rank,move,owner,due,deal,why,sources[]}],
    q4:[{risk,when,sev:'high|med|low',sources[]}],
    q5:[{gap,why,who}] }] }
```
Currency: A is GBP, B is EUR. Never mix totals across accounts.

## 6. What remains (in order)
1. Implement `analysis.js` (`buildCrm`). Guidance from the data:
   - Q1 backed: values backed by a contract/order (`contract.txt`, `invoices.json`) or by `worth_up_to` on an opportunity with evidence. Alliance renewal 350,000 GBP is backed by contract.txt + invoices (all four parts paid); say term ends 2027-02-28. Aldermoor renewal 140,000 EUR backed by contract.txt + invoices. Offers "won" count as booked ($60k, $45k). Opportunities' `worth_up_to` are ceilings: show as "up to", cite evidence ids. **Unbacked, shown apart:** Stefan's 1.2M EUR savings (sr_roi_0 is a claim; sr_roi_2 verified it is only his own guard-hours spreadsheet, no contract reduced, no saving booked); "all four forces keen" (rc_appetite_0) and "alliance has the budget" (rc_funding_0) are claims contradicted by rc_appetite_2, rc_funding_2/hd_calloff_2; 300-dock tender (no value, nothing in writing; a_tender); 30-dock stadium (rc_stadium_0 claim, no quote). Only hard saving at B: insurer 6% cut ~180,000 EUR/yr (jt_prem_2, insurer_premium_letter).
   - Q2: map per deal using stakeholders: Alliance: each force's chief finance officer approves its own call-off (rc_funding_2, hd_calloff_2, eb_sign_2); Ewan Brooks (Metro Central finance) for cost per flight; Fatima Osei (Tarn Valley DPO) decides DPIA, Norwold follows (fo_needs_3, km_others_2); Karen Mbeki uses/staffs Westmere (km_staff_2); Rhys Calder is the only programme contact and is a single point of failure (profile.json, live event). Aldermoor: Stefan Roy signed and is group security; plants pay a share of budget (sr_plants_2); Owen Fitch (IT) owns network exceptions (of_seg_2, of_offer_3); Beatriz uses Plant 7 (ba_use_2); Julian Tate (insurance, jt_review_2); Nadia Rahman group finance (shared mailbox asked for per-plant quote, emails/2026-10-08_finance_mailbox.txt); Stefan's deputy (unnamed) holds rollout know-how (sr_repl_2, ba_deputy_0). Use stakeholder `relationship` from the export for standing.
   - Q3 (first three moves, ranked, dated): A: (1) reply to Karen's ticket on Westmere's 5 Dec public event (training dates + who answers on the day; see live signal); (2) name a Rhys successor/second contact before January and book finance-director meetings per force; (3) get Metro Central payroll drone-overtime figure (eb_drone_2, "could pull it in a week") and finish cost per flight; plus Tarn Valley: chase the data-flow pack, a_tarn. B: (1) Owen Fitch network exception pilot plan before the segmentation project (of_seg_2, of_offer_3); (2) capture the deputy's rollout know-how and Beatriz's checklist (ba_playbook_2, plant7_checklist) before he leaves; (3) reply to group finance with per-plant renewal quote (term ends 2027-01-31); investigate the three silent docks (live signal). Compute concrete dates relative to today and each deadline; keep them inside the deadline.
   - Q4: deadlines (renewal term ends 2027-02-28 A, 2027-01-31 B; B deputy leaving; insurer review ~5 months, jt_review_2; Westmere event 5 Dec; Rhys leaving January); stale/cold: compute last-contact from calls_index.json and users.json (sign_ins_last_90_days, last_sign_in), idle docks from usage_weekly.csv (flights=0 with days_online>0), Plant 11 offline (FB-10903 pending customer, device_events.csv), FB-10412 unanswered four months (requests.csv, tickets.json), Karen's unanswered battery email.
   - Q5: gaps with who could fill: A: Schedule 2 (invoice split, held by Accounts), which dock sits at which force (install sheets), alliance procurement lead unnamed, drone overtime figure (Payroll via Ewan), who succeeds Rhys, Norwold's chief constable stance. B: the deputy's name/contact, which dock is at which plant, group finance contact, how plants share cost, the 1.2M breakdown (Stefan).
   - Add a "traceability" mechanism: every row has `sources[]`; filter against known ids; render "no source" visibly rather than inventing.
2. **Live events**: `get_signals` is empty right now. The Build page says three events appear over time (Aldermoor 30 Nov: three docks that flew most nights flew nothing in the last two weeks; Eastern Counties 18 Nov: Karen Mbeki asked in writing for operator training dates and who answers if a dock fails on 5 Dec, ticket logged, nobody replied; 17 Nov: Rhys leaves in January, no successor, all pre-handover calls were with him). Make `analysis.js` read `store.fetched.signals.data.signals`, show them in `live.signals`, and have them change Q3/Q4/Q5 automatically (e.g. add moves/risks when a signal exists). Inspect the real signal object when one appears (it will have its own id; cite it). No hard-coded dates for events that have not arrived.
3. **write_note**: front end already posts to `/api/note`. Also have the server write its generated top moves/risks back once per new signal via `write_note {text, account, kind:'next_step'|'risk', title}`, mindful of 1 call/min.
4. Fix `ingest.js` order (bootstrap before live loop); keep the 62s gap.
5. README.md: what it is, how to run (`AQ_TOKEN`, `node --env-file=.env server.js`), env var, deploy notes, no token in repo.
6. Host: any Node host (Render/Railway/Fly). Set `AQ_TOKEN` in the host's server env. Persist `data/` or let it re-ingest at boot (~10 min). Check in a private window. Consider committing a sanitised `data/store.json` seed ONLY if it contains no token (it does not; the token is never stored) so first load is instant. Confirm before pushing.
7. Push to a PUBLIC GitHub repo (the human's account): `git add . && git commit` (`.env` and `data/` ignored unless intentionally seeded). Verify no token in history: `git grep aq1.`.
8. Draft the thinking doc (one page) and video outline for the human. Video must show: five answers for one account, one number traced to its source, a new live event appearing, the code briefly.
9. Human enters the four links in the game's Build > Hand in tab before 03:47. Links can be changed until time is called.

## 7. Security notes
- The token is in `.env` only and was also visible in a chat transcript. Never commit it. If you publish the repo, run `git grep aq1.` first. Consider asking the organisers to rotate it if in doubt.
- Judges open the live CRM: do not expose `/api/note` write abuse publicly without basic protection if you care; it can only add notes, never change the game.

## 8. Honest status
- Done: discovery, ingest layer, front end, data fully fetched and inspected.
- Not done: `analysis.js` real logic, live-event handling, README, hosting, repo, doc, video, hand-in.
- Not verified: nothing in `analysis.js` has been run; the server currently runs with the stub (`/api/crm` returns `{stage:"ingesting",...}` and the page shows "Still loading").
