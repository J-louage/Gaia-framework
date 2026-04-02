import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const DOCS_ROOT = join(__dirname, "..", "..", "..", "..", "docs");
const ARCH_PATH = join(DOCS_ROOT, "planning-artifacts", "architecture.md");
const PROJECT_ROOT = join(__dirname, "..", "..", "..");
const SCHEMA_PATH = join(PROJECT_ROOT, "_gaia", "lifecycle", "templates", "gap-entry-schema.md");

/**
 * E11-S14: Reconcile doc-code-drift Category with Architecture Enum
 *
 * Validates that architecture.md sections 10.15.2 and 10.15.3 use
 * `doc-code-drift` (not `documentation`) as the gap category for
 * documentation-code mismatch findings, consistent with gap-entry-schema.md
 * and all implementation code.
 */
describe("E11-S14: doc-code-drift category reconciliation", () => {
  let archContent;
  let schemaContent;

  // --- AC1: Architecture 10.15.3 enum uses doc-code-drift, not documentation ---
  it("architecture 10.15.3 category enum contains doc-code-drift", () => {
    archContent = archContent || readFileSync(ARCH_PATH, "utf8");
    // Extract the category enum line from section 10.15.3
    const enumMatch = archContent.match(/category:\s*(functional\|[^\n]+)/);
    expect(enumMatch).not.toBeNull();
    expect(enumMatch[1]).toContain("doc-code-drift");
  });

  it("architecture 10.15.3 category enum does NOT contain standalone 'documentation' category", () => {
    archContent = archContent || readFileSync(ARCH_PATH, "utf8");
    const enumMatch = archContent.match(/category:\s*(functional\|[^\n]+)/);
    expect(enumMatch).not.toBeNull();
    // Split enum by pipe and check none equals 'documentation'
    const categories = enumMatch[1].split("|");
    expect(categories).not.toContain("documentation");
  });

  // --- AC2: Architecture 10.15.2 scan subagent table uses doc-code-drift ---
  it("architecture 10.15.2 scan subagent table maps Documentation-Code Mismatch Scanner to doc-code-drift", () => {
    archContent = archContent || readFileSync(ARCH_PATH, "utf8");
    // Find the Documentation-Code Mismatch Scanner row in the table
    const scannerRow = archContent.match(/Documentation-Code Mismatch Scanner\s*\|\s*(\S+)/);
    expect(scannerRow).not.toBeNull();
    expect(scannerRow[1]).toBe("doc-code-drift");
  });

  // --- AC5: Gap-entry-schema doc-code-drift category matches architecture 10.15.3 ---
  it("gap-entry-schema.md doc-code-drift category is present in architecture 10.15.3 enum", () => {
    archContent = archContent || readFileSync(ARCH_PATH, "utf8");
    schemaContent = schemaContent || readFileSync(SCHEMA_PATH, "utf8");

    // Verify gap-entry-schema uses doc-code-drift
    expect(schemaContent).toContain("doc-code-drift");

    // Verify architecture enum also uses doc-code-drift (consistency)
    const enumMatch = archContent.match(/category:\s*(functional\|[^\n]+)/);
    expect(enumMatch).not.toBeNull();
    const archCategories = enumMatch[1].split("|");
    expect(archCategories).toContain("doc-code-drift");
  });
});
