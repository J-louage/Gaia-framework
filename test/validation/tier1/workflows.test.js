import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { join, resolve } from "path";
import { execSync } from "child_process";

// Project root is where _gaia/ lives
const PROJECT_ROOT = resolve(import.meta.dirname, "../../..");

// Use glob to find all workflow.yaml files
function findWorkflowFiles() {
  const result = execSync(
    `find "${PROJECT_ROOT}/_gaia" -name "workflow.yaml" -not -path "*/node_modules/*"`,
    { encoding: "utf8" },
  );
  return result
    .trim()
    .split("\n")
    .filter((f) => f.length > 0);
}

describe("Workflow Definition Validation (FR-30)", () => {
  const workflowFiles = findWorkflowFiles();

  it("should find workflow.yaml files", () => {
    expect(workflowFiles.length).toBeGreaterThan(0);
  });

  describe.each(workflowFiles)("%s", (workflowPath) => {
    let config;

    try {
      // Simple YAML parsing for key fields (replace with js-yaml when available)
      const content = readFileSync(workflowPath, "utf8");
      config = parseSimpleYaml(content);
    } catch {
      config = null;
    }

    it("should parse as valid YAML", () => {
      expect(config).not.toBeNull();
    });

    it("should have a name field", () => {
      expect(config?.name).toBeTruthy();
    });

    it("should have an instructions field", () => {
      expect(config?.instructions).toBeTruthy();
    });

    it("should reference an existing instructions file", () => {
      if (!config?.instructions) return;
      const resolvedPath = resolveVariable(config.instructions, workflowPath, config);
      expect(
        existsSync(resolvedPath),
        `Instructions file not found: ${resolvedPath}`,
      ).toBe(true);
    });

    it("should reference an existing agent file (if agent declared)", () => {
      if (!config?.agent || config.agent === "orchestrator") return;

      // dev-* is a wildcard — the engine asks the user which stack to use at runtime
      if (config.agent === "dev-*") return;

      const module = config.module || "lifecycle";
      const agentPath = join(
        PROJECT_ROOT,
        "_gaia",
        module,
        "agents",
        `${config.agent}.md`,
      );
      expect(
        existsSync(agentPath),
        `Agent file not found: ${agentPath}`,
      ).toBe(true);
    });

    it("should reference an existing validation/checklist file (if declared)", () => {
      if (!config?.validation) return;
      const resolvedPath = resolveVariable(config.validation, workflowPath, config);
      expect(
        existsSync(resolvedPath),
        `Validation file not found: ${resolvedPath}`,
      ).toBe(true);
    });
  });
});

/**
 * Minimal YAML parser for flat key-value workflow.yaml files.
 * Replace with js-yaml for production use.
 */
function parseSimpleYaml(content) {
  const result = {};
  for (const line of content.split("\n")) {
    // Match key: value (with or without quotes, allowing braces in values)
    const match = line.match(/^(\w[\w_]*)\s*:\s*["']?(.+?)["']?\s*$/);
    if (match) {
      const value = match[2].replace(/#.*$/, "").trim();
      if (value) result[match[1]] = value;
    }
  }
  return Object.keys(result).length > 0 ? result : null;
}

/**
 * Resolve variables in a path using the workflow's own declared installed_path.
 * {project-root} resolves to PROJECT_ROOT (Gaia-framework/).
 * {installed_path} resolves from the workflow.yaml's installed_path field,
 * falling back to {project-root}/_gaia (from global.yaml) if not declared.
 */
function resolveVariable(value, workflowPath, parsedConfig) {
  // Default installed_path from global.yaml: "{project-root}/_gaia"
  let installedPath = join(PROJECT_ROOT, "_gaia");

  if (parsedConfig?.installed_path) {
    installedPath = parsedConfig.installed_path.replace(
      /\{project-root\}/g,
      PROJECT_ROOT,
    );
  }

  return value
    .replace(/\{installed_path\}/g, installedPath)
    .replace(/\{project-root\}/g, PROJECT_ROOT);
}
