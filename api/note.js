import { saveNote } from "../live.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const b = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  const text = String(b.text || "").trim().slice(0, 1000);
  if (!text) return res.status(400).json({ error: "text required" });
  try {
    const out = await saveNote({ text, account: b.account, kind: b.kind, title: b.title });
    res.status(200).json({ ok: true, out });
  } catch (e) {
    if (e.message === "rate-limited") return res.status(429).json({ error: `The game allows one call a minute. Try again in ${e.retryIn}s.` });
    res.status(500).json({ error: e.message });
  }
}
