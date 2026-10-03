# Contract: Page Elements and Message Catalog

**Feature**: 001-live-call-text | **Date**: 2026-10-03

The automated tests find elements only by these `data-testid` values, and they check the message
codes listed here. The visible wording may be polished, but each code keeps its meaning and its fix.

## Agent page (`/index.html`)

| `data-testid` | Element | Rules |
|---|---|---|
| `customer-lang` | select | Options `en-US` "English" and `ur-PK` "Urdu". Changes apply during a call (FR-012) |
| `agent-lang` | select | Same options |
| `start` | button | Visible when no call is listening |
| `stop` | button | Visible while listening |
| `status` | text | One of `Ready`, `Listening to a browser tab`, `Listening to the laptop's sound`, `Listening to an app window`, `Paused: No internet`, `Paused: Speech service not responding`, `Stopped` (FR-006). `data-state` is `ready`, `choosing`, `listening`, `paused` or `stopped` |
| `meter-call` | meter-like element | `data-level` from 0 to 1 (FR-007) |
| `meter-mic` | meter-like element | `data-level` from 0 to 1; `data-state="unavailable"` when there is no microphone |
| `transcript` | scroll container | Holds call sections and lines (FR-010, FR-020) |
| `call-section` | group | `data-call-id` and a visible start time |
| `line` | text row | `data-side` is `customer` or `agent`; `data-final` is `true` or `false`; `lang`; `dir` is `rtl` for Urdu (FR-009, FR-011, FR-014) |
| `message` | alert area | `data-code` holds one code from the catalog below |
| `hint` | note | Shown for H_NO_CALL_SOUND (FR-008) |
| `copy-link` | button | Enabled only while listening (FR-024) |
| `link-status` | text | `data-state` is `off` (no link yet), `connecting`, `live`, `reconnecting`, `unavailable` or `ended`. While live, it shows the link text and sets `data-url`, so the agent can also copy it by hand |
| `save-chat` | button | Saves the shown call's chat as a text file (FR-039). Enabled when the chat has text. Shows "Saved" until new text arrives |
| `new-call` | button | Clears the conversation (FR-040). Disabled while listening or when the chat is empty |
| `unsaved-dialog` | dialog | "Save this call first?" Opens before New call or Start when the chat has unsaved text |
| `dialog-save` | button | In the dialog: saves the chat, then continues |
| `dialog-discard` | button | In the dialog: continues without saving |
| `dialog-cancel` | button | In the dialog: closes it and changes nothing |
| `headset-reminder` | text | Always visible next to Start (FR-023) |
| `privacy-line` | text | The one-line notice (FR-035) |
| `help-link` | link | Opens `/guide.html` |

## Customer page (`/v.html#<sid>`)

| `data-testid` | Element | Rules |
|---|---|---|
| `v-status` | text | `data-state` is `connecting`, `waiting`, `live`, `paused`, `ended` or `invalid`. Labels are in English and Urdu (FR-027) |
| `v-transcript` | container | Agent lines only (FR-026) |
| `v-line` | text row | `data-final`; `lang`; `dir="rtl"` for Urdu |

## Message catalog (agent page)

| Code | When | Text (simple English) |
|---|---|---|
| E_NOT_CHROME | Not Google Chrome, or not a laptop | "Please open this page in Google Chrome on your laptop." |
| E_OLD_CHROME | Chrome older than 133 | "Your Chrome is too old. Update it: Menu > Help > About Google Chrome, then reload this page." |
| E_SHARE_CANCELLED | The share window was closed | "Sharing was cancelled. Press Start and choose the call." |
| E_NO_CALL_SOUND_SCREEN | Entire screen shared without sound | "No call sound. Press Start again, choose 'Entire screen' and tick 'Also share system audio'." |
| E_NO_CALL_SOUND_WINDOW | A window was shared without sound | "This window has no sound. Press Start again and choose 'Entire screen' with 'Also share system audio', or choose the WhatsApp tab." |
| E_NO_CALL_SOUND_TAB | A tab was shared with its sound switched off | "No tab sound. Press Start again and keep 'Also share tab audio' on." |
| I_SHARING_STOPPED | Sharing ended from outside the page | "Listening stopped because sharing ended. Press Start to continue." |
| W_MIC_BLOCKED | Microphone permission denied | "Your microphone is blocked, so your own words won't show. Click the icon in the address bar and allow the microphone. Customer text still works." |
| W_MIC_MISSING | No microphone found | "No microphone found. Plug in your headset to see your own words. Customer text still works." |
| W_NO_INTERNET | Offline, or a network error | "No internet - captions paused. They will continue by themselves." |
| W_SPEECH_SERVICE | The speech service is not responding | "Speech service is not responding - captions paused. Trying again..." |
| H_NO_CALL_SOUND | No call sound heard for 20 s after Start | "No call sound heard yet. Check that you shared the call tab, or that your headset is the laptop's default sound device." |
| I_LINK_COPIED | Copy customer link succeeded | "Link copied - paste it in the chat." |
| W_LINK_UNAVAILABLE | Relay unreachable or out of free capacity | "Customer link is not available right now." |
| I_CHAT_SAVED | Save chat succeeded | "Chat saved to your Downloads folder." |

**Showing one message at a time**: the `message` area shows one code. When several are active,
it picks the first in this order:

1. any `E_*`
2. W_NO_INTERNET
3. W_SPEECH_SERVICE
4. W_LINK_UNAVAILABLE
5. W_MIC_BLOCKED
6. W_MIC_MISSING
7. I_SHARING_STOPPED
8. I_LINK_COPIED
9. I_CHAT_SAVED

I_LINK_COPIED and I_CHAT_SAVED clear themselves after 4 s. Microphone warnings stay until the next Start. Network
warnings clear when the network recovers. H_NO_CALL_SOUND appears only in the `hint` element.

Fixed texts:

- Headset reminder: "Use a headset, so the customer's voice doesn't reach your microphone."
- Privacy line: "Speech is sent to Google through Chrome to turn it into text. Nothing is recorded."

## Customer page labels (English / Urdu)

| State | English | Urdu |
|---|---|---|
| connecting | "Connecting..." | "رابطہ ہو رہا ہے..." |
| waiting | "Waiting for the agent to speak..." | "ایجنٹ کے بولنے کا انتظار ہے..." |
| live | "Live" | "براہِ راست" |
| paused | "Connection to the agent is weak, please wait..." | "ایجنٹ سے رابطہ کمزور ہے، انتظار کریں..." |
| ended | "Call ended" | "کال ختم ہو گئی" |
| invalid | "This call has ended or the link is not valid" | "یہ کال ختم ہو چکی ہے یا لنک درست نہیں ہے" |
