// Integraciones de reputación de URL. SOLO se invocan con consentimiento explícito del usuario.
// Las claves no se registran en ningún log. Un resultado "no listado" NO implica que la URL sea segura.
const SB_ENDPOINT = 'https://safebrowsing.googleapis.com/v4/threatMatches:find';
const VT_ENDPOINT = 'https://www.virustotal.com/api/v3/urls/';
export const REPUTATION_ORIGINS = ['https://safebrowsing.googleapis.com/*', 'https://www.virustotal.com/*'];

export async function checkSafeBrowsing(url, apiKey, fetchImpl = globalThis.fetch) {
  if (!apiKey) return { provider: 'Google Safe Browsing', status: 'no-config', message: 'Falta la clave API (Configuración).' };
  const body = {
    client: { clientId: 'cyberadmin-security-center', clientVersion: '1.0.0' },
    threatInfo: {
      threatTypes: ['MALWARE', 'SOCIAL_ENGINEERING', 'UNWANTED_SOFTWARE', 'POTENTIALLY_HARMFUL_APPLICATION'],
      platformTypes: ['ANY_PLATFORM'], threatEntryTypes: ['URL'], threatEntries: [{ url }]
    }
  };
  const r = await fetchImpl(`${SB_ENDPOINT}?key=${encodeURIComponent(apiKey)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), credentials: 'omit', referrerPolicy: 'no-referrer' });
  if (!r.ok) return { provider: 'Google Safe Browsing', status: 'error', message: `HTTP ${r.status}` };
  const data = await r.json();
  const matches = data.matches || [];
  return { provider: 'Google Safe Browsing', status: matches.length ? 'listed' : 'not-listed', threats: [...new Set(matches.map((m) => m.threatType))] };
}
export const vtId = (url) => btoa(url).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
export async function checkVirusTotal(url, apiKey, fetchImpl = globalThis.fetch) {
  if (!apiKey) return { provider: 'VirusTotal', status: 'no-config', message: 'Falta la clave API (Configuración).' };
  const r = await fetchImpl(VT_ENDPOINT + vtId(url), { headers: { 'x-apikey': apiKey }, credentials: 'omit', referrerPolicy: 'no-referrer' });
  if (r.status === 404) return { provider: 'VirusTotal', status: 'unknown', message: 'VirusTotal no tiene análisis previo de esta URL.' };
  if (!r.ok) return { provider: 'VirusTotal', status: 'error', message: `HTTP ${r.status}` };
  const st = (await r.json())?.data?.attributes?.last_analysis_stats || {};
  const bad = (st.malicious || 0) + (st.suspicious || 0);
  return { provider: 'VirusTotal', status: bad > 0 ? 'listed' : 'not-listed', stats: { malicious: st.malicious || 0, suspicious: st.suspicious || 0, harmless: st.harmless || 0, undetected: st.undetected || 0 } };
}
export async function ensureHostPermission() {
  const p = globalThis.chrome?.permissions;
  if (!p) return false;
  if (await p.contains({ origins: REPUTATION_ORIGINS })) return true;
  return p.request({ origins: REPUTATION_ORIGINS }); // requiere gesto del usuario
}
