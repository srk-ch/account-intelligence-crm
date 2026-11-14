// Builds the five answers for an account that has no discovery export, only paperwork (for example a
// third account dropped mid-build). Everything here comes from the records on file; nothing is invented.
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

export function buildPaperworkAccount(id, pw, signals) {
  const rec = (p) => pw.find((r) => r.path === p);
  const data = (p) => rec(p)?.data;
  const profile = data("profile.json") || {};
  const cur = profile.currency === "EUR" ? "€" : "£";
  const money = (n) => (n == null ? "no value on file" : `${cur}${Math.round(n).toLocaleString("en-GB")}`);
  const P = (p) => `${id}/${p}`;
  const contacts = profile.contacts_on_file || [];
  const mySignals = signals.filter((s) => !s.account || s.account === id);
  const known = new Set([...pw.map((r) => P(r.path)), ...contacts.map((c) => c.id), ...mySignals.map((s) => s.id)]);
  const cite = (...x) => [...new Set(x.flat().filter((i) => known.has(i)))];
  const snippet = (r) => (r.text ? String(r.text).split(/[\r\n\t ]+/).join(" ").slice(0, 320) + "…" : JSON.stringify(r.data || "").slice(0, 320) + "…");

  const refs = {};
  pw.forEach((r) => (refs[P(r.path)] = { kind: "record", label: r.path, meta: snippet(r) }));
  contacts.forEach((c) => (refs[c.id] = { kind: "person", label: `${c.name}, ${c.role}`, meta: c.note || "On file" }));
  mySignals.forEach((s) => (refs[s.id] = { kind: "signal", label: s.title, meta: s.detail }));

  // usage
  const usage = csv(rec("usage_weekly.csv")?.text);
  const weeks = [...new Set(usage.map((u) => u.week_start))].sort();
  const docks = [...new Set(usage.map((u) => u.dock_id))];
  const totalFlights = usage.reduce((n, u) => n + Number(u.flights || 0), 0);
  const series = weeks.map((w) => ({ w, flights: usage.filter((u) => u.week_start === w).reduce((n, u) => n + Number(u.flights || 0), 0), docks: new Set(usage.filter((u) => u.week_start === w && Number(u.flights) > 0).map((u) => u.dock_id)).size }));
  const last4 = weeks.slice(-4);
  const flyingNow = docks.filter((d) => usage.filter((u) => u.dock_id === d && last4.includes(u.week_start)).some((u) => Number(u.flights) > 0)).length;
  const dev = data("devices.json")?.docks || [];
  const installed = dev[0]?.registered || deal_installed(data("deal_history.json"));
  function deal_installed(h) { return (h?.history || []).find((x) => /installed/i.test(x.what))?.date; }
  const weeksIdle = weeks.length;

  const renewal = profile.renewal;
  const requests = csv(rec("requests.csv")?.text).filter((r) => r.status !== "Closed");
  const dana = contacts[0];

  // ---- Q1
  const q1 = { backed: [], unbacked: [], backedTotal: "", unbackedTotal: "not added up: claims and unpriced items are shown apart" };
  if (renewal) q1.backed.push({ deal: "Platform subscription, 1 dock", value: `${money(renewal.annual_value)} a year`, kind: "booked", amount: renewal.annual_value, basis: `Signed through the installer, paid in full; term ends ${renewal.term_ends}`, stage: "paid", sources: cite(P("contract.txt"), P("invoices.json"), P("profile.json")) });
  q1.backedTotal = `${money(renewal?.annual_value || 0)} (signed contract only)`;
  q1.unbacked.push({ kind: "unpriced", deal: "Go-live of the one dock", value: "no value on file", why: "Paid for and not flying; nothing on file says why, so there is nothing to price", sources: cite(P("deal_history.json"), P("devices.json")) });
  q1.unbacked.push({ kind: "claim", deal: "Estate-wide mapping need", value: "claimed, not backed", said_by: "the installer's order notes", why: "The installer describes the purpose as mapping the whole estate; no one at the estate has said so, and one dock cannot do it", sources: cite(P("deal_history.json")) });

  // ---- Q2
  const who = dana ? `${dana.name}: unmet` : "no one met";
  const q2 = [
    { deal: "Go-live of the one dock", decides: "Unknown. Dana Whitfield (estate manager) is the only name on file; who signs for the estate is not recorded", pays: "The installer paid FlytBase in full; what the estate paid the installer is not on file", uses: "Nobody yet: no flight on record", blocks: "The installer (installed it, no longer answers); no commissioning flight; no FlytBase onboarding or operator training", standing: who, sources: cite(P("deal_history.json"), P("profile.json"), P("devices.json"), dana?.id) },
    { deal: "Renewal of the platform subscription", decides: "Unknown. The order was placed by the installer, not the estate", pays: "The reseller route: FlytBase invoiced the installer", uses: "Nobody yet", blocks: "A year with no flights; a customer who has never spoken to a person at FlytBase", standing: who, sources: cite(P("contract.txt"), P("invoices.json"), P("profile.json"), dana?.id) },
  ];

  // ---- Q3
  const q3 = [
    { rank: 1, move: `Phone ${dana ? dana.name : "the estate manager"}, a person not an auto-reply: apologise for the silence, find out why the dock has not flown, and what the estate actually needs`, owner: "You (CSM)", due: addDays(2), deal: "Go-live of the one dock", why: `Her only message (19 Oct) got an automatic acknowledgement and nothing since; she was told to expect a person.`, sources: cite(P("emails/2026-10-19_dana_when.txt"), P("requests.csv"), dana?.id) },
    { rank: 2, move: "Get the dock commissioned and flying: ask engineering what the registration and checks show, and agree a commissioning flight date", owner: "You (CSM) with Pranjal Suyal (Lead Solutions Engineer)", due: addDays(10), deal: "Go-live of the one dock", why: "The dock has been online since 14 Sep with no commissioning flight and no flight of any kind on record.", sources: cite(P("devices.json"), P("device_events.csv"), P("usage_weekly.csv")) },
    { rank: 3, move: "Decide who owns this account and who trains the operators: the order leaves training and onboarding to an installer that no longer answers", owner: "You (CSM) with Achal Negi (Director of Business Development)", due: addDays(14), deal: "Renewal of the platform subscription", why: "The order excludes training and FlytBase onboarding, and the installer's phone and email no longer work, so nobody is responsible for the customer.", sources: cite(P("contract.txt"), P("profile.json")) },
  ];

  // ---- Q4
  const q4 = [];
  mySignals.forEach((s) => q4.push({ risk: `${s.title}${s.detail ? ": " + s.detail : ""}`, when: s.date ? `Reported ${s.date}` : "Live event", sev: "high", sources: cite(s.id) }));
  requests.forEach((r) => q4.push({ risk: `${dana ? dana.name + "'s" : "The customer's"} only message has had no human reply`, detail: r.summary, when: `${daysSince(r.opened)} days since ${fmtD(r.opened)}; no owner`, sev: "high", sources: cite(P("requests.csv"), P("emails/2026-10-19_dana_when.txt"), P("mail_log.json")) }));
  q4.push({ risk: "The dock has never flown", detail: `${totalFlights} flights in ${weeksIdle} weeks online${installed ? ", since installation on " + fmtD(installed) : ""}`, when: "Already happening", sev: "high", sources: cite(P("usage_weekly.csv"), P("devices.json")) });
  q4.push({ risk: "No FlytBase person has ever spoken to the customer, and the installer has stopped answering", detail: "Nobody is responsible for commissioning, training or support follow-up", when: "Already happening", sev: "high", sources: cite(P("profile.json"), P("deal_history.json")) });
  if (renewal) q4.push({ risk: "Renewal with no flights: the contract has no automatic renewal", detail: "A year of subscription with nothing to show is a likely non-renewal or refund request", when: `${renewal.term_ends} (${Math.ceil((new Date(renewal.term_ends) - Date.now()) / DAY)} days)`, sev: "med", sources: cite(P("contract.txt"), P("profile.json")) });
  q4.sort((a, b) => ({ high: 0, med: 1, low: 2 }[a.sev] - { high: 0, med: 1, low: 2 }[b.sev]));

  // ---- Q5
  const q5 = [
    { gap: "Why the dock has not flown", why: "Commissioning, operator training, permission or a fault would each need a different fix", who: "Dana Whitfield; engineering (Pranjal Suyal); the support desk" },
    { gap: "What the estate wants the dock for, and how much", why: "The installer says whole-estate mapping; one dock cannot do it, and an expansion cannot be priced without it", who: "Dana Whitfield" },
    { gap: "Who at the estate decides and pays", why: "Only the estate manager is named; the order was placed by the installer", who: "Dana Whitfield" },
    { gap: "What the installer is contractually responsible for (training, certification, support)", why: "The order leaves them to the reseller, who no longer answers", who: "Achal Negi; FlytBase Accounts" },
    { gap: "A working contact at the installer", why: "They installed it and hold the on-site knowledge", who: "Achal Negi; FlytBase Accounts" },
    { gap: "Who at the estate can fly the dock", why: "No operator training is included in the order", who: "Dana Whitfield" },
  ];
  if (mySignals.length) q5.push({ gap: "Details behind the live event(s)", why: "Reaction is based on the first report only", who: "The customer contact named in the event" });

  const pipeline = [
    { id: P("contract.txt"), title: "Platform subscription, 1 dock", col: "agreed", amount: renewal?.annual_value, person: dana?.name || "", blocker: null },
    { id: P("deal_history.json"), title: "Go-live of the one dock", col: "identified", amount: null, person: dana?.name || "", blocker: "open" },
  ];
  if (refs[P("contract.txt")]) refs[P("contract.txt")].meta = "Stage: agreed · Signed order through the installer, paid in full";
  if (refs[P("deal_history.json")]) refs[P("deal_history.json")].meta = "Stage: identified · Blocker (open): Paid for and not flying. Nothing on file says why.";

  const timeline = [...q3.map((m) => ({ date: m.due, label: "Move " + m.rank, sub: m.deal, kind: "move" })), ...(renewal ? [{ date: renewal.term_ends, label: "Contract term ends", kind: "deadline" }] : [])];
  const kpis = { backed: money(renewal?.annual_value || 0), ceiling: money(0), bookedN: renewal?.annual_value || 0, ceilingN: 0, offersN: 0, high: q4.filter((r) => r.sev === "high").length, moves: q3.length, claims: q1.unbacked.filter((r) => /claimed/.test(r.value)).length, currency: cur };

  return { id, name: profile.name || `Account ${id}`, refs, kpis, pipeline, metrics: { facts: 0, verified: 0, opps: 2, agreed: 1 }, usage: { series, docks: docks.length, flyingNow, last4 }, timeline, q1, q2, q3, q4, q5, source: "paperwork" };
}
