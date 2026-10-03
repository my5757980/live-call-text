---
id: 14
title: Live WhatsApp Web test steps
stage: explainer
date: 2026-10-03
surface: agent
model: claude-opus-5-5
feature: 001-live-call-text
branch: 001-live-call-text (no git repo)
user: Muhammad Yaseen
command: none (free-form request)
labels: ["testing","whatsapp-web","roman-urdu"]
links:
  spec: specs/001-live-call-text/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - history/prompts/001-live-call-text/14-live-whatsapp-web-test-steps.explainer.prompt.md
tests:
 - none (checked that http://localhost:8787 answers 200)
---

## Prompt

nahii manayy project browser mayy open kar liaa haiii whatsapp browser wala open haiiii ab mayyy kasayy test karoo step by step btoooo live call ho rahii haiii project mayy kasayy dikhayy ga batoooo

## Response snapshot

Confirmed that the server is up. Gave step-by-step Roman Urdu instructions for a live WhatsApp Web call:
1. Open http://localhost:8787.
2. Choose the customer's language.
3. Press Start.
4. In Chrome's share window, pick "Chrome Tab", choose the WhatsApp tab, keep "Also share tab audio" on, and press Share.
5. Allow the microphone.
6. Read the Customer lines in the Conversation box.
7. Check the "Call sound" meter if no text appears.
8. Press Stop at the end.

## Outcome

- ✅ Impact: The user can run the live test themselves.
- 🧪 Tests: server check only
- 📁 Files: this PHR only
- 🔁 Next prompts: the user reports what appeared during the call
- 🧠 Reflection: Keep the steps numbered and very short; the user is mid-call.

## Evaluation notes (flywheel)

- Failure modes observed: none
- Graders run and results (PASS/FAIL): none
- Prompt variant (if applicable): none
- Next experiment (smallest change to try): none
