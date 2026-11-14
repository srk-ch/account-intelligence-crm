// Turns the stored export + paperwork + live signals into the five answers per account.
// Rules: every row carries sources[]; sources are filtered against ids that really exist; unbacked claims
// are shown apart and never added into the backed total.

const DAY = 86_400_000;
const iso = (d) => new Date(d).toISOString().slice(0, 10);
const addDays = (n, from = Date.now()) => iso(from + n * DAY);
const daysSince = (s) => Math.floor((Date.now() - new Date(s).getTime()) / DAY);

function csv(text) {
  const lines = (text || "").trim().split("\n");
  const head = lines.shift()?.split(",") || [];
  return lines.map((l) => {
    const cells = l.match(/("([^"]|"")*"|[^,]*)(,|$)/g)?.map((c) => c.replace(/,$/, "").replace(/^"|"$/g, "")) || [];
    return Object.fromEntries(head.map((h, i) => [h, cells[i] ?? ""]));
  });
}

const fmtD = (s) => new Date(s).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
function niceReq(r) {
  const x = `${r.request_id} ${r.summary}`;
  if (/FB-10412|data-flow|Document request/i.test(x)) return "Tarn Valley's request for data-flow documents has gone unanswered";
  if (/FB-10903|offline|network link/i.test(x)) return "A Plant 11 dock keeps dropping offline and is waiting on the customer's IT";
  if (/batter/i.test(x)) return "Insp. Mbeki's email about failing batteries was never answered";
  if (/renewal quote|cost for each plant/i.test(x)) return "Group finance asked for a per-plant renewal quote and heard nothing";
  if (/case study/i.test(x)) return "Stefan Roy's case study request has not been started";
  return r.summary;
}

