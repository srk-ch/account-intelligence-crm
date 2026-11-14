// Builds the five answers for an account that was released mid-build with BOTH a discovery export
// (people, facts, deals, offers, deadlines, files) and paperwork. Everything cites ids that exist.
const DAY = 86_400_000;
const iso = (d) => new Date(d).toISOString().slice(0, 10);
const addDays = (n) => iso(Date.now() + n * DAY);
const daysSince = (s) => Math.floor((Date.now() - new Date(s).getTime()) / DAY);
const fmtD = (s) => new Date(s).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

function csv(text) {
  const lines = (text || "").trim().split("\n");
  const head = lines.shift()?.split(",") || [];
  return lines.map((l) => {
    const cells = l.match(/("([^"]|"")*"|[^,]*)(,|$)/g)?.map((c) => c.replace(/,$/, "").replace(/^"|"$/g, "")) || [];
    return Object.fromEntries(head.map((h, i) => [h, cells[i] ?? ""]));
  });
}

// the next "first Monday of the month" after today (the estate board's meeting day)
function nextFirstMonday() {
  const now = new Date();
  for (let m = 0; m < 4; m++) {
    const d = new Date(now.getFullYear(), now.getMonth() + m, 1, 12);
    while (d.getDay() !== 1) d.setDate(d.getDate() + 1);
    if (d > now) return iso(d);
  }
  return addDays(30);
}

