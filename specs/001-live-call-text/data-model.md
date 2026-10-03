# Data Model: Live Call Text

**Feature**: 001-live-call-text | **Date**: 2026-10-03 | **Spec**: [spec.md](./spec.md)

No database is involved:

- Everything on the agent page lives in page memory, except the two language choices.
- The relay keeps only what its open sockets carry (tags and attachments).
- The customer page keeps only the lines it has received.

## Agent page (memory only)

### Call

One conversation, from Start until it stops (spec: Key Entities, Call).

| Field | Type | Rules |
|---|---|---|
| `id` | string | `call-<n>`; n counts up from 1 for each page load |
| `startedAt` | number (ms) | Set when Start is pressed |
| `customerLang`, `agentLang` | `'ur-PK'` or `'en-US'` | Initial values come from the agent's preferences; can change during the call (FR-012) |
| `source` | `'tab'`, `'screen'`, `'window'` or `null` | Taken from `displaySurface`: `browser` gives `tab`, `monitor` gives `screen`, `window` gives `window` |
| `state` | see below | |
| `lanes` | `{ customer: Lane, agent: Lane }` | |
| `link` | LinkSession or `null` | Created on the first Copy customer link (FR-024) |

**States**:

```text
ready ──Start──▶ choosing ──shared, has sound──▶ listening ──Stop / track ended / pagehide──▶ stopped
                   │                                                                          │
                   ├─cancelled──▶ ready (E_SHARE_CANCELLED)                                   │
                   └─no sound───▶ ready (E_NO_CALL_SOUND_*)        stopped ──Start──▶ choosing (empty conversation)
```

Rules:

- `listening` is reached only when the shared stream has an audio track (FR-005).
- When the call stops, both sides are stopped and the link is ended (FR-018, FR-019).
- A new Start creates a new Call on an empty conversation, marked with its start time. Unsaved text
  is offered for saving first (FR-020, FR-040).

### Lane

One side of the call: `customer` (the call audio) or `agent` (the microphone).

| Field | Type | Rules |
|---|---|---|
| `side` | `'customer'` or `'agent'` | |
| `lang` | `'ur-PK'` or `'en-US'` | |
| `state` | `idle`, `starting`, `listening`, `paused`, `stopped` or `unavailable` | |
| `pauseReason` | `'no-internet'`, `'speech-service'` or `null` | Set only while `paused` |
| `retryStep` | integer ≥ 0 | Index into the retry delays 0.5 s, 1 s, 2 s, 3 s, 3 s… (R5) |
| `level` | number from 0 to 1 | Current sound level for the meter (FR-007) |
| `lastSoundAt` | number (ms) or `null` | Drives the 20-second hint for the customer side only (FR-008) |
| `session` | integer | Counts recognizer starts; used in line ids |
| `offline` | boolean | Set by the window `offline` event, cleared by `online`. While true, a pause is never cleared |

**States**:

```text
idle ──track ready──▶ starting ──recognizer started──▶ listening
listening ──end / no-speech / aborted (not ours)──▶ starting
listening ──network error / offline──▶ paused(no-internet) ──online or retry──▶ restart (stays paused)
listening ──service error──▶ paused(speech-service) ──retry──▶ restart (stays paused)
paused ──healthy (first result, or 3 s with no error; never while offline)──▶ listening
listening ──1.5 s quiet with an open in-progress line──▶ finalize (stop) ──▶ starting (new session)
listening ──language changed──▶ starting (new lang, same track)
any ──Stop / track ended──▶ stopped
idle (agent side) ──microphone blocked or missing──▶ unavailable   (the customer side is not affected; FR-017)
```

### CaptionLine

| Field | Type | Rules |
|---|---|---|
| `id` | string | `<callId>:<side>:<session>:<resultIndex>`, so restarts never collide |
| `callId` | string | The call it belongs to |
| `side` | `'customer'` or `'agent'` | Shown as "Customer" or "Agent" (FR-009) |
| `text` | string | Trimmed. Empty text is ignored |
| `final` | boolean | `false` means in progress, styled differently (FR-011) |
| `lang` | `'ur-PK'` or `'en-US'` | Urdu renders right-to-left (FR-014) |
| `at` | number (ms) | When the first word arrived. Lines are ordered by `at` (FR-010) |

Rules:

- Each side has at most one non-final line.
- When a final result arrives, it replaces that side's in-progress line. No duplicate is created.

