# Live Call Text

Live text of laptop calls for call-center agents, in **Urdu or English**, at zero running cost.

While an agent calls a customer from a laptop (WhatsApp Web in Chrome, the WhatsApp Desktop app, or
an installed VoIP dialer), the customer's words appear as live text. The agent's own words are shown
too, and an optional customer link shows the agent's words on the customer's phone.

## How it works

- **Speech to text**: Chrome's built-in Web Speech API (`SpeechRecognition.start(audioTrack)`, Chrome 133+).
  No API keys and no paid service.
- **Call audio**: Chrome's share window. Pick a **tab** for WhatsApp Web, or **Entire screen + "Also share
  system audio"** for WhatsApp Desktop or a dialer. The agent keeps hearing the call.
- **Agent words**: the microphone, with an echo filter so the customer's voice from the speakers is not
  shown twice.
- **Customer link** (optional): a small relay on Cloudflare Workers Free (one Durable Object, WebSocket
  Hibernation). It only passes text along and stores nothing.
- **Save chat / New call**: each call starts on a clean page; the agent can save the call's text as a
  `.txt` file on the laptop.
- Plain HTML, CSS and JavaScript. The pages have no build step.

## Requirements

- Windows laptop with Google Chrome 133 or newer, a headset and internet.
- Node.js 24 (developers only).

## Run locally

```powershell
npm install
npm run dev        # pages + relay on http://localhost:8787
```

Open http://localhost:8787 in Chrome. The agent guide (Roman Urdu) is at `/guide.html`.

## Tests

```powershell
npm run test:unit    # node:test, pure logic
npm run test:relay   # relay integration (wrangler dev)
npm run test:e2e     # Playwright with the installed Chrome and recorded audio
npm test             # all of the above
```

## Deploy

```powershell
npm run deploy       # wrangler deploy (needs a free Cloudflare account)
```

## Project layout

```text
web/            agent page (index.html), customer page (v.html), guide (guide.html)
web/js/core/    pure logic, unit-tested
web/js/browser/ thin adapters over browser APIs
relay/src/      Cloudflare Worker + hub Durable Object
tests/          unit, relay, e2e, fixtures
specs/          spec, plan, research, data model, contracts, tasks (Spec-Driven Development)
```

## Known limits

- Speech is sent to Google through Chrome to be turned into text.
- Very fast English can lose some words (a limit of the speech service). Urdu is fine.
- Real-call checks on each call type are still pending before release
  (see `specs/001-live-call-text/quickstart.md`).
