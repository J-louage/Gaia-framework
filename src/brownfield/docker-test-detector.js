/**
 * E19-S14: Brownfield Docker Test Config Detection
 *
 * Detects Docker-based test configurations so /gaia-brownfield can capture
 * containerized test setups in the onboarding report and the generated
 * test-environment.yaml.
 *
 * Detection sources (in priority order):
 *   1. docker-compose.test.yml — any service, always a match
 *   2. docker-compose.override.yml — services whose NAME matches a test pattern
 *   3. docker-compose.yml — services whose NAME matches a test pattern
 *   4. Dockerfile.test — CMD / ENTRYPOINT command
 *   5. Dockerfile — CMD / ENTRYPOINT matching known test command patterns
 *
 * Returns:
 *   { compose_file, service_name, test_command } when a test config is found
 *   null when nothing is detected
 *
 * Traces to: FR-233, NFR-041 (zero false positives)
 */

import { readFileSync, existsSync } from "fs";
import { join, resolve } from "path";
import yaml from "js-yaml";

// ─── Known patterns ─────────────────────────────────────────────────────────

// Service names (lowercased) that count as test services in a generic compose file.
const TEST_SERVICE_NAMES = new Set(["test", "tests", "spec", "specs", "e2e", "integration"]);

// Production service names that must NEVER be classified as tests, even if
// their image tag or command happens to contain the word "test".
const PRODUCTION_SERVICE_NAMES = new Set([
  "web",
  "app",
  "api",
  "server",
  "backend",
  "frontend",
  "nginx",
  "httpd",
  "apache",
  "db",
  "database",
  "postgres",
  "postgresql",
  "mysql",
  "mariadb",
  "mongo",
  "mongodb",
  "redis",
  "memcached",
  "cache",
  "kafka",
  "rabbitmq",
  "elasticsearch",
  "worker",
  "queue",
]);

