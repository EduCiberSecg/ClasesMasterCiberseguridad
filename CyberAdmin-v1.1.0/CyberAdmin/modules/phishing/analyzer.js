// Motor de análisis de URLs 100% local: no realiza ninguna petición de red.
// Un resultado "bajo" NUNCA significa "seguro": solo que no hay indicadores locales relevantes.
export const BRAND_DOMAINS = {
  paypal: ['paypal.com'], google: ['google.com', 'google.es', 'gmail.com', 'youtube.com'], microsoft: ['microsoft.com', 'live.com', 'office.com', 'outlook.com', 'microsoftonline.com'],
  apple: ['apple.com', 'icloud.com'], amazon: ['amazon.com', 'amazon.es', 'amazon.de', 'amazonaws.com'], facebook: ['facebook.com', 'fb.com'], instagram: ['instagram.com'],
  netflix: ['netflix.com'], santander: ['santander.com', 'bancosantander.es', 'santander.es'], bbva: ['bbva.com', 'bbva.es'], caixabank: ['caixabank.es', 'caixabank.com'],
  correos: ['correos.es'], dhl: ['dhl.com', 'dhl.de'], fedex: ['fedex.com'], linkedin: ['linkedin.com'], dropbox: ['dropbox.com'], whatsapp: ['whatsapp.com'],
  binance: ['binance.com'], coinbase: ['coinbase.com'], github: ['github.com'], adobe: ['adobe.com'], docusign: ['docusign.com', 'docusign.net'], telegram: ['telegram.org', 't.me'],
  sabadell: ['bancsabadell.com', 'sabadell.com'], iberdrola: ['iberdrola.es', 'iberdrola.com'], agenciatributaria: ['agenciatributaria.gob.es', 'agenciatributaria.es'], seguridadsocial: ['seg-social.es', 'seg-social.gob.es']
};
const SECOND_LEVEL = new Set(['co.uk', 'com.es', 'com.br', 'com.au', 'co.jp', 'gob.es', 'org.es', 'co.in', 'com.mx', 'com.ar']);
const RISKY_TLDS = new Set(['zip', 'mov', 'xyz', 'top', 'click', 'link', 'work', 'gq', 'tk', 'ml', 'cf', 'ga', 'cam', 'rest', 'icu', 'buzz', 'country', 'support', 'loan', 'men', 'monster']);
const SHORTENERS = new Set(['bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'ow.ly', 'is.gd', 'buff.ly', 'cutt.ly', 'rebrand.ly', 'shorturl.at', 'tiny.cc', 'rb.gy', 'lnkd.in']);
const KEYWORDS = ['login', 'signin', 'verify', 'verif', 'secure', 'account', 'update', 'confirm', 'password', 'banking', 'wallet', 'suspend', 'unlock', 'invoice', 'billing', 'recover', 'security-alert', 'webscr', 'cuenta', 'acceso', 'clave'];
export const LEVELS = [{ max: 14, key: 'low', label: 'Bajo' }, { max: 39, key: 'medium', label: 'Medio' }, { max: 69, key: 'high', label: 'Alto' }, { max: 100, key: 'critical', label: 'Crítico' }];
export const levelFor = (score) => LEVELS.find((l) => score <= l.max) || LEVELS[3];

export function registrable(host) {
  const parts = host.split('.');
  if (parts.length <= 2) return host;
  const last2 = parts.slice(-2).join('.');
  return SECOND_LEVEL.has(last2) ? parts.slice(-3).join('.') : last2;
}
export function levenshtein(a, b) {
  const m = a.length, n = b.length;
  if (!m) return n; if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[n];
}
const deLeet = (s) => s.replace(/rn/g, 'm').replace(/vv/g, 'w').replace(/0/g, 'o').replace(/1/g, 'l').replace(/3/g, 'e').replace(/5/g, 's').replace(/\$/g, 's');

export function normalizeInput(raw) {
  const input = String(raw ?? '').replace(/[\u0000-\u001F\u007F]/g, '').trim();
  if (!input) return { error: 'Introduce una URL.' };
  if (input.length > 2048) return { error: 'La URL supera los 2048 caracteres permitidos.' };
  const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(input) && !/^[a-z0-9.-]+:\d+(\/|$)/i.test(input);
  return { input, withScheme: hasScheme ? input : 'http://' + input, assumedScheme: !hasScheme };
}

export function analyzeUrl(raw, now = new Date()) {
  const n = normalizeInput(raw);
  if (n.error) return { error: n.error };
  const findings = [];
  const add = (id, title, weight, reason) => findings.push({ id, title, weight, reason });
  let u;
  try { u = new URL(n.withScheme); } catch { return { error: 'La URL no es válida.' }; }
  const scheme = u.protocol.replace(':', '').toLowerCase();
  const base = { input: n.input, analyzedAt: now.toISOString(), reputation: null };

  if (!['http', 'https'].includes(scheme)) {
    add('scheme', 'Esquema no web', 70, `El esquema "${scheme}:" puede ejecutar código o incrustar contenido; no es un enlace web normal.`);
    return finish(base, findings, { host: '', scheme });
  }
  if (n.assumedScheme) add('noscheme', 'Sin esquema explícito', 0, 'Se asumió http:// para poder analizar la dirección.');
  const host = u.hostname.toLowerCase().replace(/\.$/, '');
  const rawHostMatch = n.withScheme.match(/^[a-z]+:\/\/(?:[^/?#@]*@)?([^/?#:]*)/i);
  const rawHost = rawHostMatch ? rawHostMatch[1] : host;

  if (scheme === 'http') add('http', 'HTTP sin cifrar', 15, 'La conexión no está cifrada: un atacante en red podría interceptar o alterar el contenido y las credenciales.');
  if (u.username || n.withScheme.replace(/^[a-z]+:\/\//i, '').split(/[/?#]/)[0].includes('@')) add('userinfo', 'Credenciales/“@” en la URL', 35, 'El texto antes de “@” se usa para aparentar otro dominio; el destino real es el que va después.');

  const isIPv4 = /^\d{1,3}(\.\d{1,3}){3}$/.test(host);
  const isIPv6 = host.startsWith('[');
  const obfuscatedIp = /^(0x[0-9a-f]+|\d+)$/i.test(rawHost) || /^0x[0-9a-f]+(\.|$)/i.test(rawHost);
  if (isIPv4 || isIPv6 || obfuscatedIp) add('ip', 'Dirección IP en lugar de dominio', 35, 'Los sitios legítimos casi siempre usan un dominio; las IP directas son habituales en infraestructura de phishing.');

  const labels = host.split('.');
  const reg = isIPv4 || isIPv6 ? host : registrable(host);
  const sub = isIPv4 || isIPv6 ? [] : labels.slice(0, labels.length - reg.split('.').length);
  const sld = isIPv4 || isIPv6 ? '' : reg.split('.')[0];
  const tld = labels[labels.length - 1];

  if (labels.some((l) => l.startsWith('xn--')) || /[^\x00-\x7F]/.test(rawHost)) {
    add('punycode', 'Dominio Punycode / IDN', 30, 'Usa caracteres internacionales que pueden imitar letras latinas (ataque homográfico).');
    if (/\p{Script=Cyrillic}|\p{Script=Greek}/u.test(rawHost) && /[a-z]/i.test(rawHost)) add('mixed', 'Mezcla de alfabetos', 30, 'Combina letras latinas con cirílicas/griegas visualmente idénticas.');
  }
  if (sub.length > 3) add('subdomains', 'Subdominios excesivos', 20, `Tiene ${sub.length} niveles de subdominio; se usan para esconder el dominio real al final.`);
  else if (sub.length === 3) add('subdomains', 'Muchos subdominios', 10, 'Tres niveles de subdominio: revisa cuál es el dominio registrable real.');
  if ((host.match(/-/g) || []).length >= 3) add('hyphens', 'Guiones abundantes', 12, 'Dominios con muchos guiones son típicos de dominios generados para suplantar.');
  if (/\d/.test(sld) && /[a-z]/.test(sld) && sld.length > 3) add('digits', 'Dígitos mezclados con letras', 8, 'Mezclar números y letras puede sustituir caracteres (0↔o, 1↔l).');
  if (RISKY_TLDS.has(tld)) add('tld', `TLD de riesgo (.${tld})`, 12, 'Este TLD tiene un uso desproporcionado en campañas maliciosas (no implica que todo el dominio lo sea).');
  if (SHORTENERS.has(reg)) add('shortener', 'Acortador de URL', 20, 'Oculta el destino real. Expándelo en un entorno aislado (la resolución de redirecciones requiere backend/sandbox).');
  if (!isIPv4 && !isIPv6 && host.length > 40) add('longhost', 'Nombre de host muy largo', 8, 'Hosts largos dificultan ver el dominio real.');
  if (u.port && !['80', '443', ''].includes(u.port)) add('port', `Puerto no estándar (${u.port})`, 10, 'Los servicios web legítimos rara vez usan puertos atípicos en enlaces de usuario.');

  // Suplantación de marcas
  if (!isIPv4 && !isIPv6) {
    const hostFlat = deLeet(labels.join('.'));
    for (const [brand, doms] of Object.entries(BRAND_DOMAINS)) {
      const legit = doms.some((d) => host === d || host.endsWith('.' + d));
      if (legit) continue;
      if (hostFlat.includes(brand) || host.replace(/-/g, '').includes(brand)) {
        add('brand', `Posible suplantación de “${brand}”`, 40, `El nombre de la marca aparece en el host pero el dominio real es ${reg}, que no pertenece a ${brand}.`);
        break;
      }
      const d = levenshtein(deLeet(sld), brand);
      if (brand.length >= 5 && d > 0 && d <= 2) { add('typosquat', `Parecido a “${brand}” (typosquatting)`, 35, `“${sld}” difiere en solo ${d} carácter(es) de “${brand}”.`); break; }
    }
  }
  const path = decodeURIComponent_safe(u.pathname + u.search).toLowerCase();
  const kw = KEYWORDS.filter((k) => path.includes(k) || host.includes(k));
  if (kw.length >= 2) add('keywords', 'Palabras típicas de phishing', 15, `Contiene: ${[...new Set(kw)].slice(0, 5).join(', ')}.`);
  else if (kw.length === 1) add('keywords', 'Palabra sensible en la URL', 6, `Contiene “${kw[0]}”; valora si el contexto es coherente.`);
  if (/%[0-9a-f]{2}/i.test(u.pathname + u.search) && (u.pathname + u.search).match(/%[0-9a-f]{2}/gi).length > 6) add('encoding', 'Codificación porcentual excesiva', 10, 'Se usa para ofuscar el contenido real de la URL.');
  if (/[?&](url|redirect|redirect_uri|next|return|returnurl|continue|dest|goto|target)=https?(%3a|:)/i.test(u.search)) add('openredirect', 'Posible redirección abierta', 25, 'Un parámetro lleva otra URL completa: puede encadenar a un sitio malicioso desde un dominio de confianza.');
  if (n.withScheme.length > 200) add('longurl', 'URL muy larga', 6, 'URLs largas suelen ocultar el destino o embeber datos.');
  if (/\.(exe|scr|js|vbs|bat|cmd|msi|jar|iso|lnk|hta|ps1)(\?|$)/i.test(u.pathname)) add('download', 'Descarga de fichero ejecutable', 30, 'La URL apunta directamente a un fichero ejecutable/script.');

  return finish(base, findings, { host, scheme, registrable: reg });
}
function decodeURIComponent_safe(s) { try { return decodeURIComponent(s); } catch { return s; } }

function finish(base, findings, meta) {
  const score = Math.min(100, findings.reduce((s, f) => s + f.weight, 0));
  const level = levelFor(score);
  const reasons = findings.filter((f) => f.weight > 0).map((f) => f.reason);
  const rec = [];
  if (level.key === 'low') rec.push('No se detectaron indicadores locales relevantes, pero esto NO garantiza que la URL sea segura. Verifica el remitente/contexto.');
  else {
    rec.push('No abras el enlace ni introduzcas credenciales hasta verificarlo por otro canal (llamada al remitente, portal oficial escrito a mano).');
    rec.push('Si llegó por correo/mensajería, conserva el mensaje original con cabeceras como evidencia y repórtalo.');
  }
  if (level.key === 'high' || level.key === 'critical') { rec.push('Considera bloquear el dominio en proxy/DNS/pasarela de correo (acción manual autorizada) y abre un incidente de phishing.'); rec.push('Si alguien interactuó con el enlace, sigue el protocolo de Phishing y restablece credenciales afectadas.'); }
  if (findings.some((f) => f.id === 'shortener')) rec.push('Expande el acortador en un entorno aislado o con un servicio de expansión corporativo.');
  return { ...base, ...meta, score, level: level.key, levelLabel: level.label, indicators: findings, reasons, recommendations: rec, lowDisclaimer: level.key === 'low' };
}

// URL que puede enviarse a servicios externos (opcionalmente sin query/fragmento y sin credenciales).
export function urlForExternal(raw, redactQuery = true) {
  const n = normalizeInput(raw);
  if (n.error) throw new Error(n.error);
  const u = new URL(n.withScheme);
  u.username = ''; u.password = '';
  if (redactQuery) { u.search = ''; u.hash = ''; }
  return u.toString();
}
