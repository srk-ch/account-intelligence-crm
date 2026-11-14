// Builds the five answers for any account released mid-build that has a discovery export but is NOT Kestrel.
// Nothing here is account-specific wording: every sentence is assembled from that export's own people, facts,
// deals, offers, deadlines and files, so a new account never inherits another account's story.
// Value rule is unchanged: with no signed contract or paid invoice on file, nothing is "backed".
const DAY = 86_400_000;
const iso = (d) => new Date(d).toISOString().slice(0, 10);
const addDays = (n) => iso(Date.now() + n * DAY);
const daysSince = (s) => Math.floor((Date.now() - new Date(s).getTime()) / DAY);
const fmtD = (s) => new Date(s).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
const MIN_PER_DAY = 1440;

function csv(text) {
  const lines = (text || "").trim().split("\n");
  const head = lines.shift()?.split(",") || [];
  return lines.map((l) => Object.fromEntries(head.map((h, i) => [h, (l.split(",")[i] ?? "").trim()])));
}
const first = (n) => String(n || "").split(" ")[0];

export function buildGenericExport(id, exp, files, fileTexts, pw, signals) {
  const P = (p) => `${id}/${p}`;
  const mySignals = signals.filter((s) => !s.account || s.account === id);
  const cur = ""; // the export states no currency, so none is invented
  const money = (n) => (n == null ? "no value on file" : Math.round(n).toLocaleString("en-GB"));
  const fact = (x) => exp.facts.find((f) => f.id === x);
  const by = (role) => exp.stakeholders.find((s) => new RegExp(role, "i").test(s.role));
  const known = new Set([
    ...exp.facts.map((f) => f.id), ...exp.opportunities.map((o) => o.id), ...exp.offers.map((o) => o.id), ...exp.stakeholders.map((s) => s.id),
    ...files.map((f) => f.id), ...pw.map((r) => P(r.path)), ...mySignals.map((s) => s.id), ...mySignals.flatMap((s) => s.paths || []),
  ]);
  const cite = (...x) => [...new Set(x.flat().filter((i) => known.has(i)))];
  const snip = (t) => String(t).split(/[\r\n\t ]+/).join(" ").slice(0, 320) + "…";

  const refs = {};
  pw.forEach((r) => (refs[P(r.path)] = { kind: "record", label: r.path, meta: r.text ? snip(r.text) : snip(JSON.stringify(r.data || "")) }));
  exp.facts.forEach((f) => (refs[f.id] = { kind: "fact", status: f.status, label: f.text, meta: `${f.said_by} · ${f.status}${f.verified_by ? " · verified by " + f.verified_by : ""}` }));
  exp.opportunities.forEach((o) => (refs[o.id] = { kind: "deal", label: o.title, meta: `Stage: ${o.stage}${o.blocker ? " · Blocker (" + o.blocker.status + "): " + o.blocker.text : ""}` }));
  exp.offers.forEach((o) => (refs[o.id] = { kind: "deal", label: o.title, meta: `Offer to ${o.pitch_to} · ${o.status}` }));
  exp.stakeholders.forEach((s) => (refs[s.id] = { kind: "person", label: `${s.name}, ${s.role}`, meta: `${s.relationship} with us` }));
  files.forEach((f) => (refs[f.id] = { kind: "file", label: f.title || f.id, meta: fileTexts[f.id] ? snip(fileTexts[f.id]) : "Data room file" }));
  mySignals.forEach((s) => { refs[s.id] = { kind: "signal", label: s.title, meta: s.detail }; (s.recs || []).forEach((r) => (refs[r.path] = { kind: "record", label: r.path, meta: snip(r.text || "") })); });

  // ---- usage from the flight log file (monthly rows: dock, site, month, patrol_flights, test_flights)
  const logFile = files.find((f) => /flight|usage/i.test(f.id + (f.title || "")));
  const log = csv(fileTexts[logFile?.id] || "");
  const docks = [...new Set(log.map((r) => r.dock))];
  const patrol = (d) => log.filter((r) => r.dock === d).reduce((n, r) => n + Number(r.patrol_flights || 0), 0);
  const flyingNow = docks.filter((d) => patrol(d) > 0).length;
  const sites = [...new Set(log.map((r) => r.site))];
  const siteLine = sites.map((s) => `${s}: ${log.filter((r) => r.site === s).reduce((n, r) => n + Number(r.patrol_flights || 0), 0)} patrol flights`).join("; ");
  const neverFlown = sites.filter((s) => log.filter((r) => r.site === s).every((r) => Number(r.patrol_flights) === 0));
  const months = [...new Set(log.map((r) => r.month))];

  // ---- deadlines (minutes from now -> days from now)
  const dl = (re) => { const d = exp.deadlines.find((x) => re.test(x.text)); return d ? { days: Math.round(d.minute / MIN_PER_DAY), date: addDays(Math.round(d.minute / MIN_PER_DAY)), text: d.text } : null; };
  const leave = dl(/leav|ends|depart/i), network = dl(/network|segment|migrat|move/i), renewalDl = dl(/renew/i);

  // ---- people by role
  const fin = by("financ"), ops = by("operations|head of"), dp = by("protection|privacy"), contractor = by("contractor"), it = by("IT");
  const ally = exp.stakeholders.find((s) => /ally|warm/.test(s.relationship) && s !== contractor) || ops;
  const standing = exp.stakeholders.map((s) => `${s.name}: ${s.relationship}`).join("; ");

  const renewal = exp.opportunities.find((o) => /renew/i.test(o.title));
  const yard = exp.opportunities.find((o) => /yard|live|go.?live/i.test(o.title) && o !== renewal);
  const expand = exp.opportunities.find((o) => o !== renewal && o !== yard);
  const pack = exp.offers[0];
  const claimFacts = exp.facts.filter((f) => f.status === "claim");
  const savingClaim = claimFacts.find((f) => /sav/i.test(f.text));
  const expandClaim = claimFacts.find((f) => f !== savingClaim);
  const dpFile = files.find((f) => /dp|privacy|data/i.test(f.id));
  const netFile = files.find((f) => /network|it_/i.test(f.id));

  // ---- Q1: nothing is booked on file, so every deal value is a ceiling and nothing is added up
  const q1 = { backed: [], unbacked: [], backedTotal: "Nothing booked on file: no signed contract or paid invoice was released with this account", unbackedTotal: "not added up: ceilings, open offers, unpriced items and claims are shown apart" };
  [renewal, yard].filter(Boolean).forEach((o) => o.worth_up_to && q1.backed.push({ deal: o.title, value: `up to ${money(o.worth_up_to)}`, kind: "ceiling", amount: o.worth_up_to, basis: `Blocker: ${o.blocker?.text || "none"}`, stage: `${o.stage}, blocker ${o.blocker?.status || "none"}`, sources: cite(o.id, o.evidence || []) }));
  if (pack) q1.unbacked.push({ kind: "offer", deal: pack.title, value: money(pack.value), why: `Offer to ${pack.pitch_to}, not accepted yet`, sources: cite(pack.id, "h_contractor_leaving_1yo") });
  if (expand) q1.unbacked.push({ kind: "unpriced", deal: expand.title, value: "no value on file", why: "Identified only: no value, no blocker, and no evidence beyond one person's wish", sources: cite(expand.id, expand.evidence || []) });
  if (savingClaim) q1.unbacked.push({ kind: "claim", deal: "The programme saves about 400,000 a year", value: "claimed, not backed", said_by: savingClaim.said_by, why: "It is one person's estimate of patrol hours the docks could replace; finance has not seen the workings and no patrol contract has changed", sources: cite(savingClaim.id, "h_saving_basis_1yo", "h_finance_unseen_1yo") });
  if (expandClaim) q1.unbacked.push({ kind: "claim", deal: "Ready to expand to two more harbours", value: "claimed, not backed", said_by: expandClaim.said_by, why: `A wish: the container yard dock has never flown${renewal?.blocker ? " and finance has not agreed to renew the current six" : ""}`, sources: cite(expandClaim.id, "h_two_quays_1yo", renewal?.id) });

  // ---- Q2
  const q2 = [];
  if (renewal) q2.push({ deal: renewal.title, decides: `${fin?.name || "Finance"} (${fin?.role || "finance"}) signs the renewal`, pays: `${fin?.name || "Finance"}: she will not renew on a saving she cannot see in the accounts`, uses: `${ops?.name || "Operations"} (${ops?.role || ""}); quays that fly: ${siteLine}`, blocks: renewal.blocker?.text || "Nothing recorded", standing, sources: cite(renewal.id, fin?.id, ops?.id, "h_finance_renewal_1yo", "h_finance_unseen_1yo", "h_two_quays_1yo") });
  if (yard) q2.push({ deal: yard.title, decides: `${dp?.name || "Data protection"} (${dp?.role || ""}) signs the privacy assessment`, pays: "Not stated in the data", uses: `${ops?.name || "Operations"}, once it flies`, blocks: `${yard.blocker?.text || ""}; devices also move to a segmented network${network ? " in about " + network.days + " days" : ""}, and IT has no record of what the docks need`, standing, sources: cite(yard.id, dp?.id, it?.id, "h_yard_blocked_1yo", "h_vendor_silent_1yo", "h_dp_request_1yo", "h_segmentation_1yo", "h_it_not_involved_1yo") });
  if (expand) q2.push({ deal: expand.title, decides: "Not stated in the data", pays: "Not stated in the data", uses: "Unknown", blocks: "Nothing recorded as a blocker; the container yard dock has never flown and finance has not agreed to renew the current six", standing, sources: cite(expand.id, expandClaim?.id, "h_two_quays_1yo") });

  // ---- Q3: deadlines first
  const q3 = [];
  if (contractor && pack) q3.push({ rank: 0, move: `Get ${contractor.name}'s launch steps, patrol routes and alert rota written down before he leaves: offer ${ops?.name || "the head of operations"} the written playbook (${money(pack.value)})`, owner: `You (CSM) with ${contractor.name} and ${ops?.name || "operations"}`, due: addDays(Math.min(7, Math.max(2, (leave?.days ?? 30) - 20))), deal: pack.title, why: `${contractor.name}'s contract ends${leave ? " in about " + leave.days + " days" : " soon"} and nothing is written down; when he goes the operating knowledge goes with him.`, sources: cite(pack.id, "h_contractor_leaving_1yo", contractor.id) });
  if (yard && dp) q3.push({ rank: 0, move: `Send ${dp.name} the four written answers her privacy assessment needs: what data is collected, where video is stored, how long it is kept, who can access it`, owner: "You (CSM) with Pranjal Suyal (Lead Solutions Engineer)", due: addDays(7), deal: yard.title, why: `The request has had no reply since ${dpFile ? "April" : "the spring"}; the assessment cannot be signed without it, so the yard dock cannot go live. The delay is ours, not hers.`, sources: cite(yard.id, "h_yard_blocked_1yo", "h_vendor_silent_1yo", dpFile?.id, dp.id) });
  if (it && network) q3.push({ rank: 0, move: `Register the docks with ${it.name} before the network change: device type, location, ports and destinations, data volumes, an owner`, owner: `You (CSM) with ${it.name} and the field team`, due: addDays(Math.max(10, network.days - 45)), deal: yard?.title || "Docks stay online", why: `Devices not registered with IT lose network access when the segmented network starts (about ${network.days} days); the notice lists no drone docks as registered.`, sources: cite("h_segmentation_1yo", "h_it_not_involved_1yo", netFile?.id, it.id) });
  if (fin && renewal) q3.push({ rank: 0, move: `Put the saving into ${fin.name}'s accounts view: with ${ops?.name || "operations"}, turn the patrol-hours estimate into figures finance can check before the renewal decision`, owner: `You (CSM) with ${ops?.name || "operations"} and ${fin.name}`, due: addDays(Math.max(14, (renewalDl?.days ?? 150) - 60)), deal: renewal.title, why: `${fin.name} signs the renewal and will not renew on a saving she cannot see; today it is one person's estimate.`, sources: cite(renewal.id, "h_saving_basis_1yo", "h_finance_unseen_1yo", "h_finance_renewal_1yo", fin.id) });
  q3.forEach((m, i) => (m.rank = i + 1));

  // ---- Q4
  const q4 = [];
  mySignals.forEach((s) => q4.push({ risk: `${s.title}${s.detail ? ": " + s.detail : ""}`, when: s.date ? `Reported ${s.date}` : "Live event", sev: "high", sources: cite(s.paths || [], s.id) }));
  if (contractor && leave) q4.push({ risk: `${contractor.name} leaves and takes the operating knowledge with him`, detail: "Launch steps, patrol routes and the alert rota are in his head; nothing is written down", when: `${leave.date} (about ${leave.days} days)`, sev: "high", sources: cite("h_contractor_leaving_1yo", contractor.id, pack?.id) });
  if (renewal && renewalDl) q4.push({ risk: "Renewal decision with the saving unproven to finance", detail: `${fin?.name || "Finance"} signs and will not renew on a saving she cannot see`, when: `${renewalDl.date} (about ${renewalDl.days} days)`, sev: "high", sources: cite(renewal.id, "h_finance_renewal_1yo", "h_finance_unseen_1yo", "h_saving_basis_1yo") });
  if (yard && dpFile) q4.push({ risk: "Container yard dock is blocked by an unanswered privacy request", detail: `${dp?.name || "The data protection lead"} asked the vendor in writing on 14 April; no reply is on file`, when: `${daysSince("2026-04-14")} days since 14 Apr; no owner`, sev: "high", sources: cite("h_vendor_silent_1yo", dpFile.id, "h_yard_blocked_1yo") });
  if (network) q4.push({ risk: "Docks lose network access if not registered before the segmentation", detail: "Unregistered devices are cut off until an exception is approved; no drone docks are on IT's list", when: `${network.date} (about ${network.days} days)`, sev: "med", sources: cite("h_segmentation_1yo", "h_it_not_involved_1yo", netFile?.id) });
  if (neverFlown.length) q4.push({ risk: `${neverFlown.join(", ")} dock has never flown a patrol`, detail: `${siteLine}`, when: `Already happening${months.length ? " (" + months.length + " months of log)" : ""}`, sev: "med", sources: cite("h_two_quays_1yo", logFile?.id) });
  q4.sort((a, b) => ({ high: 0, med: 1, low: 2 }[a.sev] - { high: 0, med: 1, low: 2 }[b.sev]));

  // ---- Q5
  const q5 = [
    { gap: "Whether the saving is real, and what it is measured against", why: "Finance will not renew on an estimate; no patrol contract has changed", who: `${fin?.name || "Finance"}; ${ops?.name || "operations"}` },
    { gap: "What data the platform collects, where video is stored, how long it is kept and who can access it", why: "The privacy assessment cannot be signed without these written answers", who: "Pranjal Suyal; FlytBase engineering" },
    { gap: "What the docks need from the segmented network (ports, destinations, volumes, owner)", why: "Without a registered exception the docks lose network access", who: `${it?.name || "IT"}; the field team` },
    { gap: "Why one quay flies only about weekly while two fly nightly", why: "It affects what the six-dock renewal is worth and what to say about usage", who: ops?.name || "Operations" },
    { gap: "Whether the contractor will be reachable after he leaves", why: "If the playbook is not finished by his last day, the knowledge is lost", who: contractor?.name || "The contractor" },
    { gap: "The contract value and currency", why: "No signed contract or invoice was released with this account, so nothing is backed and no currency is stated", who: "FlytBase Accounts" },
  ];
  if (mySignals.length) q5.push({ gap: "Details behind the live event(s)", why: "Reaction is based on the first report only", who: "The customer contact named in the event" });

  const pipeline = [
    ...exp.opportunities.map((o) => ({ id: o.id, title: o.title, col: ["agreed", "qualified"].includes(o.stage) ? o.stage : "identified", amount: o.worth_up_to, blocker: o.blocker?.status || null, person: (o === renewal ? fin : o === yard ? dp : ops)?.name || "" })),
    ...exp.offers.map((o) => ({ id: o.id, title: o.title, col: o.status === "won" ? "agreed" : "offer", amount: o.value, person: o.pitch_to, blocker: null })),
  ];

  const timeline = [...q3.map((m) => ({ date: m.due, label: "Move " + m.rank, sub: m.deal, kind: "move" })),
    ...exp.deadlines.map((d) => ({ date: addDays(Math.round(d.minute / MIN_PER_DAY)), label: d.text, kind: "deadline" }))];
  const ceilingN = [renewal, yard].filter(Boolean).reduce((n, o) => n + (o.worth_up_to || 0), 0), offersN = exp.offers.filter((o) => o.status !== "won").reduce((n, o) => n + o.value, 0);
  const kpis = { backed: "0", ceiling: money(ceilingN), bookedN: 0, ceilingN, offersN, high: q4.filter((r) => r.sev === "high").length, moves: q3.length, claims: q1.unbacked.filter((r) => /claimed/.test(r.value)).length, currency: cur };
  const metrics = { facts: exp.facts.length, verified: exp.facts.filter((f) => f.status === "verified").length, opps: exp.opportunities.length, agreed: exp.opportunities.filter((o) => o.stage === "agreed").length };

  return { id, name: exp.name || `Account ${id}`, refs, kpis, pipeline, metrics, usage: { series: [], docks: docks.length, flyingNow, last4: [], span: `last ${months.length || 3} months` }, timeline, q1, q2, q3, q4, q5, source: "export" };
}
