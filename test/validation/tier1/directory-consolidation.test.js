import { describe, it, expect } from "vitest";
import { existsSync, lstatSync, readlinkSync, realpathSync } from "fs";
import { resolve, join } from "path";

const PROJECT_PATH = resolve(import.meta.dirname, "../../..");
const PROJECT_ROOT = resolve(PROJECT_PATH, "..");

describe("E9-S13: Directory Consolidation", () => {
  describe("AC1: Single canonical location for _gaia/", () => {
    it("should have _gaia/ as a symlink in {project-path}", () => {
      const gaiaInProjectPath = join(PROJECT_PATH, "_gaia");
      expect(existsSync(gaiaInProjectPath)).toBe(true);
      const stat = lstatSync(gaiaInProjectPath);
      expect(stat.isSymbolicLink()).toBe(true);
    });

    it("should have _gaia/ symlink pointing to {project-root}/_gaia/", () => {
      const gaiaInProjectPath = join(PROJECT_PATH, "_gaia");
      const realPath = realpathSync(gaiaInProjectPath);
      const canonicalGaia = join(PROJECT_ROOT, "_gaia");
      expect(realPath).toBe(realpathSync(canonicalGaia));
    });

    it("should have _gaia/ as a real directory at {project-root}", () => {
      const gaiaAtRoot = join(PROJECT_ROOT, "_gaia");
      expect(existsSync(gaiaAtRoot)).toBe(true);
      const stat = lstatSync(gaiaAtRoot);
      expect(stat.isDirectory()).toBe(true);
      expect(stat.isSymbolicLink()).toBe(false);
    });
  });

  describe("AC1: Single canonical location for _memory/", () => {
    it("should have _memory/ as a symlink in {project-path}", () => {
      const memoryInProjectPath = join(PROJECT_PATH, "_memory");
      expect(existsSync(memoryInProjectPath)).toBe(true);
      const stat = lstatSync(memoryInProjectPath);
      expect(stat.isSymbolicLink()).toBe(true);
    });

    it("should have _memory/ symlink pointing to {project-root}/_memory/", () => {
      const memoryInProjectPath = join(PROJECT_PATH, "_memory");
      const realPath = realpathSync(memoryInProjectPath);
      const canonicalMemory = join(PROJECT_ROOT, "_memory");
      expect(realPath).toBe(realpathSync(canonicalMemory));
    });

    it("should have _memory/ as a real directory at {project-root}", () => {
      const memoryAtRoot = join(PROJECT_ROOT, "_memory");
      expect(existsSync(memoryAtRoot)).toBe(true);
      const stat = lstatSync(memoryAtRoot);
      expect(stat.isDirectory()).toBe(true);
      expect(stat.isSymbolicLink()).toBe(false);
    });
  });

  describe("AC2: Path resolution works through symlinks", () => {
    it("should resolve _gaia/_config/global.yaml from both locations identically", () => {
      const fromRoot = realpathSync(join(PROJECT_ROOT, "_gaia", "_config", "global.yaml"));
      const fromProjectPath = realpathSync(join(PROJECT_PATH, "_gaia", "_config", "global.yaml"));
      expect(fromRoot).toBe(fromProjectPath);
    });

    it("should resolve _memory/ contents from both locations identically", () => {
      const fromRoot = realpathSync(join(PROJECT_ROOT, "_memory"));
      const fromProjectPath = realpathSync(join(PROJECT_PATH, "_memory"));
      expect(fromRoot).toBe(fromProjectPath);
    });

    it("should resolve .claude/commands/ from both locations identically", () => {
      const fromRoot = realpathSync(join(PROJECT_ROOT, ".claude", "commands"));
      const fromProjectPath = realpathSync(join(PROJECT_PATH, ".claude", "commands"));
      expect(fromRoot).toBe(fromProjectPath);
    });
  });

  describe("AC3: No duplicate directories remain", () => {
    it("should not have a real (non-symlink) _gaia/ inside {project-path}", () => {
      const gaiaInProjectPath = join(PROJECT_PATH, "_gaia");
      if (existsSync(gaiaInProjectPath)) {
        const stat = lstatSync(gaiaInProjectPath);
        expect(stat.isSymbolicLink()).toBe(true);
      }
    });

    it("should not have a real (non-symlink) _memory/ inside {project-path}", () => {
      const memoryInProjectPath = join(PROJECT_PATH, "_memory");
      if (existsSync(memoryInProjectPath)) {
        const stat = lstatSync(memoryInProjectPath);
        expect(stat.isSymbolicLink()).toBe(true);
      }
    });

    it("should use relative symlink targets (portable)", () => {
      const gaiaInProjectPath = join(PROJECT_PATH, "_gaia");
      const memoryInProjectPath = join(PROJECT_PATH, "_memory");

      if (lstatSync(gaiaInProjectPath).isSymbolicLink()) {
        const target = readlinkSync(gaiaInProjectPath);
        expect(target).toBe("../_gaia");
      }

      if (lstatSync(memoryInProjectPath).isSymbolicLink()) {
        const target = readlinkSync(memoryInProjectPath);
        expect(target).toBe("../_memory");
      }
    });
  });
});
