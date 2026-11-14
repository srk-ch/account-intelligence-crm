import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { snapshot, saveNote } from "./live.js";

// Local development server. On Vercel the same logic runs as api/crm.js and api/note.js.
if (!process.env.AQ_TOKEN) console.warn("AQ_TOKEN is not set: showing the bundled snapshot only.");
const json = (res, code, body) => { res.writeHead(code, { "content-type": "application/json" }); res.end(JSON.stringify(body)); };

createServer(async (req, res) => {
  try {
    if (req.url === "/" || req.url.startsWith("/?")) { res.writeHead(200, { "content-type": "text/html; charset=utf-8" }); return res.end(readFileSync("public/index.html", "utf8")); }
    if (req.url === "/api/crm") return json(res, 200, await snapshot());
    if (req.url === "/api/note" && req.method === "POST") {
      let b = ""; for await (const c of req) b += c;
      const { text, account, kind } = JSON.parse(b);
      if (!text) return json(res, 400, { error: "text required" });
      try { return json(res, 200, { ok: true, out: await saveNote({ text, account, kind }) }); }
      catch (e) { return json(res, e.message === "rate-limited" ? 429 : 500, { error: e.message === "rate-limited" ? `One call a minute. Try again in ${e.retryIn}s.` : e.message }); }
    }
    json(res, 404, { error: "not found" });
  } catch (e) { json(res, 500, { error: e.message }); }
}).listen(process.env.PORT || 3000, () => console.log("CRM on :" + (process.env.PORT || 3000)));
