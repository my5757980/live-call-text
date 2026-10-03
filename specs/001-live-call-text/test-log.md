# Test Log: Live Call Text

Every automated and manual run is recorded here exactly as it happened, failures included
(Constitution VI).

## Toolchain (T011, 2026-10-03)

| Tool | Version |
|---|---|
| Node.js | v24.5.0 |
| Wrangler | 4.147.0 |
| Playwright | 1.63.0 |
| Google Chrome | 154.0.8037.93 |

- `wrangler dev` started locally with no Cloudflare account. It was ready in about 7 s and `GET /`
  returned 404, as expected while `web/` was still empty. Then it was stopped.

## Runs

| Date | Task | Command | Chrome | Passed | Failed | Notes |
|---|---|---|---|---|---|---|
| 2026-10-03 | T018 (red) | `npm run test:unit` | n/a | 0 | 5 files | Expected: `web/js/core/*` modules don't exist yet (module not found) |
| 2026-10-03 | T018 (red) | `npx playwright test tests/e2e/foundation.spec.js --retries=0` | 154 | 0 | all | Expected: `web/` is empty, so `/` returns 404 and Playwright's webServer readiness check timed out after 60 s |
| 2026-10-03 | T030 | `npm run test:unit` | n/a | 44 | 0 | messages, support, prefs, transcript, lane-policy |
| 2026-10-03 | T030 | `npx playwright test tests/e2e/foundation.spec.js --retries=0` | 154 | 4 | 1 | Test bug: the contract-table regex also matched the header cell `data-testid`. Fixed the test filter |
| 2026-10-03 | T030 | same, re-run | 154 | 5 | 0 | All foundation checks pass; headless Chrome 154 reports the "Google Chrome" brand |
| 2026-10-03 | T036 (red) | `node --test` source-check + silence-watch | n/a | 0 | 2 files | Expected: modules don't exist yet |
| 2026-10-03 | T036 (red) | `npx playwright test` us1-tab, us1-errors, us1-system-audio `--retries=0` | 154 | 0 | 11 | Expected: Start isn't wired yet, so the status never reaches "Listening" (no sound was played) |
| 2026-10-03 | T041 | `npx playwright test us1-tab.spec.js --retries=0` | 154 | 4 | 1 | The Urdu final line never came within 20 s. See Finding 1 |
| 2026-10-03 | T041 | us1-tab + us1-errors `--retries=0` | 154 | 8 | 1 | The Urdu test passes after the pause finalizer. The offline test failed: the status flipped back to "Listening" while still offline. See Finding 2 |
| 2026-10-03 | T041 | `npm run test:unit` | n/a | 59 | 0 | Adds pause-finalizer (6 tests) and lane-policy healthy/offline (2 tests) |
| 2026-10-03 | T041 | `npx playwright test us1-system-audio.spec.js --retries=0` | 154 | 2 | 0 | English and Urdu through Entire screen + system audio. A quiet clip played through the laptop speakers, with `testGain=30` |
| 2026-10-03 | T041 | `npx playwright test --retries=0` (all e2e) | 154 | 16 | 0 | Clean full run: foundation 5, us1-errors 4, us1-system-audio 2, us1-tab 5 |
| 2026-10-03 | T045 (red) | us2-agent-mic + us2-mic-problems `--retries=0` | 154 | 0 | 4 | Expected: the microphone isn't wired yet |
| 2026-10-03 | T048 | us2 specs `--retries=0` | 154 | 4 | 0 | Agent Urdu + customer English in time order; mic blocked / missing warnings; agent language switch |
| 2026-10-03 | T048 | foundation + us1 regression `--retries=0` | 154 | 12 | 2 | (1) Offline test expected no message at all, but the tests' headless Chrome has no microphone, so a W_MIC_* warning correctly stays. Test fixed to check that W_NO_INTERNET clears. (2) Language switch failed 3/3. See Finding 4 |
| 2026-10-03 | T048 | language switch `--repeat-each=4` after the fix | 154 | 4 | 0 | Watchdog added in the recognizer runner |
| 2026-10-03 | T055 (red) | US3 unit (4 files), `npm run test:relay`, us3-link e2e | 154 | 0 | 4 files / 1 file / 4 | Expected: link, protocol, throttle, hub and relay code don't exist yet |
| 2026-10-03 | T066 | US3 unit tests | n/a | 25 | 0 | link-session (fixed vectors), protocol, throttle, hub-logic |
| 2026-10-03 | T066 | `npm run test:relay` | n/a | 9 | 0 | Local `wrangler dev`. Close events take about 10 s locally (status frames arrive at once; pages react to status, not close) |
| 2026-10-03 | T066 | us3-link e2e `--retries=0` | 154 | 4 | 0 | Agent words on a Pixel 7-sized page within 3 s; no customer text leaks; Stop and page close end the link; relay down still leaves captions working |
| 2026-10-03 | T068, T083 | polish + layout `--retries=0` | 154 | 6 | 0 | Guide sections; 22/24 px; no horizontal scroll at 640 / 390 px; contrast ≥ 4.5:1 in light and dark |
| 2026-10-03 | T070 | visibility `--retries=0` | 154 | 0 | 1 | The page stays "visible" under Playwright even when minimised (Finding 5). Marked fixme; moved to the manual checklist |
| 2026-10-03 | T071 | us1-system-audio with `--system-audio-capture-default-checked` only | 154 | 0 | 2 | The dash spelling doesn't tick the box |
| 2026-10-03 | T071 | us1-system-audio with `--system-audio-capture-default_checked` only | 154 | 2 | 0 | The underscore spelling works; it is the only one kept |
| 2026-10-03 | T072 | `npm run test:unit` | n/a | 84 | 0 | All unit tests |
| 2026-10-03 | T072 | `npm run test:relay` | n/a | 9 | 0 | All relay tests |
| 2026-10-03 | T072 | `npx playwright test --retries=0` (all e2e) | 154 | 30 | 0 | Plus 2 skipped: soak (needs SOAK_MINUTES) and visibility (fixme) |
| 2026-10-03 | T073 | `npx wrangler deploy --dry-run` | n/a | ok | - | Worker bundles: env.HUB (Durable Object) and env.ASSETS. Only `web/` is published (25 files). Nothing was uploaded |
| 2026-10-03 | T069 | `SOAK_MINUTES=10` soak | 154 | 9 rounds | 1 | At about 3 min a replay produced no new final line. See Finding 6 |
| 2026-10-03 | T069 | 8-minute diagnostic soak with event log (before fix) | 154 | 23 rounds | 1 | Stalled at round 24: the session sent no results for new audio, with no error and no `end` |
| 2026-10-03 | T069 | `node --test` stall-watch | n/a | 6 | 0 | New `core/stall-watch.js` |
| 2026-10-03 | T069 | 8-minute diagnostic soak (after fix) | 154 | 26 rounds | 0 | All rounds produced finals; the stall watch restarted a silent session 2 times |
| 2026-10-03 | T069 | full regression: unit / relay / e2e | 154 | 90 / 9 / 30 | 0 | e2e also had 2 skipped (soak opt-in, visibility fixme) |
| 2026-10-03 | T084 (red) | echo-filter + transcript unit; echo.spec | 154 | 10 | 2 / 1 | Expected: the filter doesn't exist yet. One Agent echo line was visible |
| 2026-10-03 | T084 | `npm run test:unit` | n/a | 99 | 0 | Adds echo-filter (8 tests) and markEcho |
| 2026-10-03 | T084 | `npx playwright test --retries=0` (all e2e) | 154 | 31 | 0 | Plus 2 skipped. echo.spec: same clip in mic and call gives Customer lines only, Agent echo hidden, nothing on the customer link |
| 2026-10-03 | T085 | loudness/speed matrix, before AGC (20 runs) | 154 | - | - | Normal and loud 100%. Urdu soft/very soft/fast 100% (customer); agent ur-soft 93% (split). English soft 50% / 28% (agent), very soft 72% / 44%, fast 39%. See Finding 7 |
| 2026-10-03 | T085 | soft English with a manual boost | 154 | - | - | en-soft 50% → 94% at ×10; en-vsoft 50% → 78-83% at ×40 |
| 2026-10-03 | T085 (red) | agc unit; loudness.spec | 154 | 2 | 1 file / 3 | Expected: the AGC doesn't exist yet. en-soft below 85% |
| 2026-10-03 | T085 | loudness/speed matrix, after AGC (20 runs) | 154 | - | - | English soft 94% / 100% (agent), very soft 100% / 100%; all Urdu 100%; loud 100%; fast English still 39% (Finding 8) |
| 2026-10-03 | T085 | sped-up natural English ×1.1 / ×1.2 / ×1.25, en-US vs en-IN | 154 | - | - | ×1.1: 72-78%. ×1.2: 39% (cut after "2018"). ×1.25: 50%. Same for en-IN. Urdu 100% at every speed |
| 2026-10-03 | T085 | quicker stall trigger (1.2 s) tried | 154 | - | - | Made things worse (agent en-x110 22%), so it was removed |
| 2026-10-03 | T085 | final: unit / relay / e2e | 154 | 107 / 9 / 36 | 0 | Plus 2 skipped. us1-system-audio passes without the test boost (AGC raises the quiet clip). The old `testGain=30` plus the AGC limiter had distorted it ("Badri ki") |
| 2026-10-03 | T086-T088 (red) | record, transcript.clear and messages unit; us4-save-clear e2e | 154 | 15 / 0 | 5 / 3 | Expected: record.js, clear(), I_CHAT_SAVED and the buttons don't exist yet |
| 2026-10-03 | T092 | us4-save-clear + us1-tab + foundation `--retries=0` | 154 | 13 | 0 | Save downloads `call-YYYY-MM-DD_HH-MM.txt` with every line; New call empties; the unsaved dialog's Cancel / Don't save / Save and continue all work; Start after "Save and continue" still opens the share window |
| 2026-10-03 | T092 | full: unit / relay / e2e | 154 | 113 / 9 / 39 | 0 | Plus 2 skipped (soak opt-in, visibility fixme) |

