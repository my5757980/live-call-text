# Feature Specification: Live Call Text

**Feature Branch**: `001-live-call-text`  
**Created**: 2026-10-03  
**Status**: Draft  
**Input**: User description: "Live call text for agents. While an agent talks to a customer on a laptop call (WhatsApp Web in Chrome, the WhatsApp Desktop app, or a VoIP dialer installed on the laptop), the customer's words appear as live text on the agent's screen, in Urdu or English, 100% free, with nothing for the customer to do. The agent's own words can also be shown, and the agent can optionally send the customer a link to see the agent's words as live text on their phone." (The command was run without text. This description was written from the project context agreed with the owner on 2026-10-02.)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Customer's words as live text for the agent (Priority: P1)

An agent is on a call with a customer from their laptop, wearing a headset. The agent opens the
Live Call Text page in Google Chrome, checks the customer's language (Urdu or English) and presses
**Start**. Chrome's share window opens:

- For **WhatsApp Web**, or a dialer that runs in a Chrome tab, the agent picks that tab.
- For the **WhatsApp Desktop app** or a **VoIP dialer installed on the laptop**, the agent picks
  **Entire screen** and ticks **Also share system audio**.

From then on, everything the customer says appears as text on the agent's screen, labelled
**Customer**, newest at the bottom. Words appear while the customer is still talking and settle into
a final sentence when they pause. The agent keeps hearing the call normally. The customer does
nothing at all. **Stop** ends it.

**Why this priority**: This is the main job of the product. On its own it already helps the agent
understand every customer, so it is the MVP.

**Independent Test**: Play recorded customer speech (Urdu and English) into a stand-in WhatsApp Web
tab, and separately through the laptop's sound output (standing in for the desktop app or dialer).
Confirm the text appears on the agent page as Customer lines. Then make one real call on each call
type using the written checklist.

**Acceptance Scenarios**:

1. **Given** an agent on a WhatsApp Web call with the page open and the customer language set to
   Urdu, **When** the agent presses Start, picks the WhatsApp tab and the customer speaks, **Then**
   the customer's words appear as Urdu text, right-to-left, labelled Customer, and the agent still
   hears the customer exactly as before.
2. **Given** an agent on a call in the WhatsApp Desktop app or an installed VoIP dialer, **When** the
   agent presses Start, picks Entire screen, ticks Also share system audio and the customer speaks
   English, **Then** the customer's words appear as English text labelled Customer.
3. **Given** captions are running, **When** the customer is in the middle of a sentence, **Then** the
   words so far are shown as in-progress text, and when the customer pauses they are replaced by one
   final line with no duplicate.
4. **Given** the agent picked Entire screen but did not tick Also share system audio (or shared a
   single window, which carries no sound), **When** sharing starts, **Then** within 3 seconds the page
   says exactly how to fix it (for example: "No call sound. Press Start again and tick 'Also share
   system audio'.") and does not show that it is listening.
5. **Given** captions are running, **When** the customer is silent for several minutes and then
   speaks, **Then** their words appear again with no action from the agent.
6. **Given** captions are running, **When** the agent presses Stop, **Then** the page stops listening
   at once and the call's text stays on screen.

---

### User Story 2 - The agent's own words in the same view (Priority: P2)

With the same Start, the page also turns the agent's microphone into text, labelled **Agent**, so the
agent sees both sides of the conversation in order. The agent picks their own language separately
from the customer's. If the microphone is blocked or missing, customer captions still work and the
page explains how to allow or connect the microphone.

**Why this priority**: It shows the whole conversation in one place, and the customer link
(User Story 3) needs it. The main job (User Story 1) works without it.

**Independent Test**: Play recorded agent speech into the microphone path and recorded customer
speech into the call path. Confirm Agent and Customer lines appear in the right order and languages.
Block the microphone and confirm customer captions continue.

**Acceptance Scenarios**:

1. **Given** captions are running and the microphone is allowed, **When** the agent speaks, **Then**
   the agent's words appear labelled Agent, in the agent's chosen language, in time order with the
   Customer lines.
2. **Given** the agent's language is English and the customer's is Urdu, **When** both speak,
   **Then** Agent lines are in English and Customer lines are in Urdu.
3. **Given** the microphone is blocked or not connected, **When** the agent presses Start, **Then**
   customer captions start normally and the page shows a short message on how to allow or connect
   the microphone.
4. **Given** the agent wears a headset, **When** the customer speaks, **Then** the customer's words
   appear only as Customer lines, never also as Agent lines.

---

### User Story 3 - Optional customer link (Priority: P3)

During a call, the agent can press **Copy customer link** and paste the link into the WhatsApp chat
with the customer. The customer taps it and their phone's normal browser opens a page (no app, no
sign-up) that shows the agent's words as live text in large letters. When the call ends, the
customer's page shows **Call ended** and no new text arrives. Each link belongs to one call only.

