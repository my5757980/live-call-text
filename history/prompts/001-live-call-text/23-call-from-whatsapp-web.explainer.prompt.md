---
id: 23
title: How to call from WhatsApp Web
stage: explainer
date: 2026-10-03
surface: agent
model: claude-opus-5-5
feature: 001-live-call-text
branch: 001-live-call-text (no git repo)
user: Muhammad Yaseen
command: none (free-form request)
labels: ["whatsapp-web","calling","dialer","roman-urdu"]
links:
  spec: specs/001-live-call-text/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - history/prompts/001-live-call-text/23-call-from-whatsapp-web.explainer.prompt.md
 - specs/001-live-call-text/data-model.md (stale "earlier calls stay on screen" lines fixed for amended FR-020)
 - specs/001-live-call-text/plan.md (constraint + Constitution Check V mention the Save chat exception)
 - specs/001-live-call-text/tasks.md (T033 (d) points to T089)
tests:
 - none (web search: WhatsApp Web calling launched 2026-07-28)
---

## Prompt

achaaa ya to whatsapp destop wala install walay sayy call kar rahay haii to matlab install destop dialer sayy bhii hojayy giiii us mayy bhii phone icon hoga call hogii likin browser whatsapp sayy kasayy karayy ya batooooo

## Response snapshot

- Confirmed that an installed desktop dialer works the same way as WhatsApp Desktop: Start, Entire screen, tick "Also share system audio". The owner's dialer itself is not tested yet.
- Checked the web: WhatsApp Web voice and video calling started rolling out on 2026-07-28 (9to5Mac, Help Net Security).
- Steps to call from the browser:
  1. Open the contact's chat on web.whatsapp.com.
  2. Click the phone icon at the top right, or use the Calls tab.
  3. Allow the microphone.
  4. In the project, press Start, pick the WhatsApp tab with tab audio on, and press Share.
- If there is no phone icon, update Chrome and the phone app and refresh; if it still doesn't appear, use the desktop app.
- Doc fix found while checking: data-model.md and plan.md still described the pre-US4 behaviour (earlier calls staying on screen, text only in page memory). Updated them to match amended FR-020/FR-033/FR-039; T033 (d) now points to T089. No code changed.

## Outcome

- ✅ Impact: The user knows how to call from the browser and which share option fits each app.
- 🧪 Tests: none
- 📁 Files: this PHR + 3 doc consistency fixes (data-model, plan, tasks)
- 🔁 Next prompts: the user tests a WhatsApp Web call with tab sharing
- 🧠 Reflection: The first real-call failure (no Customer text while sharing the WhatsApp tab) was likely a Desktop-app call with the wrong share option.

## Evaluation notes (flywheel)

- Failure modes observed: none
- Graders run and results (PASS/FAIL): none
- Prompt variant (if applicable): none
- Next experiment (smallest change to try): none
