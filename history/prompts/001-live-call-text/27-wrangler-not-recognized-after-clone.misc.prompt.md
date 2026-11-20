---
id: 27
title: Wrangler not recognized after clone
stage: misc
date: 2026-10-03
surface: agent
model: claude-opus-5-5
feature: 001-live-call-text
branch: main
user: Muhammad Yaseen
command: none (free-form question)
labels: ["setup","npm-install","wrangler","clone","roman-urdu"]
links:
  spec: specs/001-live-call-text/spec.md
  ticket: null
  adr: null
  pr: https://github.com/my5757980/live-call-text
files:
 - history/prompts/001-live-call-text/27-wrangler-not-recognized-after-clone.misc.prompt.md
tests:
 - none
---

## Prompt

manyy sir ko ya project repo diee haii kayy wo repo clone karayy apnayy pass test karayyy link merayy pass sahi chal rahaa un kayy error a raha haiii kue ya error a raha hai un kay pass  

```
> live-call-text@0.1.0 dev
> wrangler dev --port 8787

'wrangler' is not recognized as an internal or external command,
operable program or batch file.
```

## Response snapshot

- **Cause**: `node_modules/` is gitignored, so a fresh clone has no local Wrangler. `npm run dev` was run without `npm install` first.
- **Fix**: in the cloned folder, run `npm install`, then `npm run dev`, then open http://localhost:8787 in Chrome.
- **Node**: Node.js 24 is needed (`node -v`).
- **Alternative**: deploying to Cloudflare Free (with approval) would give Sir a plain link with nothing to install.

## Outcome

- ✅ Impact: Sir can run the cloned project.
- 🧪 Tests: none
- 📁 Files: this PHR only
- 🔁 Next prompts: Sir runs npm install; optionally approve the deploy
- 🧠 Reflection: The README already lists `npm install` first; the error is a missed setup step, not a code bug.

## Evaluation notes (flywheel)

- Failure modes observed: none
- Graders run and results (PASS/FAIL): none
- Prompt variant (if applicable): none
- Next experiment (smallest change to try): none
