/**
 * test-environment.yaml Schema Validator
 *
 * Validates the test-environment.yaml manifest against the schema
 * defined in architecture section 10.20.5 (ADR-028, FR-196).
 *
 * Design:
 *   - Emits WARNINGs on schema violations — never throws errors.
 *   - Missing or empty file is treated as valid (auto-discovery fallback).
 *   - Includes a minimal YAML parser sufficient for the manifest schema.
 *
 * @module test-environment-validator
 */

// ─── Minimal YAML Parser ────────────────────────────────────────

/**
 * Parse a scalar YAML value into its JS equivalent.
 * Handles booleans, null, integers, floats, and quoted strings.
 */
function parseScalar(raw) {
  if (raw === "true") return true;
  if (raw === "false") return false;
  if (raw === "null" || raw === "~") return null;
  if (/^\d+$/.test(raw)) return parseInt(raw, 10);
  if (/^\d+\.\d+$/.test(raw)) return parseFloat(raw);
  // Strip surrounding quotes
  if (
    (raw.startsWith('"') && raw.endsWith('"')) ||
    (raw.startsWith("'") && raw.endsWith("'"))
  ) {
    return raw.slice(1, -1);
  }
  return raw;
}

/**
 * Parse an inline YAML flow sequence like `[a, b, c]` into an array of strings.
 */
function parseFlowSequence(raw) {
  return raw
    .slice(1, -1)
    .split(",")
    .map((s) => s.trim());
}

/**
 * Flush the current nested structure (list or map) into the result object.
 */
function flushNested(result, key, isList, list, isMap, map) {
  if (isList && key) result[key] = list;
  else if (isMap && key) result[key] = map;
}

/**
 * Parse a simple YAML string into a JS object.
 *
 * Supports: top-level scalars, lists of scalars, lists of maps (one level),
 * nested maps (two levels), and inline flow sequences `[a, b]`.
 *
 * Limitations: does not support multi-line strings, anchors, aliases, or
 * deeply nested structures. This is intentional — the manifest schema is flat.
 */