## Findings

1. **Urdu results turn final only when the session ends (Chrome 154).**
   - A diagnostic run logged recognition events for the same clip through tab capture:
     - English: final at 10.4 s, about 1.4 s after speech ended.
     - Urdu: in progress until `speechend`/`end` at 23.3 s, about 14 s after speech ended.
   - Calling `stop()` 2.5 s after the Urdu clip ended returned the full Urdu final in about 0.2 s.
   - **Fix**: added `web/js/core/pause-finalizer.js`. After 1.5 s of quiet with an in-progress line still open, the lane calls `stop()` and restarts at once. If Chrome sends a final by itself (English), the request is cancelled.
2. **`start` fires before Chrome reaches the speech service.**
   - Emulated offline didn't stop Chrome's speech traffic, so a restart fired `start` and cleared the pause while the browser was still offline. On a real outage, the status would flicker between Paused and Listening.
   - **Fix**: lane-policy only clears a pause on `healthy`, sent on the first result or after 3 s without an error. While offline, nothing clears the pause.
3. **Recognized text vs the clip.**
   - The Urdu clip was recognized as "… ٹویوٹا کارولا …" (in progress) and "… کرولا …" (final). Karachi (کراچی) was exact.
   - English final: "hello I want the price of a 2018 Toyota Corolla how many days will Shipping to Karachi take".

