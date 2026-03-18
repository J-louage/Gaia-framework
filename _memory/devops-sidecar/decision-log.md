# Infrastructure Decisions — GAIA Framework

**Date:** 2026-03-14
**Author:** Soren (DevOps/SRE Engineer)

## Key Decisions

### D-01: GitHub Actions is the only infrastructure-as-code
- No cloud resources → no Terraform/Pulumi/CloudFormation needed
- `.github/workflows/ci.yml` and `publish.yml` are the complete IaC
- Workflow files + branch protection + CODEOWNERS = full infrastructure definition

### D-02: No containerization
- Framework is a CLI tool with no running services
- CI uses ephemeral GitHub Actions runners (VMs, not containers)
- End-users run on their local machines

### D-03: Two-workflow CI/CD design
- `ci.yml`: PR + main branch validation (lint, test, audit, validate)
- `publish.yml`: Release-triggered publish (isolated from PR context)
- Publish uses protected GitHub Environment with required reviewers

### D-04: npm ci with committed lockfile
- `package-lock.json` committed to repository
- CI uses `npm ci` for exact reproducibility
- Prevents dependency drift between environments

### D-05: Dependency budget enforced in CI
- Transitive dependency count checked in CI (max 400)
- Budget: Vitest ~180, ESLint ~100, Prettier ~30, Husky ~20, parsers ~3
- New dependencies must be evaluated against budget

### D-06: Rollback strategy is version-based
- npm unpublish (within 72 hours) or deprecate for bad versions
- git revert for CI/config/content changes
- No blue/green, canary, or feature flags — simple linear versioning

### D-07: Observability is CI-scoped
- No runtime monitoring (no runtime services)
- CI pipeline metrics: build time, coverage, dependency count, validation coverage
- SLO: PR feedback < 5 minutes, main branch green >= 95%

### D-08: Dependabot for automated updates
- Weekly checks for npm + GitHub Actions version updates
- Grouped PRs for dev dependencies
- Budget check prevents over-limit merges