**Why this priority**: It helps customers with a bad line or poor hearing, but it is optional; the
agent decides when to use it.

**Independent Test**: Start a call with recorded agent speech, copy the link and open it on a phone
(or a phone-sized browser window). Confirm the agent's words appear there. Press Stop and confirm the
phone shows Call ended, and that opening the link again shows no call text.

**Acceptance Scenarios**:

1. **Given** captions are running, **When** the agent presses Copy customer link, **Then** a link is
   copied and the page confirms "Link copied - paste it in the chat".
2. **Given** the customer opens the link during the call, **When** the agent speaks, **Then** the
   customer sees the agent's words within 3 seconds, large and easy to read, Urdu right-to-left.
3. **Given** the customer opens the link part-way through the call, **When** the page loads,
   **Then** it shows only what the agent says from that moment on, and never the customer's own
   words.
4. **Given** the customer's page is open, **When** the agent presses Stop or closes the agent page,
   **Then** the customer's page shows Call ended within 5 seconds and receives no more text.
5. **Given** a link from a call that has ended, or a link that has been changed or guessed, **When**
   anyone opens it, **Then** they see "This call has ended or the link is not valid" and no call
   text.
6. **Given** the customer-link service is down or out of free capacity, **When** the agent uses the
   page, **Then** the agent's captions keep working and only the link feature says "Customer link is
   not available right now".

---

### User Story 4 - Save the call record and start fresh (Priority: P4)

*Added 2026-10-03 at the owner's request: "har aik call kayyy bad wo agent apniii poora text chat
save kar saktayy taakayyy record rahayyyy or us chat ko clear kar sakayyy".*

After a call, the agent presses **Save chat**. The whole conversation (who said what, with times)
is saved as a text file on the agent's laptop, for the record. The agent then presses **New call**,
and the conversation is cleared, so the next call starts on a fresh, empty page and calls never
mix. If the agent tries to start a new call, clear the chat, or close the page before saving,
the page asks first so the record isn't lost by mistake.

**Why this priority**: It keeps a record of every call and keeps calls apart. It builds on User
Stories 1-3 but doesn't change them.

**Independent Test**: After a call, press Save chat and check the downloaded file has every
line, with speaker and time. Press New call and check the conversation is empty. Start another
call without saving and check that the page asks first.

**Acceptance Scenarios**:

1. **Given** a finished call with text, **When** the agent presses Save chat, **Then** a text file
   named with the call's date and time is saved on the laptop. It contains the date, start and end
   times, both languages, and every line as "[time] Customer: …" or "[time] Agent: …". The page
   confirms "Chat saved".
2. **Given** a saved call, **When** the agent presses New call, **Then** the conversation is cleared
   at once and the empty "No call yet" view shows.
3. **Given** a call whose chat is not saved, **When** the agent presses New call or Start,
   **Then** the page asks "Save this call first?" with Save and continue, Don't save, and Cancel.
   Cancel keeps everything as it was.
4. **Given** any new call, **When** it starts, **Then** the conversation shows only that call's
   text.
5. **Given** an unsaved chat, **When** the agent closes or reloads the page, **Then** Chrome warns
   before leaving.

---

### Edge Cases

- **System audio not ticked, a window shared instead of a tab or screen, or tab sound switched off in
  the share window**: no call sound reaches the page. It shows the exact fix within 3 seconds
  (User Story 1, scenario 4).
- **Wrong tab shared, or the dialer plays through a sound device that is not the laptop's default**:
  the call sound indicator stays flat. If no call sound at all is heard for 20 seconds after Start,
  the page shows a hint: check that the call tab was shared, or that the headset is the laptop's
  default sound device. The hint disappears as soon as call sound arrives.
- **Agent presses Chrome's own "Stop sharing" bar, or closes the shared tab**: the page notices within
  2 seconds, says listening has stopped, and offers Start.
- **Internet drops**: the page shows "No internet - captions paused" and continues by itself within
  5 seconds of the connection returning.
- **Long silence or a very long call (60 minutes or more)**: captions continue without any agent
  action.
- **No headset**: the customer's voice from the laptop speakers also reaches the microphone and
  appears as Agent lines. The page shows a headset reminder next to Start.
