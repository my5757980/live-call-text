---
id: 13
title: Self-test before handing over
stage: explainer
date: 2026-10-03
surface: agent
model: claude-opus-5-5
feature: 001-live-call-text
branch: 001-live-call-text (no git repo)
user: Muhammad Yaseen
command: none (free-form request)
labels: ["testing","handover","roman-urdu"]
links:
  spec: specs/001-live-call-text/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - history/prompts/001-live-call-text/13-self-test-before-handover.explainer.prompt.md
tests:
 - none
---

## Prompt

achaa ab ya batooo ya project mayyy sir ko denayyy sayy phlayy apnayy pass kasayy test karuuuu kayy ya project 1oo% work karrahaaa haiiiii

## Response snapshot

Short Roman Urdu self-test steps:
1. Run `npm test` for all automatic tests.
2. Start the server (`npm run dev`, or say "server chalao") and open http://localhost:8787 in Chrome.
3. Make a real WhatsApp call to a second number (a friend or a second phone) and speak from the phone side. Text should appear on the laptop.
4. Test WhatsApp Desktop and the dialer too, using Entire screen and the system audio tick.
5. Customer link: open it in another Chrome window on the laptop. The phone test needs the site online first.
6. Pass means: text appears, Urdu is right-to-left, the call audio sounds normal, and Stop shows "Call ended".

## Outcome

- ✅ Impact: The user has a self-test path before handing the project over.
- 🧪 Tests: none run
- 📁 Files: this PHR only
- 🔁 Next prompts: "server chalao", then report the real-call results
- 🧠 Reflection: A call needs two different WhatsApp numbers; one person can still test alone with a second phone.

## Evaluation notes (flywheel)

- Failure modes observed: none
- Graders run and results (PASS/FAIL): none
- Prompt variant (if applicable): none
- Next experiment (smallest change to try): none
