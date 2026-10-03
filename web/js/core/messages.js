// Message catalog for the agent page and labels for the customer page.
// Texts are copied exactly from specs/001-live-call-text/contracts/ui-contract.md.

export const MESSAGES = Object.freeze({
  E_NOT_CHROME: { level: 'error', text: 'Please open this page in Google Chrome on your laptop.' },
  E_OLD_CHROME: { level: 'error', text: 'Your Chrome is too old. Update it: Menu > Help > About Google Chrome, then reload this page.' },
  E_SHARE_CANCELLED: { level: 'error', text: 'Sharing was cancelled. Press Start and choose the call.' },
  E_NO_CALL_SOUND_SCREEN: { level: 'error', text: "No call sound. Press Start again, choose 'Entire screen' and tick 'Also share system audio'." },
  E_NO_CALL_SOUND_WINDOW: { level: 'error', text: "This window has no sound. Press Start again and choose 'Entire screen' with 'Also share system audio', or choose the WhatsApp tab." },
  E_NO_CALL_SOUND_TAB: { level: 'error', text: "No tab sound. Press Start again and keep 'Also share tab audio' on." },
  I_SHARING_STOPPED: { level: 'info', text: 'Listening stopped because sharing ended. Press Start to continue.' },
  W_MIC_BLOCKED: { level: 'warning', text: "Your microphone is blocked, so your own words won't show. Click the icon in the address bar and allow the microphone. Customer text still works." },
  W_MIC_MISSING: { level: 'warning', text: 'No microphone found. Plug in your headset to see your own words. Customer text still works.' },
  W_NO_INTERNET: { level: 'warning', text: 'No internet - captions paused. They will continue by themselves.' },
  W_SPEECH_SERVICE: { level: 'warning', text: 'Speech service is not responding - captions paused. Trying again...' },
  H_NO_CALL_SOUND: { level: 'hint', text: "No call sound heard yet. Check that you shared the call tab, or that your headset is the laptop's default sound device." },
  I_LINK_COPIED: { level: 'info', text: 'Link copied - paste it in the chat.' },
  W_LINK_UNAVAILABLE: { level: 'warning', text: 'Customer link is not available right now.' },
  I_CHAT_SAVED: { level: 'info', text: 'Chat saved to your Downloads folder.' },
});

export const HEADSET_REMINDER = "Use a headset, so the customer's voice doesn't reach your microphone.";
export const PRIVACY_LINE = 'Speech is sent to Google through Chrome to turn it into text. Nothing is recorded.';

export const VIEWER_LABELS = Object.freeze({
  connecting: { en: 'Connecting...', ur: 'رابطہ ہو رہا ہے...' },
  waiting: { en: 'Waiting for the agent to speak...', ur: 'ایجنٹ کے بولنے کا انتظار ہے...' },
  live: { en: 'Live', ur: 'براہِ راست' },
  paused: { en: 'Connection to the agent is weak, please wait...', ur: 'ایجنٹ سے رابطہ کمزور ہے، انتظار کریں...' },
  ended: { en: 'Call ended', ur: 'کال ختم ہو گئی' },
  invalid: { en: 'This call has ended or the link is not valid', ur: 'یہ کال ختم ہو چکی ہے یا لنک درست نہیں ہے' },
});

// After any E_* code, the message area shows the first active code in this order.
const PRIORITY = [
  'W_NO_INTERNET', 'W_SPEECH_SERVICE', 'W_LINK_UNAVAILABLE', 'W_MIC_BLOCKED',
  'W_MIC_MISSING', 'I_SHARING_STOPPED', 'I_LINK_COPIED', 'I_CHAT_SAVED',
];

export function messageFor(code) {
  const message = MESSAGES[code];
  if (!message) throw new Error(`Unknown message code: ${code}`);
  return message;
}

// Picks the one message to show; H_NO_CALL_SOUND belongs to the hint element instead.
export function pickMessage(activeCodes) {
  const codes = new Set(activeCodes);
  for (const code of codes) messageFor(code);
  const error = Object.keys(MESSAGES).find((code) => code.startsWith('E_') && codes.has(code));
  if (error) return error;
  return PRIORITY.find((code) => codes.has(code)) ?? null;
}
