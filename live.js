// Serverless-friendly data layer. Starts from the bundled seed (everything fetched during the build), then
// keeps itself current: it watches get_signals / whoami / list_notes and, when something changes, queues a
// re-pull of accounts, paperwork and any new files. One MCP call per refresh, never faster than the game's
// one-call-a-minute limit.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { tryCall } from "./mcp.js";
import { buildCrm } from "./analysis.js";

const REFRESH_MS = 70_000;
const WATCH = [["signals", "get_signals"], ["whoami", "whoami"], ["notes", "list_notes"]];

const state = (globalThis.__aq ||= (() => {
  const seed = JSON.parse(readFileSync(join(process.cwd(), "seed/store.json"), "utf8"));
  const sigs = seed.fetched.signals?.data?.signals || [];
  return { fetched: seed.fetched, checkedAt: 0, liveAt: 0, tick: 0, error: null, queue: [], sigN: sigs.length, fp: null, log: [] };
})());

const put = (key, data) => (state.fetched[key] = { at: new Date().toISOString(), data });
const note = (m) => { state.log.push(`${new Date().toISOString()} ${m}`); state.log = state.log.slice(-30); };
const queued = (key) => state.queue.some((q) => q[0] === key);
const enqueue = (key, tool, args) => { if (!queued(key)) state.queue.push([key, tool, args]); };

function requeueAll(accountIds) {
  enqueue("accounts", "get_my_accounts");
  for (const id of accountIds) enqueue(`paperwork_${id}`, "get_all_paperwork", { account: id });
}

function afterFetch(key, data) {
  if (key === "signals") {
    const n = (data?.signals || []).length;
    if (n > state.sigN) {
      state.sigN = n;
      note(`new signal(s): ${n}`);
      requeueAll((state.fetched.accounts?.data?.accounts || []).map((a) => a.id)); // new usage/paperwork may come with an event
    }
  }
  if (key === "whoami") {
    const fp = JSON.stringify({ n: data?.new_accounts, p: data?.pack });
    if (state.fp && fp !== state.fp) {
      note("whoami changed: re-pulling accounts and paperwork");
      requeueAll((data?.pack || []).map((p) => p.account));
    }
    state.fp = fp;
  }
  if (key === "accounts") {
    for (const f of data?.files || []) if (!state.fetched["file_" + f.id]) enqueue("file_" + f.id, "get_file", { id: f.id });
  }
}

export async function snapshot() {
  if (process.env.AQ_TOKEN && Date.now() - state.checkedAt > REFRESH_MS) {
    state.checkedAt = Date.now();
    let step;
    if (state.queue.length) step = state.queue[0];
    else { const w = WATCH[state.tick++ % WATCH.length]; step = [w[0], w[1], {}]; }
    try {
      const [key, tool, args] = step;
      const data = await tryCall(tool, args || {});
      if (state.queue[0] === step) state.queue.shift();
      put(key, data);
      afterFetch(key, data);
      state.liveAt = Date.now();
      state.error = null;
    } catch (e) {
      state.error = e.message === "rate-limited" ? null : e.message;
      if (state.error && state.queue[0] === step) state.queue.push(state.queue.shift()); // retry later
    }
  }
  const crm = buildCrm({ fetched: state.fetched });
  const n = state.fetched.notes?.data;
  crm.notes = Array.isArray(n) ? n : n?.notes || [];
  crm.status = {
    mode: state.liveAt ? "live" : process.env.AQ_TOKEN ? "connecting" : "snapshot",
    liveAt: state.liveAt ? new Date(state.liveAt).toISOString() : null,
    dataAsOf: state.fetched.accounts?.data?.exported_at || null,
    pending: state.queue.length,
    error: state.error,
  };
  return crm;
}

export async function saveNote(body) {
  const out = await tryCall("write_note", body);
  state.checkedAt = 0;
  state.tick = 2;
  return out;
}
