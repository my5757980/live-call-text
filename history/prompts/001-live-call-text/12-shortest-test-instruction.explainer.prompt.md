---
id: 12
title: Shortest test instruction
stage: explainer
date: 2026-10-03
surface: agent
model: claude-opus-5-5
feature: 001-live-call-text
branch: 001-live-call-text (no git repo)
user: Muhammad Yaseen
command: none (free-form request)
labels: ["status","explainer","roman-urdu"]
links:
  spec: specs/001-live-call-text/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - history/prompts/001-live-call-text/12-shortest-test-instruction.explainer.prompt.md
tests:
 - none
---

## Prompt

short mayy batooo kiaaa bl rahayyyy hooooo

## Response snapshot

A two-line Roman Urdu answer:
1. Everything is ready.
2. Open http://localhost:8787 in Chrome, make a WhatsApp call, press Start, and tell Claude the result.

## Outcome

- ✅ Impact: The instruction was cut to two lines.
- 🧪 Tests: none
- 📁 Files: this PHR only
- 🔁 Next prompts: the owner reports the real-call result
- 🧠 Reflection: A 4-step list was still too long. Give one action line, plus detail only if asked.

## Evaluation notes (flywheel)

- Failure modes observed: The reply was too long a third time.
- Graders run and results (PASS/FAIL): none
- Prompt variant (if applicable): none
- Next experiment (smallest change to try): Two lines maximum.
