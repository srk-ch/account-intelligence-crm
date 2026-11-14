// Background loop: pull everything once (one call a minute), then keep checking for live changes.
import { once, refresh } from "./store.js";

const ONCE = [
  ["accounts", "get_my_accounts"],
  ["schema", "get_data_format"],
  ["paperwork_A", "get_all_paperwork", { account: "A" }],
  ["paperwork_B", "get_all_paperwork", { account: "B" }],
  ["team", "get_flytbase_team"],
  ["feature_requests", "get_feature_requests"],
  ["release_notes", "get_release_notes"],
];

export async function bootstrap() {
  for (const [key, tool, args] of ONCE) await once(key, tool, args);
}

// Live reads cycle forever; each takes one of the per-minute calls.
export async function liveLoop() {
  const LIVE = [
    ["signals", "get_signals"],
    ["whoami", "whoami"],
    ["notes", "list_notes"],
  ];
  for (;;) {
    await bootstrap(); // retries anything that failed earlier; cheap when cached
    for (const [key, tool] of LIVE) await refresh(key, tool);
  }
}
