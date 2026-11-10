// Validación de archivos: manifest, rutas, imports, sintaxis, permisos y reglas de seguridad estáticas.
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, resolve, relative, extname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const errors = [], warns = [];
const err = (m) => errors.push(m), warn = (m) => warns.push(m);
const ALLOWED_PERMS = new Set(['storage', 'alarms', 'notifications', 'contextMenus']);
const ALLOWED_OPT_HOSTS = new Set(['https://safebrowsing.googleapis.com/*', 'https://www.virustotal.com/*', 'http://localhost/*', 'http://127.0.0.1/*']);

function walk(dir, out = []) {
  for (const n of readdirSync(dir)) {
    if (['node_modules', '.git', 'dist'].includes(n)) continue;
    const p = join(dir, n);
    statSync(p).isDirectory() ? walk(p, out) : out.push(p);
  }
  return out;
}
const mpath = join(root, 'manifest.json');
if (!existsSync(mpath)) { console.error('FALTA manifest.json'); process.exit(1); }
let m;
try { m = JSON.parse(readFileSync(mpath, 'utf8')); } catch (e) { console.error('manifest.json inválido:', e.message); process.exit(1); }

if (m.manifest_version !== 3) err('manifest_version debe ser 3');
for (const k of ['name', 'version', 'description']) if (!m[k]) err(`manifest: falta ${k}`);
if (!/^\d+(\.\d+){0,3}$/.test(m.version || '')) err('manifest: version inválida');
if ((m.description || '').length > 132) err('manifest: description > 132 caracteres (límite de la tienda)');
for (const p of m.permissions || []) if (!ALLOWED_PERMS.has(p)) err(`Permiso no permitido por política de mínimo privilegio: ${p}`);
if (m.host_permissions?.length) err('host_permissions no debe usarse (se usan optional_host_permissions)');
for (const p of m.optional_host_permissions || []) if (!ALLOWED_OPT_HOSTS.has(p)) err(`Host opcional no permitido: ${p}`);
if (m.content_scripts) err('No se esperan content_scripts en v1.0');
const csp = m.content_security_policy?.extension_pages || '';
if (!/script-src 'self'/.test(csp) || /unsafe-eval|unsafe-inline|https?:\/\/[^ ;]*(?=.*script-src)/.test(csp.split(';').find((d) => d.trim().startsWith('script-src')) || '')) err('CSP: script-src debe ser solo \'self\'');
const refs = [m.background?.service_worker, m.action?.default_popup, ...Object.values(m.icons || {}), ...Object.values(m.action?.default_icon || {})].filter(Boolean);
for (const r of refs) if (!existsSync(join(root, r))) err(`manifest referencia un archivo inexistente: ${r}`);

const files = walk(root);
for (const f of files.filter((x) => extname(x) === '.html')) {
  const html = readFileSync(f, 'utf8');
  for (const mt of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
    const u = mt[1];
    if (/^(https?:)?\/\//i.test(u)) err(`${relative(root, f)}: recurso remoto no permitido (${u})`);
    else if (!u.startsWith('#') && !existsSync(resolve(dirname(f), u))) err(`${relative(root, f)}: ruta rota ${u}`);
  }
  if (/<script(?![^>]*\bsrc=)[^>]*>/i.test(html)) err(`${relative(root, f)}: script en línea (viola CSP)`);
  if (/\sstyle="/i.test(html) || /\son\w+="/i.test(html)) err(`${relative(root, f)}: atributos style/on* en línea`);
}
const FORBID = [[/\beval\s*\(/, 'eval()'], [/new\s+Function\s*\(/, 'new Function'], [/\.innerHTML\s*=/, 'innerHTML'], [/insertAdjacentHTML/, 'insertAdjacentHTML'], [/document\.write/, 'document.write'], [/\bimportScripts\s*\(/, 'importScripts'], [/setTimeout\s*\(\s*['"`]/, 'setTimeout(string)'], [/(?<![\w.])localStorage\b/, 'localStorage']];
const jsFiles = files.filter((x) => extname(x) === '.js' && !relative(root, x).startsWith('tests') && !relative(root, x).startsWith('backend'));
for (const f of files.filter((x) => ['.js', '.mjs'].includes(extname(x)))) {
  const rel = relative(root, f);
  const r = spawnSync(process.execPath, ['--check', f], { encoding: 'utf8' });
  if (r.status !== 0) err(`Error de sintaxis en ${rel}:\n${r.stderr}`);
  const src = readFileSync(f, 'utf8');
  if (jsFiles.includes(f)) {
    for (const [re, name] of FORBID) if (re.test(src.replace(/\/\/.*$/gm, ''))) err(`${rel}: uso prohibido de ${name}`);
    if (/fetch\(\s*['"`]http:/.test(src)) err(`${rel}: petición HTTP sin cifrar`);
  }
  for (const mt of src.matchAll(/(?:import|export)\s[^'"]*?from\s*['"]([^'"]+)['"]|import\s*['"]([^'"]+)['"]/g)) {
    const spec = mt[1] || mt[2];
    if (spec.startsWith('node:') || !spec.startsWith('.')) { if (jsFiles.includes(f)) err(`${rel}: import externo no permitido (${spec})`); continue; }
    if (!existsSync(resolve(dirname(f), spec))) err(`${rel}: import roto → ${spec}`);
  }
}
for (const need of ['README.md', 'INSTALL.md', 'CHANGELOG.md', 'popup.html', 'dashboard/index.html', 'package.json']) if (!existsSync(join(root, need))) err(`Falta ${need}`);

console.log(`Archivos revisados: ${files.length}  (JS: ${jsFiles.length})`);
warns.forEach((w) => console.log('AVISO  ', w));
if (errors.length) { errors.forEach((e) => console.error('ERROR  ', e)); console.error(`\n✗ Validación fallida (${errors.length} errores)`); process.exit(1); }
console.log('✓ Validación correcta: manifest MV3, rutas, imports, sintaxis, permisos y reglas de seguridad OK');
