#!/usr/bin/env node

/**
 * generate-checksums.js — File Integrity Manifest Generator
 *
 * Generates checksums.txt containing SHA-256 checksums for all published files.
 * Runs as a prepublishOnly hook to ensure checksums are generated before tarball assembly.
 *
 * Uses only Node.js built-ins (crypto, fs, path) — zero runtime dependencies (ADR-005).
 *
 * Output format: BSD-compatible "<hash>  <filename>" with two spaces.
 * Compatible with both `shasum -a 256 -c` (macOS) and `sha256sum -c` (Linux).
 */

"use strict";

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const CHECKSUMS_FILENAME = "checksums.txt";

/**
 * Recursively expand a directory to a flat list of relative file paths.
 */
function expandDirectory(relativeBase, absolutePath) {
  const results = [];
  const entries = fs.readdirSync(absolutePath, { withFileTypes: true });
  for (const entry of entries) {
    const relativePath = path.join(relativeBase, entry.name);
    const absoluteChild = path.join(absolutePath, entry.name);
    if (entry.isDirectory()) {
      results.push(...expandDirectory(relativePath, absoluteChild));
    } else if (entry.isFile()) {
      results.push(relativePath);
    }
  }
  return results;
}

/**
 * Expand a single files-array entry to individual file paths.
 * Directories are expanded recursively; plain files are returned as-is.
 * Non-existent entries are returned for downstream error reporting.
 */
function expandEntry(entry) {
  const fullPath = path.join(ROOT, entry);
  if (!fs.existsSync(fullPath)) return [entry];
  return fs.statSync(fullPath).isDirectory() ? expandDirectory(entry, fullPath) : [entry];
}

/**
 * Resolve the full list of publishable files from package.json.
 * Expands directory entries, filters .gitkeep placeholders and checksums.txt itself,
 * and always appends package.json.
 */
function resolveFileList(filesArray) {
  const expanded = filesArray.filter((entry) => entry !== CHECKSUMS_FILENAME).flatMap(expandEntry);

  // Filter .gitkeep (intentionally zero-byte placeholders), add package.json
  return [...expanded.filter((f) => path.basename(f) !== ".gitkeep"), "package.json"].sort();
}

/**
 * Validate that every file exists and has non-zero size.
 * Returns an array of error strings (empty if all valid).
 */
function validateFiles(files) {
  const errors = [];
  for (const file of files) {
    const fullPath = path.join(ROOT, file);
    if (!fs.existsSync(fullPath)) {
      errors.push(`MISSING: ${file}`);
    } else if (fs.statSync(fullPath).size === 0) {
      errors.push(`ZERO BYTES: ${file}`);
    }
  }
  return errors;
}

/**
 * Compute SHA-256 hash for a file and return BSD-format line.
 */
function checksumLine(file) {
  const content = fs.readFileSync(path.join(ROOT, file));
  const hash = crypto.createHash("sha256").update(content).digest("hex");
  return `${hash}  ${file}`;
}

/**
 * Main: read files array from package.json, validate, compute checksums, write manifest.
 */
function main() {
  const pkgPath = path.join(ROOT, "package.json");
  if (!fs.existsSync(pkgPath)) {
    console.error("ERROR: package.json not found at", pkgPath);
    process.exit(1);
  }

  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  const filesArray = pkg.files || [];

  if (filesArray.length === 0) {
    console.error("ERROR: package.json 'files' array is empty or missing.");
    process.exit(1);
  }

  const allFiles = resolveFileList(filesArray);
  const errors = validateFiles(allFiles);

  if (errors.length > 0) {
    console.error("ERROR: File integrity check failed:");
    errors.forEach((err) => console.error("  " + err));
    process.exit(1);
  }

  const lines = allFiles.map(checksumLine);
  fs.writeFileSync(path.join(ROOT, CHECKSUMS_FILENAME), lines.join("\n") + "\n", "utf8");

  console.log(`${CHECKSUMS_FILENAME} generated with ${lines.length} entries.`);
}

main();
