---
id: 5
title: Live call text plan
stage: plan
date: 2026-10-03
surface: agent
model: claude-opus-5-5
feature: 001-live-call-text
branch: 001-live-call-text (no git repo; branch validation skipped)
user: Muhammad Yaseen
command: /sp.plan
labels: ["plan","web-speech-api","getDisplayMedia","cloudflare-workers","durable-objects","free-tier"]
links:
  spec: specs/001-live-call-text/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - specs/001-live-call-text/plan.md
 - specs/001-live-call-text/research.md
 - specs/001-live-call-text/data-model.md
 - specs/001-live-call-text/quickstart.md
 - specs/001-live-call-text/contracts/relay-protocol.md
 - specs/001-live-call-text/contracts/relay-messages.schema.json
 - specs/001-live-call-text/contracts/ui-contract.md
 - CLAUDE.md
 - history/prompts/001-live-call-text/5-live-call-text-plan.plan.prompt.md
tests:
 - none (plan stage; artifact checks only: no template markers left, schema JSON parses)
---

## Prompt

/sp.plan

(The command was run with no text. As agreed, Claude supplied the technical direction itself from the project context: plain HTML/CSS/JS with no build step for the pages; Chrome's Web Speech API fed by getDisplayMedia tab or system audio plus the getUserMedia mic; a free relay that needs no card or key; tests with node:test, Playwright on the installed Chrome and recorded English/Urdu audio; real-call checklists; verify APIs and free-tier numbers in official docs.)

## Response snapshot

- Ran setup-plan.ps1 and filled plan.md:
  - Technical Context, including a Free-Tier Ledger.
  - Constitution Check: all 7 principles pass before research and after design.
  - Project structure: web/ with core and browser modules, relay/, tests/.
  - Complexity Tracking: Wrangler bundling and the two dev dependencies are justified.
  - Risks.
- research.md (R1 to R11), checked against Cloudflare, MDN, Chrome and blink-dev sources:
  - **Speech**: start(audioTrack) shipped in desktop Chrome M133 and was verified on Chrome 154. There is no feature detection (older browsers fall back to the mic), so the page requires Chrome 133+.
  - **Capture**: getDisplayMedia with tab audio or Entire screen + system audio, with suppressLocalAudioPlayback set to false. windowAudio is only a hint, used with a fallback.
  - **Relay**: one Worker plus one hub Durable Object on the Workers Free plan, using hibernation and tags/attachments with no stored rows. One Durable Object per call was rejected because its duration would be about 18,432 GB-s, over the 13,000 GB-s free limit.
  - **Links**: the sid is derived from a hash of the token, and the token travels in the WebSocket subprotocol.
  - **Ledger**: about 10,560 of 100,000 Durable Object requests per day, and about 4,608 of 13,000 GB-s for a 10-hour day.
  - **Tests**: Playwright flags and the lessons from the 2026-10-02 runs.
- data-model.md: Call, Lane, CaptionLine, LinkSession, AgentPreferences, RelaySocket and ViewerState, with their state machines.
- contracts/:
  - relay-protocol.md: endpoints, auth, messages, close codes and limits.
  - relay-messages.schema.json (JSON Schema 2020-12).
  - ui-contract.md: data-testids, a message catalog of 14 codes, and Urdu/English labels for the customer page.
- quickstart.md: setup, tests, local run, real-call checklists with 5 English and 5 Urdu test sentences, and deployment steps gated on the owner's approval.
- Ran update-agent-context.ps1, which filled Active Technologies in CLAUDE.md. The script skipped Recent Changes because of a section-order bug, so that entry was added by hand. CLAUDE.md line endings stayed LF.
- ADR suggestions: the Chrome speech + call capture approach, and the Cloudflare hub relay.

## Outcome

- ✅ Impact: Design complete and verified against official docs; ready for /sp.tasks.
- 🧪 Tests: none run (plan stage).
- 📁 Files: plan.md, research.md, data-model.md, quickstart.md, contracts/ (3 files), CLAUDE.md
- 🔁 Next prompts: /sp.tasks; optionally /sp.adr for the two decisions
- 🧠 Reflection: The free-tier math changed the design: one Durable Object per call would exceed the free duration limit, while one shared hub stays at about 2.8x headroom.

## Evaluation notes (flywheel)

- Failure modes observed: update-agent-context.ps1 does not add the Recent Changes entry when that heading directly follows Active Technologies (fixed by hand). setup-plan.ps1 exits with code 128 from its git probe even on success.
- Graders run and results (PASS/FAIL): Constitution Check before and after design - PASS; artifact checks - PASS
- Prompt variant (if applicable): none
- Next experiment (smallest change to try): Confirm the system-audio checkbox flag spelling in the first e2e task.
