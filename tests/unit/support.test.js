import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkSupport, readEnv, MIN_CHROME } from '../../web/js/core/support.js';

const chrome = (version, extra = {}) => ({
  brands: [{ brand: 'Not)A;Brand', version: '8' }, { brand: 'Chromium', version },
    { brand: 'Google Chrome', version }],
  mobile: false, hasSpeech: true, hasDisplayMedia: true, secure: true, ...extra,
});

test('current desktop Google Chrome is supported', () => {
  assert.deepEqual(checkSupport(chrome('154')), { ok: true });
});

test('minimum version is 133 (start(audioTrack) shipped in M133)', () => {
  assert.equal(MIN_CHROME, 133);
  assert.deepEqual(checkSupport(chrome('133')), { ok: true });
  assert.deepEqual(checkSupport(chrome('132')), { ok: false, code: 'E_OLD_CHROME' });
});

test('other Chromium browsers are refused', () => {
  const edge = { ...chrome('154'), brands: [{ brand: 'Chromium', version: '154' },
    { brand: 'Microsoft Edge', version: '154' }] };
  assert.deepEqual(checkSupport(edge), { ok: false, code: 'E_NOT_CHROME' });
});

test('browsers without brands (no userAgentData) are refused', () => {
  assert.deepEqual(checkSupport({ ...chrome('154'), brands: [] }), { ok: false, code: 'E_NOT_CHROME' });
  assert.deepEqual(checkSupport({}), { ok: false, code: 'E_NOT_CHROME' });
});

test('phones are refused', () => {
  assert.deepEqual(checkSupport(chrome('154', { mobile: true })), { ok: false, code: 'E_NOT_CHROME' });
});

test('missing APIs or an insecure page are refused', () => {
  for (const missing of ['hasSpeech', 'hasDisplayMedia', 'secure']) {
    assert.deepEqual(checkSupport(chrome('154', { [missing]: false })),
      { ok: false, code: 'E_NOT_CHROME' }, missing);
  }
});

test('readEnv reads brands, mobile, APIs and secure context from a window', () => {
  const win = {
    navigator: {
      userAgentData: { brands: [{ brand: 'Google Chrome', version: '154' }], mobile: false },
      mediaDevices: { getDisplayMedia() {} },
    },
    webkitSpeechRecognition: function SR() {},
    isSecureContext: true,
  };
  assert.deepEqual(readEnv(win), {
    brands: [{ brand: 'Google Chrome', version: '154' }],
    mobile: false, hasSpeech: true, hasDisplayMedia: true, secure: true,
  });
  assert.deepEqual(readEnv({ navigator: {} }), {
    brands: [], mobile: false, hasSpeech: false, hasDisplayMedia: false, secure: false,
  });
});
