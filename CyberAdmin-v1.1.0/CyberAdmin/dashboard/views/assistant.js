import { h, card, field, select, guard, toast } from '../ui.js';
import { getSettings, setSettings } from '../../storage/settings.js';
import { listModels, ensureOllamaPermission, hasOllamaPermission } from '../../services/ollama.js';
import { ask } from '../../modules/assistant/assistant.js';
import { pageHeader } from './shared.js';

const chatState = { messages: [], useContext: false }; // persiste mientras la pestaña esté abierta
const QUICK = [
  'Resume los pasos de contención ante un ransomware activo.',
  '¿Cómo analizo las cabeceras de un correo sospechoso de phishing?',
  'Dame una lista de IOC típicos de una cuenta comprometida.',
  'Redacta un resumen ejecutivo breve de un incidente de fuga de datos.'
];
// Texto plano con bloques ``` como <pre><code> (sin innerHTML: todo con nodos de texto).
function renderText(text) {
  return text.split(/```[^\n]*\n?/).map((part, i) => (i % 2 ? h('pre', { class: 'code' }, h('code', {}, part.replace(/\n$/, ''))) : part ? h('p', { class: 'msg-t' }, part) : null));
}
export async function renderAssistant() {
  let s = await getSettings();
  const log = h('div', { class: 'chat-log', 'aria-live': 'polite' });
  const status = h('span', { class: 'sub' });
  const input = h('textarea', { placeholder: 'Pregunta sobre un incidente, un correo sospechoso, un log…  (Ctrl+Enter para enviar)', maxlength: 4000, 'aria-label': 'Pregunta' });
  const ctx = h('input', { type: 'checkbox', checked: chatState.useContext, onchange: (e) => { chatState.useContext = e.target.checked; } });
  const modelSel = h('select', { 'aria-label': 'Modelo' });
  let abort = null;
  const sendBtn = h('button', { class: 'btn primary', onclick: () => send() }, 'Enviar');
  const stopBtn = h('button', { class: 'btn danger hidden', onclick: () => abort?.abort() }, 'Detener');

  const bubble = (m) => h('div', { class: `msg ${m.role}` }, h('small', {}, m.role === 'user' ? 'Tú' : s.ollamaModel || 'IA'), h('div', { class: 'msg-b' }, renderText(m.content)));
  const drawLog = () => {
    log.replaceChildren(...(chatState.messages.length ? chatState.messages.map(bubble) : [h('p', { class: 'empty' }, 'Sin mensajes. Elige una pregunta rápida o escribe la tuya.')]));
    log.scrollTop = log.scrollHeight;
  };
  async function loadModels(notify) {
    try {
      if (notify ? !(await ensureOllamaPermission()) : !(await hasOllamaPermission())) {
        status.textContent = 'Falta el permiso de acceso a Ollama (localhost). Pulsa «Reconectar» para concederlo.';
        modelSel.replaceChildren(h('option', { value: '' }, '(sin permiso)')); return;
      }
      const names = await listModels(s.ollamaUrl);
      if (!names.length) { status.textContent = 'Ollama conectado, pero sin modelos. Ejecuta: ollama pull llama3.2'; modelSel.replaceChildren(h('option', { value: '' }, '(sin modelos)')); return; }
      if (!names.includes(s.ollamaModel)) { s = await setSettings({ ollamaModel: names[0] }); }
      modelSel.replaceChildren(...names.map((n) => h('option', { value: n, selected: n === s.ollamaModel }, n)));
      status.textContent = `Conectado a ${s.ollamaUrl} · ${names.length} modelo(s)`;
      if (notify) toast('Conectado a Ollama');
    } catch (e) { status.textContent = e.message; modelSel.replaceChildren(h('option', { value: '' }, '(sin conexión)')); }
  }
  modelSel.addEventListener('change', () => guard(async () => { s = await setSettings({ ollamaModel: modelSel.value }); }));

  async function send(text) {
    const q = (text ?? input.value).trim();
    if (!q || abort) return;
    if (!s.ollamaModel) { toast('No hay modelo seleccionado. Comprueba la conexión con Ollama.', 'err'); return; }
    if (!(await ensureOllamaPermission())) { toast('Se necesita permiso para acceder a Ollama en localhost.', 'err'); return; }
    input.value = '';
    chatState.messages.push({ role: 'user', content: q });
    const reply = { role: 'assistant', content: '' };
    chatState.messages.push(reply); drawLog();
    abort = new AbortController(); sendBtn.disabled = true; stopBtn.classList.remove('hidden');
    try {
      await ask(chatState.messages.slice(0, -1), { useContext: chatState.useContext, signal: abort.signal, onToken: (t) => { reply.content = t; drawLog(); } });
    } catch (e) {
      if (e?.name === 'AbortError') reply.content = (reply.content || '') + '\n[detenido]';
      else { chatState.messages.pop(); toast(e.message || String(e), 'err'); }
    } finally { abort = null; sendBtn.disabled = false; stopBtn.classList.add('hidden'); drawLog(); }
  }
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); send(); } });

  const root = h('div', {}, pageHeader('Asistente IA', 'Consultas de seguridad con Ollama (modelo local, los datos no salen de tu equipo)', h('div', { class: 'row' },
    h('button', { class: 'btn', onclick: () => { chatState.messages = []; drawLog(); } }, 'Nueva conversación'),
    h('button', { class: 'btn', onclick: () => guard(() => loadModels(true)) }, 'Reconectar'))),
    card(null, h('div', {},
      h('div', { class: 'row' }, h('div', { class: 'grow' }, field('Modelo', modelSel)), h('label', { class: 'check grow' }, ctx, h('span', {}, 'Incluir resumen de incidentes abiertos y alertas pendientes como contexto'))),
      status, log,
      h('div', { class: 'row quick' }, QUICK.map((q) => h('button', { class: 'tab', onclick: () => send(q) }, q))),
      field('Tu pregunta', input), h('div', { class: 'row' }, sendBtn, stopBtn),
      h('p', { class: 'warn' }, 'Las respuestas de un modelo pueden contener errores: verifícalas antes de actuar. El contenido de las consultas no se guarda en auditoría (solo que se hizo una consulta).'))));
  drawLog(); loadModels(false);
  return root;
}
