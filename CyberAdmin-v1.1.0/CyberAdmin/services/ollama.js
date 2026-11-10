// Cliente de Ollama (IA local). Todo el tráfico va a localhost: ningún dato sale del equipo.
// Requiere que Ollama permita el origen de la extensión: OLLAMA_ORIGINS=chrome-extension://* (ver INSTALL.md).
export const OLLAMA_ORIGINS = ['http://localhost/*', 'http://127.0.0.1/*'];

export class OllamaError extends Error {
  constructor(message, code = 'error') { super(message); this.name = 'OllamaError'; this.code = code; }
}
const base = (url) => String(url || '').replace(/\/+$/, '');

function httpError(r, url, model) {
  if (r.status === 403) return new OllamaError('Ollama rechazó el origen de la extensión (HTTP 403). Arranca Ollama con OLLAMA_ORIGINS=chrome-extension://* (ver INSTALL.md) y reinícialo.', 'origin');
  if (r.status === 404) return new OllamaError(`Modelo «${model || '?'}» no encontrado en Ollama. Descárgalo con: ollama pull ${model || '<modelo>'}`, 'model');
  return new OllamaError(`Ollama respondió HTTP ${r.status} (${url}).`, 'http');
}
const netError = (url) => new OllamaError(`No se pudo conectar con Ollama en ${url}. ¿Está en ejecución (ollama serve) y permitido el origen de la extensión?`, 'network');

export async function listModels(url, fetchImpl = globalThis.fetch) {
  let r;
  try { r = await fetchImpl(`${base(url)}/api/tags`, { credentials: 'omit', referrerPolicy: 'no-referrer' }); } catch { throw netError(url); }
  if (!r.ok) throw httpError(r, url);
  const data = await r.json();
  return (data.models || []).map((m) => m.name).filter(Boolean).sort();
}

// Lee una respuesta NDJSON (una línea JSON por fragmento) de un ReadableStream.
export async function* readNdjson(stream) {
  const reader = stream.getReader(), dec = new TextDecoder();
  let buf = '';
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (value) buf += dec.decode(value, { stream: !done });
      let i;
      while ((i = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
        if (line) yield JSON.parse(line);
      }
      if (done) break;
    }
    if (buf.trim()) yield JSON.parse(buf);
  } finally { reader.releaseLock?.(); }
}

// Envía el chat y devuelve el texto completo; onToken(texto_acumulado) se llama durante el streaming.
export async function chat({ url, model, messages, signal, onToken, temperature = 0.2, fetchImpl = globalThis.fetch }) {
  if (!model) throw new OllamaError('Selecciona un modelo de Ollama.', 'model');
  let r;
  try {
    r = await fetchImpl(`${base(url)}/api/chat`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'omit', referrerPolicy: 'no-referrer', signal,
      body: JSON.stringify({ model, messages, stream: true, options: { temperature } })
    });
  } catch (e) { if (e?.name === 'AbortError') throw e; throw netError(url); }
  if (!r.ok) throw httpError(r, url, model);
  let text = '';
  for await (const part of readNdjson(r.body)) {
    if (part.error) throw new OllamaError(String(part.error).slice(0, 300), 'model');
    const t = part.message?.content;
    if (t) { text += t; onToken?.(text); }
    if (part.done) break;
  }
  return text;
}

export async function hasOllamaPermission() {
  const p = globalThis.chrome?.permissions;
  return p ? p.contains({ origins: OLLAMA_ORIGINS }) : true;
}
export async function ensureOllamaPermission() {
  const p = globalThis.chrome?.permissions;
  if (!p) return true; // fuera de la extensión (tests)
  if (await p.contains({ origins: OLLAMA_ORIGINS })) return true;
  return p.request({ origins: OLLAMA_ORIGINS }); // requiere gesto del usuario
}
