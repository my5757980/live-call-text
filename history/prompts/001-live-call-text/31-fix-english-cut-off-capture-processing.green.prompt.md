---
id: 31
title: Fix English cut-off from capture processing
stage: green
date: 2026-11-13
surface: agent
model: claude-fable-5-2
feature: 001-live-call-text
branch: main
user: Muhammad Yaseen
command: none (free-form request, then "continue")
labels: ["english-cut-off","getDisplayMedia","echoCancellation","root-cause","chrome-157","unfinished"]
links:
  spec: specs/001-live-call-text/spec.md
  ticket: null
  adr: null
  pr: https://github.com/my5757980/live-call-text
files:
 - web/js/browser/capture.js
 - tests/e2e/us1-tab.spec.js
 - specs/001-live-call-text/test-log.md
 - history/prompts/001-live-call-text/31-fix-english-cut-off-capture-processing.green.prompt.md
tests:
 - temporary chunk-level checks of the captured track (default vs unprocessed), 14 runs
 - us1-tab + loudness + us2-agent-mic + us1-system-audio --retries=0 → 13 passed, 1 failed (system-audio English)
---

## Prompt

haaa shuruu karoo jo jo maslayy haii fix karoo project 1oo% complete karoooo

(The session was interrupted twice; the user sent "continue" each time.)

continue

## Response snapshot

- **Root cause of the English cut-off (Finding 9)**: Chrome applies its own call processing to the captured call audio. The captured track reports `echoCancellation`, `noiseSuppression` and `autoGainControl` as `true`, and 10 ms pieces of sound go missing (5 to 250 per 9 s). Runs with many missing pieces lose English words; Urdu tolerates it. The agent lane (microphone path) never froze, which ruled out Google's English service as the cause.
- **Proof**: with the three settings `false`, 0 pieces were missing in 4 of 4 runs and the soft English clip gave 78-100%, against 28% four times with the default.
- **Fix**: `web/js/browser/capture.js` now asks for unprocessed call audio. `tests/e2e/us1-tab.spec.js` asserts the three settings are `false`.
- **Result**: the three tests that failed on 2026-11-12 pass. One new failure appeared in the same run: us1-system-audio English (quiet clip through the speakers). Urdu passed there. Not yet checked whether it is a one-off or caused by switching Chrome's own gain off.
- Earlier ideas (a replay buffer, a text-progress stall check) were measured and set aside once the real cause was found.
- Stopped here because the usage limit was reached.

## Outcome

- ✅ Impact: The main cause of English text being cut is found and fixed for the tab path.
- 🧪 Tests: 13 passed, 1 failed (system-audio English, open)
- 📁 Files: capture.js, us1-tab.spec.js, test-log.md, this PHR
- 🔁 Next prompts: check the system-audio English failure (repeat the test; if it is the gain, keep Chrome's gain on or raise the page's own gain limit); run the full suite; then the other listed problems (echo filter, pause check on noisy lines, microphone removed mid-call, privacy wording, link and relay fixes, guide, housekeeping)
- 🧠 Reflection: Comparing the two lanes on the same clip, then reading the track chunk by chunk, found the cause. The first theories (Google's service, a stall check) were wrong.

## Evaluation notes (flywheel)

- Failure modes observed: system-audio English test failed once after the change; cause unknown.
- Graders run and results (PASS/FAIL): targeted e2e 13 PASS, 1 FAIL
- Prompt variant (if applicable): none
- Next experiment (smallest change to try): Run us1-system-audio English 4 times with and without `autoGainControl: false`.
