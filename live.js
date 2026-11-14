// Serverless-friendly data layer. Starts from the bundled seed (everything fetched during the build), then
// keeps itself current with no code change and no manual step:
//   - it watches get_signals / whoami / list_notes, one MCP call per refresh;
//   - a new event queues a re-pull of accounts and paperwork (events can bring new records);
//   - whoami's new_accounts triggers get_new_account, the account's paperwork, and each of its files;
//   - a change in the pack queues a re-pull of everything for every account.
// Calls never go faster than the game's one-a-minute limit.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { tryCall } from "./mcp.js";
import { buildCrm } from "./analysis.js";

const REFRESH_MS = 70_000;
const WATCH = [["signals", "get_signals"], ["whoami", "whoami"], ["notes", "list_notes"]];

const state = (globalThis.__aq ||= (() => {
  const seed = JSON.parse(readFileSync(join(process.cwd(), "seed/store.json"), "utf8"));
  const sigs = seed.fetched.signals?.data?.signals || [];
  return { fetched: seed.fetched, checkedAt: 0, liveAt: 0, tick: 0, error: null, queue: [], sigN: sigs.length, fp: null, log: [], inited: false };
})());

const put = (key, data) => (state.fetched[key] = { at: new Date().toISOString(), data });
const note = (m) => { state.log.push(`${new Date().toISOString()} ${m}`); state.log = state.log.slice(-30); };
const queued = (key) => state.queue.some((q) => q[0] === key);
const enqueue = (key, tool, args) => { if (!queued(key)) state.queue.push([key, tool, args]); };

const exportIds = () => (state.fetched.accounts?.data?.accounts || []).map((a) => a.id);
const newIds = () => Object.keys(state.fetched).filter((k) => k.startsWith("newaccount_")).map((k) => k.slice("newaccount_".length));

// make sure a released account has its export and paperwork
function ensureAccount(id) {
  if (!state.fetched[`newaccount_${id}`]) enqueue(`newaccount_${id}`, "get_new_account", { account: id });
  if (!state.fetched[`paperwork_${id}`]) enqueue(`paperwork_${id}`, "get_all_paperwork", { account: id });
}

function requeueAll(ids) {
  enqueue("accounts", "get_my_accounts");
  for (const id of new Set(ids)) {
    enqueue(`paperwork_${id}`, "get_all_paperwork", { account: id });
    if (state.fetched[`newaccount_${id}`]) enqueue(`newaccount_${id}`, "get_new_account", { account: id });
  }
}

function afterFetch(key, data) {
  if (key === "signals") {
    const n = (data?.signals || []).length;
    if (n > state.sigN) {
      state.sigN = n;
      note(`new signal(s): ${n}`);
      requeueAll([...exportIds(), ...newIds()]); // an event can bring new usage and paperwork
    }
  }
  if (key === "whoami") {
    for (const n of data?.new_accounts || []) ensureAccount(n.id); // a released account is pulled in by itself
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
  if (key.startsWith("newaccount_")) {
    const id = key.slice("newaccount_".length);
    for (const f of data?.files || []) {
      const fk = `newfile_${id}_${f.id}`;
      if (!state.fetched[fk]) enqueue(fk, "get_new_account_file", { account: id, file_id: f.id });
    }
  }
}

export async function snapshot() {
  if (!state.inited) {
    state.inited = true;
    for (const n of state.fetched.whoami?.data?.new_accounts || []) ensureAccount(n.id);
    for (const id of newIds()) afterFetch(`newaccount_${id}`, state.fetched[`newaccount_${id}`].data);
  }
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
    accounts: crm.accounts.map((a) => a.id),
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
