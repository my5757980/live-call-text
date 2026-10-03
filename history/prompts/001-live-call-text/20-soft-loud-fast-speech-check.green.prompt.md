---
id: 20
title: Soft, loud and fast speech check
stage: green
date: 2026-10-03
surface: agent
model: claude-opus-5-5
feature: 001-live-call-text
branch: 001-live-call-text (no git repo)
user: Muhammad Yaseen
command: none (free-form request, then "continue")
labels: ["agc","loudness","fast-speech","reliability","tdd","measurement"]
links:
  spec: specs/001-live-call-text/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - web/js/core/agc.js
 - web/js/browser/audio-graph.js
 - web/js/agent.js
 - web/js/core/stall-watch.js (quick trigger tried, then removed)
 - web/js/browser/recognizer.js (localhost-only result logging)
 - tests/unit/agc.test.js
 - tests/unit/stall-watch.test.js
 - tests/e2e/loudness.spec.js
 - tests/e2e/us1-system-audio.spec.js (no test boost; AGC does it)
 - tests/fixtures/audio/ (soft, vsoft, loud, fast, twice clips + README)
 - specs/001-live-call-text/test-log.md (Findings 7-8)
 - specs/001-live-call-text/research.md
 - specs/001-live-call-text/spec.md (assumption on fast English)
 - specs/001-live-call-text/tasks.md (T085)
 - specs/001-live-call-text/plan.md
tests:
 - npm run test:unit → 107 passed
 - npm run test:relay → 9 passed
 - npx playwright test --retries=0 → 36 passed, 2 skipped
 - loudness/speed matrices (20 runs, before and after the AGC), speed sweep, en-US vs en-IN, on-device probe
---

## Prompt

achaa aik bar aik cheez or dekh loo deeplyy bikul smooth chalnaa chiyaaaaa agr halka bolayy ya tez sab text achii tarhaaaa anaa chiyaa bikul right kuch miss nahiiii kuch tootna nahii chiyaaa ya dono taraf agent customer donoooo dekhoo deeplyyy confirm karoooooo

(The owner interrupted one long tool run, then said "continue".)

## Response snapshot

- **Measured** both sides × Urdu/English × normal/loud/fast/soft/very soft:
  - Normal and loud speech: 100%.
  - Urdu: 100% almost everywhere.
  - English soft: 50% (customer) and 28% (agent). English fast: 39%.
- **Proved** that a boost fixes soft English (50% → 94%).
- **Built test-first** an AGC (`core/agc.js`) plus a limiter on the recognition path, with an adaptive speech check that now drives the pause, stall and echo logic.
- **Re-measured**:
  - Soft and very soft English is now 94-100% on both sides; all Urdu 100%; loud 100%.
- **Traced fast English**: Chrome's service stops mid-sentence when English is about 1.2× or faster.
  - en-IN gave the same result.
  - A quicker stall restart made it worse, so it was removed.
  - On-device recognition is downloadable for en-US only.
  - Documented as a known limit: Urdu is unaffected; English needs a real-call check.
- **Fixed** the system-audio tests: the old test boost plus the AGC limiter distorted the clip, so the boost was dropped and the AGC handles it.
- **Final run**: unit 107, relay 9, e2e 36 (+2 skipped).

## Outcome

- ✅ Impact: Soft speakers are now captured reliably on both sides. The fast-English limit is measured and documented honestly.
- 🧪 Tests: 107 / 9 / 36 passing; loudness test added
- 📁 Files: see the list above
- 🔁 Next prompts: the owner's real-call test with two people; decide whether to try on-device English for fast speakers
- 🧠 Reflection: Measuring before and after mattered. The quicker stall trigger looked right but measured worse, and was removed.

## Evaluation notes (flywheel)

- Failure modes observed: soft-speech misses (fixed); fast-English cut-off (Google limit); test-boost overload with the AGC (fixed)
- Graders run and results (PASS/FAIL): all suites PASS
- Prompt variant (if applicable): none
- Next experiment (smallest change to try): Try on-device en-US recognition for fast English speakers (needs the owner's OK to download the model).
