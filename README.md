# GAIA — Generative Agile Intelligence Architecture

AI agent framework for Claude Code that orchestrates software product development through specialized agents, structured workflows, and intelligent tooling.

## Quick Start

1. Type `/gaia` to start the orchestrator
2. Select from the categorized menu
3. Follow the workflow prompts

## Key Commands

| Command | Description |
|---------|------------|
| `/gaia` | Main entry point — categorized menu |
| `/gaia-help` | Context-sensitive help |
| `/gaia-dev-story` | Implement a user story |
| `/gaia-quick-spec` | Quick spec for small changes |
| `/gaia-quick-dev` | Rapid implementation of a quick spec |
| `/gaia-resume` | Resume from last checkpoint |

## Architecture

```
_gaia/
├── core/        # Engine, protocols, shared tasks
├── lifecycle/   # Product lifecycle (analysis → deployment)
├── dev/         # Developer agents (6 stacks) + shared skills
├── creative/    # Creative intelligence workflows
└── testing/     # Test architecture + knowledge base
```

- **5 modules** — core, lifecycle, dev, creative, testing
- **26 agents** with distinct personas and specializations
- **57 workflows** covering analysis through deployment
- **17 core tasks** for reviews, audits, and utilities
- **8 shared skills** with sectioned JIT loading
- **34+ knowledge fragments** for testing patterns
- **Checkpoint/resume** for long-running workflows

## Agents

| Category | Agents |
|----------|--------|
| **Lifecycle** | Analyst, PM, UX Designer, Architect, Scrum Master, Tech Writer |
| **Developer** | Angular, TypeScript, Flutter, Java, Python, Mobile |
| **Specialist** | QA, Security, DevOps, Performance, Data Engineer |
| **Creative** | Design Thinking, Problem Solver, Innovation, Storyteller, Brainstorming, Presentation |
| **Testing** | Test Architect |
| **Core** | Orchestrator (Gaia) |

## Workflow Phases

1. **Analysis** — Market research, domain research, product briefs
2. **Planning** — PRDs, UX design, validation
3. **Solutioning** — Architecture, epics/stories, threat models, infrastructure
4. **Implementation** — Sprint planning, story development, code review, testing
5. **Deployment** — Release planning, deployment checklists, post-deploy verification

## For Developers

See `GT-AI-PLAN.md` for full architecture documentation.
See `docs/phases/` for implementation phase guides.
