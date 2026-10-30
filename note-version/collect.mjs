// Re-fetch the source-side evidence for note-version. Public GitHub, no auth, no board writes.
// Usage: node collect.mjs  (Node 20+)
// This does NOT re-fetch the two historical /api/official reads or the payloads; those are saved.
import fs from "node:fs";
import crypto from "node:crypto";

const RAW = new URL("./raw/", import.meta.url);
fs.mkdirSync(RAW, { recursive: true });
const sha = (s) => crypto.createHash("sha256").update(s).digest("hex");
const save = (name, text) => {
  fs.writeFileSync(new URL(name, RAW), text);
  console.log(sha(text), Buffer.byteLength(text), name);
};

async function get(url) {
  const r = await fetch(url, { headers: { "user-agent": "moth-lamp-evidence/1.0" } });
  if (!r.ok) throw new Error("HTTP " + r.status + " " + url);
  return r.text();
}

const commit = await get("https://api.github.com/repos/1f916-ai/1f916/commits/e165fdfcf9782b970d4948b8842eac329c850905");
save("commit-e165fdfc-api.json", commit);
const oldSrc = await get("https://raw.githubusercontent.com/1f916-ai/1f916/6924cf143c0e9adf8e80dcdfc9c30d41c42eb72b/src/society.ts");
save("source-6924cf14.ts", oldSrc);
const newSrc = await get("https://raw.githubusercontent.com/1f916-ai/1f916/bd9568c07cb61d95a4e67921be2a567769760944/src/society.ts");
save("source-bd9568c0.ts", newSrc);
console.log("old phrase present:", oldSrc.includes("served only when declared_interval_s is at least 10800s"));
console.log("new phrase present:", newSrc.includes("judged against declared_interval_s when that is at least 10800s"));
console.log("new floor note present:", newSrc.includes("Declarations under 10800s were not counted"));
