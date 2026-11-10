// Validación y saneamiento de entradas (defensa en profundidad; el renderizado usa textContent, nunca innerHTML).
export function cleanText(v, max = 2000) {
  // eslint-disable-next-line no-control-regex
  return String(v ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, max);
}
export function oneOf(v, list, name) {
  if (!list.includes(v)) throw new ValidationError(`${name} no válido`);
  return v;
}
export function required(v, min, max, name) {
  const s = cleanText(v, max);
  if (s.length < min) throw new ValidationError(`${name} es obligatorio (mínimo ${min} caracteres)`);
  return s;
}
export function isoDate(v, name = 'Fecha') {
  const d = v ? new Date(v) : new Date();
  if (Number.isNaN(d.getTime())) throw new ValidationError(`${name} no válida`);
  return d.toISOString();
}
export class ValidationError extends Error {
  constructor(m) { super(m); this.name = 'ValidationError'; }
}
// Evita inyección de fórmulas al abrir CSV en Excel/Sheets.
export function csvCell(v) {
  let s = v == null ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
