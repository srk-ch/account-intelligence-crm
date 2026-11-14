// Serverless-friendly data layer: starts from the bundled seed (everything fetched during the build),
// then lays live reads on top without ever breaking the one-call-a-minute limit.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { tryCall } from "./mcp.js";
import { buildCrm } from "./analysis.js";

const REFRESH_MS = 70_000;
const state = (globalThis.__aq ||= (() => {
  const seed = JSON.parse(readFileSync(join(process.cwd(), "seed/store.json"), "utf8"));
  return { fetched: seed.fetched, checkedAt: 0, liveAt: 0, tick: 0, error: null };
})());

export async function snapshot() {
  const stale = Date.now() - state.checkedAt > REFRESH_MS;
  if (process.env.AQ_TOKEN && stale) {
    state.checkedAt = Date.now();
    const tool = state.tick++ % 3 === 2 ? ["notes", "list_notes"] : ["signals", "get_signals"];
    try {
      state.fetched[tool[0]] = { at: new Date().toISOString(), data: await tryCall(tool[1]) };
      state.liveAt = Date.now();
      state.error = null;
    } catch (e) {
      state.error = e.message === "rate-limited" ? null : e.message;
    }
  }
  const crm = buildCrm({ fetched: state.fetched });
  const n = state.fetched.notes?.data;
  crm.notes = Array.isArray(n) ? n : n?.notes || [];
  crm.status = {
    mode: state.liveAt ? "live" : process.env.AQ_TOKEN ? "connecting" : "snapshot",
    liveAt: state.liveAt ? new Date(state.liveAt).toISOString() : null,
    dataAsOf: state.fetched.accounts?.data?.exported_at || null,
    error: state.error,
  };
  return crm;
}

export async function saveNote(body) {
  const out = await tryCall("write_note", body);
  state.checkedAt = 0; // pick up the saved note on the next refresh
  state.tick = 2;
  return out;
}
