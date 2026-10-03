# Contract: Customer-Link Relay Protocol (v1)

**Feature**: 001-live-call-text | **Date**: 2026-10-03 | **Schema**: [relay-messages.schema.json](./relay-messages.schema.json)

The relay is one Cloudflare Worker and one hub Durable Object. It forwards the agent's words to open
customer pages and stores nothing (Constitution V, FR-034).

## Endpoints

| Path | Method | Purpose |
|---|---|---|
| `/`, `/index.html` | GET | Agent page (static asset) |
| `/v.html` | GET | Customer page (static asset). The session id is in the fragment: `/v.html#<sid>` |
| `/guide.html` | GET | Agent guide in Roman Urdu (static asset) |
| `/ws?role=agent&sid=<sid>` | GET with `Upgrade: websocket` | Agent socket |
| `/ws?role=viewer&sid=<sid>` | GET with `Upgrade: websocket` | Customer socket |

`sid` matches `^[A-Za-z0-9_-]{22}$`. Any other `/ws` request gets HTTP 400.

## Agent socket

1. The agent page creates `token` (32 random bytes, base64url) and `created` (ms). It computes
   `sid = base64url(SHA-256("lct1|" + token + "|" + created)).slice(0, 22)`.
2. It opens `new WebSocket(origin + "/ws?role=agent&sid=" + sid, ["lct1", "auth." + token + "." + created])`.
3. Before upgrading, the relay checks:
   - `sid` recomputed from the token and `created` matches. Otherwise **HTTP 403**.
   - `created` is between `now − 4 h` and `now + 60 s`. Otherwise **HTTP 403**.
4. On success the relay upgrades with `Sec-WebSocket-Protocol: lct1` and tags the socket
   `agent` and `agent:<sid>`. It sends `{"t":"status","state":"live"}` to the agent and to any
   viewers of that sid (this is how a reconnect brings them back).
5. If an older agent socket for the same sid still exists, the new authenticated socket replaces
   it. This happens after a network drop, while the old socket still looks open. The relay marks the
   old socket's attachment `replaced: true` and closes it with **4010**. Closing a replaced socket
   never ends or pauses the call. Only the token holder can do this.

| Agent → relay | Meaning |
|---|---|
| `{"t":"caption","id":"…","text":"…","final":false,"lang":"ur-PK"}` | In-progress words. Sent at most once per second per `id` |
| `{"t":"caption","id":"…","text":"…","final":true,"lang":"en-US"}` | Final line |
| `{"t":"end"}` | Call ended (Stop or pagehide) |
| `ping` (text) | Heartbeat. The auto-response `pong` comes back without waking the object |

The relay forwards each valid `caption` unchanged to every socket tagged `viewer:<sid>`. The agent
does not get its own captions echoed back.

## Viewer socket

1. The customer page reads `sid` from `location.hash` and opens `/ws?role=viewer&sid=<sid>`. Viewer
   sockets have no token, because they can only receive.
2. The relay accepts the upgrade and tags the socket `viewer` and `viewer:<sid>`. Then:
   - If a live agent socket exists for the sid and fewer than 5 viewers are connected, it sends
     `{"t":"status","state":"live"}`.
   - Otherwise it sends `{"t":"status","state":"invalid"}` and closes with **4404**. Too many viewers
     closes with **4009**.
3. Viewers receive only what is sent after they join (FR-026). The relay keeps no history.

| Relay → viewer | Meaning |
|---|---|
| `{"t":"status","state":"live"}` | The agent is connected |
| `{"t":"status","state":"paused"}` | The agent's socket dropped uncleanly; waiting up to 60 s |
| `{"t":"status","state":"ended"}` | The call ended. Close 4000 follows |
| `{"t":"status","state":"expired"}` | Four hours passed. Close 4001 follows |
| `{"t":"status","state":"invalid"}` | No such live call. Close 4404 follows |
| `{"t":"caption",…}` | Same object the agent sent |
| `pong` (text) | Answer to a viewer `ping` |

## Ending and recovery

| Event at the relay | Relay action |
|---|---|
| The agent sends `end` | Send `ended` to viewers, close them with 4000, and close the agent with 1000 |
| The agent socket closes with 1000 or 1001 and no `end` was sent | Same as `end` (the page was closed) |
| The agent socket closes uncleanly (1006 or an error) | Send `paused` to viewers. The agent page retries with the same token for up to 60 s. A successful reconnect sends `live` again. The viewer page shows Call ended after 60 s without `live` |
| A message arrives later than `created + 4 h` | Send `expired` to viewers and close them with 4001; close the agent with 4001 |

## Limits and errors

| Rule | Value | On violation |
|---|---|---|
| Frame size | ≤ 2,048 bytes | Drop the frame; after 3 drops, close with 4008 |
| `text` length | 1 to 500 characters | Drop the frame |
| `lang` | `ur-PK` or `en-US` | Drop the frame |
| Agent rate | ≤ 5 frames per second | Drop the extra frames |
| Viewers per sid | ≤ 5 | Close the new viewer with 4009 |
| Viewer sending anything other than `ping` | — | Ignore it |

### Close codes

| Code | Meaning |
|---|---|
| 1000 | Normal close |
| 4000 | Call ended |
| 4001 | Link expired (4 h) |
| 4008 | Too many invalid frames |
| 4009 | Too many viewers |
| 4010 | Agent socket replaced by a newer connection from the same agent (ignored by the close handler) |
| 4404 | Invalid or ended link |

## Timing targets

| Target | Value | Source |
|---|---|---|
| Agent words on the customer's phone | ≤ 3 s after being spoken | SC-009 |
| `ended` on the customer page after Stop | ≤ 5 s | FR-028 |
| Agent reconnect window | 60 s | R7 |

## Compatibility

- Messages carry no version field. The protocol version is the subprotocol `lct1`.
- A breaking change uses `lct2`, and the relay accepts both during rollout.