// Known test command patterns (substring match on a single command line).
const TEST_COMMAND_PATTERNS = [
  /\bnpm\s+(run\s+)?test\b/,
  /\byarn\s+(run\s+)?test\b/,
  /\bpnpm\s+(run\s+)?test\b/,
  /\bpytest\b/,
  /\.\/gradlew\s+(\S+\s+)*test\b/,
  /\bmvn\s+(\S+\s+)*(test|verify)\b/,
  /\brspec\b/,
  /\bgo\s+test\b/,
  /\bvitest\b/,
  /\bjest\b/,
  /\bmocha\b/,
  /\bcypress\s+run\b/,
  /\bplaywright\s+test\b/,
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function readTextSafe(filePath) {
  try {
    if (!existsSync(filePath)) return null;
    return readFileSync(filePath, "utf8");
  } catch {
    return null;
  }
}

function parseYamlSafe(content) {
  try {
    return yaml.load(content);
  } catch {
    return null;
  }
}

function normalizeCommand(cmd) {
  if (cmd == null) return null;
  if (Array.isArray(cmd)) return cmd.join(" ").trim();
  if (typeof cmd === "string") return cmd.trim();
  return null;
}

function isTestCommand(cmd) {
  if (!cmd) return false;
  return TEST_COMMAND_PATTERNS.some((re) => re.test(cmd));
}

function isTestServiceName(name) {
  if (!name) return false;
  return TEST_SERVICE_NAMES.has(name.toLowerCase());
}

function isProductionServiceName(name) {
  if (!name) return false;
  return PRODUCTION_SERVICE_NAMES.has(name.toLowerCase());
}

// ─── Compose scanners ───────────────────────────────────────────────────────

/**
 * Extract a test config from a compose file. The caller decides the matching
 * policy via matchPolicy: "any" means the first non-production service is
 * considered a test (used for docker-compose.test.yml). "by-name" means only
 * services whose name matches TEST_SERVICE_NAMES count (used for override
 * and base compose files — prevents NFR-041 false positives).
 */
function scanCompose(projectPath, composeFileName, matchPolicy) {
  const filePath = join(projectPath, composeFileName);
  const content = readTextSafe(filePath);
  if (content == null) return null;

  const parsed = parseYamlSafe(content);
  if (!parsed || typeof parsed !== "object") return null;

  const services = parsed.services;
  if (!services || typeof services !== "object") return null;

  for (const [serviceName, serviceDef] of Object.entries(services)) {
    if (!serviceDef || typeof serviceDef !== "object") continue;
    if (isProductionServiceName(serviceName)) continue;

    if (matchPolicy === "by-name" && !isTestServiceName(serviceName)) {
      continue;
    }

    const command = normalizeCommand(serviceDef.command) || normalizeCommand(serviceDef.entrypoint);
    return {
      compose_file: composeFileName,
      service_name: serviceName,
      test_command: command,
    };
  }

  return null;
}

// ─── Dockerfile scanner ─────────────────────────────────────────────────────

/**
 * Parse CMD / ENTRYPOINT from a Dockerfile. Supports both exec form
 * (`CMD ["npm", "test"]`) and shell form (`CMD npm test`). Returns the raw
 * command string or null. Only looks at the LAST CMD and LAST ENTRYPOINT
 * directives in the file, consistent with Docker's own semantics.
 */
function extractDockerfileCommand(content) {
  if (!content) return null;

  const lines = content.split("\n");
  let lastCmd = null;
  let lastEntrypoint = null;

  for (const rawLine of lines) {
    // Strip inline comments defensively — Dockerfile comments are whole-line
    // (lines starting with #) but we stay permissive.
    const line = rawLine.replace(/^\s+/, "");
    if (line.startsWith("#")) continue;

    const cmdMatch = line.match(/^CMD\s+(.+)$/i);
    if (cmdMatch) {
      lastCmd = parseDockerfileArgs(cmdMatch[1]);
      continue;
    }

    const entryMatch = line.match(/^ENTRYPOINT\s+(.+)$/i);
    if (entryMatch) {
      lastEntrypoint = parseDockerfileArgs(entryMatch[1]);
    }
  }

  return lastCmd || lastEntrypoint;
}

function parseDockerfileArgs(argsText) {
  const trimmed = argsText.trim();
  // Exec form: ["foo", "bar"]
  if (trimmed.startsWith("[")) {
    try {
      const arr = JSON.parse(trimmed);
      if (Array.isArray(arr)) return arr.join(" ");
    } catch {
      // fall through to shell form
    }
  }
  // Shell form
  return trimmed;
}

function scanDockerfile(projectPath, fileName) {
  const content = readTextSafe(join(projectPath, fileName));
  if (content == null) return null;
  const cmd = extractDockerfileCommand(content);
  if (!cmd) return null;
  return { compose_file: fileName, service_name: null, test_command: cmd };
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Detect Docker-based test configuration at the given project path.
 *
 * @param {string} projectPath — absolute path to the project root
 * @returns {Promise<{compose_file: string, service_name: string|null, test_command: string|null} | null>}
 */
export async function detectDockerTestConfig(projectPath) {
  const resolvedPath = resolve(projectPath);

  // 1. docker-compose.test.yml — any non-production service is a match.
  const testCompose = scanCompose(resolvedPath, "docker-compose.test.yml", "any");
  if (testCompose) return testCompose;

  // 2. docker-compose.override.yml — only services named test/spec/e2e/etc.
  const override = scanCompose(resolvedPath, "docker-compose.override.yml", "by-name");
  if (override) return override;

  // 3. docker-compose.yml — only services whose NAME matches a test pattern
  // (prevents NFR-041 false positives: comments and image tags are ignored).
  const baseCompose = scanCompose(resolvedPath, "docker-compose.yml", "by-name");
  if (baseCompose) return baseCompose;

  // 4. Dockerfile.test — presence alone counts; extract CMD/ENTRYPOINT.
  const dockerfileTest = scanDockerfile(resolvedPath, "Dockerfile.test");
  if (dockerfileTest) return dockerfileTest;

  // 5. Dockerfile — only match when CMD/ENTRYPOINT invokes a known test command.
  const dockerfile = scanDockerfile(resolvedPath, "Dockerfile");
  if (dockerfile && isTestCommand(dockerfile.test_command)) {
    return dockerfile;
  }

  return null;
}