function parseSimpleYaml(text) {
  const result = {};
  const lines = text.split("\n");
  let currentKey = null;
  let currentList = null;
  let currentMap = null;
  let currentMapKey = null;
  let inList = false;
  let inMap = false;

  for (const rawLine of lines) {
    const line = rawLine.replace(/#.*$/, "").trimEnd();
    if (line.trim() === "") continue;

    const indent = line.length - line.trimStart().length;

    // ── Top-level key ──────────────────────────────────────────
    if (indent === 0 && line.includes(":")) {
      flushNested(result, currentKey, inList, currentList, inMap, currentMap);
      inList = false;
      inMap = false;
      currentList = null;
      currentMap = null;
      currentMapKey = null;

      const colonIdx = line.indexOf(":");
      const key = line.substring(0, colonIdx).trim();
      const val = line.substring(colonIdx + 1).trim();
      currentKey = key;

      if (val === "") continue; // value on subsequent lines
      result[key] = parseScalar(val);
      currentKey = null;
      continue;
    }

    // ── List item (dash prefix) ────────────────────────────────
    if (line.trimStart().startsWith("- ") && currentKey) {
      if (!inList && !inMap) {
        inList = true;
        currentList = [];
      }
      if (!inList) continue;

      const itemText = line.trimStart().substring(2).trim();
      if (itemText.includes(":")) {
        const colonIdx = itemText.indexOf(":");
        const k = itemText.substring(0, colonIdx).trim();
        const v = itemText.substring(colonIdx + 1).trim();
        currentList.push({ [k]: parseScalar(v) });
      } else {
        currentList.push(parseScalar(itemText));
      }
      continue;
    }

    // ── Indented key: value ────────────────────────────────────
    if (indent > 0 && line.includes(":") && currentKey) {
      const trimmed = line.trimStart();
      const colonIdx = trimmed.indexOf(":");
      const k = trimmed.substring(0, colonIdx).trim();
      const v = trimmed.substring(colonIdx + 1).trim();

      // Inside a list entry — append properties to the last entry
      if (inList && currentList && currentList.length > 0) {
        const lastEntry = currentList[currentList.length - 1];
        if (typeof lastEntry === "object" && lastEntry !== null) {
          lastEntry[k] =
            v.startsWith("[") && v.endsWith("]")
              ? parseFlowSequence(v)
              : v === ""
                ? {}
                : parseScalar(v);
        }
        continue;
      }

      // Nested map
      if (!inMap) {
        inMap = true;
        currentMap = {};
      }

      if (v === "" || v.startsWith("{")) {
        // Sub-map key (e.g., tiers.1)
        currentMapKey = k;
        if (!currentMap[k]) currentMap[k] = {};
      } else if (v.startsWith("[") && v.endsWith("]")) {
        const target =
          currentMapKey && currentMap[currentMapKey]
            ? currentMap[currentMapKey]
            : currentMap;
        target[k] = parseFlowSequence(v);
      } else {
        const target =
          currentMapKey && currentMap[currentMapKey]
            ? currentMap[currentMapKey]
            : currentMap;
        target[k] = parseScalar(v);
      }
    }
  }

  flushNested(result, currentKey, inList, currentList, inMap, currentMap);
  return result;
}

// ─── Runner Validation ──────────────────────────────────────────

const RUNNER_REQUIRED_FIELDS = ["name", "command", "tier"];

/**
 * Validate a single runner entry and return any warning messages.
 * @param {object} runner — Parsed runner object
 * @param {number} index — Position in the runners array (for error messages)
 * @returns {string[]} Warning messages (empty if valid)
 */
function validateRunnerEntry(runner, index) {
  const warnings = [];
  if (typeof runner !== "object" || runner === null) {
    warnings.push(`Runner entry [${index}] is not a valid map.`);
    return warnings;
  }
  for (const field of RUNNER_REQUIRED_FIELDS) {
    if (runner[field] === undefined || runner[field] === null || runner[field] === "") {
      warnings.push(
        `Runner entry [${index}] is missing required field: '${field}'.`
      );
    }
  }
  return warnings;
}

// ─── E25-S6: tiers.stack_hints validation ──────────────────────
//
// The generic parseSimpleYaml above only supports 2-level maps, so the
// deeply-nested `tiers.stack_hints.{pytest_markers,gradle_tasks,go_build_tags,
// flutter_suites}` block is scanned directly from the raw YAML text. This keeps
// the existing parser untouched and avoids introducing a new YAML dependency
// (same approach used elsewhere in the bridge adapters — see ADR-038 §10.20.11).
//
// Contract: FR-312, ADR-038 §10.20.11 (stack adapter registry).
// See docs/test-artifacts/test-environment.yaml.example for canonical usage.

/**
 * Allowed keys inside `tiers.stack_hints`. Any other key is a validation error
 * naming the unknown key and the accepted keys (AC6).
 */
const STACK_HINT_KEYS = Object.freeze([
  "pytest_markers",
  "gradle_tasks",
  "go_build_tags",
  "flutter_suites",
]);

/**
 * Extract the `tiers.stack_hints` block from raw YAML text using a
 * line-oriented indent scan. Returns an object describing the block and any
 * shape violations — does not throw. When the block is absent, returns null.
 *
 * Supported shapes (partial blocks are valid — unset tiers fall back to the
 * adapter default, per Dev Notes):
 *   tiers:
 *     stack_hints:
 *       pytest_markers: ["slow", "integration"]
 *       gradle_tasks:
 *         unit: test
 *         integration: integrationTest
 *         e2e: e2eTest
 *       go_build_tags: [integration, e2e]
 *       flutter_suites:
 *         unit: test/
 *         integration: integration_test/
 *         e2e: integration_test/e2e/
 *
 * @param {string} text
 * @returns {{ raw: object, warnings: string[] }|null}
 */
function extractStackHints(text) {
  const lines = text.split(/\r?\n/);

  // Locate `tiers:` at column 0.
  let tiersIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^tiers\s*:\s*(#.*)?$/.test(lines[i])) {
      tiersIdx = i;
      break;
    }
  }
  if (tiersIdx === -1) return null;

  // Find `stack_hints:` nested under `tiers:` (indent >= 2, < indent of next
  // top-level key). We just look line-by-line for a `^(\s+)stack_hints\s*:`
  // whose indent is > 0 and occurs before any column-0 key after `tiers:`.
  let hintsIdx = -1;
  let hintsIndent = -1;
  for (let i = tiersIdx + 1; i < lines.length; i++) {
    const l = lines[i];
    if (l.trim() === "" || l.trimStart().startsWith("#")) continue;
    const indent = l.length - l.trimStart().length;
    if (indent === 0) break; // left the tiers: subtree
    if (/^\s+stack_hints\s*:\s*(#.*)?$/.test(l)) {
      hintsIdx = i;
      hintsIndent = indent;
      break;
    }
  }
  if (hintsIdx === -1) return null;

  // Walk child lines whose indent is > hintsIndent. Stop when indent <= hintsIndent.
  const warnings = [];
  const block = {};
  let currentKey = null;
  let currentKeyIndent = -1;
  let currentSubMap = null;

  const recordUnknown = (key) => {
    warnings.push(
      `Unknown key 'tiers.stack_hints.${key}'. Accepted keys: ${STACK_HINT_KEYS.join(", ")}.`
    );
  };

  for (let i = hintsIdx + 1; i < lines.length; i++) {
    const rawLine = lines[i];
    const stripped = rawLine.replace(/#.*$/, "").trimEnd();
    if (stripped.trim() === "") continue;
    const indent = stripped.length - stripped.trimStart().length;
    if (indent <= hintsIndent) break; // left stack_hints subtree

    const trimmed = stripped.trim();

    // Top-level stack_hints key (first indent level beneath stack_hints:).
    // Track the first child indent we see — any line at that indent is a key.
    if (currentKeyIndent === -1 || indent === currentKeyIndent) {
      currentKeyIndent = indent;
      const colonIdx = trimmed.indexOf(":");
      if (colonIdx === -1) continue;
      const key = trimmed.substring(0, colonIdx).trim();
      const val = trimmed.substring(colonIdx + 1).trim();

      if (!STACK_HINT_KEYS.includes(key)) {
        recordUnknown(key);
        currentKey = null;
        currentSubMap = null;
        continue;
      }

      currentKey = key;
      if (val === "") {
        // Expect a sub-map on following lines (e.g., gradle_tasks: / flutter_suites:)
        currentSubMap = {};
        block[key] = currentSubMap;
      } else if (val.startsWith("[") && val.endsWith("]")) {
        // Flow sequence: pytest_markers: [a, b]
        const items = val
          .slice(1, -1)
          .split(",")
          .map((s) => s.trim().replace(/^['"]|['"]$/g, ""))
          .filter((s) => s !== "");
        // Validate shape: string[] only
        const invalid = items.find((x) => typeof x !== "string");
        if (invalid !== undefined) {
          warnings.push(
            `Invalid shape for 'tiers.stack_hints.${key}': expected array of strings.`
          );
        }
        block[key] = items;
        currentSubMap = null;
      } else {
        // Scalar value where an array or map was expected — shape error.
        warnings.push(
          `Invalid shape for 'tiers.stack_hints.${key}': expected ${
            key === "pytest_markers" || key === "go_build_tags"
              ? "array of strings"
              : "map of { unit, integration, e2e }"
          }, got scalar.`
        );
        block[key] = parseScalar(val);
        currentSubMap = null;
      }
      continue;
    }

    // Nested sub-map entry (gradle_tasks / flutter_suites children).
    if (indent > currentKeyIndent && currentKey && currentSubMap) {
      const colonIdx = trimmed.indexOf(":");
      if (colonIdx === -1) continue;
      const k = trimmed.substring(0, colonIdx).trim();
      const v = trimmed.substring(colonIdx + 1).trim();
      // Only unit / integration / e2e are meaningful for tier maps, but we
      // record whatever keys appear — downstream adapters pick the ones they need.
      if (v === "") continue;
      const parsed = parseScalar(v);
      // For gradle_tasks / flutter_suites, values must be strings.
      if (
        (currentKey === "gradle_tasks" || currentKey === "flutter_suites") &&
        typeof parsed !== "string"
      ) {
        warnings.push(
          `Invalid shape for 'tiers.stack_hints.${currentKey}.${k}': expected string, got ${typeof parsed}.`
        );
      }
      currentSubMap[k] = parsed;
    }
  }

  return { raw: block, warnings };
}

// ─── Public API ─────────────────────────────────────────────────

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} valid    — true if no warnings (or file absent/empty)
 * @property {string[]} warnings — list of WARNING-level schema violations
 * @property {string} [info]    — informational message (e.g., auto-discovery fallback)
 */

/**
 * Validate test-environment.yaml content against the manifest schema.
 *
 * @param {string|null} content — Raw YAML content, null if file absent, or empty string.
 * @param {object} [options] — Optional cross-validation context.
 * @param {object} [options.globalConfig] — Parsed global.yaml content. When provided
 *   and `ci_cd.promotion_chain` exists, the validator cross-checks every
 *   `promotion_chain_env_id` against chain ids and emits an orphan warning
 *   if the id is not present (E20-S10, AC4).
 * @returns {ValidationResult}
 */
export function validateTestEnvironment(content, options = {}) {
  // AC5: Missing file is not an error — fallback to auto-discovery
  if (content === null || content === undefined || content.trim() === "") {
    return {
      valid: true,
      warnings: [],
      info: "No test-environment.yaml found — using auto-discovery fallback (FR-196).",
    };
  }

  const warnings = [];

  let parsed;
  try {
    parsed = parseSimpleYaml(content);
  } catch {
    return {
      valid: false,
      warnings: [
        "Failed to parse test-environment.yaml — invalid YAML syntax.",
      ],
    };
  }

  // AC2: Required field — version
  if (parsed.version === undefined || parsed.version === null) {
    warnings.push(
      "Missing required field: 'version'. Expected an integer (e.g., version: 1)."
    );
  }

  // AC2: Required field — runners (list of maps with name, command, tier)
  if (!parsed.runners || !Array.isArray(parsed.runners)) {
    warnings.push(
      "Missing required field: 'runners'. Expected a list of runner entries with name, command, and tier."
    );
  } else {
    for (let i = 0; i < parsed.runners.length; i++) {
      warnings.push(...validateRunnerEntry(parsed.runners[i], i));
    }
  }

  // E20-S10 AC4: Cross-validate promotion_chain_env_id references against
  // the promotion chain when the caller provides a globalConfig. When
  // `ci_cd` is absent (AC6 backward compat), this check is skipped entirely
  // — promotion_chain_env_id fields are silently ignored.
  const globalConfig = options && options.globalConfig;
  const chain = globalConfig?.ci_cd?.promotion_chain;

  if (Array.isArray(chain) && Array.isArray(parsed.runners)) {
    const knownIds = chain
      .map((entry) => (entry && entry.id ? entry.id : null))
      .filter((id) => id !== null);

    for (const runner of parsed.runners) {
      if (!runner || typeof runner !== "object") continue;
      const envId = runner.promotion_chain_env_id;
      if (envId === undefined || envId === null || envId === "" || envId === "null") {
        continue;
      }
      if (!knownIds.includes(envId)) {
        const tierName = runner.name || `tier-${runner.tier ?? "?"}`;
        warnings.push(
          `WARNING [test-environment.yaml]: tier '${tierName}' references ` +
            `promotion_chain_env_id '${envId}' which does not exist in ` +
            `ci_cd.promotion_chain (known ids: [${knownIds.join(", ")}]).`
        );
      }
    }
  }

  // E25-S6 / FR-312 / ADR-038 §10.20.11: validate `tiers.stack_hints` block.
  // The generic parseSimpleYaml above only supports 2-level maps, so the
  // nested stack_hints block is scanned directly from the raw text.
  const stackHints = extractStackHints(content);
  if (stackHints && stackHints.warnings.length > 0) {
    warnings.push(...stackHints.warnings);
  }

  return {
    valid: warnings.length === 0,
    warnings,
    // Expose the parsed block for adapter consumers (AC3 wiring). Null when
    // the block is absent — callers must fall back to adapter defaults.
    stackHints: stackHints ? stackHints.raw : null,
  };
}

// E25-S6: exported for unit tests and downstream consumers that need direct
// access to the scanner without running the full validator.
export { extractStackHints, STACK_HINT_KEYS };