### LinkSession (agent page)

| Field | Type | Rules |
|---|---|---|
| `token` | string | 43 base64url characters (32 random bytes); never shown to anyone |
| `created` | number (ms) | |
| `sid` | string | 22 base64url characters: the first 22 of base64url(SHA-256(`lct1|token|created`)) |
| `url` | string | `<origin>/v.html#<sid>` |
| `state` | `connecting`, `live`, `reconnecting`, `unavailable` or `ended` | |

**States**:

```text
(no link) ──Copy customer link──▶ connecting ──socket open──▶ live
connecting ──fail──▶ unavailable (W_LINK_UNAVAILABLE; captions continue)
live ──unclean close──▶ reconnecting ──open within 60 s──▶ live
reconnecting ──60 s passed──▶ unavailable
any ──Stop / pagehide / track ended──▶ ended (sends "end" first)
```

What is sent:

- Only Agent-side caption lines are sent to the relay (FR-026). Customer lines are never sent.
- Interim updates go at most once per second per line; final lines go at once (R7).

### ShownCall and CallRecord (User Story 4)

The call whose chat is on screen:

| Field | Type | Rules |
|---|---|---|
| `id`, `startedAt` | string, number (ms) | Same as the Call |
| `endedAt` | number (ms) or `null` | Set when the call stops |
| `customerLang`, `agentLang` | `'ur-PK'` or `'en-US'` | Follow language changes made during the call |
| `hasText` | boolean | True once any non-echo line appears |
| `saved` | boolean | True after Save chat; back to false when new text arrives |

**Rules**:
- New call and Start clear the conversation (`transcript.clear()`).
- When `hasText && !saved`, the page first asks Save and continue / Don't save / Cancel.
- `beforeunload` warns while there is unsaved text.

**CallRecord**: the saved UTF-8 text file (with a BOM) named `call-YYYY-MM-DD_HH-MM.txt`.
- Header: date, start time, end time, duration, and both languages.
- Body: one line per non-echo caption, `[HH:MM:SS] Customer|Agent: text`, ordered by time.
- An empty chat gives a single "(no text)" line.
- Built by `core/record.js`. The file is only saved on the agent's laptop.

### AgentPreferences

| Field | Type | Rules |
|---|---|---|
| storage key | `lct.prefs.v1` | `localStorage`, wrapped in try/catch |
| `v` | `1` | Format version |
| `customerLang`, `agentLang` | `'ur-PK'` or `'en-US'` | Default `en-US` for both (spec assumption). Any invalid value falls back to the default (FR-013) |

## Relay (hub Durable Object; nothing stored)

### RelaySocket

Each hibernatable WebSocket has the following. No SQLite rows are ever written.

| Item | Value |
|---|---|
| tags (at most 10, each at most 256 characters) | Agent: `['agent', 'agent:<sid>']`. Viewer: `['viewer', 'viewer:<sid>']` |
| attachment (at most 16 KB) | `{ role, sid, created, windowStart, count }`. `created` is for agents only; `windowStart` and `count` are the per-second rate limit |

What the relay derives from these:

- A call is **live** when an agent socket tagged `agent:<sid>` is open and fewer than 4 h have passed
  since `created`.
- **Viewers** of a call are `getWebSockets('viewer:<sid>')`, at most 5.
- **Validation**: a frame is at most 2,048 bytes; text is at most 500 characters; `lang` is one of
  the two allowed values; the message type must be allowed for the socket's role (contracts).

## Customer page (memory only)

### ViewerState

| Field | Type | Rules |
|---|---|---|
| `sid` | string | Read from `location.hash`. If it is not 22 base64url characters, the page shows `invalid` without connecting |
| `state` | `connecting`, `waiting`, `live`, `paused`, `ended` or `invalid` | Each state has an English and Urdu label (FR-027) |
| `lines` | CaptionLine[] (agent only) | Only lines received after the page opened (FR-026) |

**States**:

```text
connecting ──status live──▶ waiting ──first caption──▶ live
waiting/live ──status paused──▶ paused ──status live──▶ live
paused ──60 s without live──▶ ended
any ──status ended / expired, or close 4000 / 4001──▶ ended
connecting ──status invalid, or close 4404──▶ invalid
```

## Message catalog

The codes, their English text and the customer-page labels are in
[contracts/ui-contract.md](./contracts/ui-contract.md). Every code is one of the FR-021 problems, a
hint, or a confirmation.
