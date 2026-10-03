---
id: 3
title: Live call text spec
stage: spec
date: 2026-10-03
surface: agent
model: claude-opus-5-5
feature: 001-live-call-text
branch: 001-live-call-text (no git repo; branch creation skipped)
user: Muhammad Yaseen
command: /sp.specify
labels: ["spec","live-call-text","whatsapp","voip-dialer","captions"]
links:
  spec: specs/001-live-call-text/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - specs/001-live-call-text/spec.md
 - specs/001-live-call-text/checklists/requirements.md
 - history/prompts/001-live-call-text/3-live-call-text-spec.spec.prompt.md
tests:
 - none (spec stage; spec quality checklist passed 16/16)
---

## Prompt

/sp.specify

(The command was run with no text. A second message, "continue", was sent after the feature script ran.)

continue

Because the owner asked Claude to write each command's content for the project, the feature description was written from the agreed context:

"Live call text for agents. While an agent talks to a customer on a laptop call (WhatsApp Web in Chrome, the WhatsApp Desktop app, or a VoIP dialer installed on the laptop), the customer's words appear as live text on the agent's screen, in Urdu or English, 100% free, with nothing for the customer to do. The agent's own words can also be shown, and the agent can optionally send the customer a link to see the agent's words as live text on their phone."

## Response snapshot

- Ran create-new-feature.ps1 (-Number 1 -ShortName live-call-text). No git repo, so branch creation was skipped; it created specs/001-live-call-text/spec.md and history/prompts/001-live-call-text/.
- Wrote the spec with three prioritized, independently testable stories:
  - P1 (MVP): the customer's words appear as live text for the agent, via a Chrome tab (WhatsApp Web) or Entire screen + system audio (WhatsApp Desktop, installed VoIP dialer).
  - P2: the agent's own microphone appears as Agent lines.
  - P3: optional customer link that shows the agent's words on the customer's phone.
- Requirements: 36 functional requirements (starting and listening, captions, stopping, messages and help, customer link, privacy and cost) and 4 verification requirements (recorded Urdu and English audio tests, automated error-message checks, real-call checklist per call type, honest results).
- Also written: 12 measurable success criteria, edge cases, key entities, assumptions, dependencies and out of scope.
- The quality checklist passed 16/16 on the first iteration, with no clarification markers. Defaults recorded as assumptions: English as the first-use language, 20 agents, links expire at call end or after 4 hours, the customer page shows only the agent's words, and each new Start adds a call section.
- Flagged that the constitution is still the blank template and must be filled before /sp.plan.

## Outcome

- ✅ Impact: Feature spec ready for planning (after the constitution is filled).
- 🧪 Tests: none run (spec stage); spec quality checklist 16/16 pass.
- 📁 Files: specs/001-live-call-text/spec.md, specs/001-live-call-text/checklists/requirements.md
- 🔁 Next prompts: /sp.constitution (still blank), then /sp.plan
- 🧠 Reflection: The owner runs bare commands and expects Claude to supply the content from the project context, so an empty /sp.specify was treated as "use the agreed description", not as an error.

## Evaluation notes (flywheel)

- Failure modes observed: The constitution step was skipped by the owner. The feature script returned exit code 128 from the leftover git probe even though it succeeded (its JSON output was valid).
- Graders run and results (PASS/FAIL): Spec quality checklist - PASS (16/16)
- Prompt variant (if applicable): none
- Next experiment (smallest change to try): Remind the owner of the next command in order when a step is skipped.