- **Music, videos or other sounds playing on the laptop while Entire screen is shared**: these sounds
  are also turned into text. The guide tells agents to keep other sounds off during calls.
- **Customer speaks a different language than selected**: the agent switches the customer's language
  during the call; it applies to the next words within 3 seconds without sharing again.
- **Mixed Urdu and English in one sentence**: written in the selected language as well as the speech
  service can. This is a known limit.
- **Page opened in a browser other than Google Chrome, on a phone, or in an old Chrome**: the page
  explains that it needs an up-to-date Google Chrome on a laptop and does not start.
- **Speech service not responding**: the page says captions are paused and keeps retrying by itself.
- **Agent closes or reloads the page during a call**: listening stops, the text is gone, and any
  customer link for that call ends.
- **Agent presses Start again after a call**: the earlier call's text is cleared, after offering to
  save it if it isn't saved (User Story 4). The new call starts on an empty conversation. A new
  customer link is needed for the new call.

## Requirements *(mandatory)*

### Functional Requirements

**Starting and listening**

- **FR-001**: The agent page MUST work in Google Chrome on a Windows laptop with no install, no
  sign-up and no login.
- **FR-002**: Agents MUST be able to start captions for a call with one Start action followed by the
  choice in Chrome's share window (and, the first time only, allowing the microphone).
- **FR-003**: The system MUST be able to listen to (a) a Chrome tab, for WhatsApp Web or a dialer that
  runs in a browser tab, and (b) the laptop's whole sound output (Entire screen with system audio),
  for the WhatsApp Desktop app or a VoIP dialer installed on the laptop.
- **FR-004**: Listening MUST NOT mute, lower, delay or otherwise change what the agent hears on the
  call.
- **FR-005**: If what the agent shared carries no sound, the system MUST show the exact fix within
  3 seconds and MUST NOT show that it is listening.
