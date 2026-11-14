import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { store } from "./store.js";
import { liveLoop } from "./ingest.js";
import { callTool } from "./mcp.js";
import { buildCrm } from "./analysis.js";

if (!process.env.AQ_TOKEN) console.warn("AQ_TOKEN is not set: the CRM will show only what is already stored.");

const html = () => readFileSync("public/index.html", "utf8");
const json = (res, code, body) => {
  res.writeHead(code, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
};

createServer(async (req, res) => {
  try {
    if (req.url === "/" || req.url.startsWith("/?")) {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      return res.end(html());
    }
    if (req.url === "/api/crm") return json(res, 200, buildCrm(store));
    if (req.url === "/api/health") return json(res, 200, { ok: true, fetched: Object.keys(store.fetched), log: store.log.slice(-15) });
    if (req.url === "/api/note" && req.method === "POST") {
      let b = "";
      for await (const c of req) b += c;
      const { text, account, kind, title } = JSON.parse(b);
      if (!text) return json(res, 400, { error: "text required" });
      const out = await callTool("write_note", { text, account, kind, title });
      return json(res, 200, out);
    }
    json(res, 404, { error: "not found" });
  } catch (e) {
    json(res, 500, { error: e.message });
  }
}).listen(process.env.PORT || 3000, () => console.log("CRM on :" + (process.env.PORT || 3000)));

if (process.env.AQ_TOKEN) liveLoop();
