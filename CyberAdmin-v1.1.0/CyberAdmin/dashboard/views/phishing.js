import { h, card, fmtDate, field, empty, guard, toast, modal } from '../ui.js';
import { gauge } from '../charts.js';
import { analyzeUrl, urlForExternal } from '../../modules/phishing/analyzer.js';
import { checkSafeBrowsing, checkVirusTotal, ensureHostPermission } from '../../services/reputation.js';
import { getSettings } from '../../storage/settings.js';
import { put, getAll, newId } from '../../storage/db.js';
import { log } from '../../modules/audit/audit.js';
import { createIncident } from '../../modules/incidents/incidents.js';
import { createAlert } from '../../modules/alerts/alerts.js';
import { pageHeader } from './shared.js';

const COLORS = { low: '#19e68c', medium: '#ffb020', high: '#ff7a45', critical: '#ff3b5c' };
const REP_LABEL = { listed: 'LISTADA como amenaza', 'not-listed': 'No listada (no implica que sea segura)', unknown: 'Sin datos', 'no-config': 'No configurado', error: 'Error' };

export async function renderPhishing({ params, go }) {
  const settings = await getSettings();
  const input = h('input', { type: 'text', id: 'url', maxlength: 2048, placeholder: 'https://login-paypa1.com/verify', autocomplete: 'off', spellcheck: 'false', value: (params.get('u') || '').slice(0, 2048) });
  const ext = h('input', { type: 'checkbox', id: 'ext' });
  const hasKeys = !!(settings.safeBrowsingKey || settings.virusTotalKey);
  const out = h('div', { 'aria-live': 'polite' });
  const histBox = h('div');

  async function run() {
    const res = analyzeUrl(input.value);
    if (res.error) { toast(res.error, 'err'); return; }
    if (ext.checked) {
      let target;
      try { target = urlForExternal(input.value, settings.redactQuery); } catch (e) { toast(e.message, 'err'); return; }
      const ok = await modal('Consentimiento para consulta externa', h('div', {},
        h('p', {}, 'Se enviará la siguiente URL a los servicios de reputación configurados (Google Safe Browsing / VirusTotal):'),
        h('p', { class: 'mono' }, target),
        h('p', { class: 'warn' }, settings.redactQuery ? 'Se han eliminado parámetros y fragmento para proteger datos privados.' : 'Atención: la URL se envía completa, incluyendo parámetros que podrían contener datos privados.')),
        [{ label: 'Cancelar', value: false }, { label: 'Enviar y analizar', value: true, primary: true }]);
      if (ok) {
        if (!(await ensureHostPermission())) toast('Permiso de acceso a los servicios denegado; análisis solo local.', 'err');
        else {
          res.reputation = [];
          for (const [fn, key] of [[checkSafeBrowsing, settings.safeBrowsingKey], [checkVirusTotal, settings.virusTotalKey]]) {
            if (!key) continue;
            try { res.reputation.push(await fn(target, key)); } catch (e) { res.reputation.push({ provider: fn === checkVirusTotal ? 'VirusTotal' : 'Google Safe Browsing', status: 'error', message: 'Fallo de red' }); }
          }
          if (res.reputation.some((r) => r.status === 'listed')) { res.score = Math.max(res.score, 85); res.level = 'critical'; res.levelLabel = 'Crítico'; res.reasons.push('Un servicio de reputación externo lista esta URL como amenaza.'); res.lowDisclaimer = false; }
        }
      }
    }
    const usedExt = !!res.reputation?.length;
    await put('analyses', { id: newId(), ts: res.analyzedAt, input: res.input, score: res.score, level: res.level, levelLabel: res.levelLabel, indicators: res.indicators.map((i) => i.id), external: usedExt });
    await log('phishing.analyze', { url: res.input.slice(0, 120), level: res.level, external: usedExt });
    if ((res.level === 'critical' || res.level === 'high')) await createAlert({ severity: res.level, title: `URL de riesgo ${res.levelLabel.toLowerCase()}: ${res.input.slice(0, 80)}`, source: 'phishing' });
    out.replaceChildren(result(res)); loadHistory();
  }
  function result(res) {
    const ind = res.indicators.filter((i) => i.weight > 0);
    return card('Resultado del análisis', h('div', {},
      h('div', { class: 'row' }, gauge(res.score, COLORS[res.level]), h('div', {}, h('div', { class: `v risk-${res.level}`, }, h('b', {}, `Riesgo ${res.levelLabel.toUpperCase()}`)), h('small', {}, `Analizado: ${fmtDate(res.analyzedAt)}`), res.host ? h('div', { class: 'mono' }, res.host) : null)),
      res.lowDisclaimer ? h('p', { class: 'warn' }, 'Sin indicadores locales relevantes. Esto NO significa que la URL sea segura: comprueba el contexto y el remitente.') : null,
      h('h4', {}, `Indicadores detectados (${ind.length})`),
      ind.length ? ind.map((i) => h('div', { class: 'ind' }, h('b', {}, `${i.title}  (+${i.weight})`), h('small', {}, i.reason))) : empty('Ninguno'),
      res.reputation?.length ? [h('h4', {}, 'Reputación externa'), res.reputation.map((r) => h('div', { class: 'ind' }, h('b', {}, `${r.provider}: ${REP_LABEL[r.status] || r.status}`), h('small', {}, [r.threats?.join(', '), r.stats ? `malicious ${r.stats.malicious} · suspicious ${r.stats.suspicious}` : '', r.message].filter(Boolean).join(' · '))))] : null,
      h('h4', {}, 'Motivos de la clasificación'), res.reasons.length ? h('ul', {}, res.reasons.map((r) => h('li', {}, r))) : h('p', {}, 'Sin motivos de riesgo detectados localmente.'),
      h('h4', {}, 'Recomendaciones'), h('ul', {}, res.recommendations.map((r) => h('li', {}, r))),
      h('div', { class: 'row' }, h('button', { class: 'btn primary', onclick: () => guard(async () => {
        const inc = await createIncident({ title: `URL sospechosa: ${res.host || res.input.slice(0, 60)}`, category: 'phishing', priority: res.level === 'critical' ? 'critical' : res.level === 'high' ? 'high' : 'medium', description: `URL analizada: ${res.input}\nRiesgo: ${res.levelLabel} (${res.score}/100)\nIndicadores: ${ind.map((i) => i.title).join('; ') || 'ninguno'}`, source: 'phishing' });
        toast(`Incidente ${inc.code} creado`); go('/incidents/' + inc.id);
      }) }, 'Crear incidente'))));
  }
  async function loadHistory() {
    const rows = (await getAll('analyses')).sort((a, b) => b.ts.localeCompare(a.ts)).slice(0, 15);
    histBox.replaceChildren(card('Análisis recientes', rows.length ? h('div', { class: 'tw' }, h('table', {}, h('thead', {}, h('tr', {}, ['Fecha', 'URL', 'Riesgo', 'Ext.'].map((t) => h('th', {}, t)))),
      h('tbody', {}, rows.map((r) => h('tr', { class: 'click', onclick: () => { input.value = r.input; }, title: 'Reutilizar URL' }, h('td', {}, fmtDate(r.ts)), h('td', { class: 'mono' }, r.input.slice(0, 90)), h('td', {}, h('span', { class: `risk-${r.level}` }, `${r.levelLabel} (${r.score})`)), h('td', {}, r.external ? 'Sí' : 'No')))))) : empty('Aún no hay análisis')));
  }
  const root = h('div', {}, pageHeader('Analizador de phishing', 'Análisis heurístico local · sin envío de datos por defecto'),
    card('Analizar URL', h('div', {}, field('URL sospechosa', input), h('label', { class: 'check' }, ext, h('span', {}, 'Consultar además servicios de reputación externos (envía la URL; requiere tu consentimiento en cada análisis). ', hasKeys ? '' : h('small', {}, 'Configura una clave API en Configuración.'))),
      h('div', { class: 'row' }, h('button', { class: 'btn primary', onclick: () => guard(run) }, 'Analizar')))), out, histBox);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') guard(run); });
  loadHistory();
  return root;
}
