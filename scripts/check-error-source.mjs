#!/usr/bin/env node
// check-error-source.mjs — Assert error copy is not hardcoded outside src/lib/errors.ts.
//
// Usage: node scripts/check-error-source.mjs
//
// Scans src/pages and src/components for hardcoded error-message fragments that
// belong to ERROR_MESSAGES in src/lib/errors.ts. Pages/components must import
// the message from errors.ts, not retype it.
//
// Exit 0 = clean (no hardcoding). Exit 1 = hardcoded fragment found.

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";

const SCAN_DIRS = ["src/pages", "src/components"];
const SCAN_EXTENSIONS = [".ts", ".tsx"];

// Fragments unique enough to SPEC error copy that any hit means the message was
// retyped instead of imported from ERROR_MESSAGES.
const FORBIDDEN_FRAGMENTS = [
  "잠시 후 다시 시도",
  "이미 수정된 기록",
  "삭제되었거나 없는 기록",
  "모든 기록을 다 봤어요",
];

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const s = statSync(full);
    if (s.isDirectory()) {
      yield* walk(full);
    } else if (SCAN_EXTENSIONS.some((ext) => full.endsWith(ext))) {
      yield full;
    }
  }
}

let foundAny = false;

for (const dir of SCAN_DIRS) {
  if (!existsSync(dir)) continue;
  for (const file of walk(dir)) {
    const content = readFileSync(file, "utf8");
    for (const fragment of FORBIDDEN_FRAGMENTS) {
      if (content.includes(fragment)) {
        console.error(`✗ HARDCODED ERROR COPY: '${fragment}' found in ${file}`);
        console.error(`  → import from ERROR_MESSAGES in src/lib/errors.ts instead`);
        foundAny = true;
      }
    }
  }
}

if (foundAny) {
  process.exit(1);
}

console.log("✓ No hardcoded error copy in src/pages or src/components.");
