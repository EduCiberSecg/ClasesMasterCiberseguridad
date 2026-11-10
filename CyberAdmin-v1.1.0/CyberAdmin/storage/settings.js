// Ajustes y claves API. Las claves se guardan SOLO en chrome.storage.local (aislado de páginas web),
// nunca en IndexedDB, nunca en auditorías ni en informes exportados.
export const DEFAULTS = Object.freeze({
  operator: 'local-operator',
  redactQuery: true,
  safeBrowsingKey: '',
  virusTotalKey: '',
  backendUrl: '',
  ollamaUrl: 'http://localhost:11434',
  ollamaModel: ''
});
const memory = {};
const area = () => globalThis.chrome?.storage?.local;

export async function getSettings() {
  const a = area();
  let stored = memory;
  if (a) stored = (await a.get('settings')).settings || {};
  return { ...DEFAULTS, ...stored };
}
export async function setSettings(patch) {
  const next = sanitizeSettings({ ...(await getSettings()), ...patch });
  const a = area();
  if (a) await a.set({ settings: next }); else Object.assign(memory, next);
  return next;
}
export function sanitizeSettings(s) {
  const op = String(s.operator ?? '').replace(/[^\p{L}\p{N} ._@-]/gu, '').trim().slice(0, 64);
  const key = (k) => String(k ?? '').replace(/[^A-Za-z0-9_\-]/g, '').slice(0, 128);
  let backendUrl = String(s.backendUrl ?? '').trim();
  if (backendUrl && !/^https:\/\/[^\s]+$/i.test(backendUrl)) backendUrl = '';
  // Ollama: solo equipo local (la CSP y el permiso de host solo cubren localhost/127.0.0.1).
  let ollamaUrl = String(s.ollamaUrl ?? '').trim().replace(/\/+$/, '');
  if (!/^http:\/\/(localhost|127\.0\.0\.1)(:\d{1,5})?$/i.test(ollamaUrl)) ollamaUrl = DEFAULTS.ollamaUrl;
  const ollamaModel = String(s.ollamaModel ?? '').replace(/[^A-Za-z0-9_.:\/-]/g, '').slice(0, 100);
  return {
    operator: op || DEFAULTS.operator,
    redactQuery: s.redactQuery !== false,
    safeBrowsingKey: key(s.safeBrowsingKey),
    virusTotalKey: key(s.virusTotalKey),
    backendUrl,
    ollamaUrl,
    ollamaModel
  };
}
export const maskKey = (k) => (k ? '••••••••' + k.slice(-4) : '');
export async function resetSettings() {
  const a = area();
  if (a) await a.remove('settings'); else for (const k of Object.keys(memory)) delete memory[k];
}
