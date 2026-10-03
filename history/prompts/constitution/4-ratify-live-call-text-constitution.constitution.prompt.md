---
id: 4
title: Ratify Live Call Text constitution
stage: constitution
date: 2026-10-03
surface: agent
model: claude-opus-5-5
feature: none
branch: none (dialer is not a git repo)
user: Muhammad Yaseen
command: /sp.constitution
labels: ["constitution","zero-cost","privacy","honest-testing","live-call-text"]
links:
  spec: specs/001-live-call-text/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - .specify/memory/constitution.md
 - .specify/templates/plan-template.md
 - .specify/templates/tasks-template.md
 - history/prompts/constitution/4-ratify-live-call-text-constitution.constitution.prompt.md
tests:
 - none (validation only: no placeholders left, no trailing whitespace, no line over 100 chars)
---

## Prompt

/sp.constitution

(The command was run with no text. As agreed, Claude used the seven-principle prompt it had prepared for this project, recorded in full in history/prompts/general/2-first-sdd-command-constitution-prompt.general.prompt.md: project "Live Call Text", principles Zero Cost, Customer Text First, Laptop Call Surfaces, Simple for Non-Technical Agents, Privacy by Design, Honest Testing, Smallest Viable Build, plus governance.)

## Response snapshot

- Filled .specify/memory/constitution.md and set version 1.0.0 (first ratification), ratified and last amended 2026-10-03.
- Seven principles:
  - I. Zero Cost (NON-NEGOTIABLE)
  - II. Customer Text First
  - III. Laptop Call Surfaces
  - IV. Simple for Non-Technical Agents
  - V. Privacy by Design
  - VI. Honest Testing (NON-NEGOTIABLE)
  - VII. Smallest Viable Build. The template had six slots, so a seventh was added.
- Added sections:
  - Platform and Cost Constraints: agent and customer setup, Chrome speech-to-text risk, HTTPS-only capture, a free-tier ledger (20 agents, 8 h/day, link on 1 in 4 calls, 2x headroom), and owner approval for outward actions.
  - Development Workflow and Quality Gates: the SDD flow, PHR/ADR records, plan, task, story and release gates, and Roman Urdu reporting.
- Governance covers amendments, semver rules and Constitution Check compliance.
- Propagated the changes:
  - plan-template.md gained a Free-Tier Ledger line.
  - tasks-template.md now marks tests as required and written first, and adds a real-call checklist task.
  - Flagged .claude/commands/sp.tasks.md ("tests optional unless requested"). Left unedited because the 001 spec requests tests.
- Added a Sync Impact Report as an HTML comment at the top.
- Suggested commit message: docs: ratify constitution v1.0.0 (7 principles, cost and quality gates)

## Outcome

- ✅ Impact: Project principles set; /sp.plan can now run its Constitution Check.
- 🧪 Tests: none (document validation passed)
- 📁 Files: constitution.md, plan-template.md, tasks-template.md
- 🔁 Next prompts: /sp.plan
- 🧠 Reflection: The spec written earlier already matches all seven principles (FR-002, FR-022, FR-032 to FR-036, VR-001 to VR-004), so no spec change was needed.

## Evaluation notes (flywheel)

- Failure modes observed: The constitution step ran after the spec instead of before; no conflict resulted.
- Graders run and results (PASS/FAIL): Constitution validation (placeholders, dates, version line, whitespace, line length) - PASS
- Prompt variant (if applicable): none
- Next experiment (smallest change to try): none
