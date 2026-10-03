<!--
Sync Impact Report
==================
Version change: 1.0.0 -> 1.1.0 (2026-10-03, MINOR: Principle V gains one explicit exception)

Modified principles:
- V. Privacy by Design: an agent may now save a call's chat as a text file on their own laptop
  (Save chat, spec FR-039). Nothing is uploaded, and audio is still never kept. The reason is the
  owner's request for a per-call record ("har aik call kayyy bad ... chat save kar saktayy taakayyy
  record rahayyyy"), approved by the owner on 2026-10-03.

Added sections: none. Removed sections: none.
Templates: no change needed (plan/spec/tasks templates are unaffected).
Deferred TODOs: none

Earlier report (1.0.0)
----------------------
Version change: unversioned template -> 1.0.0 (first ratification)

Principles (template placeholder -> new title):
- [PRINCIPLE_1_NAME] -> I. Zero Cost (NON-NEGOTIABLE)
- [PRINCIPLE_2_NAME] -> II. Customer Text First
- [PRINCIPLE_3_NAME] -> III. Laptop Call Surfaces
- [PRINCIPLE_4_NAME] -> IV. Simple for Non-Technical Agents
- [PRINCIPLE_5_NAME] -> V. Privacy by Design
- [PRINCIPLE_6_NAME] -> VI. Honest Testing (NON-NEGOTIABLE)
- (new) -> VII. Smallest Viable Build (the template had six slots; the owner asked for seven)

Added sections:
- Platform and Cost Constraints (was [SECTION_2_NAME])
- Development Workflow and Quality Gates (was [SECTION_3_NAME])

Removed sections: none

Templates and docs:
- ✅ .specify/templates/plan-template.md: added a Free-Tier Ledger line to Technical Context
  (Principle I). /sp.plan fills the Constitution Check gate from this file.
- ✅ .specify/templates/tasks-template.md: tests are now required and written first
  (Principle VI); added a real-call checklist task to the Polish phase.
- ✅ .specify/templates/spec-template.md: no change needed.
- ✅ CLAUDE.md: already points to this file for code standards; no change needed.
- ⚠ .claude/commands/sp.tasks.md: still says tests are optional unless requested. Not edited
  (tool-managed file). No conflict for 001-live-call-text, whose spec requests tests
  (VR-001 to VR-004). Revisit if a future spec leaves tests out.
