// Utilidades de UI. Se construye el DOM SIEMPRE con nodos/textContent (nunca innerHTML) para evitar XSS.
const SVG_NS = 'http://www.w3.org/2000/svg';
export function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) { if (typeof v === 'function') el.addEventListener(k.slice(2), v); }
    else if (k === 'style') continue; // CSP: sin estilos en línea
    else if (k === 'href') { if (/^(https?:|#)/i.test(v)) el.setAttribute('href', v); }
    else if (k === 'value') el.value = v;
    else if (k === 'checked' || k === 'disabled' || k === 'selected' || k === 'required') el[k] = !!v;
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  append(el, kids);
  return el;
}
export function append(el, kids) {
  for (const k of kids.flat(Infinity)) { if (k == null || k === false) continue; el.append(k instanceof Node ? k : document.createTextNode(String(k))); }
  return el;
}
export const svg = (tag, attrs = {}, ...kids) => {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v != null) el.setAttribute(k, String(v));
  for (const c of kids.flat()) if (c) el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  return el;
};
const ICONS = {
  dashboard: 'M3 3h8v8H3zM13 3h8v5h-8zM13 10h8v11h-8zM3 13h8v8H3z',
  phishing: 'M12 2a10 10 0 100 20 10 10 0 000-20zM2 12h20M12 2c3 3 4 6.5 4 10s-1 7-4 10c-3-3-4-6.5-4-10s1-7 4-10z',
  incidents: 'M12 3l10 18H2zM12 10v5M12 18v.01',
  alerts: 'M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0',
  playbooks: 'M4 4h12a4 4 0 014 4v12H8a4 4 0 01-4-4zM8 9h8M8 13h8',
  audit: 'M9 11l3 3 8-8M20 12v7a2 2 0 01-2 2H6a2 2 0 01-2-2V5a2 2 0 012-2h9',
  reports: 'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M8 13h8M8 17h8',
  assistant: 'M21 12a8 8 0 01-11.6 7.1L4 20l1-4.6A8 8 0 1121 12zM8.5 12h.01M12 12h.01M15.5 12h.01',
  settings: 'M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z'
};
export function icon(name, size = 18) {
  return svg('svg', { viewBox: '0 0 24 24', width: size, height: size, fill: 'none', stroke: 'currentColor', 'stroke-width': 1.8, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' }, svg('path', { d: ICONS[name] || ICONS.dashboard }));
}
export const fmtDate = (iso) => (iso ? new Date(iso).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' }) : '—');
export const badge = (text, kind = 'info') => h('span', { class: `badge b-${kind}` }, text);
export function toast(msg, kind = 'ok') {
  let box = document.getElementById('toasts');
  if (!box) { box = h('div', { id: 'toasts', 'aria-live': 'polite' }); document.body.append(box); }
  const t = h('div', { class: `toast t-${kind}`, role: 'status' }, msg);
  box.append(t); setTimeout(() => t.remove(), kind === 'err' ? 6000 : 3000);
}
export function download(filename, mime, data) {
  const url = URL.createObjectURL(new Blob([data], { type: mime }));
  const a = h('a', { download: filename }); a.href = url; document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
export function field(label, input, hint) {
  return h('label', { class: 'field' }, h('span', {}, label), input, hint ? h('small', {}, hint) : null);
}
export function select(options, value, attrs = {}) {
  return h('select', attrs, options.map(([v, l]) => h('option', { value: v, selected: v === value }, l)));
}
export function modal(title, body, actions = []) {
  return new Promise((resolve) => {
    const close = (v) => { overlay.remove(); document.removeEventListener('keydown', onKey); resolve(v); };
    const onKey = (e) => { if (e.key === 'Escape') close(null); };
    const overlay = h('div', { class: 'overlay', role: 'dialog', 'aria-modal': 'true', 'aria-label': title, onclick: (e) => { if (e.target === overlay) close(null); } },
      h('div', { class: 'modal' }, h('h3', {}, title), body, h('div', { class: 'modal-actions' },
        actions.map((a) => h('button', { class: a.primary ? 'btn primary' : a.danger ? 'btn danger' : 'btn', onclick: () => close(a.value) }, a.label)))));
    document.addEventListener('keydown', onKey); document.body.append(overlay);
    overlay.querySelector('input,textarea,select,button')?.focus();
  });
}
export const confirmDialog = async (title, text, danger = false) =>
  (await modal(title, h('p', {}, text), [{ label: 'Cancelar', value: false }, { label: 'Confirmar', value: true, primary: !danger, danger }])) === true;
export async function guard(fn) { try { return await fn(); } catch (e) { toast(e?.message || String(e), 'err'); console.error(e); } }
export const card = (title, body, extra = {}) => h('section', { class: 'card ' + (extra.class || '') }, title ? h('header', { class: 'card-h' }, h('h3', {}, title), extra.right || null) : null, body);
export const empty = (text) => h('p', { class: 'empty' }, text);
