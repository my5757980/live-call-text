---
id: 15
title: How to place WhatsApp call
stage: explainer
date: 2026-10-03
surface: agent
model: claude-opus-5-5
feature: 001-live-call-text
branch: 001-live-call-text (no git repo)
user: Muhammad Yaseen
command: none (free-form request)
labels: ["testing","whatsapp-web","calling","roman-urdu"]
links:
  spec: specs/001-live-call-text/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - history/prompts/001-live-call-text/15-how-to-place-whatsapp-call.explainer.prompt.md
tests:
 - none
---

## Prompt

nahii mayy phlayy call kasayyy miloooo

## Response snapshot

Roman Urdu steps for placing a test call from WhatsApp Web:
1. Use a second number, because you cannot call your own number.
2. Open that contact's chat.
3. Click the phone icon at the top right and choose voice call.
4. Allow the microphone.
5. Answer on the other phone.

If the chat shows no call icon, calling isn't available in this browser account. In that case install WhatsApp Desktop and use Entire screen with system audio in the project.

## Outcome

- ✅ Impact: The user knows how to start the test call before starting captions.
- 🧪 Tests: none
- 📁 Files: this PHR only
- 🔁 Next prompts: the user starts the call, then follows the Start steps
- 🧠 Reflection: The answer is conditional, because calling on WhatsApp Web may not be enabled for every account.

## Evaluation notes (flywheel)

- Failure modes observed: none
- Graders run and results (PASS/FAIL): none
- Prompt variant (if applicable): none
- Next experiment (smallest change to try): none
