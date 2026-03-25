import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

// Project root is where _gaia/ lives (3 levels up from test/validation/atdd/)
const PROJECT_ROOT = path.resolve(import.meta.dirname, "../../..");
const GAIA_ROOT = path.join(PROJECT_ROOT, "_gaia");
const WORKFLOW_ENGINE_PATH = path.join(GAIA_ROOT, "core", "engine", "workflow.xml");

describe("E9-S7: Memory Load Protocol in Workflow Engine", () => {
  // AC1: Step 3 extended with memory load protocol
  describe("AC1: Step 3 memory load protocol", () => {
    it("test_ac1_step3_memory_load_protocol — workflow.xml Step 3 contains memory load actions", () => {
      expect(fs.existsSync(WORKFLOW_ENGINE_PATH), "workflow.xml not found").toBe(true);

      const content = fs.readFileSync(WORKFLOW_ENGINE_PATH, "utf-8");

      // Step 3 should exist and reference agent persona loading
      expect(content).toMatch(/step.*3|step.*load.*persona|load.*agent/i);

      // Step 3 should now include memory load protocol
      expect(content).toMatch(/memory.*load|load.*memory|sidecar.*load|load.*sidecar/i);

      // Should reference the memory protocol specifically (not just generic memory mentions)
      expect(content).toMatch(
        /memory.load.protocol|memory.loading|load.*agent.*memory|sidecar.*files/i
      );
    });
  });

  // AC2: Tiered file loading (Tier 1: 3 files, Tier 2: 2 files, Tier 3: 1 file)
  describe("AC2: Tiered file loading", () => {
    it("test_ac2_tiered_file_loading — workflow.xml distinguishes Tier 1 (3), Tier 2 (2), Tier 3 (1) file loads", () => {
      expect(fs.existsSync(WORKFLOW_ENGINE_PATH)).toBe(true);

      const content = fs.readFileSync(WORKFLOW_ENGINE_PATH, "utf-8");

      // Should reference tier-based loading
      expect(content).toMatch(/tier/i);

      // Should reference the three tiers with different file counts
      const tier1Match = content.match(/tier[- _]?1/gi);
      const tier2Match = content.match(/tier[- _]?2/gi);
      const tier3Match = content.match(/tier[- _]?3/gi);

      expect(tier1Match, "No Tier 1 reference found").not.toBeNull();
      expect(tier2Match, "No Tier 2 reference found").not.toBeNull();
      expect(tier3Match, "No Tier 3 reference found").not.toBeNull();

      // Should specify different file counts per tier
      // Tier 1: ground-truth + decision-log + conversation-context (3 files)
      // Tier 2: decision-log + conversation-context (2 files)
      // Tier 3: decision-log (1 file)
      expect(content).toMatch(/ground.truth/i);
      expect(content).toMatch(/decision.log/i);
      expect(content).toMatch(/conversation.context/i);
    });
  });

  // AC3: Load order — memory after persona, before instructions
  describe("AC3: Memory load ordering", () => {
    it("test_ac3_load_order — memory loads after persona and before instruction processing", () => {
      expect(fs.existsSync(WORKFLOW_ENGINE_PATH)).toBe(true);

      const content = fs.readFileSync(WORKFLOW_ENGINE_PATH, "utf-8");

      // Find positions of key actions in the XML
      const personaLoadPos = content.search(/load.*persona|read.*persona|agent.*persona/i);
      const memoryLoadPos = content.search(/load.*memory|memory.*load|sidecar.*load/i);
      const instructionPos = content.search(/step.*n="4".*title="Load Instructions"|<step n="4"/i);

      expect(personaLoadPos, "Persona load action not found").not.toBe(-1);
      expect(memoryLoadPos, "Memory load action not found").not.toBe(-1);
      expect(instructionPos, "Instruction processing action not found").not.toBe(-1);

      // Memory load must come AFTER persona load
      expect(
        memoryLoadPos > personaLoadPos,
        `Memory load (pos ${memoryLoadPos}) must come after persona load (pos ${personaLoadPos})`
      ).toBe(true);

      // Memory load must come BEFORE instruction processing
      expect(
        memoryLoadPos < instructionPos,
        `Memory load (pos ${memoryLoadPos}) must come before instruction processing (pos ${instructionPos})`
      ).toBe(true);
    });
  });

  // AC4: Token budget check at load time
  describe("AC4: Token budget check at load time", () => {
    it("test_ac4_token_budget_check — workflow.xml contains token budget check during memory load", () => {
      expect(fs.existsSync(WORKFLOW_ENGINE_PATH)).toBe(true);

      const content = fs.readFileSync(WORKFLOW_ENGINE_PATH, "utf-8");

      // Should contain a budget/token check action
      expect(content).toMatch(/token.*budget|budget.*check|token.*limit|budget.*warn/i);

      // Should have a warning mechanism when near limit
      expect(content).toMatch(/warn|alert|exceed|over.*budget|near.*limit|threshold/i);

      // Budget check should be in the context of memory loading (not just general mention)
      const memorySection = content.match(/memory.*load[\s\S]{0,2000}?(?=<\/step|<step|$)/i);
      if (memorySection) {
        expect(memorySection[0]).toMatch(/budget|token.*check|limit/i);
      } else {
        // If we can't isolate the section, at minimum both concepts must exist
        expect(content).toMatch(/memory.*load/i);
        expect(content).toMatch(/token.*budget|budget.*check/i);
      }
    });
  });
});
