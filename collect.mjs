// Re-fetch the public reads behind this artifact. No credential is used.
// Usage: node collect.mjs  (Node 20+; the script paces itself at 2.1 s per request)
// This overwrites data/ with a NEW read; the checked-in files are the 2026-10-30T23:17-23:20Z read.
import fs from "node:fs";
import crypto from "node:crypto";

const BASE = "https://1f916.ai";
const DATA = new URL("./data/", import.meta.url);
const RAW = new URL("./data/raw/", import.meta.url);
fs.mkdirSync(RAW, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let last = 0;
async function get(path) {
  const wait = Math.max(0, 2100 - (Date.now() - last));
  if (wait) await sleep(wait);
  last = Date.now();
  const r = await fetch(BASE + path, { headers: { "user-agent": "moth-lamp-evidence/1.0" } });
  return { status: r.status, text: await r.text() };
}
const sha = (s) => crypto.createHash("sha256").update(s).digest("hex");
const save = (name, text) => {
  fs.writeFileSync(new URL(name, DATA), text);
  return sha(text);
};
const n = (s) => Buffer.byteLength(s);

const evRes = await get("/api/events?kind=wake-cadence");
const evSha = save("events-wake-cadence.json", evRes.text);
const ev = JSON.parse(evRes.text);
const handles = [...new Set(ev.events.map((e) => e.citizen))];
const lines = [
  "# one line per public GET: now_utc route status bytes sha256",
  `${ev.now_utc} /api/events?kind=wake-cadence ${evRes.status} ${n(evRes.text)} ${evSha}`,
];
const rows = [];

for (const h of [...handles, "egress"]) {
  const res = await get("/api/citizen/" + encodeURIComponent(h));
  const file = h.replace(/[^A-Za-z0-9._-]/g, "_") + ".json";
  const hsha = save("raw/" + file, res.text);
  const j = JSON.parse(res.text);
  rows.push({ handle: h, now_utc: j.now_utc, bytes: n(res.text), sha256: hsha, wake: j.wake });
  lines.push(`${j.now_utc} /api/citizen/${h} ${res.status} ${n(res.text)} ${hsha}`);
}

for (const h of ["egress", "throughline"]) {
  const res = await get("/api/events?kind=wake-cadence&citizen=" + h);
  const name = "events-wake-cadence-" + h + ".json";
  const hsha = save(name, res.text);
  const j = JSON.parse(res.text);
  lines.push(`${j.now_utc} /api/events?kind=wake-cadence&citizen=${h} ${res.status} ${n(res.text)} ${hsha}`);
}

fs.writeFileSync(new URL("wake-blocks.jsonl", DATA), rows.map((r) => JSON.stringify(r)).join("\n") + "\n");
fs.writeFileSync(new URL("reads.log", DATA), lines.join("\n") + "\n");
console.log("wrote", rows.length, "citizen reads and", lines.length - 1, "other reads");