- n/a .specify/templates/commands/*.md: folder does not exist in this project.

Deferred TODOs: none
-->

# Live Call Text Constitution

Live Call Text shows a laptop call as live text. While an agent talks to a customer through
WhatsApp Web in Chrome, the WhatsApp Desktop app or a VoIP dialer installed on the laptop, the
customer's words appear as live text on the agent's screen. Optionally, the agent can send the
customer a link that shows the agent's words as live text on the customer's phone.

## Core Principles

### I. Zero Cost (NON-NEGOTIABLE)

- Building, running and hosting the product MUST NOT need any paid service, paid plan, API key
  or credit card.
- Speech-to-text MUST use only Google Chrome's built-in, free speech recognition.
- Hosting and any relay MUST use free tiers that need no card. Each plan MUST list every free-tier
  limit it relies on next to the expected usage, with at least 2x headroom.
- Every library and development tool MUST be free and open source.
- A service that can start billing by itself when usage grows MUST NOT be used.

**Rationale**: The owner promised the business "100% free". Any bill, key or card breaks that
promise and adds setup work a non-technical owner cannot maintain.

### II. Customer Text First

- The customer's speech as live text for the agent is the primary outcome. It MUST work on every
  supported call with no action from the customer.
- Optional features (the agent's own captions, the customer link) MUST NOT block, slow down or
  break the primary outcome. If an optional feature fails, customer captions MUST keep running.
- The primary outcome MUST be built, tested and shown working first, as the MVP.

**Rationale**: This is the reason the product exists. Everything else is a bonus.

### III. Laptop Call Surfaces

- Supported call surfaces are WhatsApp Web in Google Chrome, the WhatsApp Desktop app and VoIP
  dialers installed on the laptop, on Windows laptops with an up-to-date Google Chrome.
- Mobile apps, other browsers and other operating systems are out of scope unless this
  constitution is amended.
- Capturing call audio MUST NOT mute, lower, delay or otherwise change what the agent hears.
- The product MUST NOT need any change, plugin or add-on inside WhatsApp or the dialer.

**Rationale**: Phones do not give call audio to other apps, but Chrome on a laptop can capture a
tab or the system sound. This path passed recorded-audio tests on the owner's laptop on
2026-10-02. The agent's call must never be disturbed.

### IV. Simple for Non-Technical Agents

- Agents and customers MUST NOT need to install anything, sign up or log in.
- Starting captions MUST take one Start click plus the choice in Chrome's share window (and, the
  first time only, allowing the microphone).
- Every error MUST show a plain-language message that says exactly what to do next.
- Caption text MUST be large and high-contrast. Urdu MUST be shown in Urdu script, right-to-left.
- Agents MUST have a short guide in simple Roman Urdu.

**Rationale**: Agents are busy talking to customers. Every extra step or unclear error costs a
call.

### V. Privacy by Design

- Call audio MUST NOT be recorded or stored anywhere.
- Call text MUST exist only in the agent's open page and MUST be gone when that page is closed,
  reloaded or cleared. The one exception is a chat the agent saves on purpose (Save chat), which
  goes only to a text file on the agent's own laptop and is never uploaded.
- A relay for the customer link MUST only pass text along and MUST keep nothing. Its links MUST
  be random, impossible to guess in practice, limited to one call, and MUST expire.
- The product MUST say openly that Chrome sends speech to Google to turn it into text.
- Secrets MUST NOT be written in code or committed. Configuration goes in `.env`, which is not
  committed.

**Rationale**: Calls carry private customer details. Keeping nothing means nothing can leak.

### VI. Honest Testing (NON-NEGOTIABLE)

- Tests MUST be written before the code they cover and MUST be seen failing first
  (red, green, refactor).
- Logic MUST have automated unit tests.
- The audio-to-text flow MUST have automated browser tests that play recorded English and Urdu
  speech through a stand-in call tab and through system audio.
- A call surface MUST NOT be called "working" until a real call on it passes a written manual
  checklist.
- Test results MUST be reported exactly as they are, failures included. A failing test MUST NOT be
  skipped, weakened or marked done to make a task pass.

**Rationale**: Recorded audio proves the pipeline; only a real call proves the product. The owner
decides based on what we report, so it must be true.

### VII. Smallest Viable Build

- The product MUST use plain web technology (HTML, CSS, JavaScript) with as few dependencies as
  possible. A framework or build step MUST have a written reason in the plan.
- Every change MUST be small, testable and tied to a task.
- Features nobody asked for MUST NOT be added; new ideas go through the spec first.

**Rationale**: Small, plain code is easier to test, to host for free and to fix later.

## Platform and Cost Constraints

- **Agent side**: Windows laptop, up-to-date Google Chrome, headset and an internet connection.
- **Customer side** (optional link only): any phone with a normal web browser.
- **Speech-to-text**: Chrome's built-in speech recognition. By default it runs on Google's
  servers, needs internet and is controlled by Google. A change by Google is a known risk, handled
  by amending the plan.
- **Secure pages**: Chrome allows audio capture only on secure pages, so pages MUST be served over
  HTTPS (or from localhost during development).
- **Free-tier ledger**: Expected usage is up to 20 agents at the same time, each with up to 8 hours
  of calls a day, with the customer link used on up to 1 in 4 calls. Each plan MUST check every
  free limit against this usage with at least 2x headroom.
- **Outward actions**: Creating accounts, deploying, publishing links or anything else visible
  outside the laptop MUST wait for the owner's approval.

## Development Workflow and Quality Gates

- **Spec-Driven Development**: Work follows constitution, specify, plan, tasks, implement. Each
  feature's documents live in `specs/<feature>/`.
- **Records**: Every request gets a Prompt History Record in `history/prompts/`. Significant
  architecture decisions are suggested as ADRs in `history/adr/` and created only with the owner's
  consent.
- **Plan gate**: The Constitution Check passes (or each exception is justified in Complexity
  Tracking) and the free-tier ledger is complete before tasks are created.
- **Task gate**: Every task names its file path, and test tasks come before the code they cover.
- **Story gate**: A user story's automated tests pass before the next story starts.
- **Release gate**: Each call surface passes its real-call checklist before it is called working.
- **Reporting**: Progress reports to the owner are short and in simple Roman Urdu.

## Governance

- This constitution overrides all other project guidance. `CLAUDE.md` holds the runtime
  development guidance and applies wherever it does not conflict with this file.
- **Amendments** need a written reason, the owner's approval, an updated Sync Impact Report and
  matching updates to the templates in `.specify/templates/`.
- **Versioning** follows semantic versioning: MAJOR when a principle is removed or redefined in an
  incompatible way, MINOR when a principle or section is added or materially expanded, PATCH for
  wording and clarifications.
- **Compliance**: Every plan includes a Constitution Check against all seven principles, done
  before research and repeated after design. Every task review and implementation step verifies
  compliance. An unjustified violation blocks the next phase.

**Version**: 1.1.0 | **Ratified**: 2026-10-03 | **Last Amended**: 2026-10-03
