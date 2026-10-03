# Implementation Plan: Live Call Text

**Branch**: `001-live-call-text` | **Date**: 2026-10-03 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-live-call-text/spec.md`

## Summary

Agents get live text of the customer's words during laptop calls: WhatsApp Web, WhatsApp Desktop, or
a VoIP dialer installed on the laptop. The agent's own words can be shown too, and the agent can
optionally send the customer a link to read the agent's words live. Running cost is zero.

Technical approach:

- **Agent page**: a static page in Google Chrome. Start opens Chrome's share window:
  - a tab is shared with its tab audio (WhatsApp Web);
  - "Entire screen" is shared with system audio (WhatsApp Desktop and installed dialers).
- **Speech**: Chrome's built-in Web Speech API turns the call track into Customer lines and the
  microphone into Agent lines, using `SpeechRecognition.start(audioTrack)`. Both were verified on
  Chrome 154 on 2026-10-02.
- **Customer link**: a tiny relay on Cloudflare's Workers Free plan. One hub Durable Object uses the
  WebSocket Hibernation API to pass the agent's words on to customer pages and stores nothing. The
  same Worker serves the static pages for free.
- **No frameworks**: plain HTML, CSS and JavaScript, and no build step for the pages. Tests use Node's
  built-in test runner and Playwright with the installed Chrome and recorded English and Urdu audio.
- **Release**: needs a real call on each call type to pass.

## Technical Context

**Language/Version**: JavaScript (ES2022 modules) on Google Chrome 133+ and Cloudflare Workers; Node.js 24 for tooling  
**Primary Dependencies**: Browser APIs only at runtime (Web Speech API, getDisplayMedia, getUserMedia, Web Audio, WebSocket); dev: @playwright/test, wrangler  
**Storage**: Browser localStorage for the two language choices only; no server storage  
**Testing**: node:test (unit), Playwright with installed Google Chrome and recorded audio (e2e), wrangler dev (relay integration), manual real-call checklists  
**Target Platform**: Windows 10/11 laptops with Google Chrome (agents); any phone browser (customer link); Cloudflare Workers Free (pages + relay)  
**Project Type**: web (static pages + one small edge relay)  
**Performance Goals**:
- Customer's first words on screen ≤ 2 s (SC-002).
- Agent's words on the customer's phone ≤ 3 s (SC-009).
- Customer page opens in < 5 s (SC-009).
- A 60-minute call runs without agent action (SC-004).

**Constraints**:
- Zero cost.
- Secure context (HTTPS, or localhost in development).
- No audio recording; call text in page memory only, except a file the agent saves with Save chat (FR-039).
- Relay frames ≤ 2 KB and text ≤ 500 characters.
- ≤ 5 viewers per call; links expire within 4 h.
- The agent must keep hearing the call (`suppressLocalAudioPlayback: false`).

**Scale/Scope**: ≤ 20 agents at the same time; 3 pages (agent, customer, guide); 1 relay object  
**Free-Tier Ledger**: Worker requests ~1,440 of 100,000/day (~69x); Durable Object requests ~10,560 of 100,000/day (~9.5x); Durable Object duration ~4,608 of 13,000 GB-s/day for a 10-hour day (~2.8x; 2x holds up to ~14 h/day); storage 0; static assets free. Details in [research.md R8](./research.md#r8-free-tier-ledger-constitution-i).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Pre-research | Post-design | Evidence |
|---|---|---|---|
| I. Zero Cost | ✅ | ✅ | Speech comes from Chrome's free built-in engine. The Workers Free plan returns errors at limits instead of billing. Static assets are free. The ledger has ≥ 2x headroom (R8). Dev tools are free and open source (Node test runner, Playwright, Wrangler). **Open item**: confirm at sign-up that Cloudflare asks for no card (R6). |
| II. Customer Text First | ✅ | ✅ | User Story 1 uses only the share capture and one recognizer. The microphone and the relay are optional add-ons: the relay connects only on Copy customer link, and its failures only change `link-status` (FR-017, FR-031). |
| III. Laptop Call Surfaces | ✅ | ✅ | Tab audio and Entire screen with system audio were both verified on Chrome 154. `suppressLocalAudioPlayback: false` is set. Nothing changes inside WhatsApp or the dialer. Only Chrome 133+ on desktop is accepted (R10). |
| IV. Simple for Non-Technical Agents | ✅ | ✅ | Start plus the share choice (the microphone permission is asked once). Every FR-021 problem has a catalog message with its fix (ui-contract.md). Text is large; Urdu is right-to-left. `/guide.html` is in Roman Urdu. |
| V. Privacy by Design | ✅ | ✅ | Nothing records audio. Captions live only in page memory; the one exception (v1.1.0) is a file the agent saves on purpose with Save chat. The relay is pass-through: socket tags and attachments only, zero SQLite rows. The sid is derived from a hash of the token. Links expire. The privacy line is shown. No secrets exist to leak. |
| VI. Honest Testing | ✅ | ✅ | Unit tests on all pure logic. E2e tests with recorded English and Urdu audio through a stand-in tab and through system audio. Relay integration tests. Real-call checklists gate the release (quickstart.md §5). |
| VII. Smallest Viable Build | ✅ | ✅ | Plain HTML, CSS and JavaScript; the pages have no build step. Two dev dependencies. Wrangler's bundling of the relay is justified under Complexity Tracking. |

**Gate result**: PASS, both before research and after design. There are no unjustified violations.

## Project Structure

### Documentation (this feature)

```text
specs/001-live-call-text/
├── plan.md              # This file (/sp.plan command output)
├── research.md          # Phase 0 output (/sp.plan command)
├── data-model.md        # Phase 1 output (/sp.plan command)
├── quickstart.md        # Phase 1 output (/sp.plan command)
├── contracts/           # Phase 1 output (/sp.plan command)
│   ├── relay-protocol.md
│   ├── relay-messages.schema.json
│   └── ui-contract.md
├── checklists/
│   └── requirements.md  # Spec quality checklist (/sp.specify)
└── tasks.md             # Phase 2 output (/sp.tasks command - NOT created by /sp.plan)
```

### Source Code (repository root)

```text
web/                          # static pages served as Workers Static Assets; no build step
├── index.html                # agent page
├── v.html                    # customer page (link target: /v.html#<sid>)
├── guide.html                # one-page agent guide in Roman Urdu (FR-022)
├── css/
│   ├── app.css               # shared design system + agent page + guide (FR-037)
│   └── viewer.css            # customer page layout
└── js/
    ├── agent.js              # agent page entry: wires core + browser modules to the DOM
    ├── viewer.js             # customer page entry
    ├── guide.js              # fills the guide's message table from the catalog
    ├── core/                 # pure logic, no DOM; unit-tested with node:test
    │   ├── support.js        # browser/version/device check → ok | message code
    │   ├── source-check.js   # shared stream summary → ok | E_NO_CALL_SOUND_* code
    │   ├── transcript.js     # calls, sections, caption lines, interim → final
    │   ├── lane-policy.js    # recognition restart / pause / retry decisions
    │   ├── pause-finalizer.js # asks for a final after a 1.5 s pause (Urdu finals; research R5)
    │   ├── stall-watch.js    # restarts a session that stops sending results (research R5)
    │   ├── agc.js            # automatic gain + speech check for the recognition path (R3)
    │   ├── record.js         # the saved call record (text file) for Save chat (FR-039)
    │   ├── echo-filter.js    # hides the customer's echo picked up by the agent mic (FR-038)
    │   ├── silence-watch.js  # 20-second "no call sound" hint
    │   ├── throttle.js       # ≤ 1 interim update per second per line
    │   ├── messages.js       # message catalog (codes → text)
    │   ├── prefs.js          # language choices (storage injected)
    │   ├── link-session.js   # token, created, sid, link URL (WebCrypto)
    │   └── protocol.js       # relay message build/validate (shared with relay)
    └── browser/              # thin adapters over browser APIs; covered by e2e tests
        ├── capture.js        # getDisplayMedia / getUserMedia, ended events
        ├── audio-graph.js    # Web Audio path, levels, track for recognition
        ├── recognizer.js     # SpeechRecognition lane runner
        ├── relay-client.js   # agent → relay socket with reconnect
        ├── viewer-client.js  # customer page socket
        └── render.js         # transcript / status / message DOM (RTL aware)