- **FR-006**: The page MUST always show its state: Ready, Listening (and whether to a browser tab or
  to the laptop's sound), Paused (with the reason) or Stopped.
- **FR-007**: The page MUST show a simple live sound indicator for each side (call and microphone) so
  the agent can see that sound is arriving.
- **FR-008**: If no call sound is heard for 20 seconds after Start, the page MUST show a hint on what
  to check, and remove it as soon as call sound arrives.

**Captions**

- **FR-009**: The customer's speech MUST appear as lines labelled Customer, and the agent's microphone
  speech as lines labelled Agent.
- **FR-010**: Lines MUST appear in time order with the newest at the bottom. The view MUST follow new
  text, except while the agent has scrolled up to read earlier text; it follows again once the agent
  scrolls back to the bottom.
- **FR-011**: Words MUST appear while the person is still speaking, visibly marked as in progress, and
  be replaced by a single final line when the person pauses, with no duplicate lines.
- **FR-012**: The agent MUST be able to choose the customer's language and their own language
  separately, from Urdu and English, before or during a call. A change MUST apply to the next words
  within 3 seconds without sharing again.
- **FR-013**: The last chosen languages MUST be remembered on that laptop and pre-selected next time.
- **FR-014**: Urdu text MUST be shown in Urdu script, right-to-left; English text left-to-right.
- **FR-015**: Caption text MUST be large and high-contrast, so the agent can read the newest line at a
  glance from normal sitting distance.
- **FR-016**: Captions MUST continue through silences of any length and calls of at least 60 minutes,
  and MUST resume by themselves after internet drops of up to 60 seconds or a speech-service hiccup,
  with no agent action.
- **FR-017**: A blocked or missing microphone MUST NOT stop customer captions.

**Stopping**

- **FR-018**: Stop MUST end listening to both the call and the microphone at once, and end the
  customer link for that call.
- **FR-019**: If sharing ends from outside the page (Chrome's Stop sharing bar, or the shared tab is
  closed), the page MUST notice within 2 seconds, show that listening has stopped, end the customer
  link for that call, and offer Start.
- **FR-020**: After a call stops, its text MUST stay on screen until the agent starts a new call or
  presses New call. Each call MUST start on an empty conversation, marked with its start time, so
  calls never mix (amended 2026-10-03, User Story 4).

**Messages and help**

- **FR-021**: The page MUST show a plain-language message with the exact fix for each of these
  problems: no call sound in what was shared; sharing stopped; microphone blocked or missing; no
  internet; speech service not responding; not Google Chrome, not a laptop, or Chrome too old.
- **FR-022**: Labels and messages on the agent page MUST use simple English words. A one-page guide
  in simple Roman Urdu MUST explain how to start captions for each call type, how to send the
  customer link, and what each message means.
- **FR-023**: The page MUST show a short headset reminder next to Start.

**Customer link**

- **FR-024**: While listening, the agent MUST be able to copy a customer link for the current call
  with one action.
- **FR-025**: The customer link MUST open in a normal phone browser with no app, no sign-up and no
  login, and show the agent's words live in large text, Urdu right-to-left.
- **FR-026**: The customer's page MUST show only the agent's words spoken after the page was opened:
  never earlier text, and never the customer's own words.
- **FR-027**: Status messages on the customer page (waiting, call ended, link not valid) MUST be
  shown in both English and Urdu.
- **FR-028**: When the call ends (Stop, agent page closed, or sharing ended), the customer's open page
  MUST show Call ended within 5 seconds and receive no more text.
- **FR-029**: Each link MUST belong to one call only, MUST be practically impossible to guess, and
  MUST stop working when its call ends or 4 hours after it was created, whichever comes first.
- **FR-030**: Only the agent page that started a call MUST be able to send text to that call's link.
- **FR-031**: If the customer-link service is unavailable or out of free capacity, the agent's
  captions MUST keep working and the page MUST say "Customer link is not available right now".

**Privacy and cost**

- **FR-032**: No call audio may be recorded or stored anywhere.
- **FR-033**: Call text MUST exist only in the agent's open page, and MUST be gone when that page is
  closed, reloaded or cleared. The only exception is a copy the agent saves on purpose with Save
  chat (FR-039), which goes to the agent's own laptop and nowhere else.
- **FR-034**: The customer-link service MUST only pass the agent's words on to open customer pages,
  and MUST NOT keep any call text, during or after the call.
- **FR-035**: The page's help MUST say in one line that speech is sent to Google through Chrome to be
  turned into text.
- **FR-036**: Using the product MUST cost nothing: no paid service, paid plan, API key or credit card,
  and no sign-up for agents or customers.

**Call record** (added 2026-10-03, User Story 4)

- **FR-039**: Agents MUST be able to save the current call's chat with one Save chat action. It is
  saved as a UTF-8 text file on their own laptop, named `call-<date>_<time>.txt`. The file holds:
  - a header with date, start time, end time (or "still running"), duration, and both languages;
  - every Customer and Agent line in order, as `[HH:MM:SS] Customer: text` or `[HH:MM:SS] Agent: text`.
  Echo lines (FR-038) are left out. Nothing is uploaded anywhere.
- **FR-040**: A New call action MUST clear the conversation. Before New call, Start or closing the
  page while the chat has unsaved text, the page MUST offer to save it first: Save and continue,
  Don't save, or Cancel. Closing the page uses Chrome's own leave warning. New call is disabled
  while a call is being listened to.

**Echo without a headset** (added 2026-10-03 after the first real call)

- **FR-038**: When the customer's voice reaches the agent's microphone (no headset) and both sides
  use the same language, those words MUST NOT appear as Agent lines and MUST NOT be sent to the
  customer link. An Agent line that repeats at least 60% of what the customer says at the same
  time counts as echo and is hidden. With different languages the echo cannot be matched, so the
  headset reminder (FR-023) remains the main fix.

**Look and feel** (added 2026-10-03 at the owner's request: "UI/UX aik dam professional decent")

- **FR-037**: The agent page, customer page and guide MUST share one professional, consistent
  design:
  - a clear header with the product name and status;
  - grouped controls;
  - a chat-style conversation with Customer on the left and Agent on the right;
  - consistent colours, spacing and buttons;
  - a light and a dark theme that follow the device setting;
  - no horizontal scrolling at 640 px wide for the agent page (a half-screen window) or 390 px
    for the customer page;
  - body text contrast of at least 4.5:1.

### Verification Requirements

- **VR-001**: Each user story MUST have automated checks that use recorded Urdu and English speech,
  played through a stand-in WhatsApp Web tab and through the laptop's sound output (standing in for
  the desktop app and the dialer).
- **VR-002**: Each problem in FR-021 MUST have an automated check that its trigger shows the right
  message.
- **VR-003**: There MUST be a written real-call checklist for each call type: WhatsApp Web, WhatsApp
  Desktop, and the owner's VoIP dialer.
- **VR-004**: A call type MUST NOT be called "working" until a real call on it passes its checklist.
  All results, failures included, are recorded as they happened.

### Key Entities

- **Call**: one conversation from Start until it stops. Has its start time, the customer's and the
  agent's languages, what is being listened to (a browser tab or the laptop's sound), its state
  (starting, listening, paused with a reason, stopped) and, optionally, one customer link.
