# Research: Live Call Text

**Feature**: 001-live-call-text | **Date**: 2026-10-03 | **Plan**: [plan.md](./plan.md)

Every unknown in the plan's Technical Context is resolved here. Facts come from two places: official
docs fetched on 2026-10-03 (sources at the end), and recorded-audio tests run on the owner's laptop on
2026-10-02 (Chrome 154, Windows 10).

## R1. Speech-to-text engine

- **Decision**: Use Chrome's built-in Web Speech API (`SpeechRecognition`) and feed it an audio
  `MediaStreamTrack` through `start(audioTrack)`. Run one recognizer per side (customer and agent)
  with `continuous = true` and `interimResults = true`. Supported languages are `ur-PK` and `en-US`.
- **Rationale**: It is free, needs no install and no key (Constitution I, IV). `start(audioTrack)`
  shipped on desktop Chrome in M133 (Windows, Mac, Linux). On 2026-10-02, Chrome 154 on the owner's
  laptop ran an `en-US` recognizer and a `ur-PK` recognizer at the same time on recorded clips. Both
  transcribed correctly, and the first words appeared after about 1 second (`firstWordMs` 942 and
  1031).
- **Caveats**:
  - By default the audio is processed by Google's speech service. Chrome also has an on-device mode
    (`processLocally`), but it is not used in v1 because Urdu support for it is unverified.
  - There is no standard feature detection for `start(audioTrack)`. Older browsers ignore the track
    and listen to the microphone instead (web-speech-api issue #126). That would silently show the
    agent's voice as the customer's. So the page requires the "Google Chrome" brand at version 133
    or later (from `navigator.userAgentData`) and does not start otherwise (R10).
- **Alternatives considered**:
  - Paid cloud speech APIs: break Constitution I.
  - Whisper-style models running in the browser: free, but they need large downloads, use heavy CPU
    on agent laptops, and Urdu latency is unproven. Breaks VII.
  - Chrome's on-device mode: language coverage is unverified. A possible future option.

## R2. Capturing the call audio

- **Decision**: On Start, call `getDisplayMedia()` once, inside the click handler:

  ```js
  navigator.mediaDevices.getDisplayMedia({
    video: true,                                   // required by the API
    audio: { suppressLocalAudioPlayback: false },  // the agent keeps hearing the call (FR-004)
    systemAudio: 'include',                        // offer "Also share system audio" for screens
    windowAudio: 'window',                         // hint only; see below
    selfBrowserSurface: 'exclude',                 // our own tab is not offered
    surfaceSwitching: 'exclude',
    monitorTypeSurfaces: 'include',
  });
  ```

  - **Tab** (WhatsApp Web, or a dialer running in a browser tab) gives an audio track labelled
    "Tab audio". Verified on Chrome 154.
  - **Entire screen + "Also share system audio"** gives a track labelled "System Audio". Verified on
    Chrome 154. This is the path for the WhatsApp Desktop app and installed dialers.
  - `windowAudio: 'window'` asks Chrome to offer a single window's own sound. It was reportedly added
    in Chrome 141, but this is not confirmed in official docs and is untested on Windows. It is a
    bonus only: the guide teaches Entire screen, and a window shared without sound gets the fix
    message.
  - **No audio track**: read `videoTrack.getSettings().displaySurface` (`browser`, `window` or
    `monitor`) and show the matching fix within 3 seconds (FR-005).
  - **`ended` on the audio or video track**: means sharing stopped from outside the page (FR-019).
  - The video track is kept alive but never shown. Stopping it might also end the audio capture;
    this is untested.
  - The 2026-10-02 test used `suppressLocalAudioPlayback: true` to stay silent. Production MUST use
    `false`.
- **Rationale**: This is the only browser path to tab or system sound. Chrome's picker gives exactly
  "one Start plus the share choice" (IV). The API needs a secure context and a user click (MDN), so
  it is called from the Start handler and the pages are served over HTTPS (or localhost).
- **Alternatives considered**:
  - Virtual audio cable drivers: an install on every laptop. Breaks IV.
  - WhatsApp Business Calling API: needs a number migration and is out of scope.

## R3. Audio path inside the page

- **Decision**: Build this Web Audio graph per side:
  1. The captured track goes into a `MediaStreamAudioSourceNode`.
  2. That feeds a `GainNode` set to 1.0.
  3. The gain node feeds an `AnalyserNode`, which drives the sound meter and the 20-second hint.
  4. The gain node also feeds a `MediaStreamAudioDestinationNode`. Its track is what goes to
     `SpeechRecognition.start()`.
  5. Nothing is ever connected to `audioContext.destination`.
- **Rationale**: This is the same path the 2026-10-02 tests used. The analyser gives FR-007 and
  FR-008 without a second capture. Not connecting to the speakers avoids playing the call twice
  (FR-004). In production the gain is always 1.0. Tests may raise it, on localhost only (R9).
- **Alternatives considered**: passing the raw track straight to `start()`. It is simpler but
  untested; it can be tried later behind a test.
- **Update 2026-10-03 (test-log Finding 7)**: the path now runs input gain → AGC gain
  (`core/agc.js`, up to ×40, never below ×1) → limiter (DynamicsCompressor, threshold -10 dB,
  ratio 20) → recognition track.
  - Soft English went from 50% to 94-100% of words.
  - The AGC's adaptive speech check now drives the pause-finalizer, stall watch and echo hold, in
    place of fixed loudness levels.
  - The agent still hears the call unchanged.
- **Known limit (Finding 8)**: English spoken at about 1.2× normal speed or faster loses words in
  Chrome's service (en-US and en-IN alike); Urdu does not. On-device recognition is
  "downloadable" for en-US only, a possible later option.

## R4. Agent microphone

- **Decision**: In the same Start click, right after the share choice, call
  `getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } })`.
  The microphone uses the same audio path as R3.
  - `NotAllowedError` (blocked) or `NotFoundError` (missing): show the microphone message, mark the
    agent side as unavailable, and keep customer captions running (FR-017).
- **Rationale**: Windows lets several apps use the microphone at once, so WhatsApp or the dialer and
  Chrome can share it. This is checked on every real-call checklist.
- **Echo without a headset** (real call, 2026-10-03):
  - The customer's voice from the laptop speakers reached the built-in microphone and also
    appeared as Agent lines. The test laptop has only "Speakers" and "Microphone (High Definition
    Audio Device)"; no headset is connected.
  - Chrome 141+ accepts `echoCancellation: "all"`, which removes all system playout from the
    mic, so the constraint now asks for it.
  - On this laptop (Chrome 154, Windows) the mic reports capabilities `[true, false,
    "remote-only"]`, so `"all"` is not available and Chrome uses normal echo cancellation.
  - **Practical fix**: a headset or earphones (FR-023 reminder; spec edge case "No headset").
  - Source: Chrome 141 beta blog, https://developer.chrome.com/blog/chrome-141-beta

