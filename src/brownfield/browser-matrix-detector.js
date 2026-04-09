/**
 * E19-S15: Brownfield Browser Matrix Detection
 *
 * Detects the browser matrix used for end-to-end testing so /gaia-brownfield
 * can capture which browsers are in scope for UI test coverage in the
 * onboarding report and the generated test-environment.yaml.
 *
 * Detection sources (in priority order):
 *   1. playwright.config.{ts,js}   — parses `projects: [{ name }]`
 *   2. cypress.config.{ts,js}      — parses `browsers: [...]`
 *   3. cypress.json                — legacy Cypress config
 *   4. karma.conf.{ts,js}          — parses `browsers: [...]`
 *   5. .browserslistrc             — build-target-only, NOT test matrix
 *   6. package.json[browserslist]  — build-target-only, NOT test matrix
 *
 * Returns:
 *   {
 *     browser_matrix: [{ name, config_source }] | null,
 *     build_target_only: { type: "build_target_only", config_source } | null,
 *   }
 *   ...or null when nothing is detected at all.
 *
 * Design notes:
 *   - Config files are parsed with regex extractors rather than being `import`ed
 *     or eval'd. We never execute untrusted project config files.
 *   - Browserslist is deliberately stored separately from `browser_matrix` to
 *     satisfy NFR-041 (zero false positives): browserslist describes BUILD
 *     TARGETS, not a test browser matrix.
 *
 * Traces to: FR-234, NFR-041
 */

import { readFileSync, existsSync } from "fs";
import { join, resolve } from "path";

// ─── Safe file helpers ──────────────────────────────────────────────────────

function readTextSafe(filePath) {
  try {
    if (!existsSync(filePath)) return null;
    return readFileSync(filePath, "utf8");
  } catch {
    return null;
  }
}

function firstExisting(projectPath, fileNames) {
  for (const name of fileNames) {
    const p = join(projectPath, name);
    if (existsSync(p)) return name;
  }
  return null;
}

// ─── Extractors ─────────────────────────────────────────────────────────────

/**
 * Extract Playwright project names from a config file's source text.
 * Matches both `projects: [{ name: 'chromium' }]` and devices-based entries.
 * We look for the top-level `projects:` (or `projects =`) array and then
 * capture every `name: '...'` / `name: "..."` / `name: \`...\`` inside.
 *
 * Returns an array of names (possibly empty).
 */
