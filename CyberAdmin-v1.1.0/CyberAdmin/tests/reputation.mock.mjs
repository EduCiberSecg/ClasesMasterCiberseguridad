import { checkSafeBrowsing, checkVirusTotal, vtId } from '../services/reputation.js';
export async function reputationMock() {
  const calls = [];
  const fakeFetch = async (url, opts) => {
    calls.push({ url: String(url), opts });
    if (String(url).includes('safebrowsing')) return { ok: true, status: 200, json: async () => ({ matches: [{ threatType: 'SOCIAL_ENGINEERING' }] }) };
    return { ok: true, status: 200, json: async () => ({ data: { attributes: { last_analysis_stats: { malicious: 3, suspicious: 0, harmless: 60, undetected: 10 } } } }) };
  };
  const sb = await checkSafeBrowsing('https://evil.example/', 'KEY', fakeFetch);
  const vt = await checkVirusTotal('https://evil.example/', 'KEY', fakeFetch);
  if (!calls[0].opts.credentials || calls[0].opts.credentials !== 'omit') throw new Error('debe omitir credenciales');
  if (!calls[1].url.endsWith(vtId('https://evil.example/'))) throw new Error('id VT');
  const none = await checkSafeBrowsing('https://x/', '', fakeFetch);
  if (none.status !== 'no-config' || calls.length !== 2) throw new Error('sin clave no debe hacer peticiones');
  return { sb, vt };
}
