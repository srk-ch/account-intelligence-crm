import { snapshot } from "../live.js";

export default async function handler(req, res) {
  try {
    res.setHeader("cache-control", "no-store");
    res.status(200).json(await snapshot());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