function extractPlaywrightProjects(content) {
  if (!content) return [];

  // Find the `projects` array opener. Allow optional whitespace, `=`, or `:`.
  const projectsOpen = content.search(/\bprojects\s*[:=]\s*\[/);
  if (projectsOpen === -1) return [];

  // Walk forward from the opening `[` to find the matching `]`, counting
  // nested brackets. This handles nested objects/arrays inside the projects
  // array (devices, use blocks, etc.).
  const openIdx = content.indexOf("[", projectsOpen);
  if (openIdx === -1) return [];

  let depth = 0;
  let closeIdx = -1;
  for (let i = openIdx; i < content.length; i++) {
    const ch = content[i];
    if (ch === "[") depth++;
    else if (ch === "]") {
      depth--;
      if (depth === 0) {
        closeIdx = i;
        break;
      }
    }
  }
  if (closeIdx === -1) return [];

  const projectsBlock = content.slice(openIdx, closeIdx + 1);

  // Extract every `name: '...'` / `name: "..."` / `name: \`...\``.
  const nameRegex = /\bname\s*:\s*(['"`])([^'"`]+)\1/g;
  const names = [];
  let match;
  while ((match = nameRegex.exec(projectsBlock)) !== null) {
    names.push(match[2]);
  }
  return names;
}

/**
 * Extract a string array from a `browsers: [...]` declaration. Shared between
 * Cypress and Karma scanners.
 *
 * Returns an array of names (possibly empty).
 */
function extractBrowsersArray(content) {
  if (!content) return [];

  const browsersOpen = content.search(/\bbrowsers\s*[:=]\s*\[/);
  if (browsersOpen === -1) return [];

  const openIdx = content.indexOf("[", browsersOpen);
  if (openIdx === -1) return [];

  let depth = 0;
  let closeIdx = -1;
  for (let i = openIdx; i < content.length; i++) {
    const ch = content[i];
    if (ch === "[") depth++;
    else if (ch === "]") {
      depth--;
      if (depth === 0) {
        closeIdx = i;
        break;
      }
    }
  }
  if (closeIdx === -1) return [];

  const arrText = content.slice(openIdx + 1, closeIdx);

  // Match quoted strings inside the array body. Only top-level string items
  // count — Cypress/Karma browser lists are flat string arrays.
  const stringRegex = /(['"`])([^'"`]+)\1/g;
  const names = [];
  let match;
  while ((match = stringRegex.exec(arrText)) !== null) {
    names.push(match[2]);
  }
  return names;
}

// ─── Scanners ───────────────────────────────────────────────────────────────

function scanPlaywright(projectPath) {
  const fileName = firstExisting(projectPath, ["playwright.config.ts", "playwright.config.js"]);
  if (!fileName) return null;

  const content = readTextSafe(join(projectPath, fileName));
  if (content == null) return null;

  const names = extractPlaywrightProjects(content);
  if (names.length === 0) return null;

  return names.map((name) => ({ name, config_source: fileName }));
}

function scanCypress(projectPath) {
  const fileName = firstExisting(projectPath, [
    "cypress.config.ts",
    "cypress.config.js",
    "cypress.json",
  ]);
  if (!fileName) return null;

  const fullPath = join(projectPath, fileName);
  const content = readTextSafe(fullPath);
  if (content == null) return null;

  let names = [];
  if (fileName === "cypress.json") {
    try {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed.browsers)) {
        names = parsed.browsers.filter((x) => typeof x === "string");
      } else if (Array.isArray(parsed.browsers?.map)) {
        // `browsers: [{ name: 'chrome' }, ...]` shape
        names = parsed.browsers.map((b) => b.name).filter(Boolean);
      }
    } catch {
      return null;
    }
  } else {
    names = extractBrowsersArray(content);
  }

  if (names.length === 0) return null;
  return names.map((name) => ({ name, config_source: fileName }));
}

function scanKarma(projectPath) {
  const fileName = firstExisting(projectPath, ["karma.conf.ts", "karma.conf.js"]);
  if (!fileName) return null;

  const content = readTextSafe(join(projectPath, fileName));
  if (content == null) return null;

  const names = extractBrowsersArray(content);
  if (names.length === 0) return null;

  return names.map((name) => ({ name, config_source: fileName }));
}

function scanBrowserslist(projectPath) {
  // .browserslistrc is the strongest signal.
  if (existsSync(join(projectPath, ".browserslistrc"))) {
    return { type: "build_target_only", config_source: ".browserslistrc" };
  }

  // package.json[browserslist] is the secondary signal.
  const pkgPath = join(projectPath, "package.json");
  const pkgContent = readTextSafe(pkgPath);
  if (pkgContent == null) return null;

  try {
    const parsed = JSON.parse(pkgContent);
    if (parsed && parsed.browserslist !== undefined && parsed.browserslist !== null) {
      return {
        type: "build_target_only",
        config_source: "package.json[browserslist]",
      };
    }
  } catch {
    // ignore malformed package.json
  }

  return null;
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Detect the browser matrix for the project at `projectPath`.
 *
 * @param {string} projectPath — absolute path to the project root
 * @returns {Promise<{
 *   browser_matrix: Array<{name: string, config_source: string}> | null,
 *   build_target_only: {type: "build_target_only", config_source: string} | null,
 * } | null>}
 */
export async function detectBrowserMatrix(projectPath) {
  const resolvedPath = resolve(projectPath);

  // 1. Playwright (highest precedence).
  let browserMatrix = scanPlaywright(resolvedPath);

  // 2. Cypress (only if Playwright gave us nothing).
  if (!browserMatrix) {
    browserMatrix = scanCypress(resolvedPath);
  }

  // 3. Karma (only if neither Playwright nor Cypress matched).
  if (!browserMatrix) {
    browserMatrix = scanKarma(resolvedPath);
  }

  // 4. Browserslist — always checked, but stored SEPARATELY from the test
  // browser matrix (NFR-041: zero false positives).
  const buildTargetOnly = scanBrowserslist(resolvedPath);

  if (!browserMatrix && !buildTargetOnly) {
    return null;
  }

  return {
    browser_matrix: browserMatrix,
    build_target_only: buildTargetOnly,
  };
}