## R5. Recognition lifecycle and recovery

- **Decision**: Each side runs a small state machine (see data-model.md). The rules are pure logic in
  `lane-policy.js`:

  | Event | Action |
  |---|---|
  | `end` while not stopped | Restart within 250 ms |
  | `no-speech`, or `aborted` that the page did not cause | Restart |
  | `network`, or the `offline` event | Pause with "No internet". Retry after 0.5 s, 1 s, 2 s, then every 3 s; retry at once on `online` (SC-005, 5 s or less) |
  | `audio-capture` | If the track has ended, treat it as "sharing stopped"; otherwise retry |
  | `not-allowed`, `service-not-allowed` | Pause with "speech service not responding", using the same retry steps |
  | `language-not-supported` | Show a message and fall back to English |
  | Language changed by the agent | `abort()` the recognizer and start a new one with the new `lang` on the same track, within 3 s (FR-012) |

  Each side has at most one in-progress line, which is replaced by its final text (FR-011). Line ids
  come from (recognizer session, result index), so restarts never duplicate lines.

  **Measured on Chrome 154 (2026-10-03, test-log Findings 1-2):**
  - Urdu (`ur-PK`) results turn final only when the session ends, about 14 s after speech stops.
    English turns final about 1.4 s after speech.
    - So `pause-finalizer.js` calls `stop()` after 1.5 s of quiet while an in-progress line is open,
      or once that line reaches 600 characters. The final comes back in about 0.2 s, and the lane
      restarts at once.
    - The quiet threshold, `minLevel` 0.006 raw RMS, should be checked against real call noise
      during the real-call checklists.
  - Chrome fires `start` before it reaches the speech service. So a pause is only cleared by
    `healthy` (the first result, or 3 s without an error), and never while `navigator.onLine` is
    false.
  - In long calls, a session can stop sending results with no error and no `end`
    (test-log Finding 6). So `stall-watch.js` restarts a lane after 3 s of sound with no
    result, with an 8 s cooldown. When a session ends, its unfinished in-progress text is kept
    as a final line.