relay/
└── src/
    ├── index.js              # Worker: /ws → hub; everything else is static assets
    ├── hub.js                # Durable Object (WebSocket Hibernation API)
    └── hub-logic.js          # pure auth / routing / limit decisions; unit-tested

tests/
├── unit/                     # node:test: one file per core module + hub-logic
├── relay/                    # wrangler dev + Node WebSocket integration tests
├── e2e/                      # Playwright specs per user story and error case
│   └── helpers/              # Chrome flags, stand-in mic, system-audio player
└── fixtures/
    ├── audio/                # en.mp3, ur.mp3 (from the 2026-10-02 tests)
    └── pages/
        └── whatsapp-standin.html

wrangler.jsonc                # Worker + assets (web/) + hub DO binding + SQLite-class migration
package.json                  # scripts: test:unit, test:relay, test:e2e, dev, deploy
playwright.config.js
.gitignore
```

**Structure Decision**: This is a web project with two parts, both plain JavaScript:

- **`web/`**: the static pages. They are served unchanged, with no build step.
- **`relay/`**: the edge relay, deployed with Wrangler from the root `wrangler.jsonc`.

Pure logic sits in `web/js/core/` and `relay/src/hub-logic.js` so Node's test runner can test it
without a browser. Browser-only code is kept thin in `web/js/browser/` and covered by Playwright.
`protocol.js` and `link-session.js` are shared by the pages and the relay, so both sides agree on
messages and session ids.

## Complexity Tracking

> Recorded to meet Constitution VII ("a framework or build step MUST have a written reason"). These
> are not violations.

| Item | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| Wrangler bundles the relay (a build step for `relay/` only) | Cloudflare deploys Workers and runs them locally through Wrangler; it also runs the relay in tests (`wrangler dev`) | Uploading by hand in the dashboard is manual, can't run locally, and can't be tested. The pages themselves stay build-free |
| Two dev dependencies (`@playwright/test`, `wrangler`) | Constitution VI needs automated browser tests with real audio and a local relay | Node's built-in runner covers the unit tests but can't drive Chrome or run Workers |

## Phase Outputs

- **Phase 0**: [research.md](./research.md) covers R1 to R11, with nothing left as NEEDS CLARIFICATION.
- **Phase 1**:
  - [data-model.md](./data-model.md)
  - [contracts/relay-protocol.md](./contracts/relay-protocol.md)
  - [contracts/relay-messages.schema.json](./contracts/relay-messages.schema.json)
  - [contracts/ui-contract.md](./contracts/ui-contract.md)
  - [quickstart.md](./quickstart.md), including the real-call checklists
  - The agent context in `CLAUDE.md`, updated by the agent script.
- **Phase 2**: `/sp.tasks`, not run by this command.

## Risks

1. **Google changes or limits Chrome's free speech service.**
   - Blast radius: all captions.
   - Guardrails: a version check (R10), clear "paused" messages, and the 60-minute test. The fallback
     is to plan on-device mode once Urdu support is confirmed.
2. **Real call audio differs from the recorded clips** (codec noise, accents, mixed Urdu and English).
   - Blast radius: accuracy (SC-003).
   - Guardrail: real-call checklists before release, with language switching during the call.
3. **The free plan changes, or sign-up needs a card.**
   - Blast radius: the customer link only. Captions run without the relay (II).
   - Guardrails: the ledger is re-checked each plan, and the owner confirms at sign-up.
