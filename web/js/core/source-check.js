// Checks what the agent shared in Chrome's share window (research.md R2, FR-005).

const SOURCE_BY_SURFACE = { browser: 'tab', monitor: 'screen', window: 'window' };
const NO_SOUND_BY_SURFACE = {
  browser: 'E_NO_CALL_SOUND_TAB',
  monitor: 'E_NO_CALL_SOUND_SCREEN',
  window: 'E_NO_CALL_SOUND_WINDOW',
};

export function checkSource({ audioTracks, displaySurface }) {
  if (audioTracks > 0) return { ok: true, source: SOURCE_BY_SURFACE[displaySurface] ?? 'screen' };
  return { ok: false, code: NO_SOUND_BY_SURFACE[displaySurface] ?? 'E_NO_CALL_SOUND_SCREEN' };
}

// Whatever made getDisplayMedia fail (closed window, denied, no source), the fix for the
// agent is the same: press Start and choose the call.
export const shareErrorCode = () => 'E_SHARE_CANCELLED';
