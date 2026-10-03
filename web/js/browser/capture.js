// Captures the call audio through Chrome's share window (research.md R2).

export const DISPLAY_OPTIONS = Object.freeze({
  video: true,                                   // required by getDisplayMedia; never shown
  audio: { suppressLocalAudioPlayback: false },  // the agent keeps hearing the call (FR-004)
  systemAudio: 'include',                        // offer "Also share system audio" for screens
  windowAudio: 'window',                         // hint only; ignored where unsupported
  selfBrowserSurface: 'exclude',                 // our own tab is not offered
  surfaceSwitching: 'exclude',
  monitorTypeSurfaces: 'include',
});

export async function startCallCapture(mediaDevices = navigator.mediaDevices) {
  const stream = await mediaDevices.getDisplayMedia(DISPLAY_OPTIONS);
  const videoTrack = stream.getVideoTracks()[0] ?? null;
  const audioTrack = stream.getAudioTracks()[0] ?? null;
  const displaySurface = videoTrack?.getSettings?.().displaySurface ?? null;
  return { stream, audioTrack, videoTrack, displaySurface };
}

// The agent's microphone (research.md R4). A blocked or missing microphone only
// produces a warning code: customer captions never depend on it (FR-017).
// echoCancellation "all" (Chrome 141+) removes all system playout from the mic, such as
// the customer's voice coming out of laptop speakers. Older Chrome reads it as `true`.
export const MIC_CONSTRAINTS = Object.freeze({
  audio: { echoCancellation: 'all', noiseSuppression: true, autoGainControl: true },
});

export async function getMicrophone(mediaDevices = navigator.mediaDevices) {
  try {
    const stream = await mediaDevices.getUserMedia(MIC_CONSTRAINTS);
    const track = stream.getAudioTracks()[0];
    if (!track) return { code: 'W_MIC_MISSING' };
    return { stream, track };
  } catch (err) {
    const blocked = err?.name === 'NotAllowedError' || err?.name === 'SecurityError';
    return { code: blocked ? 'W_MIC_BLOCKED' : 'W_MIC_MISSING' };
  }
}

// Calls `cb` once when sharing ends from outside the page: Chrome's "Stop sharing" bar,
// or the shared tab closing. Stopping tracks ourselves does not fire `ended`.
export function onTrackEnded(stream, cb) {
  let fired = false;
  const handler = () => {
    if (!fired) {
      fired = true;
      cb();
    }
  };
  const tracks = stream.getTracks();
  tracks.forEach((t) => t.addEventListener('ended', handler));
  return () => tracks.forEach((t) => t.removeEventListener('ended', handler));
}
