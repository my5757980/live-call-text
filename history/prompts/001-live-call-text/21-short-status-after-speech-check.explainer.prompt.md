---
id: 21
title: Short status after speech check
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
 - history/prompts/001-live-call-text/21-short-status-after-speech-check.explainer.prompt.md
tests:
 - none
---

## Prompt

short mayyy batooo kia bol rahayyy hoooo

## Response snapshot

Three short Roman Urdu lines:
1. Soft or loud speech is now captured correctly on both sides.
2. Only very fast English may drop some words (a Google limit); Urdu is fine.
3. Refresh the page (Ctrl+R) and test again.

## Outcome

- ✅ Impact: The status was cut to three lines.
- 🧪 Tests: none
- 📁 Files: this PHR only
- 🔁 Next prompts: the owner re-tests after refreshing
- 🧠 Reflection: A table plus explanation was too long again. Lead with three lines only.

## Evaluation notes (flywheel)

- Failure modes observed: The reply was too long a fourth time.
- Graders run and results (PASS/FAIL): none
- Prompt variant (if applicable): none
- Next experiment (smallest change to try): Three lines maximum, with no tables unless asked.