- **Rationale**: Chrome's continuous recognition stops by itself after silences and time limits.
  Restarting automatically meets FR-016 and SC-004.

## R6. Customer-link relay and hosting

- **Decision**: Use the Cloudflare Workers Free plan:
  - One Worker serves the static pages (Workers Static Assets) and the `/ws` endpoint.
  - One "hub" Durable Object relays text with the WebSocket Hibernation API.
  - Heartbeats use `setWebSocketAutoResponse("ping" → "pong")`, which does not wake the object.
  - The hub must be a SQLite-backed class, because the Free plan only allows those. It never writes
    a row.
- **Rationale**:
  - The Free plan returns errors at its limits instead of billing (I).
  - Static asset requests are free and unlimited.
  - Durable Objects have been on the Free plan since 2025-04-07.
  - The pages contain no API key, because the Worker is our own.
  - One shared hub keeps duration bounded by working hours, not by the number of calls (R8).
  - Hibernation resets memory, so all routing comes from socket tags (`agent:<sid>`, `viewer:<sid>`)
    and small socket attachments. Nothing is stored (V).
- **Alternatives considered**:
  - **One Durable Object per call**: routing is simpler, but duration adds up per call:
    40 link-hours/day × 3,600 s × 0.128 GB = 18,432 GB-s, which is more than the 13,000 GB-s free.
  - **WebRTC data channel with free public signalling**: without a TURN server, connections fail
    behind many mobile-carrier NATs. Free TURN services need credentials, which are keys.
  - **Hosted realtime services (Firebase, Supabase, Ably, Pusher)**: they need a project key in the
    page, and some store the messages. That conflicts with I and V.
  - **Free app hosts that sleep when idle**: cold starts take tens of seconds, which breaks "within
    3 seconds".
  - **Public MQTT test brokers**: no account needed, but they are meant for testing and promise no
    reliability.
- **Open item**: during sign-up, the owner confirms that Cloudflare's Free plan asks for no card. If
  it does ask, stop and re-plan (I).

## R7. Link security and session protocol

- **Token**: when the agent first presses Copy customer link, the page makes 32 random bytes with
  `crypto.getRandomValues`, written as base64url (43 characters), plus `created`, a timestamp in ms.
- **Session id**: `sid` is the first 22 characters of base64url(SHA-256(`lct1|<token>|<created>`)),
  which is 132 bits. It cannot be guessed in practice (FR-029). The relay can recompute it from the
  token, so no session table is stored. This works with hibernation and with Constitution V.
- **Link**: `https://<host>/v.html#<sid>`. The sid sits in the URL fragment, so it is not sent with
  the page request or in referrers.
- **Agent connection**: `wss://<host>/ws?role=agent&sid=<sid>`, with WebSocket subprotocols
  `["lct1", "auth.<token>.<created>"]`. Before upgrading, the hub checks three things:
  - the hash of the token matches the sid;
  - `created` is between now − 4 h and now + 60 s.

  If either check fails, the hub answers with HTTP 403. A valid reconnect replaces any older agent
  socket for the same sid (close code 4010), because after a network drop the old socket can still
  look open. The token never appears in a URL, so it never reaches request logs.
- **Viewer connection**: `wss://<host>/ws?role=viewer&sid=<sid>`. It is accepted only while a live
  agent socket exists for the sid, with at most 5 viewers. Otherwise the viewer gets `status: invalid`
  and close code 4404.
- **Ending**:
  - On Stop or when the page is hidden for good (`pagehide`), the agent sends `end`. Viewers get
    `status: ended` and close code 4000.
  - If the agent's socket drops uncleanly, viewers get `status: paused`. The agent page reconnects
    with the same token for up to 60 s. If the call is not live again within 60 s, the viewer page
    shows Call ended.
  - Four hours after `created`, viewers get `status: expired` and close code 4001.
