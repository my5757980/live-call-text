// The agent's two language choices, remembered on this laptop only (FR-013, research R10).

export const LANGS = Object.freeze(['en-US', 'ur-PK']);
export const PREFS_KEY = 'lct.prefs.v1';
const DEFAULTS = Object.freeze({ customerLang: 'en-US', agentLang: 'en-US' });

const valid = (lang) => LANGS.includes(lang);
const clean = (p) => ({
  customerLang: valid(p?.customerLang) ? p.customerLang : DEFAULTS.customerLang,
  agentLang: valid(p?.agentLang) ? p.agentLang : DEFAULTS.agentLang,
});

export function loadPrefs(storage) {
  try {
    const raw = storage?.getItem(PREFS_KEY);
    return raw ? clean(JSON.parse(raw)) : { ...DEFAULTS };
  } catch {
    return { ...DEFAULTS };
  }
}

export function savePrefs(storage, prefs) {
  try {
    if (!storage) return false;
    storage.setItem(PREFS_KEY, JSON.stringify({ v: 1, ...clean(prefs) }));
    return true;
  } catch {
    return false;
  }
}

export const isRtl = (lang) => typeof lang === 'string' && lang.toLowerCase().startsWith('ur');