export function buildExportAccount(id, exp, files, fileTexts, pw, signals) {
  const rec = (p) => pw.find((r) => r.path === p);
  const data = (p) => rec(p)?.data;
  const profile = data("profile.json") || {};
  const cur = profile.currency === "EUR" ? "€" : "£";
  const money = (n) => (n == null ? "no value on file" : `${cur}${Math.round(n).toLocaleString("en-GB")}`);
  const P = (p) => `${id}/${p}`;
  const mySignals = signals.filter((s) => !s.account || s.account === id);
  const fact = (fid) => exp.facts.find((f) => f.id === fid);
  const stake = (sid) => exp.stakeholders.find((s) => s.id === sid);
  const named = (sid, fallback) => stake(sid)?.name || fallback;
  const dana = named("k_dana_1yo", "the estate manager"), graham = named("k_graham_1yo", "the board chair"), lucy = named("k_lucy_1yo", "the insurance broker");
  const opp = (oid) => exp.opportunities.find((o) => o.id === oid);

  const known = new Set([
    ...exp.facts.map((f) => f.id), ...exp.opportunities.map((o) => o.id), ...exp.offers.map((o) => o.id), ...exp.stakeholders.map((s) => s.id),
    ...files.map((f) => f.id), ...pw.map((r) => P(r.path)), ...mySignals.map((s) => s.id), ...mySignals.flatMap((s) => s.paths || []),
  ]);
  const cite = (...x) => [...new Set(x.flat().filter((i) => known.has(i)))];
  const backedEv = (o) => (o?.evidence || []).filter((e) => fact(e)?.status !== "claim");
  const snip = (t) => String(t).split(/[\r\n\t ]+/).join(" ").slice(0, 320) + "…";

  const refs = {};
  pw.forEach((r) => (refs[P(r.path)] = { kind: "record", label: r.path, meta: r.text ? snip(r.text) : snip(JSON.stringify(r.data || "")) }));
  exp.facts.forEach((f) => (refs[f.id] = { kind: "fact", status: f.status, label: f.text, meta: `${f.said_by} · ${f.status}${f.verified_by ? " · verified by " + f.verified_by : ""}` }));
  exp.opportunities.forEach((o) => (refs[o.id] = { kind: "deal", label: o.title, meta: `Stage: ${o.stage}${o.blocker ? " · Blocker (" + o.blocker.status + "): " + o.blocker.text : ""}` }));
  exp.offers.forEach((o) => (refs[o.id] = { kind: "deal", label: o.title, meta: `Offer to ${o.pitch_to} · ${o.status}` }));
  exp.stakeholders.forEach((s) => (refs[s.id] = { kind: "person", label: `${s.name}, ${s.role}`, meta: `${s.relationship} with us` }));
  files.forEach((f) => (refs[f.id] = { kind: "file", label: f.title || f.id, meta: fileTexts[f.id] ? snip(fileTexts[f.id]) : "Data room file" }));
  mySignals.forEach((s) => { refs[s.id] = { kind: "signal", label: s.title, meta: s.detail }; (s.recs || []).forEach((r) => (refs[r.path] = { kind: "record", label: r.path, meta: snip(r.text || "") })); });

  // usage
  const usage = csv(rec("usage_weekly.csv")?.text);
  const weeks = [...new Set(usage.map((u) => u.week_start))].sort();
  const docks = [...new Set(usage.map((u) => u.dock_id))];
  const totalFlights = usage.reduce((n, u) => n + Number(u.flights || 0), 0);
  const series = weeks.map((w) => ({ w, flights: usage.filter((u) => u.week_start === w).reduce((n, u) => n + Number(u.flights || 0), 0), docks: new Set(usage.filter((u) => u.week_start === w && Number(u.flights) > 0).map((u) => u.dock_id)).size }));
  const last4 = weeks.slice(-4);
  const flyingNow = docks.filter((d) => usage.filter((u) => u.dock_id === d && last4.includes(u.week_start)).some((u) => Number(u.flights) > 0)).length;
  const installed = data("devices.json")?.docks?.[0]?.registered;
  const renewal = profile.renewal;
  const board = nextFirstMonday();
  const goLive = opp("k_golive_1yo"), south = opp("k_south_1yo"), course = exp.offers.find((o) => o.id === "k_training_1yo") || exp.offers[0];
  const golTitle = goLive?.title || "Get the dock flying";

  // ---- Q1
  const q1 = { backed: [], unbacked: [], backedTotal: "", unbackedTotal: "not added up: claims, open offers and unpriced items are shown apart" };
  if (renewal) q1.backed.push({ deal: "Platform subscription, 1 dock", value: `${money(renewal.annual_value)} a year`, kind: "booked", amount: renewal.annual_value, basis: `Signed through the installer, paid in full; term ends ${renewal.term_ends}`, stage: "paid", sources: cite(P("contract.txt"), P("invoices.json"), P("profile.json")) });
  q1.backedTotal = `${money(renewal?.annual_value || 0)} (signed contract only)`;
  if (goLive?.worth_up_to) q1.backed.push({ deal: golTitle, value: `up to ${money(goLive.worth_up_to)}`, kind: "ceiling", amount: goLive.worth_up_to, basis: `Blocker: ${goLive.blocker?.text || "none"}`, stage: `${goLive.stage}, blocker ${goLive.blocker?.status || "none"}`, sources: cite(goLive.id, backedEv(goLive)) });
  if (course) q1.unbacked.push({ kind: "offer", deal: course.title, value: money(course.value), why: `Offer to ${course.pitch_to}, not accepted yet`, sources: cite(course.id, "k_no_pilot_1yo") });
  if (south) q1.unbacked.push({ kind: "unpriced", deal: south.title, value: "no value on file", why: "Identified only: the south entrance was raised at install but never assessed for coverage", sources: cite(south.id, backedEv(south)) });
  if (fact("k_keen_1yo")) q1.unbacked.push({ kind: "claim", deal: "Everyone is excited and just waiting to go live", value: "claimed, not backed", said_by: fact("k_keen_1yo").said_by, why: "Contradicted: the dock has never flown and some residents already ask why they paid for it", sources: cite("k_keen_1yo", "k_board_doubts_1yo", P("usage_weekly.csv")) });
  if (fact("k_south_wish_1yo")) q1.unbacked.push({ kind: "claim", deal: "A second dock for the south entrance", value: "claimed, not backed", said_by: fact("k_south_wish_1yo").said_by, why: "A wish that depends on the north dock working first; the south entrance has not been assessed", sources: cite("k_south_wish_1yo", "k_south_unassessed_1yo") });
  q1.unbacked.push({ kind: "claim", deal: "Estate-wide mapping", value: "claimed, not backed", said_by: "the installer's sales pitch", why: "Contradicted: what the estate needs is night patrol of the two entrances, not mapping the whole estate", sources: cite("k_need_entrances_1yo", P("deal_history.json")) });

  // ---- Q2
  const standing = exp.stakeholders.map((s) => `${s.name}: ${s.relationship}`).join("; ");
  const q2 = [
    { deal: golTitle, decides: `${dana} runs it day to day; any spend beyond the original purchase needs a vote of the residents' board (chair ${graham})`, pays: "The residents' board, by vote at its monthly meeting (first Monday)", uses: `Nobody yet: no certified pilot; ${dana}'s staff once trained`, blocks: `No certified pilot; never commissioned; insurer not told (${lucy}); installer gone; residents already doubting`, standing, sources: cite(goLive?.id, "k_board_pays_1yo", "k_no_pilot_1yo", "k_not_commissioned_1yo", "k_insurer_not_told_1yo", "k_board_doubts_1yo", "k_dana_1yo", "k_graham_1yo", "k_lucy_1yo") },
    { deal: south?.title || "Second dock for the south entrance", decides: "The residents' board (any spend beyond the original purchase)", pays: "The residents' board", uses: "Unknown", blocks: "The north dock does not fly yet; the south entrance has never been assessed", standing, sources: cite(south?.id, "k_south_wish_1yo", "k_south_unassessed_1yo", "k_board_pays_1yo") },
  ];

  // ---- Q3
  const bd = new Date(board + "T12:00:00");
  const beforeBoard = iso(bd.getTime() - 4 * DAY);
  const q3 = [
    { rank: 1, move: `Send ${dana} a dated go-live plan in writing: certify two staff, notify the insurer, then a commissioning flight`, owner: "You (CSM) with Pranjal Suyal (Lead Solutions Engineer)", due: addDays(2), deal: golTitle, why: `A go-live plan was promised to ${dana}; she assumed the dock flies itself once switched on, and nobody at the estate is certified.`, sources: cite(goLive?.id, "k_no_pilot_1yo", "k_not_commissioned_1yo", P("emails/2026-10-19_dana_when.txt")) },
    { rank: 2, move: `Get the dock declared to the insurer before any flight: ask ${lucy} what the notification needs`, owner: `You (CSM) with ${lucy}`, due: addDays(7), deal: golTitle, why: "The property policy requires any new aerial equipment to be notified before use, and the dock is not declared.", sources: cite("k_insurer_not_told_1yo", "K_insurance_schedule_1yo", "k_lucy_1yo") },
    { rank: 3, move: `Offer ${dana} the pilot certification course for two estate staff (${money(course?.value)}) and book the commissioning flight for the week after`, owner: `You (CSM) with ${dana}`, due: addDays(10), deal: golTitle, why: "Nobody at the estate can fly it and the installer who left no longer answers; the course is the way to a flying dock.", sources: cite(course?.id, "k_no_pilot_1yo", "k_installer_gone_1yo", "k_dana_1yo") },
    { rank: 4, move: `Give ${graham} a one-page update before the board vote: dock status, the dated plan, and what a vote on the renewal buys`, owner: `You (CSM) with ${graham}`, due: beforeBoard, deal: golTitle, why: "The residents vote on renewing the security budget, and some already ask why they paid for a drone that has never flown.", sources: cite("k_board_pays_1yo", "k_board_doubts_1yo", "k_graham_1yo") },
  ];

  // ---- Q4
  const q4 = [];
  mySignals.forEach((s) => q4.push({ risk: `${s.title}${s.detail ? ": " + s.detail : ""}`, when: s.date ? `Reported ${s.date}` : "Live event", sev: "high", sources: cite(s.paths || [], s.id) }));
  q4.push({ risk: "The residents' board votes on renewing the security budget", detail: "Any spend beyond the original purchase needs their vote, and some already ask why they paid for a drone that has never flown", when: `${board} (first Monday, ${Math.ceil((bd - Date.now()) / DAY)} days)`, sev: "high", sources: cite(goLive?.id, "k_board_pays_1yo", "k_board_doubts_1yo") });
  q4.push({ risk: `The go-live plan promised to ${dana} is due`, detail: "She was told a plan would follow; nothing has been sent", when: "Within about 2 days", sev: "high", sources: cite(goLive?.id, P("emails/2026-10-19_dana_when.txt")) });
  q4.push({ risk: "The dock is not declared to the insurer, and the policy requires it before use", detail: "Flying it before it is notified would breach the policy's own condition", when: "At the first flight", sev: "high", sources: cite("k_insurer_not_told_1yo", "K_insurance_schedule_1yo") });
  q4.push({ risk: "Nobody at the estate holds a drone pilot certificate", detail: `${dana} assumed the system flies itself; no test flight was ever done`, when: "Already blocking go-live", sev: "high", sources: cite("k_no_pilot_1yo", "k_not_commissioned_1yo", "K_install_note_1yo") });
  q4.push({ risk: "The dock has never flown", detail: `${totalFlights} flights in ${weeks.length} weeks online${installed ? ", since registration on " + fmtD(installed) : ""}`, when: "Already happening", sev: "high", sources: cite(P("usage_weekly.csv"), P("devices.json")) });
  csv(rec("requests.csv")?.text).filter((r) => r.status !== "Closed").forEach((r) => q4.push({ risk: `${dana}'s only message has had no human reply`, detail: r.summary, when: `${daysSince(r.opened)} days since ${fmtD(r.opened)}; no owner`, sev: "high", sources: cite(P("requests.csv"), P("emails/2026-10-19_dana_when.txt")) }));
  q4.push({ risk: "The installer has gone and no longer answers calls", detail: "Nobody else is responsible for commissioning or training", when: "Already happening", sev: "med", sources: cite("k_installer_gone_1yo", "K_install_note_1yo") });
  if (renewal) q4.push({ risk: "Contract term ends with no automatic renewal", detail: "A year of subscription with no flights is a likely non-renewal", when: `${renewal.term_ends} (${Math.ceil((new Date(renewal.term_ends) - Date.now()) / DAY)} days)`, sev: "med", sources: cite(P("contract.txt"), P("profile.json")) });
  q4.sort((a, b) => ({ high: 0, med: 1, low: 2 }[a.sev] - { high: 0, med: 1, low: 2 }[b.sev]));

  // ---- Q5
  const q5 = [
    { gap: "What the insurer needs to accept the dock, and whether it costs extra", why: "Flying before notification breaches the policy; the cost could change what the estate will pay for", who: `${lucy} (insurance broker)` },
    { gap: "Who certifies the pilots, how long it takes and what it costs", why: `The course is offered at ${money(course?.value)}, but nothing says who delivers it or when`, who: "Pranjal Suyal; Achal Negi" },
    { gap: "How the residents will vote, and what evidence they need", why: "The vote decides the renewal, and some residents already doubt the purchase", who: `${graham} (board chair)` },
    { gap: "Whether the south entrance can be covered", why: "It was raised at install and never assessed; a second dock cannot be priced without it", who: `${dana}; the field team` },
    { gap: "What covers the entrances on nights the guard is off", why: "The insurance schedule lists a night guard on Friday and Saturday only; the estate wants night patrol of both entrances", who: `${dana}` },
    { gap: "What the estate paid the installer, and what the installer owed them", why: "The installer sold a mapping pitch the estate does not need and then left", who: "Achal Negi; FlytBase Accounts" },
  ];
  if (mySignals.length) q5.push({ gap: "Details behind the live event(s)", why: "Reaction is based on the first report only", who: "The customer contact named in the event" });

  const pipeline = [
    { id: P("contract.txt"), title: "Platform subscription, 1 dock", col: "agreed", amount: renewal?.annual_value, person: dana, blocker: null },
    ...exp.opportunities.map((o) => ({ id: o.id, title: o.title, col: ["agreed", "qualified"].includes(o.stage) ? o.stage : "identified", amount: o.worth_up_to, blocker: o.blocker?.status || null, person: dana })),
    ...exp.offers.map((o) => ({ id: o.id, title: o.title, col: o.status === "won" ? "agreed" : "offer", amount: o.value, person: o.pitch_to, blocker: null })),
  ];
  if (refs[P("contract.txt")]) refs[P("contract.txt")].meta = "Stage: agreed · Signed order through the installer, paid in full";

  const timeline = [...q3.map((m) => ({ date: m.due, label: "Move " + m.rank, sub: m.deal, kind: "move" })), { date: board, label: "Residents' board vote", sub: "renewal of the security budget", kind: "deadline" }, ...(renewal ? [{ date: renewal.term_ends, label: "Contract term ends", kind: "deadline" }] : [])];
  const ceiling = goLive?.worth_up_to || 0, offersN = exp.offers.filter((o) => o.status !== "won").reduce((n, o) => n + o.value, 0);
  const kpis = { backed: money(renewal?.annual_value || 0), ceiling: money(ceiling), bookedN: renewal?.annual_value || 0, ceilingN: ceiling, offersN, high: q4.filter((r) => r.sev === "high").length, moves: q3.length, claims: q1.unbacked.filter((r) => /claimed/.test(r.value)).length, currency: cur };
  const metrics = { facts: exp.facts.length, verified: exp.facts.filter((f) => f.status === "verified").length, opps: exp.opportunities.length, agreed: exp.opportunities.filter((o) => o.stage === "agreed").length };

  return { id, name: exp.name || profile.name || `Account ${id}`, refs, kpis, pipeline, metrics, usage: { series, docks: docks.length, flyingNow, last4 }, timeline, q1, q2, q3, q4, q5, source: "export" };
}
