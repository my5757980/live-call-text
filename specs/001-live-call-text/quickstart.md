# Quickstart: Live Call Text

**Feature**: 001-live-call-text | **Date**: 2026-10-03

## 1. What you need

- A Windows laptop with an up-to-date Google Chrome, a headset and internet.
- Node.js 24, only for developers (not for agents).
- Optional, for a phone test: a phone on the same Wi-Fi, or the deployed site.

## 2. Set up (developer)

```powershell
npm install
```

This installs the two dev tools, `@playwright/test` and `wrangler`. No browser is downloaded; tests
use the installed Google Chrome.

## 3. Run it on this laptop

```powershell
npm run dev        # runs "wrangler dev": pages + relay on http://localhost:8787
```

- Agent page: http://localhost:8787/ (localhost counts as secure, so audio capture works).
- To check a customer link on a phone, run `npx wrangler dev --ip 0.0.0.0`. Then open
  `http://<laptop-LAN-IP>:8787/v.html#<sid>` on the phone. The customer page needs no secure context.

## 4. Automated tests

```powershell
npm run test:unit    # node:test; pure logic; no internet needed
npm run test:relay   # starts wrangler dev locally and drives the relay with WebSockets
npm run test:e2e     # Playwright + installed Chrome; needs internet (Google speech service)
```

Optional long-call check (a proxy for SC-004). Replays the clip every 20 s:

```powershell
$env:SOAK_MINUTES=10; npx playwright test tests/e2e/soak.spec.js
```

How the e2e run behaves:

- System-audio tests open a visible Chrome window and play a quiet clip through the laptop's
  speakers or headset. Keep other sounds off while they run.
- Expected result: every test passes. Any failure is reported exactly as it happened (Constitution
  VI).

## 5. Real-call checklists (VR-003, VR-004, SC-012)

Do one real call for each call type: two people, two devices, the agent wearing a headset. The
"customer" reads the 10 test sentences below. Record PASS or FAIL for each item, with notes, in the
results table at the end. A call type counts as working only when all its items pass.

### Test sentences (the "customer" reads them, 5 in English and 5 in Urdu)

English:
1. "Hello, I want to know the price of this car."
2. "How many days will shipping to Karachi take?"
3. "Can you send me the pictures on WhatsApp?"
4. "My budget is around two million rupees."
5. "Please call me back tomorrow at five o'clock."

Urdu:
1. السلام علیکم، مجھے اس گاڑی کی قیمت معلوم کرنی ہے۔ (Assalam o alaikum, mujhe is gaari ki qeemat maloom karni hai.)
2. کراچی تک گاڑی پہنچنے میں کتنے دن لگیں گے؟ (Karachi tak gaari pohanchne mein kitne din lagenge?)
3. مجھے واٹس ایپ پر تصویریں بھیج دیں۔ (Mujhe WhatsApp par tasveerein bhej dein.)
4. میرا بجٹ تقریباً بیس لاکھ روپے ہے۔ (Mera budget taqreeban bees lakh rupay hai.)
5. براہِ مہربانی کل پانچ بجے مجھے کال کریں۔ (Barah-e-meharbani kal paanch baje mujhe call karein.)

### A. WhatsApp Web (Chrome tab)

1. Open web.whatsapp.com in one Chrome window. Open Live Call Text in a second window and snap the
   two windows side by side.
2. Set Customer = English and Agent = Urdu. Press Start, pick the WhatsApp tab, keep "Also share tab
   audio" on, then Share. Time it: captions must be running in 15 s or less (SC-001).
3. Start a WhatsApp call with the "customer". The agent must hear the customer exactly as normal
   (FR-004).
4. The customer reads the English sentences. At least 9 of the 10 test sentences overall must be
   understandable from the text (SC-003). Words must appear in about 2 s (SC-002).
5. Switch Customer to Urdu during the call (FR-012). The customer reads the Urdu sentences. The text
   must be Urdu script, right-to-left.
6. The agent speaks. Check that "Agent" lines appear, and that customer words never appear as Agent
   lines (headset on).
7. Press Copy customer link, paste it into the chat, and open it on the customer's phone. The agent's
   words must appear on the phone within 3 s (SC-009). The status must show English and Urdu.
8. Press Stop. The phone must show "Call ended" within 5 s (FR-028). Opening the link again must show
   "not valid".
9. Turn Wi-Fi off for 30 s, then on again. Captions must continue by themselves within 5 s (SC-005).
10. Minimise the Live Call Text window for 30 s while the customer talks, then restore it. Note
    whether the customer's words from those 30 s appeared (research R11; this cannot be checked
    automatically).
11. After Stop, press **Save chat**. Open the file in Downloads and check that every line is there
    with time and speaker. Press **New call**: the conversation must be empty. Start a call, stop
    it without saving, and press Start: the page must ask "Save this call first?" (User Story 4).

### B. WhatsApp Desktop app

Same steps as A, with these changes:

- In step 1, use the WhatsApp Desktop app instead of the tab.
- In step 2, pick "Entire screen" and tick "Also share system audio".

Extra checks:

- Share without the tick. The fix message must appear within 3 s (FR-005).
- Play a YouTube video during the call. Its sound also becomes text, which is expected (edge case).
  Stop the video afterwards.

### C. The owner's VoIP dialer (on the laptop where it is installed)

Same as B, with the dialer instead of WhatsApp Desktop. Before you start, set the headset as the
laptop's default sound device in Windows Sound settings. If no sound arrives, the 20-second hint must
appear (FR-008).

### D. Long-call check (once, any call type)

Leave a call running for 60 minutes with occasional speech. Captions must still work at the end, with
no agent action (SC-004).

### Results

| Call type | Date | Tester | 1-9 / extra | Result | Notes |
|---|---|---|---|---|---|
| WhatsApp Web | | | | | |
| WhatsApp Desktop | | | | | |
| VoIP dialer | | | | | |
| 60-minute check | | | | | |

## 6. Put it online (needs the owner's approval first)

Creating an account and deploying are outward actions (Constitution: Platform and Cost Constraints).

1. The owner creates a free Cloudflare account. Confirm the sign-up asks for **no card** (R6). If it
   asks for one, stop.
2. `npx wrangler login` (the browser opens; sign in).
3. `npm run deploy` (runs `wrangler deploy`). It prints the address, for example
   `https://live-call-text.<name>.workers.dev`.
4. Give agents that address. They bookmark it and read `/guide.html` once.

## 7. Agent use in short (full guide: /guide.html, in Roman Urdu)

1. Put on the headset. Open the Live Call Text page in its own window, next to WhatsApp or the dialer.
2. Choose the customer's language and your own language.
3. Press Start.
   - For WhatsApp Web: pick the WhatsApp tab.
   - For the app or the dialer: pick "Entire screen" and tick "Also share system audio".
4. Read the customer's words live. To share your words with the customer, press Copy customer link
   and paste it in the chat.
5. Press Stop when the call ends.
