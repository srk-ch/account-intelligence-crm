// Minimal MCP-over-HTTP client. The token only ever comes from AQ_TOKEN, on the server.
// The game allows one call a minute per token, so there are two ways to call:
//   callTool: waits its turn (used by the long-running local server)
//   tryCall:  never waits; refuses if a call was made too recently (used by serverless functions)
const MCP = process.env.AQ_MCP_URL || "https://questathon.aihackerscollective.com/api/public/mcp";
export const GAP_MS = 62_000;

let last = 0;
let chain = Promise.resolve();

async function rpc(name, args) {
  const res = await fetch(MCP, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
      authorization: `Bearer ${process.env.AQ_TOKEN}`,
    },
    body: JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method: "tools/call", params: { name, arguments: args } }),
  });
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    const line = text.split("\n").filter((l) => l.startsWith("data:")).pop();
    body = JSON.parse(line.slice(5));
  }
  const { result, error } = body;
  if (error || result?.isError) throw new Error(error?.message ?? result?.content?.[0]?.text ?? "MCP error");
  const t = result.content[0].text;
  try {
    return JSON.parse(t);
  } catch {
    return t;
  }
}

export function callTool(name, args = {}) {
  const run = async () => {
    const wait = Math.max(0, last + GAP_MS - Date.now());
    if (wait) await new Promise((r) => setTimeout(r, wait));
    last = Date.now();
    return rpc(name, args);
  };
  const p = chain.then(run, run);
  chain = p.catch(() => {});
  return p;
}

export async function tryCall(name, args = {}) {
  const wait = last + GAP_MS - Date.now();
  if (wait > 0) throw Object.assign(new Error("rate-limited"), { retryIn: Math.ceil(wait / 1000) });
  last = Date.now();
  return rpc(name, args);
}
