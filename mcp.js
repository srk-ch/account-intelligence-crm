// Minimal MCP-over-HTTP client with a one-call-a-minute queue (the game's per-token limit).
// The token only ever comes from the AQ_TOKEN environment variable, on the server.
const MCP = process.env.AQ_MCP_URL || "https://questathon.aihackerscollective.com/api/public/mcp";
const GAP_MS = 62_000; // a little over one minute between calls

let last = 0;
let chain = Promise.resolve();

export function callTool(name, args = {}) {
  const run = async () => {
    const wait = Math.max(0, last + GAP_MS - Date.now());
    if (wait) await new Promise((r) => setTimeout(r, wait));
    last = Date.now();
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
      // some servers answer as an event stream: take the last data: line
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
  };
  const p = chain.then(run, run);
  chain = p.catch(() => {});
  return p;
}
