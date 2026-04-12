/**
 * Project Type Detection — E19-S22
 *
 * Single source of truth for detecting the type of project at a given path.
 * Extracted from inline detection logic previously duplicated in:
 *   - brownfield-onboarding/instructions.xml (Step 1)
 *   - test-gap-analysis/instructions.xml (Step 4b)
 *
 * The function is a pure, synchronous, read-only detector: no mutation,
 * no logging, no writes. It scans the filesystem for marker files and
 * dependency signals to classify the project.
 *
 * @module project-type-detection
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * Detect the type of project at the given path.
 *
 * @param {string} projectPath — absolute path to the project root
 * @returns {{ type: 'frontend' | 'backend' | 'fullstack' | 'data' | 'mobile' | 'unknown', evidence: string[] }}
 */
export function detectProjectType(projectPath) {
  if (!projectPath || !existsSync(projectPath)) {
    return { type: "unknown", evidence: [] };
  }

  const evidence = [];

  const frontendSignals = detectFrontend(projectPath, evidence);
  const backendSignals = detectBackend(projectPath, evidence);
  const dataSignals = detectData(projectPath, evidence);
  const mobileSignals = detectMobile(projectPath, evidence);

  // Classification decision tree
  if (mobileSignals) {
    return { type: "mobile", evidence };
  }
  if (dataSignals) {
    return { type: "data", evidence };
  }
  if (frontendSignals && backendSignals) {
    return { type: "fullstack", evidence };
  }
  if (frontendSignals) {
    return { type: "frontend", evidence };
  }
  if (backendSignals) {
    return { type: "backend", evidence };
  }

  return { type: "unknown", evidence: [] };
}

// ─── Internal detection helpers ──────────────────────────────────────────────

/**
 * Read and parse package.json if it exists. Returns null on any failure.
 * @param {string} projectPath
 * @returns {object|null}
 */
function readPackageJson(projectPath) {
  const pkgPath = join(projectPath, "package.json");
  if (!existsSync(pkgPath)) return null;
  try {
    return JSON.parse(readFileSync(pkgPath, "utf8"));
  } catch {
    return null;
  }
}

/**
 * Check if any dependency in package.json matches a list of names.
 * Checks both dependencies and devDependencies.
 * @param {object|null} pkg — parsed package.json
 * @param {string[]} names — dependency names to look for
 * @returns {string[]} — matched dependency names
 */
function matchDeps(pkg, names) {
  if (!pkg) return [];
  const allDeps = {
    ...(pkg.dependencies || {}),
    ...(pkg.devDependencies || {}),
  };
  return names.filter((name) => name in allDeps);
}

/** @returns {boolean} — true if frontend signals detected */
function detectFrontend(projectPath, evidence) {
  const pkg = readPackageJson(projectPath);
  const frontendDeps = [
    "react",
    "vue",
    "svelte",
    "@angular/core",
    "next",
    "nuxt",
    "@remix-run/react",
  ];
  const matched = matchDeps(pkg, frontendDeps);

  if (matched.length > 0) {
    evidence.push(`package.json dependencies: ${matched.join(", ")}`);
  }

  // Angular-specific markers
  if (existsSync(join(projectPath, "angular.json"))) {
    evidence.push("angular.json present");
  }

  // index.html + src/ + public/ pattern
  if (
    existsSync(join(projectPath, "index.html")) &&
    existsSync(join(projectPath, "src")) &&
    existsSync(join(projectPath, "public"))
  ) {
    evidence.push("index.html + src/ + public/ structure");
  }

  return evidence.some(
    (e) =>
      e.startsWith("package.json dependencies:") ||
      e === "angular.json present" ||
      e === "index.html + src/ + public/ structure",
  );
}

/** @returns {boolean} — true if backend signals detected */
function detectBackend(projectPath, evidence) {
  const pkg = readPackageJson(projectPath);
  let found = false;

  // Node.js backend deps
  const backendNodeDeps = ["express", "fastify", "koa", "@nestjs/core", "hapi"];
  const matchedNode = matchDeps(pkg, backendNodeDeps);
  if (matchedNode.length > 0) {
    evidence.push(`package.json backend deps: ${matchedNode.join(", ")}`);
    found = true;
  }

  // Python backend markers
  const pythonFiles = ["requirements.txt", "pyproject.toml"];
  const pythonBackendLibs = ["fastapi", "django", "flask"];
  for (const file of pythonFiles) {
    const filePath = join(projectPath, file);
    if (existsSync(filePath)) {
      try {
        const content = readFileSync(filePath, "utf8").toLowerCase();
        const matched = pythonBackendLibs.filter((lib) =>
          content.includes(lib),
        );
        if (matched.length > 0) {
          evidence.push(`${file} contains: ${matched.join(", ")}`);
          found = true;
        }
      } catch {
        // skip unreadable files
      }
    }
  }

  // Java markers
  if (existsSync(join(projectPath, "pom.xml"))) {
    evidence.push("pom.xml present (Java/Maven)");
    found = true;
  }
  if (existsSync(join(projectPath, "build.gradle"))) {
    evidence.push("build.gradle present (Java/Gradle)");
    found = true;
  }

  // Go markers
  if (existsSync(join(projectPath, "go.mod"))) {
    evidence.push("go.mod present (Go)");
    found = true;
  }

  return found;
}

/** @returns {boolean} — true if data project signals detected */
function detectData(projectPath, evidence) {
  let found = false;

  // Python data libs
  const pythonFiles = ["requirements.txt", "pyproject.toml"];
  const dataLibs = ["pandas", "numpy", "pyspark", "tensorflow", "pytorch"];
  for (const file of pythonFiles) {
    const filePath = join(projectPath, file);
    if (existsSync(filePath)) {
      try {
        const content = readFileSync(filePath, "utf8").toLowerCase();
        const matched = dataLibs.filter((lib) => content.includes(lib));
        if (matched.length > 0) {
          evidence.push(`${file} data libs: ${matched.join(", ")}`);
          found = true;
        }
      } catch {
        // skip unreadable files
      }
    }
  }

  // Notebook files
  if (existsSync(join(projectPath, "notebooks"))) {
    evidence.push("notebooks/ directory present");
    found = true;
  }

  // Check for .ipynb files at root
  try {
    const entries = readdirSync(projectPath);
    const notebooks = entries.filter((e) => e.endsWith(".ipynb"));
    if (notebooks.length > 0) {
      evidence.push(`.ipynb files: ${notebooks.slice(0, 3).join(", ")}`);
      found = true;
    }
  } catch {
    // skip if unreadable
  }

  return found;
}

/** @returns {boolean} — true if mobile project signals detected */
function detectMobile(projectPath, evidence) {
  let found = false;

  // Flutter
  if (existsSync(join(projectPath, "pubspec.yaml"))) {
    evidence.push("pubspec.yaml present (Flutter/Dart)");
    found = true;
  }

  // iOS + Android directories
  const hasIos = existsSync(join(projectPath, "ios"));
  const hasAndroid = existsSync(join(projectPath, "android"));
  if (hasIos && hasAndroid) {
    evidence.push("ios/ + android/ directories present");
    found = true;
  }

  // React Native marker
  const pkg = readPackageJson(projectPath);
  const rnDeps = matchDeps(pkg, ["react-native"]);
  if (rnDeps.length > 0) {
    evidence.push("package.json contains react-native");
    found = true;
  }

  return found;
}
