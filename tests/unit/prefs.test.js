import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadPrefs, savePrefs, isRtl, LANGS, PREFS_KEY } from '../../web/js/core/prefs.js';

class MemStorage {
  constructor(init = {}) { this.map = new Map(Object.entries(init)); }
  getItem(k) { return this.map.has(k) ? this.map.get(k) : null; }
  setItem(k, v) { this.map.set(k, String(v)); }
}
const throwing = {
  getItem() { throw new Error('storage blocked'); },
  setItem() { throw new Error('storage blocked'); },
};

test('languages and key', () => {
  assert.deepEqual(LANGS, ['en-US', 'ur-PK']);
  assert.equal(PREFS_KEY, 'lct.prefs.v1');
});

test('empty storage gives English for both sides', () => {
  assert.deepEqual(loadPrefs(new MemStorage()), { customerLang: 'en-US', agentLang: 'en-US' });
  assert.deepEqual(loadPrefs(null), { customerLang: 'en-US', agentLang: 'en-US' });
});

test('choices round-trip under lct.prefs.v1', () => {
  const s = new MemStorage();
  savePrefs(s, { customerLang: 'ur-PK', agentLang: 'en-US' });
  assert.deepEqual(JSON.parse(s.getItem('lct.prefs.v1')),
    { v: 1, customerLang: 'ur-PK', agentLang: 'en-US' });
  assert.deepEqual(loadPrefs(s), { customerLang: 'ur-PK', agentLang: 'en-US' });
});

test('bad JSON or unknown languages fall back to defaults', () => {
  assert.deepEqual(loadPrefs(new MemStorage({ 'lct.prefs.v1': '{nope' })),
    { customerLang: 'en-US', agentLang: 'en-US' });
  assert.deepEqual(
    loadPrefs(new MemStorage({ 'lct.prefs.v1': JSON.stringify({ customerLang: 'fr-FR', agentLang: 'ur-PK' }) })),
    { customerLang: 'en-US', agentLang: 'ur-PK' });
});

test('a storage that throws gives defaults and saving never throws', () => {
  assert.deepEqual(loadPrefs(throwing), { customerLang: 'en-US', agentLang: 'en-US' });
  assert.doesNotThrow(() => savePrefs(throwing, { customerLang: 'ur-PK', agentLang: 'ur-PK' }));
  assert.equal(savePrefs(throwing, { customerLang: 'ur-PK', agentLang: 'ur-PK' }), false);
});

test('Urdu is right-to-left, English is not', () => {
  assert.equal(isRtl('ur-PK'), true);
  assert.equal(isRtl('en-US'), false);
  assert.equal(isRtl(undefined), false);
});
