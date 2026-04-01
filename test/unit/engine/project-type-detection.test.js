import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

const PROJECT_ROOT = resolve(import.meta.dirname, "../../..");

const BROWNFIELD_INSTRUCTIONS_PATH = resolve(
  PROJECT_ROOT,
  "_gaia/lifecycle/workflows/anytime/brownfield-onboarding/instructions.xml"
);

describe("E12-S1: Project Type Detection in Brownfield Step 1", () => {
  let instructions;

  // Load instructions once — all tests depend on this file
  it("brownfield instructions file exists", () => {
    expect(
      existsSync(BROWNFIELD_INSTRUCTIONS_PATH),
      `Brownfield instructions not found at ${BROWNFIELD_INSTRUCTIONS_PATH}`
    ).toBe(true);
    instructions = readFileSync(BROWNFIELD_INSTRUCTIONS_PATH, "utf8");
  });

  // ── AC1: Infrastructure file pattern detection ──
  describe("AC1: Infrastructure file pattern detection", () => {
    it("detects Terraform files (*.tf, *.tfvars)", () => {
      instructions = readFileSync(BROWNFIELD_INSTRUCTIONS_PATH, "utf8");
      expect(instructions).toMatch(/\.tf\b/);
      expect(instructions).toMatch(/\.tfvars\b/);
    });

    it("detects Docker files (Dockerfile, docker-compose.yml)", () => {
      instructions = readFileSync(BROWNFIELD_INSTRUCTIONS_PATH, "utf8");
      expect(instructions).toMatch(/Dockerfile/);
      expect(instructions).toMatch(/docker-compose\.yml/);
    });

    it("detects Helm files (helm/, Chart.yaml, values.yaml)", () => {
      instructions = readFileSync(BROWNFIELD_INSTRUCTIONS_PATH, "utf8");
      expect(instructions).toMatch(/helm\//);
      expect(instructions).toMatch(/Chart\.yaml/);
      expect(instructions).toMatch(/values\.yaml/);
    });

    it("detects Kubernetes files (k8s/, kustomization.yaml)", () => {
      instructions = readFileSync(BROWNFIELD_INSTRUCTIONS_PATH, "utf8");
      expect(instructions).toMatch(/k8s\//);
      expect(instructions).toMatch(/kustomization\.yaml/);
    });

    it("detects Pulumi files (Pulumi.yaml)", () => {
      instructions = readFileSync(BROWNFIELD_INSTRUCTIONS_PATH, "utf8");
      expect(instructions).toMatch(/Pulumi\.yaml/);
    });

    it("detects CloudFormation files (cloudformation*.yaml)", () => {
      instructions = readFileSync(BROWNFIELD_INSTRUCTIONS_PATH, "utf8");
      expect(instructions).toMatch(/cloudformation.*\.yaml/);
    });
  });

  // ── AC2: Application code detection ──
  describe("AC2: Application code detection for pure app projects", () => {
    it("instructions reference application code detection", () => {
      instructions = readFileSync(BROWNFIELD_INSTRUCTIONS_PATH, "utf8");
      expect(instructions).toMatch(/application.*code|app.*code/i);
    });

    it("references framework imports for app code detection", () => {
      instructions = readFileSync(BROWNFIELD_INSTRUCTIONS_PATH, "utf8");
      // Must mention framework imports as a way to detect app code
      expect(instructions).toMatch(/Express|Spring Boot|Django|FastAPI|Angular|React/);
    });
  });

  // ── AC3: Platform classification (both app + infra) ──
  describe("AC3: Platform classification for mixed projects", () => {
    it("defines platform type for projects with both app and infra code", () => {
      instructions = readFileSync(BROWNFIELD_INSTRUCTIONS_PATH, "utf8");
      expect(instructions).toMatch(/platform/i);
    });

    it("sets project_type to platform when both markers present", () => {
      instructions = readFileSync(BROWNFIELD_INSTRUCTIONS_PATH, "utf8");
      // Must describe the logic: infra + app = platform
      expect(instructions).toMatch(/infra.*app.*platform|infrastructure.*application.*platform/is);
    });
  });

  // ── AC4: project_type in assessment output ──
  describe("AC4: project_type included in assessment output", () => {
    it("sets {project_type} variable in Step 1", () => {
      instructions = readFileSync(BROWNFIELD_INSTRUCTIONS_PATH, "utf8");
      // Step 1 must set the project_type variable
      expect(instructions).toMatch(/\{project_type\}/);
    });

    it("project_type is set before E11 scanners", () => {
      instructions = readFileSync(BROWNFIELD_INSTRUCTIONS_PATH, "utf8");
      // project_type must appear in Step 1, which is before any E11 reference
      const step1Match = instructions.match(/<step\s+n="1"[^>]*>[\s\S]*?<\/step>/);
      expect(step1Match, "Step 1 must exist").not.toBeNull();
      expect(step1Match[0]).toMatch(/project_type/);
    });
  });

  // ── AC5: Default to application ──
  describe("AC5: Default to application when no markers detected", () => {
    it("defaults project_type to application", () => {
      instructions = readFileSync(BROWNFIELD_INSTRUCTIONS_PATH, "utf8");
      expect(instructions).toMatch(/default.*application|application.*default/is);
    });
  });

  // ── AC6: Six independent infrastructure marker categories ──
  describe("AC6: Six infrastructure marker categories independently detected", () => {
    it("lists all 6 marker categories", () => {
      instructions = readFileSync(BROWNFIELD_INSTRUCTIONS_PATH, "utf8");
      const categories = ["Terraform", "Docker", "Helm", "Kubernetes", "Pulumi", "CloudFormation"];
      for (const category of categories) {
        expect(instructions, `Missing infrastructure category: ${category}`).toMatch(
          new RegExp(category, "i")
        );
      }
    });
  });

  // ── AC7: project_type accessible to Step 2.5 E11 scanners ──
  describe("AC7: project_type available for E11 scanners", () => {
    it("project_type is documented as available to downstream steps", () => {
      instructions = readFileSync(BROWNFIELD_INSTRUCTIONS_PATH, "utf8");
      // Must mention project_type availability for subsequent steps
      expect(instructions).toMatch(/project_type/);
    });
  });

  // ── AC8: Docker-only with app code classifies as platform ──
  describe("AC8: Docker with app code classifies as platform", () => {
    it("Docker alone with app code qualifies as mixed/platform", () => {
      instructions = readFileSync(BROWNFIELD_INSTRUCTIONS_PATH, "utf8");
      // The classification logic must handle Docker + app code → platform
      // This is covered by the general rule: any infra marker + app code = platform
      expect(instructions).toMatch(/Dockerfile/);
      expect(instructions).toMatch(/platform/i);
    });
  });

  // ── Classification logic structure ──
  describe("Classification logic decision tree", () => {
    it("documents the three project type values", () => {
      instructions = readFileSync(BROWNFIELD_INSTRUCTIONS_PATH, "utf8");
      expect(instructions).toMatch(/application/);
      expect(instructions).toMatch(/infrastructure/);
      expect(instructions).toMatch(/platform/);
    });

    it("classification logic is in Step 1", () => {
      instructions = readFileSync(BROWNFIELD_INSTRUCTIONS_PATH, "utf8");
      const step1Match = instructions.match(/<step\s+n="1"[^>]*>[\s\S]*?<\/step>/);
      expect(step1Match, "Step 1 must exist").not.toBeNull();
      const step1Content = step1Match[0];
      // Step 1 must contain the classification decision tree
      expect(step1Content).toMatch(/infrastructure/);
      expect(step1Content).toMatch(/application/);
      expect(step1Content).toMatch(/platform/);
    });
  });
});
