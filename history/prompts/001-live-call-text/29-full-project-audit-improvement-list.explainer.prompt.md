---
id: 29
title: Full project audit and improvement list
stage: explainer
date: 2026-11-12
surface: agent
model: claude-fable-5-2
feature: 001-live-call-text
branch: main
user: Muhammad Yaseen
command: none (free-form request)
labels: ["audit","review","improvements","e2e","chrome-157","english-cut-off","roman-urdu"]
links:
  spec: specs/001-live-call-text/spec.md
  ticket: null
  adr: null
  pr: https://github.com/my5757980/live-call-text
files:
 - specs/001-live-call-text/test-log.md (runs of 2026-11-12, Finding 9)
 - history/prompts/001-live-call-text/29-full-project-audit-improvement-list.explainer.prompt.md
tests:
 - npm run test:unit → 113 passed, 0 failed (Node v26.13.0)
 - npm run test:relay → 9 passed, 0 failed
 - npx playwright test --retries=0 → 36 passed, 3 failed, 2 skipped (Chrome 157.0.8103.51)
 - temporary diagnostics, 22 runs → English Customer line cut in 11; raw-track recognizer cut in 5 of 6
 - read-only checks of core modules → echo filter, pause finalizer, speech check, relay rate limit
 - npm audit → 4 high advisories in undici (dev tools only)
---

## Prompt

claude is project ko jo tumharayyy root mayy haii is ko full deeplyy samjoo ya kis liaaa haiii word by word line by line full scan karooo kuch miss nahii phir full detail dayy doooo is mayy kia kia improve karnayy walaaa haii miss haiii taakay hum is ko 1oo% perfect banayaaaaaaa

(The session ran long. The user then sent "continue" twice.)

continue
continue

## Response snapshot

Read every tracked file (code, tests, specs, contracts, history) and ran the tests. No product code was changed.

- **State today**: unit 113/113 and relay 9/9 pass. The e2e suite, 39/39 on Chrome 154, is 36 passed and 3 failed on Chrome 157. All three failures are English Customer lines that stop mid-sentence.
- **Diagnosis** (22 runs with the event log):
  - English was cut in 11 runs; Urdu was fine.
  - A plain recognizer on the raw captured track was cut in 5 of 6 runs, so the cause is in Chrome or Google's service, not in the page's audio path.
  - The stall watch fired once in 22 runs and did not bring the text back.
- **Release blockers**: the English cut-off; no real call has passed yet; the WhatsApp Web tab path is in doubt (news reports say calls open in a separate window, which matches the first failed real call); not deployed; the 60-minute call and the agent trial are pending; 20 agents at once on Google's free service is untested.
- **Problems found in the code** (each confirmed by reading or by a small run):
  1. The echo filter hides an agent who repeats the customer within about 4 s, with or without a headset.
  2. When the speech check misses a speaker over background noise, the pause finalizer stops the session again and again (34 stops in 10 s in a simulation).
  3. Behaviour with the page hidden or covered is untested; the level checks run on timers.
  4. A microphone that goes away mid-call shows no message.
  5. A silent speech-service failure shows no message.
  6. Restart gaps can clip a first word; in silence there is a 250 ms gap about every 8 s.
  7. A failed link copy shows no message, and a link down for over 60 s can't be made again in that call.
  8. After a reconnect, 15 of 20 queued lines are dropped by the relay's rate limit.
  9. Customer page: a malformed link stays on "Connecting...", a new link in the same tab isn't picked up, and nothing keeps the phone screen awake.
  10. "Nothing is recorded" is shown although Save chat keeps the customer's words as text.
  11. The screen video is captured and never used.
  12. Relay hardening: no Origin check, no security headers, and the 4-hour limit isn't checked when a viewer joins.
- **Feature ideas** (need the owner's OK and a spec change): an always-on-top caption window, a microphone picker, auto-save with a customer name, an Auto language mode and more languages, a text-size control, guide pictures, a diagnostics button with a version number, and an installable app window.
- **Housekeeping**: stale lines in spec, tasks and checklist; PHRs 26-28 uncommitted; no license or CI; outdated dev tools; missing unit tests for the recognizer runner and the link clients; no ADRs.
- **Recommended order**: the English cut-off first, then the small fixes (1, 2, 4, 5, 10), then the real-call tests, then deploy, then features.

## Outcome

- ✅ Impact: The owner has a full, prioritised list of what blocks "100%", with today's measured test state.
- 🧪 Tests: unit 113/113, relay 9/9, e2e 36 passed / 3 failed / 2 skipped on Chrome 157; 22 diagnostic runs
- 📁 Files: test-log.md (today's runs and Finding 9), this PHR
- 🔁 Next prompts: the owner picks where to start; recommended first step is measuring the English cut-off (sessions at once, network, on-device English)
- 🧠 Reflection: Re-running the suite on today's Chrome found the most important problem. Reading the code alone would have reported the project as green.

## Evaluation notes (flywheel)

- Failure modes observed: English recognition stops mid-sentence on Chrome 157 (also on a plain recognizer); the stall watch misses it.
- Graders run and results (PASS/FAIL): unit PASS, relay PASS, e2e FAIL (3 of 39)
- Prompt variant (if applicable): none
- Next experiment (smallest change to try): Run the English clip 20 times each with 1, 2 and 3 recognition sessions at once, and once with on-device en-US, to see what drives the cut-off.
