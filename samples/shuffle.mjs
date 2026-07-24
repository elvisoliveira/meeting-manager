#!/usr/bin/env node
// Anonymize (--revert) or de-anonymize (default) every *.json in this
// directory, using shuffle-map.json. Same CLI direction as the old shuffle.sh,
// but JSON-aware: renames object keys and exact string values (including
// "A|B" substitution segments and eligibility `family` values) — no substring
// or case accidents. Validates eligibility/absences names and fails loudly on
// anything unmapped, instead of leaking it silently.
//
// Usage:  node shuffle.mjs            # fake -> real
//         node shuffle.mjs --revert   # real -> fake
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const DIR = dirname(fileURLToPath(import.meta.url));
const MAP = JSON.parse(readFileSync(join(DIR, "shuffle-map.json"), "utf8"));
const toFake = process.argv.includes("--revert");

const invert = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [v, k]));
const pick = (o) => (toFake ? o : invert(o));
const names = { ...pick(MAP.people), ...pick(MAP.congregation) }; // exact-match values/keys
const reverseNames = { ...(toFake ? invert(MAP.people) : MAP.people) };
const families = pick(MAP.families);
const reverseFamilies = toFake ? invert(MAP.families) : MAP.families;
const months = pick(MAP.months);

const warnings = [];
const errors = [];

function mapName(s) {
  if (s.includes("|")) return s.split("|").map(mapName).join("|"); // "A|B" substitution
  if (s in names) return names[s];
  if (s in reverseNames) warnings.push(`"${s}" already in target state — left as-is`);
  return s;
}

function mapFamily(s) {
  if (s in families) return families[s];
  if (s in reverseFamilies) {
    warnings.push(`family "${s}" already in target state — left as-is`);
    return s;
  }
  errors.push(`unmapped family "${s}" — add it to shuffle-map.json`);
  return s;
}

// Month names appear only inside week labels, in arbitrary case ("DE AGOSTO").
function mapLabel(s) {
  for (const [from, to] of Object.entries(months)) {
    const re = new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    s = s.replace(re, (hit) => (hit === hit.toUpperCase() ? to.toUpperCase() : to));
  }
  return s;
}

function walk(node, key) {
  if (typeof node === "string") {
    if (key === "label") return mapLabel(node);
    if (key === "family") return mapFamily(node);
    return mapName(node);
  }
  if (Array.isArray(node)) return node.map((v) => walk(v, key));
  if (node && typeof node === "object") {
    return Object.fromEntries(Object.entries(node).map(([k, v]) => [mapName(k), walk(v, k)]));
  }
  return node;
}

// Strict check: these names are structural — unmapped means the map drifted.
function checkPeople(file, list) {
  for (const n of list) {
    if (!(n in names) && !(n in reverseNames)) {
      errors.push(`${file}: unmapped person "${n}" — add them to shuffle-map.json`);
    }
  }
}

const files = readdirSync(DIR).filter((f) => f.endsWith(".json") && f !== "shuffle-map.json");
const parsed = new Map(files.map((f) => [f, JSON.parse(readFileSync(join(DIR, f), "utf8"))]));

const elig = parsed.get("eligibility.json");
if (elig) {
  checkPeople("eligibility.json", Object.keys(elig.people));
  for (const p of Object.values(elig.people)) {
    checkPeople("eligibility.json", [...(p.only_pair_with ?? []), ...(p.cannot_pair_with ?? [])]);
  }
}
const abs = parsed.get("absences.json");
if (abs) checkPeople("absences.json", Object.keys(abs.absences));

const transformed = new Map([...parsed].map(([f, data]) => [f, walk(data, null)]));

if (errors.length) {
  for (const e of [...new Set(errors)]) console.error(`error: ${e}`);
  console.error("no files written");
  process.exit(1);
}
for (const w of [...new Set(warnings)]) console.warn(`warn: ${w}`);

for (const [f, data] of transformed) {
  const raw = readFileSync(join(DIR, f), "utf8");
  const indent = /\n( +)"/.exec(raw)?.[1].length ?? 4;
  writeFileSync(join(DIR, f), JSON.stringify(data, null, indent) + "\n");
}
console.log(`${transformed.size} files rewritten (${toFake ? "real -> fake" : "fake -> real"})`);