- **Limits**:
  - Each frame is at most 2,048 bytes, and each caption text at most 500 characters.
  - The agent may send at most 5 messages per second; extra messages are dropped.
  - The agent page sends interim updates at most once per second per line.
- **Rationale**: Covers FR-024 to FR-031 and privacy (V).

## R8. Free-tier ledger (Constitution I)

**Expected usage**: 20 agents, 8 h of calls each, link on 1 in 4 calls, which is 40 link-hours/day.

**Worst-case assumptions**:
- The agent speaks the whole time, which with throttling is at most 1.2 messages/s.
- Heartbeats every 30 s.
- An average call lasts 5 minutes, which gives 480 link calls/day with 3 sockets each.

| Resource (Workers Free) | Free limit | Expected use (worst case) | Headroom |
|---|---|---|---|
| Worker requests | 100,000/day | ~1,440/day (WebSocket upgrades only; pages are static assets) | ~69x |
| Static asset requests | Free, unlimited, not counted | Page loads | Unlimited |
| Durable Object requests (upgrades, plus incoming messages counted 20:1) | 100,000/day | ~10,560/day (172,800 messages ÷ 20 + 480 heartbeats + 1,440 upgrades) | ~9.5x |
| Durable Object duration (one hub at 128 MB) | 13,000 GB-s/day | At most 460.8 GB-s per hour awake; ~4,608 for a 10-hour day | ~2.8x (2x holds up to ~14 h/day) |
| SQLite rows written / data stored | 100,000/day; 5 GB | 0 / 0 | Unlimited |
| CPU | 10 ms per Worker call; 30 s per Durable Object request | Under 1 ms | Very large |
| Chrome speech-to-text | No published quota | Each agent's own Chrome | Unknown; watched in the 60-minute test |

**At a limit**: requests fail with an error and nothing is billed. The link feature shows "Customer
link is not available right now" (FR-031), and captions keep working (II).

**Re-check if**: link calls run more than ~14 hours a day, or there are more than 20 agents.

## R9. Test strategy (Constitution VI)

- **Unit tests**: Node 24's built-in `node:test` and `node:assert`, so no dependency. They cover the
  pure modules in `web/js/core/` and `relay/src/hub-logic.js`. Node 24 also provides
  `crypto.subtle` and a global `WebSocket` (checked on this laptop).
- **Relay integration**: run `wrangler dev` (local workerd, no account needed) and connect with
  Node's global `WebSocket`.
- **End-to-end**: `@playwright/test` driving the installed Google Chrome (`channel: 'chrome'`).
  Pass `ignoreDefaultArgs: ['--mute-audio']`, because Playwright mutes Chrome by default (found
  2026-10-02).
  - **Customer through a tab**: a stand-in page titled "WhatsApp" plays the clip. Launch with
    `--auto-select-tab-capture-source-by-title=WhatsApp`. Headless works. Start playback explicitly,
    because Chrome delays autoplay in background tabs (found 2026-10-02).
  - **Customer through system audio**: needs a visible Chrome window. Launch with
    `--auto-select-desktop-capture-source=Entire screen` and the system-audio checkbox flag.
    - T071 (2026-10-03, Chrome 154) confirmed that only `--system-audio-capture-default_checked`
      (underscore) works. The dash spelling leaves the box unticked.
    - A separate process plays the clip quietly: PowerShell with the WPF MediaPlayer, checked
      available on this laptop.
    - On localhost only, the page accepts `?testGain=` to boost the quiet clip.
  - **"System audio not ticked"**: the same launch without the checkbox flag. Expect the fix message
    within 3 s.
  - **Agent microphone**: inject a stand-in microphone with `page.addInitScript`, so that
    `getUserMedia` returns a Web Audio track playing a clip. Add `--use-fake-ui-for-media-stream`.
    Do NOT use `--use-fake-device-for-media-stream`: on 2026-10-02 it replaced the real capture with
    Chrome's fake audio.
  - **Customer link**: a second browser context with a phone-sized viewport opens the link served by
    `wrangler dev`.
  - **Fixtures**: `en.mp3` and `ur.mp3` from the 2026-10-02 tests, copied into
    `tests/fixtures/audio/`.
    - English: "hello I want the price of a 2018 Toyota Corolla how many days will Shipping to
      Karachi take".
    - Urdu: the same request in Urdu.
    - Tests check for key words: Corolla and Karachi in English; کرولا and کراچی in Urdu.
  - These tests need internet, because Chrome's speech service is online. Each e2e test may retry
    once.
