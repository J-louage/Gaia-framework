/**
 * E19-S14: Brownfield Docker Test Config Detection — Acceptance Tests
 *
 * RED PHASE — these tests are intentionally failing.
 * The implementation module (src/brownfield/docker-test-detector.js) does not
 * exist yet.
 *
 * Story: As a brownfield user, I want /gaia-brownfield to detect Docker-based
 * test configurations so that containerized test setups are captured in the
 * onboarding report and the test-environment.yaml.
 *
 * Covers: AC1-AC5 (BTI-13 through BTI-18)
 * Traces to: FR-233, NFR-041
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { join } from "path";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "fs";
import { tmpdir } from "os";

// Implementation under test — does not exist yet (red phase)
import { detectDockerTestConfig } from "../../../src/brownfield/docker-test-detector.js";

// ─── Test fixtures ────────────────────────────────────────────────────────────

const TMP_BASE = join(tmpdir(), "gaia-e19-s14-tests");

function createFixtureDir(name) {
  const dir = join(TMP_BASE, name);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function cleanFixtures() {
  if (existsSync(TMP_BASE)) {
    rmSync(TMP_BASE, { recursive: true, force: true });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// AC1: docker-compose scanner — docker-compose.test.yml and override
// ─────────────────────────────────────────────────────────────────────────────
describe("E19-S14 AC1: docker-compose scanner detects test configurations", () => {
  let projectDir;

  beforeEach(() => {
    cleanFixtures();
    projectDir = createFixtureDir("ac1-compose");
  });

  afterEach(() => {
    cleanFixtures();
  });

  it("BTI-13: detects docker-compose.test.yml with a test service", async () => {
    writeFileSync(
      join(projectDir, "docker-compose.test.yml"),
      `services:
  test:
    image: node:20
    command: npm test
`
    );

    const result = await detectDockerTestConfig(projectDir);
    expect(result).not.toBeNull();
    expect(result.compose_file).toBe("docker-compose.test.yml");
    expect(result.service_name).toBe("test");
    expect(result.test_command).toBe("npm test");
  });

  it("BTI-14: detects docker-compose.override.yml with service named 'test'", async () => {
    writeFileSync(
      join(projectDir, "docker-compose.override.yml"),
      `services:
  test:
    build: .
    command: pytest
`
    );

    const result = await detectDockerTestConfig(projectDir);
    expect(result).not.toBeNull();
    expect(result.compose_file).toBe("docker-compose.override.yml");
    expect(result.service_name).toBe("test");
    expect(result.test_command).toBe("pytest");
  });

  it("BTI-14b: detects docker-compose.override.yml with service named 'e2e'", async () => {
    writeFileSync(
      join(projectDir, "docker-compose.override.yml"),
      `services:
  e2e:
    image: cypress/included:13
    command: cypress run
`
    );

    const result = await detectDockerTestConfig(projectDir);
    expect(result).not.toBeNull();
    expect(result.service_name).toBe("e2e");
    expect(result.test_command).toBe("cypress run");
  });

  it("BTI-14c: detects docker-compose.override.yml with service named 'integration'", async () => {
    writeFileSync(
      join(projectDir, "docker-compose.override.yml"),
      `services:
  integration:
    image: maven:3.9
    command: mvn verify
`
    );

    const result = await detectDockerTestConfig(projectDir);
    expect(result).not.toBeNull();
    expect(result.service_name).toBe("integration");
  });

  it("prefers docker-compose.test.yml over docker-compose.override.yml when both exist", async () => {
    writeFileSync(
      join(projectDir, "docker-compose.test.yml"),
      `services:
  test:
    command: npm test
`
    );
    writeFileSync(
      join(projectDir, "docker-compose.override.yml"),
      `services:
  spec:
    command: pytest
`
    );

    const result = await detectDockerTestConfig(projectDir);
    expect(result.compose_file).toBe("docker-compose.test.yml");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC2: Dockerfile scanner
// ─────────────────────────────────────────────────────────────────────────────
describe("E19-S14 AC2: Dockerfile scanner detects test CMD/ENTRYPOINT", () => {
  let projectDir;

  beforeEach(() => {
    cleanFixtures();
    projectDir = createFixtureDir("ac2-dockerfile");
  });

  afterEach(() => {
    cleanFixtures();
  });

  it("BTI-16: detects Dockerfile.test with CMD", async () => {
    writeFileSync(
      join(projectDir, "Dockerfile.test"),
      `FROM node:20
WORKDIR /app
COPY . .
RUN npm ci
CMD ["npm", "test"]
`
    );

    const result = await detectDockerTestConfig(projectDir);
    expect(result).not.toBeNull();
    expect(result.compose_file).toBe("Dockerfile.test");
    expect(result.test_command).toMatch(/npm test/);
  });

  it("BTI-16b: detects Dockerfile.test with ENTRYPOINT", async () => {
    writeFileSync(
      join(projectDir, "Dockerfile.test"),
      `FROM python:3.12
COPY . /app
ENTRYPOINT ["pytest", "-q"]
`
    );

    const result = await detectDockerTestConfig(projectDir);
    expect(result).not.toBeNull();
    expect(result.test_command).toMatch(/pytest/);
  });

  it("detects Dockerfile with CMD invoking pytest", async () => {
    writeFileSync(
      join(projectDir, "Dockerfile"),
      `FROM python:3.12
COPY . /app
CMD ["pytest"]
`
    );

    const result = await detectDockerTestConfig(projectDir);
    expect(result).not.toBeNull();
    expect(result.compose_file).toBe("Dockerfile");
    expect(result.test_command).toMatch(/pytest/);
  });

  it("detects Dockerfile with CMD invoking ./gradlew test", async () => {
    writeFileSync(
      join(projectDir, "Dockerfile"),
      `FROM openjdk:21
COPY . /app
CMD ["./gradlew", "test"]
`
    );

    const result = await detectDockerTestConfig(projectDir);
    expect(result).not.toBeNull();
    expect(result.test_command).toMatch(/gradlew test/);
  });

  it("detects Dockerfile with shell-form CMD go test", async () => {
    writeFileSync(
      join(projectDir, "Dockerfile"),
      `FROM golang:1.22
COPY . /app
CMD go test ./...
`
    );

    const result = await detectDockerTestConfig(projectDir);
    expect(result).not.toBeNull();
    expect(result.test_command).toMatch(/go test/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC3: Result shape
// ─────────────────────────────────────────────────────────────────────────────
describe("E19-S14 AC3: result shape", () => {
  let projectDir;

  beforeEach(() => {
    cleanFixtures();
    projectDir = createFixtureDir("ac3-shape");
  });

  afterEach(() => {
    cleanFixtures();
  });

  it("returns object with compose_file, service_name, test_command keys", async () => {
    writeFileSync(
      join(projectDir, "docker-compose.test.yml"),
      `services:
  test:
    command: npm test
`
    );

    const result = await detectDockerTestConfig(projectDir);
    expect(result).toEqual({
      compose_file: "docker-compose.test.yml",
      service_name: "test",
      test_command: "npm test",
    });
  });

  it("returns null when no Docker files are present", async () => {
    const result = await detectDockerTestConfig(projectDir);
    expect(result).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC4: NFR-041 — Zero false positives
// ─────────────────────────────────────────────────────────────────────────────
describe("E19-S14 AC4: zero false positives (NFR-041)", () => {
  let projectDir;

  beforeEach(() => {
    cleanFixtures();
    projectDir = createFixtureDir("ac4-nfr041");
  });

  afterEach(() => {
    cleanFixtures();
  });

  it("BTI-15: production-only docker-compose.yml returns null", async () => {
    writeFileSync(
      join(projectDir, "docker-compose.yml"),
      `services:
  web:
    image: nginx:1.25
    ports:
      - "80:80"
  db:
    image: postgres:16
`
    );

    const result = await detectDockerTestConfig(projectDir);
    expect(result).toBeNull();
  });

  it("BTI-17: docker-compose.yml with 'test' only in a comment returns null", async () => {
    writeFileSync(
      join(projectDir, "docker-compose.yml"),
      `# test service coming soon
services:
  web:
    image: nginx:1.25
  db:
    image: postgres:16
`
    );

    const result = await detectDockerTestConfig(projectDir);
    expect(result).toBeNull();
  });

  it("docker-compose.yml with image containing 'test' in tag does not trigger", async () => {
    writeFileSync(
      join(projectDir, "docker-compose.yml"),
      `services:
  web:
    image: mycompany/webapp:test-latest
  redis:
    image: redis:7
`
    );

    const result = await detectDockerTestConfig(projectDir);
    expect(result).toBeNull();
  });

  it("Dockerfile without a test command returns null", async () => {
    writeFileSync(
      join(projectDir, "Dockerfile"),
      `FROM node:20
COPY . /app
CMD ["node", "server.js"]
`
    );

    const result = await detectDockerTestConfig(projectDir);
    expect(result).toBeNull();
  });

  it("BTI-18: no Docker files present returns null", async () => {
    writeFileSync(
      join(projectDir, "README.md"),
      "# Just a readme, no docker files here."
    );

    const result = await detectDockerTestConfig(projectDir);
    expect(result).toBeNull();
  });

  it("ignores services whose name equals a production name like 'web' even with image 'test'", async () => {
    writeFileSync(
      join(projectDir, "docker-compose.yml"),
      `services:
  web:
    image: busybox
    command: echo test
`
    );

    const result = await detectDockerTestConfig(projectDir);
    expect(result).toBeNull();
  });
});
