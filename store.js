// Tiny JSON-file store. Everything fetched from the MCP is saved here once and read from here after.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { callTool } from "./mcp.js";

const FILE = process.env.AQ_STORE || "data/store.json";
mkdirSync(FILE.split("/").slice(0, -1).join("/") || ".", { recursive: true });

export const store = existsSync(FILE) ? JSON.parse(readFileSync(FILE, "utf8")) : { fetched: {}, log: [] };
const save = () => writeFileSync(FILE, JSON.stringify(store, null, 1));

const note = (m) => {
  store.log.push({ at: new Date().toISOString(), m });
  store.log = store.log.slice(-200);
  console.log(m);
};

// Fetch a tool result once (cached by key). Failures are logged and retried on the next pass.
export async function once(key, tool, args = {}) {
  if (store.fetched[key]) return store.fetched[key].data;
  try {
    const data = await callTool(tool, args);
    store.fetched[key] = { at: new Date().toISOString(), data };
    save();
    note(`fetched ${key}`);
    return data;
  } catch (e) {
    note(`failed ${key}: ${e.message}`);
    return null;
  }
}

// Always-refetched live reads (get_signals, whoami, list_notes).
export async function refresh(key, tool, args = {}) {
  try {
    const data = await callTool(tool, args);
    const before = JSON.stringify(store.fetched[key]?.data);
    store.fetched[key] = { at: new Date().toISOString(), data };
    if (before !== JSON.stringify(data)) note(`updated ${key}`);
    save();
    return data;
  } catch (e) {
    note(`failed ${key}: ${e.message}`);
    return null;
  }
}

export const get = (key) => store.fetched[key]?.data ?? null;
