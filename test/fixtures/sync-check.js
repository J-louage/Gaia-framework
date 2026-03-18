/**
 * Fixture Sync Check
 *
 * Verifies that test fixtures in mock-framework/ reflect the real framework
 * structure. Run as a pre-test sanity check to catch fixture drift.
 *
 * Usage: node test/fixtures/sync-check.js
 */

import { existsSync } from "fs";
import { resolve, join } from "path";

const PROJECT_ROOT = resolve(import.meta.dirname, "../..");

// Key framework paths that fixtures must mirror
const EXPECTED_PATHS = [
  "_gaia/core/engine/workflow.xml",
  "_gaia/_config/global.yaml",
  "bin/gaia-framework.js",
  "gaia-install.sh",
  "package.json",
];

let exitCode = 0;

for (const rel of EXPECTED_PATHS) {
  const fullPath = join(PROJECT_ROOT, rel);
  if (!existsSync(fullPath)) {
    console.error(`MISSING: ${rel}`);
    exitCode = 1;
  }
}

if (exitCode === 0) {
  console.log("Fixture sync check passed — all expected paths exist.");
} else {
  console.error("Fixture sync check FAILED — some expected paths are missing.");
}

process.exit(exitCode);