- **Manual**: real-call checklists for the three call types in quickstart.md (VR-003, VR-004).

## R10. Environment checks, UI text and fonts

- **Support check**: the page starts only if all of these hold:
  - `navigator.userAgentData` lists the brand "Google Chrome" at version 133 or later;
  - `mobile` is `false`;
  - `SpeechRecognition` (or `webkitSpeechRecognition`) exists;
  - `navigator.mediaDevices.getDisplayMedia` exists;
  - the page is a secure context.

  Otherwise it shows E_NOT_CHROME or E_OLD_CHROME (ui-contract.md).
- **UI text**: agent page labels use simple English, and messages come from the catalog in
  ui-contract.md. The guide page is in Roman Urdu.
- **Urdu lines**: marked `lang="ur" dir="rtl"`, with the font stack
  `"Noto Nastaliq Urdu", "Urdu Typesetting", serif`. These are system fonts, so nothing is
  downloaded. English lines are `dir="ltr"`.
- **Text size**: at least 22 px on the agent page and 24 px on the customer page, with high contrast.
- **Preferences**: `localStorage["lct.prefs.v1"]` holds `{ v: 1, customerLang, agentLang }`, with
  `en-US` as the default for both. Every access is wrapped in try/catch (FR-013).

## R11. Page visibility (open question, tested later)

- The agent has to see the captions, so the guide puts the Live Call Text page in its own window,
  snapped beside WhatsApp or the dialer.
- It is untested whether recognition keeps running when the page is a hidden background tab.
- Measured 2026-10-03: under Playwright on Chrome 154, the page still reports
  `visibilityState: "visible"` after its window is minimised, even with Playwright's backgrounding
  switches removed. So this can't be tested automatically; `tests/e2e/visibility.spec.js` is kept as
  `fixme`.
- The check moved to the real-call checklist (quickstart §5A step 10), and the guide keeps the page
  in a visible window.

## Sources

- Cloudflare Durable Objects pricing (Free plan, the 20:1 WebSocket ratio, hibernation billing):
  https://developers.cloudflare.com/durable-objects/platform/pricing/
- Cloudflare Durable Objects limits: https://developers.cloudflare.com/durable-objects/platform/limits/
- Durable Objects on the Free plan (2025-04-07):
  https://developers.cloudflare.com/changelog/2025-04-07-durable-objects-free-tier/
- Cloudflare Workers pricing (free limits, static assets free, errors instead of billing):
  https://developers.cloudflare.com/workers/platform/pricing/
- Durable Object state API (tags, getWebSockets, auto-response, 32,768 sockets):
  https://developers.cloudflare.com/durable-objects/api/state/
- Durable Objects WebSocket hibernation:
  https://developers.cloudflare.com/durable-objects/best-practices/websockets/
- MDN `SpeechRecognition.start()`:
  https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition/start
- MDN `getDisplayMedia()`:
  https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getDisplayMedia
- Chrome screen-sharing controls: https://developer.chrome.com/docs/web-platform/screen-sharing-controls
- Intent to Ship, MediaStreamTrack support in the Web Speech API (desktop M133):
  https://groups.google.com/a/chromium.org/g/blink-dev/c/4ibjEVQ-i0s/m/2OsaIhf3BAAJ
- Feature detection for `start(audioTrack)`: https://github.com/WebAudio/web-speech-api/issues/126
- Intent to Ship, on-device Web Speech API:
  https://groups.google.com/a/chromium.org/g/blink-dev/c/VNOok2dbmHM/m/TQpe9shjCgAJ
- `windowAudio` proposal: https://lists.w3.org/Archives/Public/public-webapps-github/2025Jun/0114.html
- Local evidence: `agent2.html`, `run2.py` and `result-*.json` from the 2026-10-02 tests, under
  `%LOCALAPPDATA%\Temp\claude\E--New-folder-millinior\7c6f9adb-…\scratchpad\sttcheck\`
