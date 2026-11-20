---
id: 35
title: LinkedIn post and demo video
stage: misc
date: 2026-11-20
surface: agent
model: claude-opus-5-5
feature: 001-live-call-text
branch: main
user: Muhammad Yaseen
command: none (free-form request)
labels: ["linkedin","demo-video","marketing","ffmpeg","playwright"]
links:
  spec: specs/001-live-call-text/spec.md
  ticket: null
  adr: null
  pr: https://github.com/my5757980/live-call-text
files:
 - E:\New folder\live-call-text-linkedin\linkedin-post.txt (outside the repo)
 - E:\New folder\live-call-text-linkedin\live-call-text-demo.mp4 (outside the repo)
 - E:\New folder\live-call-text-linkedin\cover.jpg (outside the repo)
 - history/prompts/001-live-call-text/35-linkedin-post-and-demo-video.misc.prompt.md
tests:
 - demo take: all four spoken lines written correctly (customer Urdu, agent English, customer English, agent English); both agent lines reached the phone page; the phone showed "Call ended" after Stop
---

## Prompt

achaa ab bat sunoo mujayy ya project linked par dalnaa hai share karnahaiii ok text professional text kia banaya hai kis liaaa haiiii or videoooo show live kia kasayy work kartaa haiii dono readyy kar doo takayy mayyy share kar sakuuuuuu

## Response snapshot

- **Post**: a professional English LinkedIn post covering:
  - the problem (agents miss words on bad lines);
  - what the app does;
  - zero running cost and privacy;
  - the stack and the tests;
  - the echo-cancellation finding;
  - next step: real-call pilots;
  - the repo link and hashtags.

  It says the demo uses recorded voices and claims nothing beyond the tested results.
- **Video**: a 1920×1080 demo of the real app (not a mock-up):
  - The agent page (left) and the customer's phone page (right) were recorded frame by frame with Playwright/CDP while the app ran.
  - The customer's voices played into the stand-in WhatsApp tab and the agent's into the microphone: the customer's Urdu clip, then Windows voices for the agent's English lines and the customer's English line.
  - Step captions, click rings, and title and closing cards were rendered from an HTML stage and composited with ffmpeg; the voices were mixed in at their measured start times; a 7 s wait was cut.
- **Agent line**: the first candidate lines lost the words after "2018" in Google's recognition, so a line without "2018" was chosen after testing six candidates.
- **Build fixes**:
  - an odd video width (331 px) broke the H.264 encode;
  - the first composite ran out of memory on the 4 GB laptop, so the build was made lighter: one small caption track, a yuv420 overlay chain, 2 threads;
  - Chrome sends screencast frames slightly out of order, which put the laptop and phone views up to about 4 s apart; frames are now sorted by capture time;
  - the phone's "Call ended" frame never arrived in the recording (the page did show it: the take's check passed), so that state was rendered with the real customer page and added at 84 s;
  - the video was converted to the standard TV colour range.
- **Outputs**: in `E:\New folder\live-call-text-linkedin\`, outside the repo. Nothing was posted: the owner shares it.

## Outcome

- ✅ Impact: The owner has a ready LinkedIn post, a demo video and a cover image.
- 🧪 Tests: demo take checks (all lines correct)
- 📁 Files: the three output files, this PHR
- 🔁 Next prompts: the owner posts on LinkedIn; real-call tests; deploy
- 🧠 Reflection: Recording the real app gives an honest demo. The low-memory laptop needed a lighter ffmpeg pipeline.

## Evaluation notes (flywheel)

- Failure modes observed:
  - live frame forwarding through CDP congested the session (the first take ran 3 minutes at about 1 fps);
  - ffmpeg failed on an odd width;
  - the full-frame overlays used 1.3 GB of memory.
- Graders run and results (PASS/FAIL): none
- Prompt variant (if applicable): none
- Next experiment (smallest change to try): none
