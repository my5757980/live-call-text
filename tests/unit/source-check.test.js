import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkSource, shareErrorCode } from '../../web/js/core/source-check.js';

test('a shared surface with sound is accepted and named by its kind', () => {
  assert.deepEqual(checkSource({ audioTracks: 1, displaySurface: 'browser' }), { ok: true, source: 'tab' });
  assert.deepEqual(checkSource({ audioTracks: 1, displaySurface: 'monitor' }), { ok: true, source: 'screen' });
  assert.deepEqual(checkSource({ audioTracks: 1, displaySurface: 'window' }), { ok: true, source: 'window' });
});

test('a shared surface without sound gets the matching fix (FR-005)', () => {
  assert.deepEqual(checkSource({ audioTracks: 0, displaySurface: 'monitor' }), { ok: false, code: 'E_NO_CALL_SOUND_SCREEN' });
  assert.deepEqual(checkSource({ audioTracks: 0, displaySurface: 'window' }), { ok: false, code: 'E_NO_CALL_SOUND_WINDOW' });
  assert.deepEqual(checkSource({ audioTracks: 0, displaySurface: 'browser' }), { ok: false, code: 'E_NO_CALL_SOUND_TAB' });
  assert.deepEqual(checkSource({ audioTracks: 0, displaySurface: undefined }), { ok: false, code: 'E_NO_CALL_SOUND_SCREEN' });
});

test('any failure to share means the share was cancelled', () => {
  for (const name of ['NotAllowedError', 'AbortError', 'NotFoundError', 'NotReadableError', 'TypeError']) {
    assert.equal(shareErrorCode({ name }), 'E_SHARE_CANCELLED', name);
  }
  assert.equal(shareErrorCode(undefined), 'E_SHARE_CANCELLED');
});
