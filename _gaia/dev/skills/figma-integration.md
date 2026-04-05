---
name: figma-integration
version: '1.0'
applicable_agents: [typescript-dev, angular-dev, flutter-dev, java-dev, python-dev, mobile-dev]
test_scenarios:
  - scenario: Figma MCP server available and healthy
    expected: Mode selection (Generate/Import/Skip) presented to user
  - scenario: Figma MCP server not installed
    expected: Silent fallback to markdown-only, no error or warning
  - scenario: Figma MCP server not running
    expected: Silent fallback to markdown-only, no error or warning
  - scenario: Figma API token expired
    expected: Warning displayed, fallback to markdown-only
  - scenario: Rate limited (429)
    expected: Single retry after delay, fallback with warning if retry fails
  - scenario: Timeout exceeding 5 seconds
    expected: Fallback with warning, continue markdown-only
---

<!-- SECTION: detection -->
## Detection Probe

Detect Figma MCP server availability using a lightweight, read-only probe call.
This section is consumed by `/gaia-create-ux` at workflow start.

### Probe Call

Use `figma/get_user_info` as the detection probe:
- Read-only, lightweight, validates both connectivity and token validity
- 5-second hard timeout (NFR-026 compliance)
- Zero added latency when MCP is not available (silent skip)

### Detection Flow

1. **Attempt probe:** call `figma/get_user_info` with a 5-second hard timeout
2. **On success:** set `figma_mcp_available = true`, proceed to mode selection
3. **On failure:** classify the failure and handle per the failure mode table below

### Failure Mode Handling

| Failure | Detection Signal | Behavior |
|---------|-----------------|----------|
| **Not installed** (AC5) | Tool not found / tool not available | Silent fallback to markdown-only mode — no error, no warning, no prompt |
| **Not running** (AC6) | Connection refused / connection error | Silent fallback to markdown-only mode — no error, no warning, no prompt |
| **Token expired** (AC7) | 401 or 403 response from `figma/get_user_info` | Warn: "Figma token expired — falling back to markdown" then continue markdown-only |
| **Rate limited** (AC8) | 429 response | Retry once after `Retry-After` header delay (default: 2 seconds). If retry also fails, warn and fallback to markdown-only |
| **Timeout** (AC9) | No response within 5-second hard timeout | Warn: "Figma MCP did not respond within 5 seconds — falling back to markdown" then continue markdown-only |
| **Malformed response** | Unexpected or partial data | Treat as unavailable — silent fallback to markdown-only |

### Mode Selection (on success)

When `figma_mcp_available == true`, present the user with:

```
Figma MCP detected. Select UX design mode:
  [g] Generate — AI-generated UX with Figma export
  [i] Import  — Import existing Figma designs into GAIA
  [s] Skip    — Proceed with markdown-only (ignore Figma)
```

### Security Boundary

- The Figma API token lives exclusively in the MCP server configuration (ADR-024)
- GAIA files must NEVER contain or log Figma tokens, API keys, or credentials
- Detection probe interacts through MCP tool abstraction only — no direct HTTP calls

### Traceability

- FR-132: Figma MCP detection probe requirement
- FR-143: Graceful MCP failure handling
- NFR-026: MCP detection latency < 5 seconds
- ADR-024: Figma MCP integration via shared skill

<!-- SECTION: tokens -->
## Design Token Extraction

> Placeholder — implemented in E13-S3.

<!-- SECTION: components -->
## Component Mapping

> Placeholder — implemented in future stories.

<!-- SECTION: frames -->
## Frame Navigation

> Placeholder — implemented in future stories.

<!-- SECTION: assets -->
## Asset Export

> Placeholder — implemented in future stories.

<!-- SECTION: export -->
## Export Pipeline

> Placeholder — implemented in future stories.
