---

description: "Task list for Live Call Text (001-live-call-text)"
---

# Tasks: Live Call Text

**Input**: Design documents from `/specs/001-live-call-text/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ (relay-protocol.md, relay-messages.schema.json, ui-contract.md), quickstart.md

**Tests**: REQUIRED by the constitution (VI. Honest Testing) and by spec VR-001 to VR-004. Every user
story includes its test tasks. They are written first and must be seen failing before the
implementation tasks.

**Organization**: Tasks are grouped by user story, so each story can be built and tested as its own
increment.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Every task names its exact file path(s)
- Tasks marked **MANUAL** or **OWNER APPROVAL REQUIRED** must never be done automatically

## Path Conventions

These follow plan.md:

- `web/`: static pages. No build step.
- `relay/src/`: the Worker and the hub Durable Object.
- `tests/`: `unit`, `relay`, `e2e` and `fixtures`.
- Config files sit at the repo root.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project skeleton, tools, test fixtures and test helpers

- [X] T001 Create the project folders from plan.md at the repo root: `web/css/`, `web/js/core/`, `web/js/browser/`, `relay/src/`, `tests/unit/`, `tests/relay/`, `tests/e2e/helpers/`, `tests/fixtures/audio/`, `tests/fixtures/pages/`
- [X] T002 Create `package.json` at the repo root with `"name": "live-call-text"`, `"private": true`, `"type": "module"` and `"engines": {"node": ">=24"}`. Add scripts `dev` (`wrangler dev --port 8787`), `deploy` (`wrangler deploy`), `test:unit` (`node --test "tests/unit/*.test.js"`), `test:relay` (`node --test --test-concurrency=1 "tests/relay/*.test.js"`), `test:e2e` (`playwright test`) and `test` (unit, then relay, then e2e). Then run `npm install --save-dev @playwright/test wrangler`. Do not download Playwright browsers; tests use the installed Google Chrome
- [X] T003 Create `wrangler.jsonc` at the repo root:
  - `name` `live-call-text`; `main` `relay/src/index.js`
  - `compatibility_date`: today's date, or the newest date the installed wrangler accepts
  - `assets` `{ "directory": "./web", "binding": "ASSETS" }`
  - `durable_objects.bindings` `[{ "name": "HUB", "class_name": "Hub" }]`
  - `migrations` `[{ "tag": "v1", "new_sqlite_classes": ["Hub"] }]` (research.md R6)
  - *Done with `assets` only.* `main`, `assets.binding`, the HUB binding and the migration move to T061: wrangler refuses a `main` file that doesn't exist yet and a Durable Object class that isn't exported.
- [X] T004 [P] Create `.gitignore` at the repo root with `node_modules/`, `.wrangler/`, `test-results/`, `playwright-report/`, `.env`, `.dev.vars` and `*.log`
- [X] T005 [P] Create `playwright.config.js` at the repo root:
  - `testDir: 'tests/e2e'`, `timeout: 120000`, `expect: { timeout: 10000 }`, `retries: 1`, `workers: 1`, `use: { baseURL: 'http://localhost:8787' }`
  - `webServer: { command: 'npx wrangler dev --port 8787', url: 'http://localhost:8787', reuseExistingServer: true, timeout: 60000 }`
  - No browser projects; `tests/e2e/helpers/chrome.js` launches Chrome
- [X] T006 [P] Copy `en.mp3` and `ur.mp3` from `%LOCALAPPDATA%\Temp\claude\E--New-folder-millinior\7c6f9adb-dd66-4cdd-b19c-801987d82f91\scratchpad\sttcheck\` into `tests/fixtures/audio/`. Then:
  - Make quiet copies with ffmpeg: `ffmpeg -i en.mp3 -filter:a volume=-30dB -ar 48000 -ac 2 en-quiet.wav`, and the same for `ur`.
  - Write `tests/fixtures/audio/README.md` listing each clip's sentence and its test keywords: English "hello I want the price of a 2018 Toyota Corolla how many days will Shipping to Karachi take" (Corolla, Karachi); Urdu "السلام علیکم مجھے ٹویوٹا کرولا کی قیمت چاہیے گاڑی کراچی کتنے دن میں پہنچے گی" (کرولا, کراچی).
  - If the source folder is gone, record both sentences with any microphone.
- [X] T007 [P] Create `tests/fixtures/pages/whatsapp-standin.html`, the stand-in for the WhatsApp Web tab (research.md R9):
  - `<title>WhatsApp</title>`
  - `<audio id="a" preload="auto">` with src `/__test/audio/<clip>.mp3`, where clip comes from `?clip=` (default `en`)
  - `window.playClip = () => { a.currentTime = 0; return a.play(); }`
- [X] T008 Create `tests/e2e/helpers/chrome.js` exporting three helpers. Depends on T005 and T007.
  - `launchChrome(mode)` uses `chromium.launch({ channel: 'chrome', headless, args, ignoreDefaultArgs: ['--mute-audio'] })`. Base args are `--autoplay-policy=no-user-gesture-required` and `--use-fake-ui-for-media-stream`. Then by mode:
    - `tab`: add `--auto-select-tab-capture-source-by-title=WhatsApp`; headless.
    - `screen`: add `--auto-select-desktop-capture-source=Entire screen`, `--system-audio-capture-default-checked` and `--system-audio-capture-default_checked`; headed.
    - `screen-no-audio`: the screen flags without the system-audio flags; headed.
    - Never pass `--use-fake-device-for-media-stream`.
    - *Done without `--use-fake-ui-for-media-stream`.* It can auto-accept screen capture and bypass the tab auto-select. The stand-in microphone (T009) needs no permission prompt anyway.
  - `serveFixtures(context)` routes `**/__test/pages/*` and `**/__test/audio/*` to files in `tests/fixtures/` via `route.fulfill({ path })`.
  - `openAgent(context, query)` opens `http://localhost:8787/?<query>` and returns the page.
- [X] T009 [P] Create `tests/e2e/helpers/stand-in-mic.js` exporting `installStandInMic(context, { clip, mode })`. It uses `context.addInitScript` to replace `navigator.mediaDevices.getUserMedia`:
  - `mode: 'clip'` resolves with a MediaStream whose track comes from a `MediaStreamAudioDestinationNode`. The node plays `/__test/audio/<clip>.mp3`, decoded with an AudioContext, when the page calls `window.__playMic()`.
  - `mode: 'denied'` rejects with `new DOMException('Permission denied', 'NotAllowedError')`.
  - `mode: 'missing'` rejects with `new DOMException('Requested device not found', 'NotFoundError')`.
- [X] T010 [P] Create `tests/e2e/helpers/system-audio.js` exporting `playThroughSpeakers(wavPath)`, which stands in for the WhatsApp Desktop app or the dialer playing call sound. It spawns `pwsh -NoProfile -Command "(New-Object System.Media.SoundPlayer '<absolute path>').PlaySync()"` (falling back to `powershell.exe` if pwsh lacks SoundPlayer) and resolves when the process exits
- [X] T011 Create `specs/001-live-call-text/test-log.md` with a results table (date, command, Chrome version, passed, failed, notes). Record the toolchain check there:
  - versions from `node --version`, `npx wrangler --version`, `npx playwright --version` and Chrome
  - `npx wrangler dev --port 8787` starts, then is stopped

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The shared pure logic and the agent page shell that every story uses

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Tests for the foundation (REQUIRED - write first) ⚠️

- [X] T012 [P] Write `tests/unit/messages.test.js` for `web/js/core/messages.js`:
  - every code in `contracts/ui-contract.md` exists with non-empty `text` and a `level`
  - `HEADSET_REMINDER` and `PRIVACY_LINE` equal the contract texts
  - `VIEWER_LABELS` has `en` and `ur` for connecting, waiting, live, paused, ended and invalid
  - `pickMessage(activeCodes)` follows the contract's priority order
  - an unknown code throws
- [X] T013 [P] Write `tests/unit/support.test.js` for `checkSupport(env)` in `web/js/core/support.js`, where `env` is `{ brands, mobile, hasSpeech, hasDisplayMedia, secure }`:
  - Google Chrome 154 on desktop → `{ ok: true }`
  - Chrome 133 → ok
  - Chrome 132 → `E_OLD_CHROME`
  - Microsoft Edge brand → `E_NOT_CHROME`
  - no brands → `E_NOT_CHROME`
  - `mobile: true` → `E_NOT_CHROME`
  - `hasSpeech`, `hasDisplayMedia` or `secure` false → `E_NOT_CHROME`
- [X] T014 [P] Write `tests/unit/prefs.test.js` for `loadPrefs(storage)`, `savePrefs(storage, prefs)` and `isRtl(lang)` in `web/js/core/prefs.js`:
  - empty storage → `{ customerLang: 'en-US', agentLang: 'en-US' }`
  - values round-trip under the key `lct.prefs.v1`
  - bad JSON or an unknown language → the defaults
  - a storage object that throws → defaults, and `savePrefs` does not throw
  - `isRtl('ur-PK') === true` and `isRtl('en-US') === false`
- [X] T015 [P] Write `tests/unit/transcript.test.js` for `createTranscript()` in `web/js/core/transcript.js`:
  - `startCall({ id, startedAt })` creates a section
  - interim then final text for the same `(callId, side, session, resultIndex)` leaves exactly one final line
  - a new session, or a new in-progress index on the same side, finalizes the old in-progress line and keeps its text
  - empty text is ignored
  - customer and agent lines interleave by `at`
  - lines from earlier calls stay after a new `startCall`
  - line ids follow `data-model.md`
- [X] T016 [P] Write `tests/unit/lane-policy.test.js` for `decide(laneState, event)` in `web/js/core/lane-policy.js`, covering every row of research.md R5:
  - `end` → restart after 250 ms
  - `no-speech` → restart
  - `aborted` → restart if not caused by the page, otherwise no action
  - `network` or `offline` → paused (`no-internet`), with retries at 500/1000/2000/3000/3000 ms
  - `online` → restart now and reset the retry step
  - `started` → reset the retry step
  - `audio-capture` → stopped if the track ended, otherwise retry
  - `not-allowed` or `service-not-allowed` → paused (`speech-service`)
  - `language-not-supported` → a message and lang `en-US`
  - `lang-change` → restart with the new lang
  - `stop` → stopped; events after that are ignored
  - *As built:*
    - Chrome always fires `end` after `error`, so `no-speech` and `aborted` take no action and the following `end` restarts. This avoids starting twice.
    - `end` while paused or still starting retries with the backoff delays.
    - `language-not-supported` only falls back to `en-US`; there is no catalog message for it.
    - A synthetic `start-failed` (from `start()` throwing) retries with backoff.
- [X] T017 [P] Write `tests/e2e/foundation.spec.js` using `launchChrome('tab')` and `serveFixtures`:
  - the agent page has every agent `data-testid` from `contracts/ui-contract.md`
  - `headset-reminder` and `privacy-line` show the contract texts
  - `start` is enabled and `status` reads `Ready`
  - language choices survive a reload (FR-013)
  - an init script faking the Microsoft Edge brand shows `message[data-code=E_NOT_CHROME]` and disables `start`
  - faking Google Chrome 120 shows `E_OLD_CHROME`
- [X] T018 Run `npm run test:unit` and `npx playwright test tests/e2e/foundation.spec.js`. Confirm the new tests fail because the code doesn't exist yet, and record this in `specs/001-live-call-text/test-log.md`

### Implementation for the foundation

- [X] T019 [P] Implement `web/js/core/messages.js`: `MESSAGES` (code → `{ text, level }`), `HEADSET_REMINDER`, `PRIVACY_LINE`, `VIEWER_LABELS`, `messageFor(code)` and `pickMessage(activeCodes)`. Copy the texts exactly from `contracts/ui-contract.md`
- [X] T020 [P] Implement `web/js/core/support.js`:
  - `MIN_CHROME = 133`
  - `checkSupport(env)`
  - `readEnv(win)`, which builds `env` from `navigator.userAgentData`, `SpeechRecognition`/`webkitSpeechRecognition`, `navigator.mediaDevices?.getDisplayMedia` and `isSecureContext`
- [X] T021 [P] Implement `web/js/core/prefs.js` (`LANGS = ['en-US', 'ur-PK']`, `loadPrefs`, `savePrefs`, `isRtl`), with every storage access in try/catch
- [X] T022 [P] Implement `web/js/core/transcript.js` as the pure store described in T015, with no DOM access
- [X] T023 [P] Implement `web/js/core/lane-policy.js`: a pure `decide()` returning `{ state, action, delayMs, pauseReason, message, lang }` as described in T016
- [X] T024 Create `web/index.html`:
  - title "Live Call Text"
  - every agent `data-testid` from `contracts/ui-contract.md`
  - two language selects with options `en-US` "English" and `ur-PK` "Urdu"
  - a `start` button and a hidden `stop` button
  - `status`, `meter-call`, `meter-mic`, `transcript`, `message`, `hint`
  - a disabled `copy-link` and `link-status`
  - `headset-reminder`, `privacy-line`, and a `help-link` to `guide.html`
  - `<script type="module" src="js/agent.js">`
- [X] T025 [P] Create `web/css/app.css`:
  - high-contrast colours
  - caption lines at least 22 px
  - in-progress lines italic with lower opacity
  - `[dir=rtl]` lines right-aligned with the font stack `"Noto Nastaliq Urdu", "Urdu Typesetting", serif`
  - a status pill per `data-state`
  - meter bars sized by `data-level`
  - a big Start/Stop button
  - a layout usable at about 640 px wide (a half-screen window)
- [X] T026 Implement `web/js/browser/render.js`:
  - `renderSection(container, call)`, showing the start time
  - `renderLine(container, line)`, which inserts or updates `[data-testid=line]` by line id, with `data-side`, `data-final`, `lang`, `dir` and the label "Customer" or "Agent"
  - `renderStatus(el, { state, source, pauseReason })`, using the contract texts
  - `renderMessage(el, code)`, `renderHint(el, show)` and `renderMeter(el, level)`
  - auto-scroll that follows new text only while the view is within 40 px of the bottom (FR-010)
- [X] T027 Implement `web/js/browser/audio-graph.js`: `createAudioPath(audioContext, track, { gain = 1 })`
  - wire source → gain → analyser, and gain → `MediaStreamAudioDestinationNode`
  - never connect to `audioContext.destination` (research.md R3)
  - return `{ recognitionTrack, getLevel(), stop() }`, where `getLevel()` gives RMS from 0 to 1
- [X] T028 Implement `web/js/browser/recognizer.js`: `createLaneRunner({ side, track, lang, onResult, onState })`
  - wraps `SpeechRecognition` or `webkitSpeechRecognition` with `continuous = true` and `interimResults = true`, started with `recognition.start(track)`
  - turns `onresult` into `{ session, resultIndex, text, final }` events
  - sends `onend`, `onerror` and the window `online`/`offline` events through `decide()` from `lane-policy.js`, with timers for its delays
  - `setLang(lang)` aborts and restarts on the same track; `stop()` stops it
- [X] T029 Implement the bootstrap part of `web/js/agent.js`:
  - run `checkSupport(readEnv(window))`; on failure, show the code and disable Start
  - load prefs into both selects and save them on change
  - show the status `Ready`
  - on `localhost` only, expose `window.__lct = { transcript, render, state: {} }` for tests and read `?testGain=` (default 1)
- [X] T030 Run `npm run test:unit` and `npx playwright test tests/e2e/foundation.spec.js` until everything passes, and record the results in `specs/001-live-call-text/test-log.md`

**Checkpoint**: Foundation ready. User story work can begin.

---

## Phase 3: User Story 1 - Customer's words as live text for the agent (Priority: P1) 🎯 MVP

**Goal**: The customer's speech appears live as Customer lines on the agent page for a shared
Chrome tab (WhatsApp Web) or Entire screen with system audio (WhatsApp Desktop or an installed
dialer). The agent still hears the call. Clear fixes are shown for sharing problems.

**Independent Test**: Play recorded Urdu and English customer speech through the stand-in WhatsApp
tab and through the laptop speakers. Customer lines appear in the right language and direction,
within 2 s. Then run a real WhatsApp Web call with quickstart.md §5A steps 1-5.

### Tests for User Story 1 (REQUIRED - write first) ⚠️

- [X] T031 [P] [US1] Write `tests/unit/source-check.test.js` for `web/js/core/source-check.js`:
  - `checkSource({ audioTracks: 1, displaySurface: 'browser' })` → `{ ok: true, source: 'tab' }`; `'monitor'` → `'screen'`; `'window'` → `'window'`
  - with `audioTracks: 0`: `monitor` → `E_NO_CALL_SOUND_SCREEN`, `window` → `E_NO_CALL_SOUND_WINDOW`, `browser` → `E_NO_CALL_SOUND_TAB`, unknown → `E_NO_CALL_SOUND_SCREEN`
  - `shareErrorCode(err)` maps `NotAllowedError`, `AbortError` and any other error to `E_SHARE_CANCELLED`
- [X] T032 [P] [US1] Write `tests/unit/silence-watch.test.js` for `createSilenceWatch({ thresholdMs: 20000, minLevel: 0.01 })` in `web/js/core/silence-watch.js`, starting with `start(0)`:
  - `sample(0, 19999)` → no hint; `sample(0, 20000)` → hint
  - `sample(0.2, 25000)` → no hint
  - `sample(0, 90000)` → still no hint, because the hint only appears before the first sound
  - `start()` resets it
- [X] T033 [P] [US1] Write `tests/e2e/us1-tab.spec.js` with `launchChrome('tab')`, tab 1 = `/__test/pages/whatsapp-standin.html?clip=…`, tab 2 = the agent page:
  - (a) Urdu (`ur-PK`, `clip=ur`): press Start, then `playClip()`.
    - A `line[data-side=customer]` in Urdu script containing کرولا or کراچی appears with `dir=rtl`, within 2000 ms of playback starting (SC-002).
    - When it ends, every line has `data-final=true` and no text is duplicated.
    - `status` reads "Listening to a browser tab" and `meter-call` `data-level` was above 0.
    - The stand-in's audio is still playing and not muted, and `window.__lct.state.capture.audioTrack.getSettings().suppressLocalAudioPlayback === false` (FR-004).
  - (b) English (`en-US`, `clip=en`): the text contains Corolla or Karachi.
  - (c) Switching from `en-US` to `ur-PK` during the call gives Urdu text within 3 s of the next playback (FR-012).
  - (d) Stop: the status is `Stopped` and the lines stay. A second Start adds a second `call-section` with a start time below the first (FR-020). Changed by T089: a second Start now asks first, then starts fresh.
  - (e) Auto-scroll: add 50 synthetic lines through `window.__lct`. While scrolled up, a new line does not move the view; at the bottom, the view follows (FR-010).
- [X] T034 [P] [US1] Write `tests/e2e/us1-system-audio.spec.js` with `launchChrome('screen')` and the agent opened with `?testGain=30`:
  - after Start, `status` reads "Listening to the laptop's sound"
  - `playThroughSpeakers('tests/fixtures/audio/en-quiet.wav')` → Customer lines contain Corolla or Karachi within 15 s
  - the same with `ur-quiet.wav` and `ur-PK`
- [X] T035 [P] [US1] Write `tests/e2e/us1-errors.spec.js`:
  - (a) `screen-no-audio` mode: `message[data-code=E_NO_CALL_SOUND_SCREEN]` appears within 3 s of Start, and `status` is not listening (FR-005).
  - (b) `tab` mode: closing the stand-in tab while listening shows `I_SHARING_STOPPED` within 2 s, with status `Stopped` (FR-019).
  - (c) `tab` mode, no playback: `hint` appears after 20 s and disappears once `playClip()` runs (FR-008).
  - (d) `tab` mode, `context.setOffline(true)`: shows `W_NO_INTERNET` and "Paused: No internet". After `setOffline(false)`, the message clears and a replay gives new Customer lines within 5 s (SC-005). This covers the UI path only; note in `test-log.md` that Chrome's speech traffic may ignore emulated offline.
- [X] T036 [US1] Run the US1 unit and e2e tests, confirm they fail, and record this in `specs/001-live-call-text/test-log.md`

### Implementation for User Story 1

- [X] T037 [P] [US1] Implement `web/js/core/source-check.js` (`checkSource`, `shareErrorCode`) to pass T031
- [X] T038 [P] [US1] Implement `web/js/core/silence-watch.js` (`createSilenceWatch` with `start`, `sample`) to pass T032
- [X] T039 [US1] Implement `startCallCapture()` and `onTrackEnded(stream, cb)` in `web/js/browser/capture.js`:
  - use the exact `getDisplayMedia` options from research.md R2
  - return `{ stream, audioTrack, videoTrack, displaySurface }`
  - keep the video track alive and never show it
  - turn rejections into codes with `shareErrorCode`
- [X] T040 [US1] Wire the customer side into `web/js/agent.js`:
  - Start runs `startCallCapture` and then `checkSource`. On a failure: show the code, stop the stream and return to `Ready`.
  - `transcript.startCall` + `renderSection`.
  - `createAudioPath` with `testGain` (localhost only).
  - `createLaneRunner('customer', customerLang)`, with results going to `transcript.applyResult` and then `renderLine`.
  - A `requestAnimationFrame` meter loop that also feeds the silence watch into `hint`.
  - The status shows the source.
  - Stop stops the runner and the tracks. `onTrackEnded` gives `I_SHARING_STOPPED` and `Stopped`.
  - Changing customer-lang mid-call calls `setLang`.
  - Lane pauses update `status` and `message` through `pickMessage`.
  - Expose the capture as `window.__lct.state.capture` on localhost.
  - *As built:*
    - The meter loop is a 100 ms `setInterval`, because `requestAnimationFrame` stops in hidden tabs.
    - Added `web/js/core/pause-finalizer.js` (with `tests/unit/pause-finalizer.test.js`) and the runner's `finalizeNow()`. Chrome 154 only finalizes Urdu at session end (test-log Finding 1).
    - Added the `healthy` event to lane-policy so pauses don't flicker off while offline (Finding 2).
    - A localhost-only `window.__lct.addSyntheticLine()` lets the auto-scroll test add lines.
- [X] T041 [US1] Run `npm run test:unit` and the three US1 e2e specs until all pass, and record the results and the Chrome version in `specs/001-live-call-text/test-log.md`
- [ ] T042 [US1] **MANUAL with the owner**: do a quick MVP real call on WhatsApp Web, following quickstart.md §5A steps 1-5 (Customer lines only), and record the outcome in `specs/001-live-call-text/test-log.md`
  - *Deferred (owner, 2026-10-03):* "aik bar hii poora test karayy gayyyyy". The owner will test everything once at the end, so this folds into T076.

**Checkpoint**: User Story 1 works on its own. This is the MVP.

---

## Phase 4: User Story 2 - The agent's own words in the same view (Priority: P2)

**Goal**: The agent's microphone becomes Agent lines, in the agent's own language, in time order
with the Customer lines. A blocked or missing microphone never stops customer captions.

**Independent Test**: A stand-in mic plays Urdu while the stand-in tab plays English. Agent lines
come out in Urdu and Customer lines in English, in order. With the mic denied or missing, the right
warning shows and customer captions continue.

### Tests for User Story 2 (REQUIRED - write first) ⚠️

- [X] T043 [P] [US2] Write `tests/e2e/us2-agent-mic.spec.js` with `launchChrome('tab')`, `installStandInMic({ clip: 'ur', mode: 'clip' })` and the stand-in tab playing `en`. Set agent-lang `ur-PK` and customer-lang `en-US`, Start, then play both:
  - Agent lines are Urdu script, `dir=rtl`, labelled "Agent"
  - Customer lines are English
  - all lines are in time order
  - `meter-mic` `data-level` was above 0
  - switching agent-lang to `en-US` mid-call applies to the next agent words within 3 s
- [X] T044 [P] [US2] Write `tests/e2e/us2-mic-problems.spec.js`:
  - `mode: 'denied'` shows `message[data-code=W_MIC_BLOCKED]` and `meter-mic[data-state=unavailable]`, and Customer lines from the stand-in tab still appear (FR-017)
  - `mode: 'missing'` shows `W_MIC_MISSING`, with the same checks
- [X] T045 [US2] Run the US2 tests, confirm they fail, and record this in `specs/001-live-call-text/test-log.md`

### Implementation for User Story 2

- [X] T046 [US2] Implement `getMicrophone()` in `web/js/browser/capture.js`:
  - call `getUserMedia` with the constraints from research.md R4
  - return `{ track }` on success
  - return `{ code: 'W_MIC_BLOCKED' }` for `NotAllowedError` or `SecurityError`
  - return `{ code: 'W_MIC_MISSING' }` for `NotFoundError`, `OverconstrainedError` or `NotReadableError`
- [X] T047 [US2] Wire the agent side into `web/js/agent.js`:
  - call `getMicrophone()` right after a successful share, in the same Start
  - on success: `createAudioPath` (gain 1), `createLaneRunner('agent', agentLang)`, Agent lines and `meter-mic`
  - on a code: show it through `pickMessage`, set `meter-mic` `data-state=unavailable`, and leave the customer side untouched
  - changing agent-lang mid-call calls `setLang`
  - Stop and sharing-ended also stop the agent side
- [X] T048 [US2] Run the unit tests and the US1 + US2 e2e specs until all pass, and record the results in `specs/001-live-call-text/test-log.md`

**Checkpoint**: User Stories 1 and 2 work together, and User Story 1 still works without a microphone.

---

## Phase 5: User Story 3 - Optional customer link (Priority: P3)

**Goal**: One action copies a single-call link. The customer's phone browser shows the agent's
words live, never the customer's own words. It shows Call ended within 5 s of Stop. If the relay is
down, the agent's captions are unaffected.

**Independent Test**: With a stand-in mic, copy the link and open it in a phone-sized context. Agent
words appear there within 3 s. Stop shows Call ended. Reopening the link shows "not valid". Blocking
`/ws` shows `W_LINK_UNAVAILABLE`, and captions keep going.

### Tests for User Story 3 (REQUIRED - write first) ⚠️

- [X] T049 [P] [US3] Write `tests/unit/link-session.test.js` for `web/js/core/link-session.js`:
  - `createLinkSession({ origin, now, random })` returns a 43-character base64url `token`, `created === now`, a 22-character `sid`, and `url === origin + '/v.html#' + sid`
  - `deriveSid(token, created)` matches a fixed vector computed once with Node crypto and stored in the test
  - `verifyAgent({ sid, token, created, now })` → ok within 4 h; `too-old` after 4 h; `future` when `created` is more than 60 s ahead; `mismatch` for another token
  - `isValidSid` accepts exactly `^[A-Za-z0-9_-]{22}$`
- [X] T050 [P] [US3] Write `tests/unit/protocol.test.js` for `web/js/core/protocol.js`, mirroring `contracts/relay-messages.schema.json`:
  - `buildCaption` and `buildEnd` produce valid frames
  - `parseAgentFrame` and `parseViewerFrame` reject frames over 2048 bytes, empty text or text over 500 characters, a bad `lang`, extra fields and an unknown `t`
  - `splitCaption` splits a final text over 500 characters into ids `<id>`, `<id>~1`, …, and trims interim text to its last 500 characters
  - *As built:* part ids are `<id>:p1`, `<id>:p2`, … because the contract's id pattern `^[A-Za-z0-9:_-]+$` doesn't allow `~`.
- [X] T051 [P] [US3] Write `tests/unit/throttle.test.js` for `createThrottle({ intervalMs: 1000, now })` in `web/js/core/throttle.js`, with an injected clock:
  - interims for one id go out at most once per 1000 ms, and the latest text wins on `tick`
  - a final goes out at once and drops any pending interim for that id
  - different ids are throttled independently
- [X] T052 [P] [US3] Write `tests/unit/hub-logic.test.js` for `relay/src/hub-logic.js`:
  - `decideAgentUpgrade({ url, protocols, now })`: a good token → `{ ok: true, protocol: 'lct1', sid, created }`; a wrong token → 403; `created` older than 4 h → 403; a bad sid → 400
  - `decideViewerJoin({ liveAgent, viewerCount })`: live with 4 viewers → accept with `live`; no agent → `invalid` + 4404; 5 viewers → 4009
  - `onAgentFrame({ frame, attachment, now })`: forwards a valid caption; drops invalid ones and closes with 4008 on the 3rd drop; drops anything over 5 frames/s; `end` → end the call; after 4 h → expired
  - `onAgentClose({ code, attachment })`: 1000/1001 → `ended`; 1006 → `paused`; `replaced` → `ignore`
- [X] T053 [P] [US3] Write `tests/relay/relay.test.js`:
  - Setup: spawn `npx wrangler dev --port 8788` (`shell: true`), wait for its ready line, and kill it with `taskkill /pid <pid> /T /F` on teardown. Use Node's global `WebSocket` and sessions from `createLinkSession`.
  - Cases:
    1. a valid agent gets `live`
    2. a bad token gets HTTP 403 (the socket errors)
    3. a viewer gets `live`; a caption sent after it joined arrives unchanged, and one sent before is never delivered
    4. agent `end` → the viewer gets `ended` + 4000
    5. an unknown sid → `invalid` + 4404
    6. a 6th viewer → 4009
    7. a second agent connection with the same token replaces the first (4010) and the viewer stays live
    8. a 3000-byte frame is dropped
    9. `ping` → `pong`
- [X] T054 [P] [US3] Write `tests/e2e/us3-link.spec.js` with `launchChrome('tab')`, stand-in mic `en`, stand-in tab `ur`, and clipboard permissions granted for `http://localhost:8787`:
  - (a) Start, then `copy-link`:
    - `I_LINK_COPIED` shows, and the clipboard text equals `link-status[data-url]`, matching `/v.html#[A-Za-z0-9_-]{22}$`.
    - Open the link in a second context with the Pixel 7 device profile; `v-status` reaches `waiting` or `live`.
    - Play the mic: a `v-line` containing Corolla or Karachi appears within 3 s of the agent page's first Agent line (SC-009).
    - No Urdu customer text ever appears on the customer page (FR-026).
    - Stop → `v-status[data-state=ended]` within 5 s (FR-028), and reloading the customer page shows `invalid`.
  - (b) Closing the agent page → `ended` on the customer page within 5 s.
  - (c) `routeWebSocket(/\/ws/)` closing the socket → `W_LINK_UNAVAILABLE`, while Customer lines keep arriving (SC-011, FR-031).
- [X] T055 [US3] Run the US3 unit, relay and e2e tests, confirm they fail, and record this in `specs/001-live-call-text/test-log.md`

### Implementation for User Story 3

- [X] T056 [P] [US3] Implement `web/js/core/link-session.js`:
  - base64url helpers
  - `createLinkSession`
  - `deriveSid`: SHA-256 of `lct1|token|created` via `globalThis.crypto.subtle`, first 22 base64url characters
  - `verifyAgent`, `isValidSid`, `MAX_AGE_MS = 14400000` and `SKEW_MS = 60000`
  - no DOM, so it runs in Chrome, Node 24 and Workers
- [X] T057 [P] [US3] Implement `web/js/core/protocol.js`: `LANGS`, `MAX_FRAME_BYTES = 2048`, `MAX_TEXT = 500`, `buildCaption`, `buildEnd`, `buildStatus`, `parseAgentFrame`, `parseViewerFrame` and `splitCaption`, matching `contracts/relay-messages.schema.json` exactly, with no DOM
- [X] T058 [P] [US3] Implement `web/js/core/throttle.js`: `createThrottle({ intervalMs, now })` with `offer(caption)`, which returns the frames to send now, and `tick(now)`, which flushes interims that are due
- [X] T059 [US3] Implement the pure functions from T052 in `relay/src/hub-logic.js`, importing `../../web/js/core/link-session.js` and `../../web/js/core/protocol.js`
- [X] T060 [US3] Implement `relay/src/hub.js` as `export class Hub extends DurableObject`, imported from `cloudflare:workers`:
  - In the constructor, call `ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'))`.
  - `fetch(request)` upgrades sockets using hub-logic:
    - accept with `ctx.acceptWebSocket(server, tags)`, using tags `['agent', 'agent:<sid>']` or `['viewer', 'viewer:<sid>']`
    - the agent response carries the header `Sec-WebSocket-Protocol: lct1`
    - per-socket state is kept with `serializeAttachment`
    - an older agent socket is replaced: set `replaced: true` on it, then close it with 4010
  - `webSocketMessage` forwards to `ctx.getWebSockets('viewer:' + sid)` and handles `end` and expiry.
  - `webSocketClose` and `webSocketError` send `ended` or `paused` to viewers.
  - Never use `ctx.storage` (Constitution V).
- [X] T061 [US3] Implement `relay/src/index.js`: the default `fetch` sends `/ws` to `env.HUB.get(env.HUB.idFromName('hub')).fetch(request)` and everything else to `env.ASSETS.fetch(request)`; also `export { Hub }`
- [X] T062 [P] [US3] Implement `web/js/browser/relay-client.js`: `createRelayClient({ origin, session, onState })`
  - connect to `/ws?role=agent&sid=` with protocols `['lct1', 'auth.' + token + '.' + created]`
  - `sendCaption()` goes through `createThrottle`, with a 250 ms tick
  - `ping` every 30 s
  - on an unclean close, reconnect with backoff 1/2/4/5/5 s for up to 60 s
  - states: `connecting`, `live`, `reconnecting`, `unavailable`, `ended`
  - `end()` sends `end` and closes with 1000
- [X] T063 [P] [US3] Implement `web/js/browser/viewer-client.js`: `connectViewer({ origin, sid, onStatus, onCaption })`
  - `ping` every 30 s
  - `paused` starts a 60 s timer that reports `ended` if it runs out
  - close codes 4000/4001 → `ended`; 4404 → `invalid`
- [X] T064 [US3] Create `web/v.html` and `web/js/viewer.js`:
  - `v.html`: title "Live Call Text", `v-status`, `v-transcript`, a mobile viewport meta tag, and `css/app.css` plus viewer rules (lines at least 24 px)
  - `viewer.js`: read the sid from `location.hash`; if it fails `isValidSid`, show `invalid` without connecting
  - otherwise connect, and render `v-line` items by caption id (interim updated in place, then final), with `dir=rtl` for `ur-PK`
  - show the `VIEWER_LABELS` English and Urdu text for each state
  - *As built:* the viewer styles live in `web/css/viewer.css`, loaded after `css/app.css`, so the design tokens are shared (T082).
- [X] T065 [US3] Wire the customer link into `web/js/agent.js`:
  - `copy-link` is enabled only while listening
  - the first click runs `createLinkSession({ origin: location.origin })` and `createRelayClient`, writes the URL with `navigator.clipboard.writeText`, sets `link-status` text and `data-url`, and shows `I_LINK_COPIED`
  - later clicks copy the same URL
  - only agent-side results go to `sendCaption`, after `splitCaption`
  - Stop, sharing ended and `pagehide` call `end()`
  - relay states map to `link-status`; `unavailable` shows `W_LINK_UNAVAILABLE`
  - a new call creates a new link only when Copy is pressed again
- [X] T066 [US3] Run all unit, relay and e2e tests until they pass, and record the results in `specs/001-live-call-text/test-log.md`

**Checkpoint**: All three user stories work on their own and together.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: The guide, readability, long-call and visibility checks, honest results, deployment
gated on approval, and the real-call release gate

- [X] T067 [P] Write `web/guide.html`, the one-page agent guide in simple Roman Urdu (FR-022), with large text. Sections:
  1. Headset aur window set-up: snap this page beside WhatsApp or the dialer
  2. Browser wali WhatsApp: tab chunein
  3. Install wali WhatsApp ya dialer: Entire screen + "Also share system audio" tick; headset as the default sound device
  4. Customer link kaise bhejein
  5. Har message ka matlab: every code from `contracts/ui-contract.md`, with its fix in Roman Urdu
  6. Privacy: speech goes to Google through Chrome; nothing is recorded. Add the optional customer notice "Is call ki baat-cheet ko live text mein dekha ja raha hai."
- [X] T068 [P] Write `tests/e2e/polish.spec.js`:
  - `help-link` opens `guide.html`, and all 6 section headings are present
  - computed font-size is at least 22 px for `[data-testid=line]` and at least 24 px for `[data-testid=v-line]` (FR-015)
- [ ] T069 [P] Write `tests/e2e/soak.spec.js`, skipped unless `SOAK_MINUTES` is set:
  - in `tab` mode, replay the stand-in clip every 20 s for `SOAK_MINUTES` minutes
  - every replay must add a new final Customer line, and no message other than `I_*` may appear (a proxy for SC-004)
  - run it once with `SOAK_MINUTES=10` and record the result in `specs/001-live-call-text/test-log.md`
- [X] T070 [P] Write `tests/e2e/visibility.spec.js`:
  - while listening, open and bring to front a new tab in the same window, so the agent page is hidden
  - play the clip and record whether Customer lines kept arriving
  - write the finding into `specs/001-live-call-text/research.md` R11, and add a warning to `web/guide.html` if they stop
  - *As built:* Playwright opens each page in its own window, and even a minimised window reports `visibilityState: "visible"` under automation, so it can't be measured. The spec is kept as `test.fixme`, and the check is now quickstart §5A step 10 (manual). The guide already keeps the page in a visible window.
- [X] T071 Run `tests/e2e/us1-system-audio.spec.js` with each system-audio flag spelling alone. Keep only the working one in `tests/e2e/helpers/chrome.js`, and update `specs/001-live-call-text/research.md` R9
- [X] T072 Run `npm test` (unit, relay and e2e). Record every result honestly in `specs/001-live-call-text/test-log.md`: date, Chrome version, passed/failed counts, and any failure text verbatim
- [X] T073 Run `npx wrangler deploy --dry-run` to prove the Worker and assets bundle without uploading, and record the output in `specs/001-live-call-text/test-log.md`
- [ ] T074 **OWNER APPROVAL REQUIRED** (do not run without an explicit yes): deploy following `specs/001-live-call-text/quickstart.md` §6:
  - follow quickstart.md §6: the owner creates the free Cloudflare account, stopping if a card is requested
  - run `npx wrangler login`, then `npm run deploy`
  - record the live URL in `specs/001-live-call-text/test-log.md`
- [ ] T075 After T074, check on a phone using mobile data that a customer link from the deployed site opens in under 5 s and shows agent words within 3 s (SC-009). Record the result in `specs/001-live-call-text/test-log.md`
- [ ] T076 **MANUAL with the owner**: real-call checklist A, WhatsApp Web (quickstart.md §5A). Record it in the quickstart results table and `specs/001-live-call-text/test-log.md`
- [ ] T077 **MANUAL with the owner**: real-call checklist B, WhatsApp Desktop (quickstart.md §5B). Record it in `specs/001-live-call-text/test-log.md`
- [ ] T078 **MANUAL with the owner**: real-call checklist C, the owner's VoIP dialer, on the laptop where it is installed (quickstart.md §5C). Record it in `specs/001-live-call-text/test-log.md`
- [ ] T079 **MANUAL with the owner**: checklist D, a 60-minute call (quickstart.md §5D, SC-004). Record it in `specs/001-live-call-text/test-log.md`
- [ ] T080 **MANUAL with the owner**: first-time agent trial (SC-007). Five agents read `web/guide.html`, then each starts captions on a call. Record the successes (target: at least 4 of 5) in `specs/001-live-call-text/test-log.md`

### Echo filter (FR-038, added after the first real call on 2026-10-03)

- [X] T084 Hide the customer's echo on the agent page and keep it off the customer link:
  - `web/js/core/echo-filter.js` with `tests/unit/echo-filter.test.js`
  - `transcript.markEcho` and `data-echo` / `hidden` in `render.js`
  - In `agent.js`: re-check recent Agent lines on each Customer update. While call sound is active, hold in-progress Agent words and send each final after a 1.2 s re-check.
  - The mic asks for `echoCancellation: 'all'`
  - Test: `tests/e2e/echo.spec.js`

### User Story 4 - Save the call record and start fresh (P4, owner's request 2026-10-03)

**Goal**: One click saves the call's chat as a text file on the laptop; New call clears it; nothing is lost by mistake (FR-039, FR-040).
**Independent Test**: Save after a call, check the file; New call empties the conversation; Start with unsaved text asks first.

- [X] T086 [P] [US4] Write `tests/unit/record.test.js` for `buildCallRecord()` in `web/js/core/record.js`:
  - the filename is `call-YYYY-MM-DD_HH-MM.txt`
  - the header has date, start and end times, duration and language names
  - lines are written as `[HH:MM:SS] Customer: …` and `[HH:MM:SS] Agent: …`
  - echo lines are skipped; Urdu is kept as-is
  - a running call shows "still running"
- [X] T087 [P] [US4] Add `transcript.clear()` and a test in `tests/unit/transcript.test.js`. Add I_CHAT_SAVED to `tests/unit/messages.test.js` (15 codes, priority after I_LINK_COPIED)
- [X] T088 [P] [US4] Write `tests/e2e/us4-save-clear.spec.js`:
  - Save after a call downloads the file with the lines, and I_CHAT_SAVED shows
  - New call empties the conversation
  - New call with unsaved text: Cancel keeps it; Don't save clears it
  - Start with unsaved text: Save and continue downloads, then starts a fresh call
- [X] T089 [US4] Update `tests/e2e/us1-tab.spec.js` (d) for the amended FR-020: a second Start asks first, then starts fresh with one call section
- [X] T090 [US4] Implement `web/js/core/record.js`, `transcript.clear()`, the I_CHAT_SAVED message, and the save/new-call buttons and dialog in `web/index.html` + `web/css/app.css`. Wire them in `web/js/agent.js`, including the download and the `beforeunload` warning for unsaved chats
- [X] T091 [US4] Add a "Call ke baad chat save karein" section and the I_CHAT_SAVED row to `web/guide.html`, and a save/new-call step to the quickstart checklist
- [X] T092 [US4] Run all unit, relay and e2e tests, and record the results in `specs/001-live-call-text/test-log.md`

### Soft and loud speech (owner's request, 2026-10-03)

- [X] T085 Even out speech loudness for recognition on both sides:
  - `web/js/core/agc.js` with `tests/unit/agc.test.js`
  - AGC + limiter + speech check in `web/js/browser/audio-graph.js`
  - The pause, stall and echo logic in `web/js/agent.js` use the speech check
  - `tests/e2e/loudness.spec.js`: soft and loud clips must keep at least 85% / 80% of the words
  - Clips in `tests/fixtures/audio/`: soft, very soft, loud, fast and two-sentence versions
  - Measurements are in test-log Findings 7-8. A quicker stall trigger was tried and removed

### Professional look and feel (FR-037, added at the owner's request on 2026-10-03)

- [X] T081 Redesign `web/index.html` and `web/css/app.css` as a professional console. Keep every `data-testid`, the `.who`/`.text` line structure and all contract texts:
  - an app bar with brand and status chip
  - a controls card (language selects, primary Start / danger Stop, sound meters, headset note)
  - message and hint banners with icons
  - a conversation card with chat bubbles (Customer left, Agent right, in-progress style, Urdu RTL) and an empty state
  - a customer-link card
  - a footer with the privacy note and help link
  - light and dark themes via `prefers-color-scheme`
- [X] T082 Design `web/v.html` (with `web/css/viewer.css`) and `web/guide.html` in the same visual language: mobile-first customer page with a bilingual status chip and large agent bubbles; a clean document layout for the guide
- [X] T083 Write `tests/e2e/layout.spec.js`:
  - no horizontal scroll on the agent page at 640 px or on the customer page at 390 px
  - both pages render in dark mode (`colorScheme: 'dark'`) with a dark background
  - the text-to-background contrast of a Customer line, an Agent line and the status is at least 4.5:1 in both themes

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: none. T008 needs T005 and T007.
- **Foundational (Phase 2)**: needs Setup. It blocks every user story.
- **User Story 1 (Phase 3)**: needs Foundational. This is the MVP.
- **User Story 2 (Phase 4)**: needs User Story 1, because it extends the same Start flow in `web/js/agent.js` and `web/js/browser/capture.js`.
- **User Story 3 (Phase 5)**: needs User Story 2, because the customer link publishes the agent's lines. Its relay part (T052-T053, T056-T061) only needs Foundational and can be built earlier.
- **Polish (Phase 6)**: needs the stories it touches. T074 needs the owner's approval. T075 needs T074. T076-T080 need the owner present.

### User Story Dependencies

```text
Setup → Foundational → US1 (MVP) → US2 → US3 → Polish → release gate (T076-T079)
                     └──────── relay core (T052, T053, T056-T061) can start here ────────┘
```

### Within Each User Story

- Write the tests first, then run them and see them fail (T018, T036, T045, T055).
- Build the pure `core/` modules [P], then the `browser/` adapters, then the wiring in `agent.js`, then run everything.
- Tasks that touch `web/js/agent.js` or `web/js/browser/capture.js` run one after another.
- A story is done only when its tests pass and the results are in `test-log.md`.

### Parallel Opportunities

- Setup: T004, T005, T006, T007, T009 and T010 together.
- Foundational tests: T012-T017 together. Foundational core modules: T019-T023 together, with T025 alongside.
- US1: T031-T035 together; T037 and T038 together.
- US2: T043 and T044 together.
- US3: tests T049-T054 together; core T056-T058 together; T062 and T063 together, while T059-T061 are built.
- Polish: T067-T070 together.

---

## Parallel Example: User Story 1

```text
# All US1 tests together (they must fail first):
Task: "T031 [US1] tests/unit/source-check.test.js"
Task: "T032 [US1] tests/unit/silence-watch.test.js"
Task: "T033 [US1] tests/e2e/us1-tab.spec.js"
Task: "T034 [US1] tests/e2e/us1-system-audio.spec.js"
Task: "T035 [US1] tests/e2e/us1-errors.spec.js"

# Then both pure modules together:
Task: "T037 [US1] web/js/core/source-check.js"
Task: "T038 [US1] web/js/core/silence-watch.js"
```

## Parallel Example: User Story 3

```text
# Tests together:
Task: "T049 tests/unit/link-session.test.js"  Task: "T050 tests/unit/protocol.test.js"
Task: "T051 tests/unit/throttle.test.js"      Task: "T052 tests/unit/hub-logic.test.js"
Task: "T053 tests/relay/relay.test.js"        Task: "T054 tests/e2e/us3-link.spec.js"

# Shared core together, then the relay and the clients side by side:
Task: "T056 link-session.js"  Task: "T057 protocol.js"  Task: "T058 throttle.js"
Task: "T059-T061 relay/src/*" alongside "T062 relay-client.js" and "T063 viewer-client.js"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 (Setup) and Phase 2 (Foundational).
2. Complete Phase 3 (US1).
3. **STOP and VALIDATE**: all automated US1 tests pass, then do the quick real WhatsApp Web call with the owner (T042).
4. Agents can already use it from `npm run dev` on one laptop. The deployment for every agent waits for T074.

### Incremental Delivery

1. Setup + Foundational → the page shell and logic are tested.
2. US1 → customer captions (MVP) → validate with the owner.
3. US2 → the agent's own words → validate.
4. US3 → customer link → validate locally, then deploy after approval (T074, T075).
5. Polish → guide, readability, long-call and visibility checks.
6. Release gate → real-call checklists for all three call types (T076-T079) and the agent trial (T080).

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- The [Story] label maps each task to its user story for traceability
- See the tests fail before implementing (red, green, refactor; Constitution VI)
- Never weaken or skip a failing test; record failures verbatim in `test-log.md`
- System-audio tests play a quiet clip through the laptop's speakers and open a visible Chrome window
- e2e tests need internet (Chrome's speech service)
- There is no git repository yet. If one is created, commit after each task or logical group
