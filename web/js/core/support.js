// Decides whether this browser can run Live Call Text (research.md R1, R10).
// SpeechRecognition.start(audioTrack) shipped in desktop Chrome M133. Older browsers
// ignore the track and listen to the microphone, so they must be refused.

export const MIN_CHROME = 133;

export function checkSupport(env) {
  const brands = Array.isArray(env?.brands) ? env.brands : [];
  const chrome = brands.find((b) => b && b.brand === 'Google Chrome');
  if (!chrome || env.mobile) return { ok: false, code: 'E_NOT_CHROME' };
  const major = Number.parseInt(chrome.version, 10);
  if (!Number.isFinite(major) || major < MIN_CHROME) return { ok: false, code: 'E_OLD_CHROME' };
  if (!env.hasSpeech || !env.hasDisplayMedia || !env.secure) return { ok: false, code: 'E_NOT_CHROME' };
  return { ok: true };
}

export function readEnv(win) {
  const uad = win.navigator?.userAgentData;
  return {
    brands: Array.isArray(uad?.brands) ? uad.brands.map((b) => ({ brand: b.brand, version: b.version })) : [],
    mobile: Boolean(uad?.mobile),
    hasSpeech: Boolean(win.SpeechRecognition || win.webkitSpeechRecognition),
    hasDisplayMedia: typeof win.navigator?.mediaDevices?.getDisplayMedia === 'function',
    secure: Boolean(win.isSecureContext),
  };
}
