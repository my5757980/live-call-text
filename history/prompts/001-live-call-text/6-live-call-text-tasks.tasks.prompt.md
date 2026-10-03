---
id: 6
title: Live call text tasks
stage: tasks
date: 2026-10-03
surface: agent
model: claude-opus-5-5
feature: 001-live-call-text
branch: 001-live-call-text (no git repo; branch validation skipped)
user: Muhammad Yaseen
command: /sp.tasks
labels: ["tasks","tdd","playwright","node-test","cloudflare","user-stories"]
links:
  spec: specs/001-live-call-text/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - specs/001-live-call-text/tasks.md
 - specs/001-live-call-text/contracts/relay-protocol.md
 - specs/001-live-call-text/contracts/ui-contract.md
 - specs/001-live-call-text/research.md
 - history/prompts/001-live-call-text/6-live-call-text-tasks.tasks.prompt.md
tests:
 - none run (tasks stage; format validation of tasks.md passed)
---

## Prompt

/sp.tasks

(The command was run with no text. As agreed, Claude supplied the task guidance from the project context:
- organize by user story, with US1 as the MVP
- test-first with an explicit "see it fail" step
- exact file paths
- setup for node:test and Playwright on the installed Chrome
- recorded English and Urdu fixtures
- every FR-021 error message
- real-call checklists per call surface
- free hosting steps only after the owner approves
- a Roman Urdu agent guide
- [P] markers and small tasks.)

## Response snapshot

- Ran check-prerequisites.ps1. Available docs: research, data-model, contracts and quickstart.
- Wrote specs/001-live-call-text/tasks.md with 80 tasks:

  | Phase | Tasks | IDs |
  |---|---|---|
  | Setup | 11 | T001-T011 |
  | Foundational | 19 | T012-T030 |
  | US1 (MVP) | 12 | T031-T042 |
  | US2 | 6 | T043-T048 |
  | US3 | 18 | T049-T066 |
  | Polish & release gate | 14 | T067-T080 |

- 42 tasks are marked [P]. Each story has red-phase tasks (T018, T036, T045, T055), and manual or owner-approval tasks are clearly marked (T042, T074-T080).
- Refined the contracts while breaking down the work:
  - A valid agent reconnect now replaces a stale agent socket (close code 4010) instead of being refused with 409. After a network drop, the old socket can still look open, so a refusal would block the agent's own reconnect.
  - Added `data-url` to link-status so the link can also be copied by hand.
  - Added the full list of status texts and data-states.
  - Added a priority order for showing one message at a time.
- Format check: IDs run in order from T001 to T080. Story labels appear only in the story phases, and every task names a file path (.gitignore was flagged by the heuristic, but it is a path).

## Outcome

- ✅ Impact: Executable, test-first task list ready for /sp.implement.
- 🧪 Tests: none run; tasks.md format validated.
- 📁 Files: tasks.md; small contract and research refinements (relay-protocol.md, ui-contract.md, research.md R7)
- 🔁 Next prompts: /sp.implement (MVP first: T001-T042, then stop for the owner's real-call check)
- 🧠 Reflection: Breaking the relay into concrete steps exposed the reconnect deadlock (409 vs a stale socket) before any code existed.

## Evaluation notes (flywheel)

- Failure modes observed: The file-path heuristic flagged `.gitignore` and the first line of T074. T074's first line was fixed to name its path.
- Graders run and results (PASS/FAIL): tasks.md format (checkbox, sequential IDs, story labels, file paths) - PASS after one fix
- Prompt variant (if applicable): none
- Next experiment (smallest change to try): During /sp.implement, stop after T042 for the owner's MVP real-call check before US2.
