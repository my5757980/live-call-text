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
| 2026-11-12 | review | `npm run test:unit` | n/a | 113 | 0 | Node v26.13.0. No code changed since 2026-10-03 |
| 2026-11-12 | review | `npm run test:relay` | n/a | 9 | 0 | Wrangler 4.147.0 |
| 2026-11-12 | review | `npx playwright test --retries=0` (all e2e) | 157 | 36 | 3 | Chrome 157.0.8103.51, plus 2 skipped. Failed: loudness customer en-soft (28%, text stopped at "hello I want the price"); loudness customer en-loud (44%, stopped at "hello I want to price of a 2018"); us2-agent-mic (the English Customer line stopped at "I want the price of"). See Finding 9 |
| 2026-11-12 | review | temporary diagnostics with the event log, 22 runs (script not in the repo) | 157 | - | - | The English Customer line was cut mid-sentence in 11 of 22 runs. A plain recognizer on the raw captured track was cut in 5 of 6. Urdu Agent lane 100% in both runs that used it. See Finding 9 |
| 2026-11-13 | Finding 9 | chunk-level check of the captured tab track (temporary script), default capture | 157 | - | - | Chrome reports `echoCancellation`, `noiseSuppression` and `autoGainControl` all `true` on the captured call audio. 5 to 250 pieces of 10 ms were missing per 9 s. Runs with 34 or more missing pieces were cut (17-39%); runs with 5-6 were fine (94%) |
| 2026-11-13 | Finding 9 | same check with the three settings `false` | 157 | - | - | 0 missing pieces in 4 of 4 runs; English soft clip 78%, 100%, 100%, 100% (default in the same session: 28% four times) |
| 2026-11-13 | Finding 9 (red) | us1-tab now asserts the three settings are `false` | 157 | - | - | Red state seen in the check above: the default capture reports `true` for all three |
| 2026-11-13 | Finding 9 fix | us1-tab, loudness, us2-agent-mic, us1-system-audio `--retries=0` | 157 | 13 | 1 | The 3 tests that failed on 2026-11-12 pass. New failure: us1-system-audio English (quiet clip through the speakers) showed no Corolla/Karachi line within 15 s; Urdu passed. Not yet known whether this is a one-off or caused by switching Chrome's own gain off. Resolved below |
| 2026-11-14 | Finding 9 | which setting drops the pieces (temporary script; each setting alone, 3 runs each) | 157 | - | - | Only echo cancellation: 2 of 3 runs lost 45 and 57 pieces and were cut (28%). Noise suppression alone and gain alone: 0 pieces lost, 94-100% |
| 2026-11-14 | Finding 9 | system audio, quiet clip, processing off vs on, 3 runs each | 157 | - | - | 100% in all 6 runs. Without Chrome's gain the raw clip peaks at RMS 0.006 (with it 0.16); the page's own gain makes up for it |
| 2026-11-14 | Finding 9 | `us1-system-audio --repeat-each=3` | 157 | 6 | 0 | The 2026-11-13 failure did not come back |
| 2026-11-14 | Finding 9 | `npx playwright test --retries=0` (all e2e) | 157 | 39 | 0 | Plus 2 skipped. Back to the Chrome 154 result |
| 2026-11-16 | T094-T103 (red) | new unit tests | n/a | 105 | 20 | Expected: echo overlap, pause text rule, lane back-off, stall text, link retry and queue, viewer close, sid reader, hub checks don't exist yet |
| 2026-11-16 | T103 (red) | `npm run test:relay` with the new tests, old code | n/a | 10 | 3 | Expected: other websites allowed, a viewer that sends stays open (the test waited 20 s), no security headers |
| 2026-11-16 | T094-T101 (red) | new e2e tests, old code | 157 | 0 | 5 | Expected: repeat-back hidden as echo; no W_MIC_MISSING when the mic goes away; damaged link stuck on "connecting"; no W_LINK_COPY_FAILED; a new link in the same tab stayed "invalid" |
| 2026-11-16 | T093-T103 | unit / relay / e2e | 157 | 173 / 13 / 44 | 0 | e2e plus 2 skipped (soak opt-in, visibility fixme) |
| 2026-11-16 | T104 | shared screen picture: left alone vs stopped vs 1 frame a second (temporary script, 2 runs each, Chrome's CPU over 20 s) | 157 | - | - | Left alone 57% and 63% of one core; stopped 69% and 53%; 1 frame a second 45% and 40%. Sound and captions fine in all six |
| 2026-11-20 | T104 (red) | us1-tab frame-rate check, old code | 157 | 0 | 1 | Expected: frame rate 30 |
| 2026-11-20 | T104 | us1-tab + us1-system-audio + us1-errors `--retries=0` | 157 | 11 | 0 | Closing the shared tab is still noticed within 2 s |
| 2026-11-20 | Finding 8 re-check | sped-up English (1.35×), customer tab headless, customer tab visible, agent microphone; 3 runs each | 157 | - | - | Customer 39/39/50% and 39/39/72%; microphone path 39/39/39%. The text stops after "2018" on every path, the microphone path included (no capture involved), so this limit is the speech service |
| 2026-11-20 | Finding 10 | agent page hidden behind another tab, real Chrome window over the DevTools protocol (temporary script), Urdu clip | 157 | - | - | Before: the page's 100 ms loop ran once a second (50 runs in 50 s). After T105: 500 runs in 50 s, median 100 ms, in 4 runs. The Urdu final came about 0.5 s sooner |
| 2026-11-20 | Finding 10 | same, one earlier run | 157 | - | - | Once, the status read "Stopped" at the end of a hidden run (the call had stopped by itself). Not seen in 3 later runs with a status log. Cause unknown; covered by real-call checklist step 10 |
| 2026-11-20 | T105 (red) | ticker and recognizer unit tests | n/a | 0 | 16 | Expected: no ticker; a new session waited for a timer |
| 2026-11-20 | T105 | `npm run test:unit` | n/a | 178 | 0 | One of the new tests first failed because the test itself skipped the 8 s of quiet it describes; the test was corrected |
| 2026-11-20 | T098 (red, then green) | stall-watch `stuck` tests, then `npm run test:unit` | n/a | 9 / 180 | 2 / 0 | Three fruitless restarts in a row now show W_SPEECH_SERVICE |
| 2026-11-20 | T107 | `SOAK_MINUTES=10 npx playwright test tests/e2e/soak.spec.js` | 157 | 1 | 0 | 11.3 min: every replay gave a new final Customer line and no warning appeared. The 2026-10-03 run had failed at about 3 min (Finding 6) |
| 2026-11-20 | T107 | `npm audit fix` | n/a | - | - | 4 high advisories (undici, inside the dev tools) fixed; Wrangler 4.147.0 → 4.165.0 within `^4.147.0`; `npm audit`: 0 vulnerabilities. Only `package-lock.json` changed |
| 2026-11-20 | T107 | unit / relay with the updated tools | n/a | 180 / 13 | 0 | |
| 2026-11-20 | T107 | `npx playwright test --retries=0` (all e2e, cut short when the session ended after 41 tests) | 157 | 40 | 1 | Failed: echo.spec "shown only as Customer": the page hid the echo, but 1 line reached the customer link. Then 2 of 4 repeats failed the same way. See Finding 12 |
| 2026-11-20 | Finding 12 | event log of 4 echo runs (temporary script) | 157 | - | - | Nothing was sent in those 4 runs, so the cause was worked out from the code (Finding 12) |
| 2026-11-20 | Finding 12 fix | `echo.spec.js --repeat-each=5` | 157 | 10 | 0 | Both echo tests. The repeat-back test now also checks the customer link: 3 of 3 |
| 2026-11-20 | T107 | `npx playwright test --retries=0` (all e2e) | 157 | 44 | 0 | Plus 2 skipped (soak opt-in, visibility fixme). Final run of this round: unit 180, relay 13, e2e 44, soak 10 min passed |

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
   - **Re-checked 2026-11-20** after the Finding 9 fix: the sped-up clip still stops after "2018"
     on every path, the microphone path included, which involves no capture at all. So this is
     the speech service with this clip. Normal-speed English is complete.

9. **English is cut mid-sentence on Chrome 157 (2026-11-12). Fixed 2026-11-13 (T093).**
   - **Cause**: Chrome applies echo cancellation to the captured call sound. On Chrome 157 it
     drops short pieces of that sound (10 ms each, up to 250 in 9 s). English recognition
     stops when enough pieces are missing; Urdu coped. The captured track reported
     `echoCancellation`, `noiseSuppression` and `autoGainControl` all `true`.
   - **Fix**: the call sound is captured with all three switched off (FR-043). Echo
     cancellation is meaningless for call sound anyway: it is the sound the laptop plays.
   - **Proof**: 0 missing pieces in every run since; soft English 78-100% against 28% before;
     the full e2e suite is back to 39/39, and later 44/44.
   - The notes below were written before the cause was known.
   - The e2e suite passed 39/39 on Chrome 154. With no code change, it now fails 3 tests on
     Chrome 157. All three are English Customer lines that stop mid-sentence while the call
     sound keeps arriving.
   - In 22 diagnostic runs, the English Customer line was cut in 11:
     - normal clip with a silent microphone: 100%, 100%; with no microphone: 83%, 89%
     - soft clip: 28%, 28%, 39%, 94%; soft clip with a fixed ×10 boost: 94%, 39%
     - loud clip: 78%, 94%
     - normal clip while the Agent lane heard Urdu: 89%, 17%
     - two sentences 1 s apart: 44%, 39%
   - The session shows no error and no `end`. Its text stops growing; in some runs result
     events keep arriving with the same text.
   - The stall watch fired in 1 of the 22 runs, and no text came back after it. It needs 3 s
     of unbroken speech with no result event; the clip's own pause resets that count, and
     result events with unchanged text count as progress.
   - A plain `SpeechRecognition` started on the raw captured track, next to the page's own
     lane, was cut in 5 of 6 runs. That path has no AGC, no limiter and no restarts by the
     page, so the cause is in Chrome or Google's speech service, or the network path to it.
     Ping to Google during the runs: 0% loss, 53 ms average.
   - Urdu was not affected: every Urdu e2e test passed.
   - Chrome 157 did not send the English final by itself within 1.5 s in any run; the pause
     finalizer ended each session. In silence a session ends with `no-speech` after about
     8 s and restarts 250 ms later.
   - Since then: the stall watch counts only changing text as progress (T098).

10. **A hidden agent page slowed the page's checks to once a second (Chrome 157, 2026-11-20).
    Fixed (T105).**
    - Agents keep the page behind WhatsApp or the dialer. Chrome then runs the page's own
      timers at most once a second. The 100 ms loop (pause check, stall watch, echo hold,
      gain) slowed ten-fold, and the stall watch could never fire, because its samples were
      more than its 1 s gap apart.
    - Chrome's "once a minute" throttling for pages hidden 5 minutes did not appear in a test
      with its wait shortened to 10 s, but the fix does not depend on that.
    - **Fix**: the loop and the gain tick from a dedicated worker (`browser/ticker.js`), whose
      timers keep their pace; a new recognition session starts right after the current task
      instead of on a timer.
    - **Proof**: 500 loop runs in 50 s while hidden (before: 50).

11. **The unused screen picture costs CPU (2026-11-16, T104).**
    - Sharing gives a 1280×720, 30 frames-a-second picture that the page never shows.
      Slowing it to 1 frame a second cut Chrome's CPU from about 60% to about 42% of one core;
      stopping it saved nothing. The sound is unaffected.

12. **An echo line could reach the customer link before it was seen as echo (2026-11-20).
    Fixed.**
    - The customer link held back the agent's words only while the customer was talking
      (and 1.5 s after). The tail of an echoed sentence can arrive later than that, for
      example in a new recognition session, before the customer's matching words: it was
      sent, and only then hidden on the agent page. The later finals (T095) made this more
      likely.
    - **Fix**: a line whose words were spoken while the customer was speaking (overlap of 30%
      or more, or customer speech within 4 s when there is too little agent speech to judge)
      counts as a possible echo. Its in-progress words are not sent, and its final line is
      checked again after 2 s, against everything the customer has said by then.

## Manual checks

| Date | Task | Call type | Tester | Result | Notes |
|---|---|---|---|---|---|
| (pending) | T042 | WhatsApp Web (quickstart §5A steps 1-5) | Owner + Claude | not run yet | Needs a real WhatsApp call |
| 2026-10-03 | T076 (first try) | WhatsApp Web, sharing the WhatsApp tab | Owner's team | FAIL (partial) | Agent lines appeared. No Customer lines, although the customer was heard in the call. Suspected cause: the call audio plays from a different tab or window than the one shared. Advised: check the Call sound meter, then retry with Entire screen + "Also share system audio" |
| 2026-10-03 | T076 (second try) | WhatsApp, Entire screen + system audio | Owner's team | PARTIAL | Customer lines now appear. The customer's words also appear as Agent lines: echo from the laptop speakers into the built-in mic. No headset is connected; the laptop has only Speakers + Microphone. The mic now asks for `echoCancellation: "all"`, but Chrome 154 on Windows only offers `true`/`false`/`"remote-only"`. Fix: use a headset; re-test |
| 2026-10-03 | T076 (third try) | WhatsApp, one person playing both agent and customer, hands-free on both devices | Owner's team | INVALID SET-UP | The agent's own phrases ("how can you help you today", "listen to me sir") appeared as Customer lines. Cause: one speaker sits near both microphones, so the phone's mic sends the agent's voice through the call back to the laptop. The echo filter then hid the matching Agent copy. Checked: Windows "Listen to this device" is off for both microphones, so the laptop isn't playing the mic out. Not a code fault. Re-test with the customer phone held by another person in another room |
