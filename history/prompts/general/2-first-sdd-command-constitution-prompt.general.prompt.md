---
id: 2
title: First SDD command constitution prompt
stage: general
date: 2026-10-03
surface: agent
model: claude-opus-5-5
feature: none
branch: none (dialer is not a git repo)
user: Muhammad Yaseen
command: none (free-form request)
labels: ["sdd","constitution","prompt-authoring","live-call-text"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
 - history/prompts/general/2-first-sdd-command-constitution-prompt.general.prompt.md
tests:
 - none
---

## Prompt

Message 1:

achaa ab bat sunoo poora project spec driven development mayy banayy gaaa to mayy tum koo aia iak karkayy command detaa huu constitution specify paln taskas implemented tum khud sab karayy prompts banoo project kayy mutabiq phie end mayy implement ok

Message 2 (user interrupted the first reply):

nahii mayy phalayy tum ko aik aik kar kayy do gaa phir tum karnaa doo phalyy command

## Response snapshot

Before the interruption: read the sp.constitution/specify/plan/tasks/implement command files and templates, checked the environment (git 2.50.1, Node v24.5.0, npm 11.5.1, Chrome 154; folder is not a git repo, SpecKit scripts fall back to the specs/ folder), and found the earlier speech test files (agent2.html, run2.py, en.mp3, ur.mp3, results) in the earlier session's scratchpad.

After the interruption: the user wants one command at a time. Gave only the first command, ready to paste:

/sp.constitution Project name: Live Call Text. It shows a laptop call as live text. While an agent talks to a customer through WhatsApp Web in Chrome, the WhatsApp Desktop app, or a VoIP dialer installed on the laptop, the customer's words appear as live text on the agent's screen. Optionally, the agent can send the customer a link that shows the agent's words as live text on the customer's phone. Ratification date is today. Write these 7 principles as clear, testable MUST rules, each with a short rationale:

1. Zero Cost (NON-NEGOTIABLE): No paid service, paid plan, API key or credit card may be needed to build, run or host the product. Speech-to-text uses only Chrome's built-in free speech recognition. Hosting and any relay use only free tiers that need no card. Every free-tier limit we rely on is written down next to our expected usage. All dependencies are free and open source.
2. Customer Text First: The main job is turning the customer's speech into live text for the agent. It must work on every call with nothing for the customer to do. The customer link is optional and must never block, slow down or break the main job.
3. Laptop Call Surfaces: We support WhatsApp Web in Chrome, the WhatsApp Desktop app and VoIP dialers installed on the laptop, on Windows laptops with Google Chrome. Mobile apps are out of scope. Capturing call audio must never mute, delay or change what the agent hears.
4. Simple for Non-Technical Agents: Nothing to install and no sign-up for agents or customers. Starting captions takes one Start click plus Chrome's share choice. Every error shows a plain-language message that says exactly what to do. Text is large and easy to read, and Urdu is shown right-to-left.
5. Privacy by Design: No call audio is recorded or stored. The transcript exists only in the agent's open page and is gone when the page closes. A relay for the customer link only passes text along, keeps nothing after the call ends, and uses random, unguessable links that expire. We say openly that Chrome sends speech to Google for recognition. No secrets in code; any config goes in .env.
6. Honest Testing (NON-NEGOTIABLE): Logic has automated unit tests. The audio-to-text flow has automated browser tests that use recorded English and Urdu audio. No call surface is called "working" until a real call on it passes a written manual checklist. Test results are reported exactly as they are, failures included.
7. Smallest Viable Build: Plain web technology with as few dependencies as possible; a framework only with a written reason. Small, testable changes, and no features nobody asked for.

Governance: This constitution overrides other project guidance. Amendments need a written reason, a semantic version bump and an updated Sync Impact Report. Every plan must pass a Constitution Check against these principles, and any exception must be justified in the plan's Complexity Tracking table.

## Outcome

- ✅ Impact: SDD workflow agreed (user runs one command at a time; Claude writes each prompt for the project); first prompt (constitution) handed over.
- 🧪 Tests: none
- 📁 Files: this PHR only
- 🔁 Next prompts: user runs /sp.constitution with the prompt above; then Claude gives the /sp.specify prompt
- 🧠 Reflection: The first reply started preparing all five prompts at once; the user wants them one by one, so only the next command is given each time.

## Evaluation notes (flywheel)

- Failure modes observed: Prepared more than asked (all five prompts) before confirming the one-by-one flow.
- Graders run and results (PASS/FAIL): none
- Prompt variant (if applicable): none
- Next experiment (smallest change to try): Give one command prompt per turn and wait for the user to run it.
