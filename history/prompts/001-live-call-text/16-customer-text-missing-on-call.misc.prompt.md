---
id: 16
title: Customer text missing on real call
stage: misc
date: 2026-10-03
surface: agent
model: claude-opus-5-5
feature: 001-live-call-text
branch: 001-live-call-text (no git repo)
user: Muhammad Yaseen
command: none (free-form request)
labels: ["real-call","whatsapp-web","troubleshooting","tab-capture"]
links:
  spec: specs/001-live-call-text/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - specs/001-live-call-text/test-log.md
 - history/prompts/001-live-call-text/16-customer-text-missing-on-call.misc.prompt.md
tests:
 - none (manual real-call report recorded in test-log)
---

## Prompt

nahii manayy call karii mayy bol rahaaa huu to mujayy neechayy mera hii text mil rahaa haiii jis ko call kariiiii customer koooo mayy agent manayy call kariii jis ko kariii wo customerr to us ki awaz baat call ho rahii haii likin us ka text nahiii kasayy flow chalayy ga sahi batoooo

## Response snapshot

- Explained the flow: the call sound becomes Customer text, and the mic becomes Agent text.
- Since Agent lines work, sharing succeeded. But the shared tab has no call sound, so the call audio is probably playing in a different tab or window.
- Gave the fix:
  1. Check the "Call sound" meter.
  2. Press Stop, then Start.
  3. Choose "Entire screen", tick "Also share system audio", and press Share.
  4. Make sure "Customer speaks" matches the customer's language.
- Recorded the first real-call result in test-log (T076, partial fail).

## Outcome

- ✅ Impact: The user has a reliable way to capture the customer's call audio.
- 🧪 Tests: manual result recorded
- 📁 Files: test-log.md
- 🔁 Next prompts: the user retries with Entire screen + system audio and reports the meter and text
- 🧠 Reflection: WhatsApp Web call audio may not play in the main chat tab. Tell agents to use Entire screen + system audio if the meter stays flat, and confirm this after the retry.

## Evaluation notes (flywheel)

- Failure modes observed: the shared tab carries no call sound during a real WhatsApp Web call (suspected; not yet confirmed)
- Graders run and results (PASS/FAIL): manual T076 partial FAIL
- Prompt variant (if applicable): none
- Next experiment (smallest change to try): Retry with Entire screen + system audio. If that works, update the guide to make it the default for WhatsApp Web too.
