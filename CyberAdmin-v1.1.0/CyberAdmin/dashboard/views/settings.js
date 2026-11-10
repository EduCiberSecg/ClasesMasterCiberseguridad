import { h, card, field, guard, toast, confirmDialog } from '../ui.js';
import { getSettings, setSettings, maskKey } from '../../storage/settings.js';
import { loadDemo, removeDemo } from '../../modules/incidents/demo.js';
import { clearAll } from '../../storage/db.js';
import { log } from '../../modules/audit/audit.js';
import { listModels, ensureOllamaPermission } from '../../services/ollama.js';
import { pageHeader } from './shared.js';

export async function renderSettings({ go }) {
  const s = await getSettings();
  const op = h('input', { value: s.operator, maxlength: 64 });
  const sb = h('input', { type: 'password', placeholder: s.safeBrowsingKey ? maskKey(s.safeBrowsingKey) + ' (guardada)' : 'API key de Google Safe Browsing', autocomplete: 'off' });
  const vt = h('input', { type: 'password', placeholder: s.virusTotalKey ? maskKey(s.virusTotalKey) + ' (guardada)' : 'API key de VirusTotal', autocomplete: 'off' });
  const redact = h('input', { type: 'checkbox', checked: s.redactQuery });
  const be = h('input', { value: s.backendUrl, placeholder: 'https://backend.empresa.local (opcional, futuro)', maxlength: 200 });
  const ou = h('input', { value: s.ollamaUrl, placeholder: 'http://localhost:11434', maxlength: 60 });
  const om = h('input', { value: s.ollamaModel, placeholder: 'p. ej. llama3.2 (o elígelo en Asistente IA)', maxlength: 100 });
  const testOllama = () => guard(async () => {
    const saved = await setSettings({ ollamaUrl: ou.value, ollamaModel: om.value });
    if (!(await ensureOllamaPermission())) throw new Error('Permiso denegado para acceder a Ollama en localhost.');
    const names = await listModels(saved.ollamaUrl);
    toast(`Ollama OK: ${names.length} modelo(s) disponibles`);
  });
  const save = () => guard(async () => {
    const patch = { operator: op.value, redactQuery: redact.checked, backendUrl: be.value, ollamaUrl: ou.value, ollamaModel: om.value };
    if (sb.value) patch.safeBrowsingKey = sb.value; if (vt.value) patch.virusTotalKey = vt.value;
    await setSettings(patch); await log('settings.update', { fields: Object.keys(patch) }); toast('Configuración guardada'); go('/settings?r=' + Date.now());
  });
  const clearKeys = () => guard(async () => { await setSettings({ safeBrowsingKey: '', virusTotalKey: '' }); await log('settings.keys-cleared'); toast('Claves eliminadas'); go('/settings?r=' + Date.now()); });
  return h('div', {}, pageHeader('Configuración', 'Operador, integraciones y datos'),
    h('div', { class: 'grid g2' },
      card('General', h('div', {}, field('Nombre de operador (aparece en auditoría)', op), h('label', { class: 'check' }, redact, h('span', {}, 'Eliminar parámetros y fragmento de las URLs antes de enviarlas a servicios externos (recomendado)')), h('br'), field('URL de backend corporativo (reservado)', be, 'Debe ser https. En v1.0 no se envían datos al backend.'), h('button', { class: 'btn primary', onclick: save }, 'Guardar'))),
      card('Servicios de reputación', h('div', {}, h('p', { class: 'warn' }, 'Las claves se guardan solo en el almacenamiento local de la extensión (chrome.storage.local), no se sincronizan, no se exportan ni aparecen en auditoría. Para uso corporativo, usa claves con cuota limitada y un backend proxy.'),
        field('Google Safe Browsing API key', sb), field('VirusTotal API key', vt), h('div', { class: 'row' }, h('button', { class: 'btn primary', onclick: save }, 'Guardar'), h('button', { class: 'btn', onclick: clearKeys }, 'Borrar claves'))))),
    card('Asistente IA (Ollama)', h('div', {}, h('p', { class: 'warn' }, 'Ollama se ejecuta en tu equipo: las consultas no salen de él. Debe arrancarse con OLLAMA_ORIGINS=chrome-extension://* (ver INSTALL.md). Solo se admite localhost / 127.0.0.1.'),
      field('URL de Ollama', ou), field('Modelo por defecto', om), h('div', { class: 'row' }, h('button', { class: 'btn primary', onclick: save }, 'Guardar'), h('button', { class: 'btn', onclick: testOllama }, 'Probar conexión')))),
    card('Datos', h('div', { class: 'row' },
      h('button', { class: 'btn', onclick: () => guard(async () => { await loadDemo(); toast('Datos de demostración cargados'); }) }, 'Cargar datos de demostración'),
      h('button', { class: 'btn', onclick: () => guard(async () => { await removeDemo(); toast('Incidentes de demostración eliminados'); }) }, 'Eliminar incidentes de demostración'),
      h('button', { class: 'btn danger', onclick: () => guard(async () => { if (await confirmDialog('Borrar TODOS los datos', 'Se eliminarán incidentes, alertas, auditoría y análisis locales. Exporta antes un informe si lo necesitas. Esta acción no se puede deshacer.', true)) { await clearAll(); toast('Datos eliminados'); go('/'); location.reload(); } }) }, 'Borrar todos los datos'))));
}