4. **Chrome may not fire `end` after `abort()` if the session hasn't fired `start` yet.**
   - A language change right after Start left the customer side stuck with no text.
   - **Fix**: a 1.5 s watchdog in `recognizer.js`. If `end` never arrives after an intended
     abort or stop, the runner replaces the session itself.
5. **The hidden-page behaviour can't be measured under Playwright.**
   - Pages open as separate windows, and even a minimised window reports `visible`, also with
     Playwright's backgrounding switches removed.
   - Moved to the manual real-call checklist (quickstart §5A step 10).

6. **Chrome sessions can go quiet without telling anyone (long calls).**
   - In long runs, a session sometimes stopped sending results while call audio kept arriving,
     with no error and no `end`. The 10-minute soak failed at about 3 minutes; the diagnostic
     failed at about 7 minutes.
   - Some `stop()` calls also ended a session without a final for its in-progress text.
   - **Fixes**:
     - `core/stall-watch.js`: 3 s of sound with no result triggers a fresh session, with an 8 s
       cooldown.
     - The runner turns a session's unfinished in-progress text into a final line when that
       session ends.
   - **Result**: the 8-minute diagnostic soak then passed 26/26 rounds.
   - The official 10-minute soak is re-run after the owner's real-call session (it plays clips in
     a background browser).