- **Caption line**: one piece of what was said. Has the speaker (Agent or Customer), the text, whether
  it is in progress or final, its language and the time it was spoken. Belongs to one call.
- **Customer link**: an optional, unguessable link for one call. Has its state (live, ended, expired)
  and its expiry time. Carries only the agent's words, and only while the call is live.
- **Agent preferences**: the last chosen customer and agent languages, kept on that laptop only.
- **Call record**: the text file an agent saves after a call. It has a header (date, times,
  duration, languages) and every non-echo line with its time and speaker. It is kept only on the
  agent's laptop.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: From pressing Start, an agent has captions running in 15 seconds or less on each of the
  three call types.
- **SC-002**: For at least 9 out of 10 spoken sentences, the customer's first words appear on the
  agent's screen within 2 seconds of being spoken.
- **SC-003**: On a clear real call, the agent can understand at least 9 out of 10 test sentences from
  the text alone, in Urdu and in English (5 sentences each, read by a tester playing the customer).
- **SC-004**: A 60-minute call runs from start to end with no agent action and no sentence lost
  because captions stopped.
- **SC-005**: After an internet drop of up to 60 seconds, captions resume within 5 seconds of the
  connection returning, with no agent action.
- **SC-006**: Each problem listed in FR-021 shows its message with the fix within 3 seconds.
- **SC-007**: In a trial with first-time agents, at least 4 out of 5 start captions correctly on their
  first try after reading the one-page guide.
- **SC-008**: Running cost stays at zero (no bill, paid plan or card) with up to 20 agents at the same
  time, each with up to 8 hours of calls a day, and the customer link used on up to 1 in 4 calls.
- **SC-009**: The customer link opens on a phone in under 5 seconds on a normal mobile data
  connection, and the agent's words appear there within 3 seconds of being spoken.
- **SC-010**: After a call ends, its link shows no call text to anyone, and no audio or text from the
  call remains anywhere except the agent's open page.
- **SC-011**: Switching off the customer-link service in the middle of a call does not interrupt the
  agent's captions for even one sentence.
- **SC-012**: Before release, each call type (WhatsApp Web, WhatsApp Desktop, the owner's VoIP
  dialer) passes its real-call checklist.
- **SC-013**: An agent can save a finished call's chat and start a fresh call in 3 clicks or fewer
  (Save chat, New call, Start). The saved file contains every final line shown on screen, with
  speaker and time.

## Assumptions

- Agents use Windows laptops with an up-to-date Google Chrome and a stable internet connection.
- Agents wear a headset; for the desktop app and the dialer, the headset is the laptop's default sound
  device.
- Up to 20 agents use the product at the same time, each on one call at a time.
- On first use, both languages are set to English; the agent changes them once and the page
  remembers.
- Customers speak mainly Urdu or English. Mixed speech is written in the selected language as well as
  the speech service can.
- Soft and loud speech are both supported; the page evens out the level for the speech service.
  Very fast English (about 1.2× normal speed or faster) may lose words, a limit of Chrome's free
  English recognition (test-log Finding 8). Urdu at the same speeds is not affected.
- Customers open the link in their phone's normal browser. The agent shares it through the existing
  WhatsApp chat (or SMS).
- After a call the agent can save its chat as a text file on the laptop (FR-039). Files go to Chrome's
  normal Downloads folder.
- The business decides what to tell customers about live captions. The guide includes an optional
  one-line notice agents can say.
- The owner sets up the free hosting once, with a free account and no card. Agents and customers
  never sign up.
- The owner's VoIP dialer is not known yet. It is assumed to play call sound through the laptop's
  normal sound output.

## Dependencies

- Google Chrome's built-in speech-to-text: free, needs internet, run by Google. If Google changes it,
  the product may need changes.
- A free hosting service that needs no card, for the pages and the customer-link service.

## Out of Scope

- Calls made on a phone (mobile WhatsApp or mobile dialers).
- Recording calls or keeping any audio.
- Saving transcripts to a server or CRM. Saving a text file on the agent's own laptop is in scope
  (FR-039).
- Translation, and writing Urdu in Roman letters.
- Browsers other than Google Chrome, and operating systems other than Windows.
- Accounts, login, admin screens and usage reports.
- WhatsApp Business Calling API, or any change inside WhatsApp or the dialer.
- More than one call at a time in one agent page.
- Showing the customer's own words on the customer page.
