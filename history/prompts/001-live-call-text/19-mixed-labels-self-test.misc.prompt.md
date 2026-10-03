---
id: 19
title: Mixed labels in one-person self-test
stage: misc
date: 2026-10-03
surface: agent
model: claude-opus-5-5
feature: 001-live-call-text
branch: 001-live-call-text (no git repo)
user: Muhammad Yaseen
command: none (free-form request)
labels: ["real-call","troubleshooting","echo","test-setup"]
links:
  spec: specs/001-live-call-text/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - specs/001-live-call-text/test-log.md
 - history/prompts/001-live-call-text/19-mixed-labels-self-test.misc.prompt.md
tests:
 - Windows check: "Listen to this device" is not set on either capture endpoint
---

## Prompt

(pasted transcript)
hello listen to me

Customer
how can you help you today

Agent
hello hello

Customer
hello

Customer
hello how can you help you today

Customer
hello listen

Customer
hello listen to me how

Customer
hello sir

Agent
hello

Customer
hello sir

Customer
listen to me sir

Customer
listen to me

Customer
how can you help you today

  ya dekhoo mujayy confirm karoo mujayy to samj nahii a rahaaa mayyy mayy agentt hu jis nayy call kii wo customer dayy rahaaa haiii customer bolaa agent customer donoooo kuch samj nahii a rahaiii mayy dono taraf heanfree use karrahaa huuu tumm deeplyy dekhoo masla batooo code mayyy ya kuch or

## Response snapshot

- **Analysis**:
  - The agent's own phrases ("how can you help you today", "listen to me sir") appear as Customer lines.
  - With one person testing both phones, each with hands-free, that one voice enters both microphones. The laptop mic gives Agent text. The phone's mic sends the voice through the WhatsApp call back to the laptop, where it becomes Customer text.
  - Because the text matched, the new echo filter hid the Agent copy.
- **Checked on the machine**: Windows "Listen to this device" is off, so the laptop isn't replaying the mic. The lane wiring is verified by tests.
- **Verdict**: not a code fault; the test set-up is the problem.
- **Correct method**: give the customer phone to another person in another room, or keep the phone far away and muted while speaking as the agent.

## Outcome

- ✅ Impact: Root cause explained; the self-test procedure is corrected.
- 🧪 Tests: system setting check only
- 📁 Files: test-log.md
- 🔁 Next prompts: re-test with a second person in another room
- 🧠 Reflection: A one-person test with two hands-free devices can't separate the voices. Testing needs two people apart.

## Evaluation notes (flywheel)

- Failure modes observed: invalid test set-up (the same voice reaches both mics)
- Graders run and results (PASS/FAIL): n/a
- Prompt variant (if applicable): none
- Next experiment (smallest change to try): Add a line to the guide: "test with two people in different rooms".