export function buildCrm(store) {
  const F = store.fetched;
  const exp = F.accounts?.data;
  if (!exp?.accounts) return { stage: "ingesting", fetched: Object.keys(F) };

  const signals = normaliseSignals(F.signals?.data);
  const out = { generatedAt: new Date().toISOString(), fetched: Object.keys(F), live: { signals }, accounts: [] };

  for (const acc of exp.accounts) {
    const pw = F["paperwork_" + acc.id]?.data?.records || [];
    const rec = (p) => pw.find((r) => r.path === p);
    const data = (p) => rec(p)?.data;
    const profile = data("profile.json") || {};
    const cur = profile.currency === "EUR" ? "€" : "£";
    const money = (n) => (n == null ? "unknown" : `${cur}${Number(n).toLocaleString("en-GB")}`);
    const fact = (id) => acc.facts.find((f) => f.id === id);
    const stake = (id) => acc.stakeholders.find((s) => s.id === id);
    const standing = (id) => (stake(id) ? `${stake(id).name}: ${stake(id).relationship}` : "not met");

    // ids we are allowed to cite
    const known = new Set([
      ...acc.facts.map((f) => f.id),
      ...acc.opportunities.map((o) => o.id),
      ...acc.offers.map((o) => o.id),
      ...acc.stakeholders.map((s) => s.id),
      ...exp.files.filter((f) => f.account === acc.id).map((f) => f.id),
      ...pw.map((r) => `${acc.id}/${r.path}`),
      ...signals.map((s) => s.id),
    ]);
    const cite = (...ids) => [...new Set(ids.flat().filter((i) => known.has(i)))];
    const P = (p) => `${acc.id}/${p}`;
    const opp = (id) => acc.opportunities.find((o) => o.id === id);
    const backedEv = (o) => (o?.evidence || []).filter((id) => fact(id)?.status !== "claim");

    // ---- usage, computed from usage_weekly.csv
    const usage = csv(rec("usage_weekly.csv")?.text);
    const weeks = [...new Set(usage.map((u) => u.week_start))].sort();
    const last4 = weeks.slice(-4), prev4 = weeks.slice(-8, -4);
    const sum = (d, ws) => usage.filter((u) => u.dock_id === d && ws.includes(u.week_start)).reduce((a, u) => a + Number(u.flights || 0), 0);
    const docks = [...new Set(usage.map((u) => u.dock_id))];
    const wentQuiet = docks.filter((d) => sum(d, prev4) > 0 && sum(d, last4) === 0);
    const neverFlew = docks.filter((d) => sum(d, weeks) === 0);
    const flyingNow = docks.filter((d) => sum(d, last4) > 0);

    const reqs = csv(rec("requests.csv")?.text);
    const openReqs = reqs.filter((r) => r.status !== "Closed");
    const sig = (re) => signals.filter((s) => (!s.account || s.account === acc.id) && re.test(`${s.title} ${s.detail}`));

    // ================= Q1 =================
    const q1 = { backed: [], unbacked: [], backedTotal: "", unbackedTotal: "not added up: claims and unaccepted offers are shown apart" };
    let total = 0;
    const renewal = profile.renewal;
    const renewalOpp = acc.opportunities.find((o) => /renew/i.test(o.title));
    if (renewal) {
      total += renewal.annual_value;
      q1.backed.push({
        deal: renewalOpp?.title || "Contract renewal",
        value: `${money(renewal.annual_value)} a year`,
        kind: "booked", amount: renewal.annual_value,
        basis: `Signed order form, term ends ${renewal.term_ends}; invoices paid`,
        stage: renewalOpp ? renewalOpp.stage : "contract",
        sources: cite(renewalOpp?.id, P("contract.txt"), P("invoices.json"), P("profile.json"), backedEv(renewalOpp)),
      });
    }
    for (const o of acc.offers.filter((o) => o.status === "won")) {
      total += o.value;
      q1.backed.push({ deal: o.title, value: money(o.value), kind: "booked", amount: o.value, basis: "Offer won, agreed with " + o.pitch_to, stage: "won", sources: cite(o.id) });
    }
    for (const o of acc.opportunities.filter((o) => o.worth_up_to && o !== renewalOpp)) {
      q1.backed.push({
        deal: o.title,
        kind: "ceiling", amount: o.worth_up_to, basis: o.blocker ? "Blocker: " + o.blocker.text : "No blocker recorded",
        value: `up to ${money(o.worth_up_to)}`,
        stage: `${o.stage}${o.blocker ? ", blocker " + o.blocker.status : ""}`,
        sources: cite(o.id, backedEv(o)),
      });
    }
    q1.backedTotal = `${money(total)} (signed contract + won offers only)`;
    for (const o of acc.offers.filter((o) => o.status !== "won"))
      q1.unbacked.push({ kind: "offer", deal: o.title, value: money(o.value), why: `Offer to ${o.pitch_to}, not accepted yet`, sources: cite(o.id) });
    for (const o of acc.opportunities.filter((o) => !o.worth_up_to && !/renew/i.test(o.title)))
      q1.unbacked.push({ kind: "unpriced", deal: o.title, value: "no value on file", why: `Stage ${o.stage}; nothing in writing to price it`, sources: cite(o.id, backedEv(o)) });
    const claimRows = {
      A: [["rc_appetite_0", "All four forces are keen", "Contradicted: only Westmere and Metro Central fly live", ["rc_appetite_2", P("usage_weekly.csv")]],
          ["rc_funding_0", "The alliance has the budget", "Contradicted: no pooled budget, each force's finance signs its own call-off", ["rc_funding_2", "hd_calloff_2"]],
          ["rc_stadium_0", "Westmere stadium: 30 docks", "Claim from one contact; no quote asked for in writing beyond an email, no budget holder met", [P("emails/2026-10-02_rhys_stadium.txt")]]],
      B: [["sr_roi_0", "ROI proven, about €1.2M a year saved", "Own spreadsheet of guard hours; no guard contract reduced, no saving booked", ["sr_roi_2", P("emails/2026-07-16_stefan_savings.txt")]],
          ["sr_roll_0", "13 of 15 plants flying", `Usage shows ${flyingNow.length} of ${docks.length} docks flew in the last 4 weeks, but there is no dock-to-plant list, so plants cannot be counted; Plant 11 reportedly does not use theirs`, [P("usage_weekly.csv"), "ba_other_1", "of_weak_1"]]],
    }[acc.id] || [];
    for (const [id, deal, why, extra] of claimRows) if (fact(id)) q1.unbacked.push({ kind: "claim", deal, value: "claimed, not backed", said_by: fact(id).said_by, why, sources: cite(id, extra) });
    if (acc.id === "B")
      q1.backed.push({ deal: "Insurer premium cut (6% across nine plants)", value: "about €180,000 a year", kind: "benefit", amount: 180000, basis: "The customer's one verified saving, not FlytBase revenue", stage: "verified", sources: cite("jt_prem_2", "insurer_premium_letter") });

    // ================= Q2 =================
    const decide = {
      A: [
        ["a_renewal", "Alliance office signs the order; each force's CFO approves its own call-off", "Each force from its own budget (no pooled budget)", "Rhys Calder (programme), Karen Mbeki (Westmere)", "Forces whose docks never flew (Tarn Valley, Norwold)", ["rc_funding_2", "hd_calloff_2", "rhys_calder", "karen_mbeki"]],
        ["a_tarn", "Fatima Osei (Tarn Valley DPO) signs the DPIA; Norwold copies it", "Tarn Valley / Norwold from their own budgets", "Nobody yet (never flown live)", "Fatima Osei; Norwold's cautious chief constable", ["fo_dpia_2", "fo_needs_3", "km_others_2", "fatima_osei"]],
        ["a_westmere", "Metro Central finance director signs a call-off; Ewan Brooks carries it", "Metro Central from its own budget", "Karen Mbeki's six part-time operators", "Metro Central CFO (wants cost per flight vs helicopter); Karen's staffing limit", ["eb_sign_2", "eb_heli_1", "km_staff_2", "ewan_brooks", "karen_mbeki"]],
        ["a_tender", "Unknown: no procurement lead named", "Unknown", "Unknown", "Each force's CFO (cannot be committed by the alliance)", ["rc_tender_0", "hd_calloff_2", "rc_funding_2"]],
      ],
      B: [
        ["b_renewal", "Stefan Roy (signed the order) with group finance", "Group security invoice; plants pay a share of the budget", "Plant managers (e.g. Beatriz at Plant 7)", "Group finance (asked for per-plant quote, unanswered); plant managers resenting the cost", ["sr_plants_2", "stefan_roy", "beatriz_alonso"]],
        ["b_idle", "Owen Fitch (group IT) for network exceptions; Stefan Roy for adoption", "Group security budget; plants pay a share", "Plant managers and night guards (contractor not covered to act on alerts)", "Owen Fitch's segmentation project; Plant 11 manager (sees it as head office's toy)", ["of_seg_2", "of_offer_3", "ba_use_2", "ba_other_1", "sr_plants_2", "owen_fitch"]],
        ["b_insurance", "Insurer's surveyor; Julian Tate is our contact", "Insurer (premium reduction benefits the group)", "Plants (logs by plant)", "Plants with idle docks put the discount at risk", ["jt_prem_2", "jt_review_2", "julian_tate"]],
        ["b_sister", "Unknown at the sister company", "Unknown", "Unknown", "No saving booked, so the headline figure would not survive scrutiny", ["sr_roi_2", "sr_roi_0", "stefan_roy"]],
      ],
    }[acc.id] || [];
    const q2 = decide.map(([id, d, p, u, b, s]) => {
      const names = [...new Set(s.filter((x) => stake(x)))].map(standing).join("; ") || "no one met";
      return { deal: opp(id)?.title || id, decides: d, pays: p, uses: u, blocks: b, standing: names, sources: cite(id, s) };
    });

    // ================= Q3 =================
    const moves = [];
    const w = sig(/westmere|5 december|public event/i), rh = sig(/rhys|moving on|successor|leaves/i);
    if (acc.id === "A") {
      for (const s of w) moves.push({ pri: 0, move: "Reply in writing to Insp. Mbeki: training dates for new operators before the 5 December event, and who answers if a dock fails on the day", owner: "You (CSM), with Neel for training capacity and the support desk for on-call", due: addDays(3), deal: "Scale Westmere's fleet", why: "She wrote directly and logged a ticket; nobody has replied. Her last email (batteries, Aug) also had no reply.", sources: cite(s.id, "karen_mbeki", "a_westmere", P("emails/2026-08-11_karen_batteries.txt"), "km_staff_2") });
      for (const s of rh) moves.push({ pri: 1, move: "Ask Rhys for a named successor and a second contact in each force; get the alliance procurement lead's name", owner: "You (CSM)", due: addDays(10), deal: "Renew the alliance contract", why: "Every call on file was with Rhys alone and he leaves in January; the term ends before the renewal can be signed without him.", sources: cite(s.id, "rhys_calder", P("profile.json"), "a_renewal") });
      moves.push({ pri: 2, move: "Get Metro Central's drone overtime from Payroll (via Ewan) and finish the cost-per-flight against helicopter hours", owner: "You (CSM) with Ewan Brooks", due: addDays(7), deal: "Scale Westmere's fleet", why: "His CFO signs a call-off only with a cost per flight against £1,500 helicopter hours; overtime is not tracked separately.", sources: cite("eb_sign_2", "eb_drone_2", "eb_heli_1", "a_westmere", P("helicopter_cost_overtime")) });
      moves.push({ pri: 3, move: "Chase Fatima Osei's DPIA now she has the data-flow pack; agree the date she will sign, then offer the same pack to Norwold", owner: "You (CSM), engineering (SRV) on questions", due: addDays(21), deal: "Tarn Valley and Norwold go live", why: "She said she can finish in three weeks with the pack; Norwold is waiting to copy her assessment.", sources: cite("fo_needs_3", "srv_dataflow", "a_tarn", "dataflow_pack", "km_others_2") });
      moves.push({ pri: 4, move: "Open the renewal with each force's finance lead before term end (28 Feb 2027); ask each CFO what a call-off needs", owner: "You (CSM) with Achal Negi (commercial owner)", due: "2027-01-15", deal: "Renew the alliance contract", why: "No automatic renewal; each force signs its own call-off.", sources: cite("hd_calloff_2", "rc_funding_2", P("contract.txt"), P("profile.json")) });
    } else {
      for (const s of sig(/dock|flew|usage|stopped/i)) moves.push({ pri: 0, move: "Find out why the docks that flew most nights went quiet while staying online: call the plant managers, check tickets, ask Owen about the network", owner: "You (CSM) with the support desk", due: addDays(3), deal: "Bring the idle plants into regular patrol", why: "Usage fell to zero with no ticket and no word from the customer.", sources: cite(s.id, "b_idle", P("usage_weekly.csv"), P("device_events.csv")) });
      moves.push({ pri: 2, move: "Put a pilot network-exception plan to Owen Fitch (two engineer days offered) before segmentation starts; name an owner per plant", owner: "You (CSM) with Owen Fitch", due: addDays(14), deal: "Bring the idle plants into regular patrol", why: "Segmentation starts in about four months and will cut the docks' connectivity; nobody has told Owen the docks exist.", sources: cite("of_seg_2", "of_offer_3", "network_plan", "b_idle") });
      moves.push({ pri: 1, move: "Capture the deputy's rollout know-how and Beatriz's night-patrol checklist into one written template; find the deputy's name", owner: "You (CSM) with Beatriz Alonso", due: addDays(10), deal: "Bring the idle plants into regular patrol", why: "The deputy set up most docks, is leaving, and nothing is written down.", sources: cite("sr_repl_2", "ba_deputy_0", "ba_playbook_2", "plant7_checklist", "b_idle") });
      moves.push({ pri: 3, move: "Answer group finance: send the renewal quote broken down by plant, after agreeing it with Stefan Roy", owner: "You (CSM) with Achal Negi", due: addDays(14), deal: "Renew the Aldermoor contract", why: "Unsigned finance email asked for a per-plant quote on 8 Oct and was not answered; the term ends 31 Jan 2027.", sources: cite(P("emails/2026-10-08_finance_mailbox.txt"), P("contract.txt"), "b_renewal") });
      moves.push({ pri: 4, move: "Set up consistent flight logs by plant ahead of the insurer's review", owner: "You (CSM) with Julian Tate", due: addDays(60), deal: "Protect and extend the insurance discount", why: "The 6% premium cut (about €180k a year) is the only hard saving; the review is in about five months.", sources: cite("jt_review_2", "jt_prem_2", "b_insurance") });
    }
    const q3 = moves.sort((a, b) => a.pri - b.pri).slice(0, 5).map((m, i) => ({ rank: i + 1, ...m }));

    // ================= Q4 =================
    const q4 = [];
    for (const s of signals.filter((s) => !s.account || s.account === acc.id))
      q4.push({ risk: `${s.title}${s.detail ? ": " + s.detail : ""}`, when: s.date ? `Reported ${s.date}` : "Live event", sev: "high", sources: cite(s.id) });
    if (profile.renewal) q4.push({ risk: "Contract term ends with no automatic renewal", when: `${profile.renewal.term_ends} (${Math.ceil((new Date(profile.renewal.term_ends) - Date.now()) / DAY)} days)`, sev: acc.id === "B" ? "high" : "med", sources: cite(P("contract.txt"), P("profile.json")) });
    for (const o of acc.opportunities.filter((o) => o.deadline && !o.deadline.met))
      q4.push({ risk: o.deadline.text, when: "Date not on file; turns bad when he leaves", sev: "high", sources: cite(o.id, "sr_repl_2", "ba_deputy_0") });
    for (const r of openReqs) {
      const ticket = r.request_id.startsWith("FB-") ? P("tickets.json")
        : /case study/i.test(r.summary) ? P("emails/2026-09-22_stefan_case_study.txt")
        : /battery|batteries/i.test(r.summary) ? P("emails/2026-08-11_karen_batteries.txt")
        : P("emails/2026-10-08_finance_mailbox.txt");
      q4.push({ risk: niceReq(r), detail: r.summary, when: `${daysSince(r.opened)} days with no reply, since ${fmtD(r.opened)}`, sev: daysSince(r.opened) > 60 ? "high" : "med", sources: cite(P("requests.csv"), ticket) });
    }
    if (acc.id === "A") {
      q4.push({ risk: "Single point of contact: every call since May 2026 was with Rhys Calder", when: "Any day he is unavailable", sev: "med", sources: cite(P("profile.json"), "rhys_calder") });
      q4.push({ risk: "Tarn Valley DPIA is still waiting on us; Norwold copies it", when: "Until the DPO signs (she said about three weeks)", sev: "med", sources: cite("fo_dpia_2", "fo_needs_3", "a_tarn") });
    } else {
      q4.push({ risk: "Network segmentation will cut dock connectivity unless exceptions are planned", when: "About four months", sev: "high", sources: cite("of_seg_2", "b_idle") });
      q4.push({ risk: "Insurer's review may withdraw the discount if idle docks and inconsistent logs persist", when: "About five months", sev: "med", sources: cite("jt_review_2", "jt_prem_2", "b_insurance") });
      q4.push({ risk: "Plant 11 sees the docks as head office's toy and has a poor network link", when: "Already stuck (ticket pending customer)", sev: "med", sources: cite("ba_other_1", "of_weak_1", P("requests.csv")) });
    }
    if (docks.length)
      q4.push({ risk: `${flyingNow.length} of ${docks.length} docks flew in the last 4 weeks; ${neverFlew.length} never flew${wentQuiet.length ? `; ${wentQuiet.length} went quiet (${wentQuiet.join(", ")})` : ""}`, when: `Weeks ${last4[0] || "?"} to ${last4[last4.length - 1] || "?"}`, sev: neverFlew.length > docks.length / 3 ? "high" : "med", sources: cite(P("usage_weekly.csv")) });

    // ================= Q5 =================
    const q5 = {
      A: [["Which dock sits at which force", "Without it usage cannot be shown force by force, which the renewal needs", "Field team (install sheets) or Rhys Calder"],
          ["Invoice split and billing addresses (Schedule 2)", "Who pays what per force", "FlytBase Accounts"],
          ["Alliance procurement lead (name not recorded)", "Likely signs the renewal and the tender", "Rhys Calder; attended the Dec 2025 review call"],
          ["Metro Central's drone overtime", "Needed for cost per flight", "Ewan Brooks via Payroll"],
          ["Who replaces Rhys Calder", "He is the only programme contact", "Rhys Calder"],
          ["Norwold's position", "Chief constable cautious after a privacy row", "Fatima Osei / Karen Mbeki"],
          ["Whether the tender is real", "Nothing in writing; not covered by the order", "Rhys Calder; alliance procurement"]],
      B: [["Stefan's deputy: name and contact", "Holds the rollout know-how and is leaving", "Stefan Roy"],
          ["Which dock sits at which plant", "Cannot say which plants are idle without it", "Stefan Roy or Beatriz Alonso"],
          ["Group finance contact and how plants share cost", "Needed for the renewal and per-plant quote", "Stefan Roy; the shared finance mailbox"],
          ["Breakdown of the €1.2M saving", "Only the insurer cut is verified", "Stefan Roy"],
          ["Segmentation dates and which docks need exceptions", "Docks lose connectivity otherwise", "Owen Fitch"],
          ["Why docks go quiet while online", "Three possible causes: network, adoption, contractor", "Plant managers; support desk"]],
    }[acc.id].map(([gap, why, who]) => ({ gap, why, who }));
    if (signals.length) q5.push({ gap: "Details behind the live event(s) above", why: "Reaction is based on the first report only", who: "The customer contact named in the event" });

    const refs = {};
    acc.facts.forEach((f) => (refs[f.id] = { kind: "fact", status: f.status, label: f.text, meta: `${f.said_by} · ${f.status}${f.verified_by ? " · verified by " + f.verified_by : ""}` }));
    acc.opportunities.forEach((o) => (refs[o.id] = { kind: "deal", label: o.title, meta: `Stage: ${o.stage}${o.blocker ? " · Blocker (" + o.blocker.status + "): " + o.blocker.text : ""}` }));
    acc.offers.forEach((o) => (refs[o.id] = { kind: "deal", label: o.title, meta: `Offer to ${o.pitch_to} · ${o.status}` }));
    acc.stakeholders.forEach((s) => (refs[s.id] = { kind: "person", label: `${s.name}, ${s.role}`, meta: `${s.relationship} with us` }));
    exp.files.filter((f) => f.account === acc.id).forEach((f) => (refs[f.id] = { kind: "file", label: f.title, meta: F["file_" + f.id]?.data?.text ? String(F["file_" + f.id].data.text).split(/[\r\n\t ]+/).join(" ").slice(0, 320) + "…" : "Data room file" }));
    pw.forEach((r) => (refs[P(r.path)] = { kind: "record", label: r.path, meta: "Paperwork record on file" }));
    signals.forEach((s) => (refs[s.id] = { kind: "signal", label: s.title, meta: s.detail }));
    const ceiling = acc.opportunities.filter((o) => o.worth_up_to && o !== renewalOpp).reduce((n, o) => n + o.worth_up_to, 0);
    q4.sort((a, b) => ({ high: 0, med: 1, low: 2 }[a.sev] - { high: 0, med: 1, low: 2 }[b.sev]));
    const openOffers = acc.offers.filter((o) => o.status !== "won").reduce((n, o) => n + o.value, 0);
    const kpis = { backed: money(total), ceiling: money(ceiling), bookedN: total, ceilingN: ceiling, offersN: openOffers, high: q4.filter((r) => r.sev === "high").length, moves: q3.length, claims: q1.unbacked.filter((r) => /claimed/.test(r.value)).length, currency: cur };
    const series = weeks.map((w) => ({ w, flights: usage.filter((u) => u.week_start === w).reduce((n, u) => n + Number(u.flights || 0), 0), docks: new Set(usage.filter((u) => u.week_start === w && Number(u.flights) > 0).map((u) => u.dock_id)).size }));
    const timeline = [...q3.map((m) => ({ date: m.due, label: "Move " + m.rank, sub: m.deal, kind: "move" })), ...(profile.renewal ? [{ date: profile.renewal.term_ends, label: "Contract term ends", kind: "deadline" }] : [])]
      .concat(signals.filter((s) => (!s.account || s.account === acc.id) && /5 dec/i.test(s.detail)).map(() => ({ date: "2026-12-05", label: "Westmere public event", kind: "deadline" })));
    const stakeNames = acc.stakeholders.map((s) => s.name);
    const personFor = (o) => { const c = {}; for (const id of o.evidence || []) { const f = fact(id); if (f && stakeNames.includes(f.said_by)) c[f.said_by] = (c[f.said_by] || 0) + 1; } return Object.entries(c).sort((x, y) => y[1] - x[1])[0]?.[0] || ""; };
    const pipeline = [...acc.opportunities.map((o) => ({ id: o.id, title: o.title, col: ["agreed", "qualified"].includes(o.stage) ? o.stage : "identified", amount: o.worth_up_to, blocker: o.blocker?.status || null, person: personFor(o) })),
      ...acc.offers.map((o) => ({ id: o.id, title: o.title, col: o.status === "won" ? "agreed" : "offer", amount: o.value, person: o.pitch_to, blocker: null }))];
    const metrics = { facts: acc.facts.length, verified: acc.facts.filter((f) => f.status === "verified").length, opps: acc.opportunities.length, agreed: acc.opportunities.filter((o) => o.stage === "agreed").length };
    out.accounts.push({ id: acc.id, name: acc.name, refs, kpis, pipeline, metrics, usage: { series, docks: docks.length, flyingNow: flyingNow.length, last4 }, timeline, q1, q2, q3, q4: q4.sort((a, b) => ({ high: 0, med: 1, low: 2 }[a.sev] - { high: 0, med: 1, low: 2 }[b.sev])), q5 });
  }
  return out;
}

function normaliseSignals(d) {
  const arr = Array.isArray(d) ? d : d?.signals || [];
  return arr.map((s, i) => ({
    id: s.id || s.signal_id || `signal-${i + 1}`,
    account: s.account || s.account_id || "",
    date: s.date || s.at || s.created_at || "",
    title: s.title || s.headline || s.type || "Live event",
    detail: s.detail || s.summary || s.text || s.body || (typeof s === "string" ? s : ""),
  }));
}
