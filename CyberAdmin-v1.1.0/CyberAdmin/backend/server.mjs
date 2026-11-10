// Backend de referencia (andamiaje) para futuras integraciones corporativas. Sin dependencias.
// NO es utilizado por la extensión v1.0. Persistencia en fichero JSON; sustituir por BD real en producción.
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { timingSafeEqual, randomUUID } from 'node:crypto';

const PORT = Number(process.env.CYBERADMIN_PORT || 8787);
const TOKEN = process.env.CYBERADMIN_API_TOKEN || '';
const ORIGIN = process.env.CYBERADMIN_ALLOWED_ORIGIN || '';
const FILE = new URL('./data.json', import.meta.url);
if (TOKEN.length < 24) { console.error('Define CYBERADMIN_API_TOKEN (>= 24 caracteres).'); process.exit(1); }
const db = existsSync(FILE) ? JSON.parse(readFileSync(FILE, 'utf8')) : { incidents: [] };
const save = () => writeFileSync(FILE, JSON.stringify(db, null, 2));
const authOk = (h) => { const a = Buffer.from(String(h || '').replace(/^Bearer /, '')), b = Buffer.from(TOKEN); return a.length === b.length && timingSafeEqual(a, b); };
const send = (res, code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json', 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(obj)); };

createServer(async (req, res) => {
  if (ORIGIN) { res.setHeader('Access-Control-Allow-Origin', ORIGIN); res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type'); res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS'); }
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/health') return send(res, 200, { status: 'ok' });
  if (!authOk(req.headers.authorization)) return send(res, 401, { error: 'unauthorized' });
  if (url.pathname === '/api/v1/incidents' && req.method === 'GET') return send(res, 200, db.incidents);
  if (url.pathname === '/api/v1/incidents' && req.method === 'POST') {
    let raw = ''; for await (const c of req) { raw += c; if (raw.length > 1e6) return send(res, 413, { error: 'too large' }); }
    try { const b = JSON.parse(raw); if (typeof b.title !== 'string' || b.title.length < 3) return send(res, 400, { error: 'title' });
      const inc = { id: randomUUID(), receivedAt: new Date().toISOString(), ...b }; db.incidents.push(inc); save(); return send(res, 201, inc);
    } catch { return send(res, 400, { error: 'invalid json' }); }
  }
  send(res, 404, { error: 'not found' });
}).listen(PORT, '127.0.0.1', () => console.log(`CyberAdmin backend (andamiaje) en http://127.0.0.1:${PORT}`));
