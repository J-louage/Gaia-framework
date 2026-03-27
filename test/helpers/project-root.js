/**
 * Shared PROJECT_ROOT resolution for all test files.
 *
 * Uses process.cwd() which vitest sets to the config's `root` directory.
 * This is more reliable than import.meta.dirname traversal which can
 * break in CI when the repo checkout path depth differs from local.
 */
import { resolve } from "path";

export const PROJECT_ROOT = resolve(process.cwd());