7. **Soft speech was missed (English) because nothing raised its level.**
   - Chrome's English recognition dropped words at low levels: soft (-41 dB mean) gave 50%, very
     soft (-53 dB) 72%. Urdu was unaffected.
   - **Fix**: `core/agc.js`, an automatic gain on the recognition path only, plus a limiter. It
     holds its gain in silence, uses an adaptive noise floor, and has a speech check that now drives
     the pause, stall and echo logic.
   - **Result**: soft English is now 94-100% on both sides, and the system-audio tests pass with no
     test boost.
8. **Fast English loses words (Google limit, not our code).**
   - For English sped up to about 1.2× or more, Chrome's service stops sending results mid-sentence,
     typically after "2018", and the final keeps only that part.
   - Results were the same with en-IN, and a quicker restart only made it worse.
   - Urdu is 100% at 1.1-1.35×, and normal-speed natural English is 100%.
   - Chrome reports on-device recognition as "downloadable" for en-US and "unavailable" for ur-PK.
     That is a possible future option for English, still to be tested.
   - **Check with the owner**: how natural fast English sounds on a real call.

## Manual checks

| Date | Task | Call type | Tester | Result | Notes |
|---|---|---|---|---|---|
| (pending) | T042 | WhatsApp Web (quickstart §5A steps 1-5) | Owner + Claude | not run yet | Needs a real WhatsApp call |
| 2026-10-03 | T076 (first try) | WhatsApp Web, sharing the WhatsApp tab | Owner's team | FAIL (partial) | Agent lines appeared. No Customer lines, although the customer was heard in the call. Suspected cause: the call audio plays from a different tab or window than the one shared. Advised: check the Call sound meter, then retry with Entire screen + "Also share system audio" |
| 2026-10-03 | T076 (second try) | WhatsApp, Entire screen + system audio | Owner's team | PARTIAL | Customer lines now appear. The customer's words also appear as Agent lines: echo from the laptop speakers into the built-in mic. No headset is connected; the laptop has only Speakers + Microphone. The mic now asks for `echoCancellation: "all"`, but Chrome 154 on Windows only offers `true`/`false`/`"remote-only"`. Fix: use a headset; re-test |
| 2026-10-03 | T076 (third try) | WhatsApp, one person playing both agent and customer, hands-free on both devices | Owner's team | INVALID SET-UP | The agent's own phrases ("how can you help you today", "listen to me sir") appeared as Customer lines. Cause: one speaker sits near both microphones, so the phone's mic sends the agent's voice through the call back to the laptop. The echo filter then hid the matching Agent copy. Checked: Windows "Listen to this device" is off for both microphones, so the laptop isn't playing the mic out. Not a code fault. Re-test with the customer phone held by another person in another room |
