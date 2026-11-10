// Comprobación de dependencias del entorno de desarrollo/validación (la extensión NO tiene dependencias de runtime).
import { spawnSync } from 'node:child_process';
const major = Number(process.versions.node.split('.')[0]);
const has = (cmd, args = ['--version']) => { const r = spawnSync(cmd, args, { encoding: 'utf8', shell: process.platform === 'win32' }); return r.status === 0 ? (r.stdout || r.stderr).split('\n')[0].trim() : null; };
let fail = false;
const line = (ok, name, info, req = true) => { console.log(`${ok ? '✓' : req ? '✗' : '·'} ${name}: ${info}`); if (!ok && req) fail = true; };
line(major >= 18, 'Node.js', `${process.version} (se requiere >= 18)`);
line(true, 'Dependencias npm', 'ninguna (la extensión no usa librerías de terceros)');
const zip = has('zip', ['-v']) ? 'zip' : has('tar') ? 'tar (bsdtar)' : has('powershell', ['-Command', '$PSVersionTable.PSVersion.ToString()']) ? 'PowerShell Compress-Archive' : null;
line(!!zip, 'Empaquetado ZIP', zip || 'no disponible (instala zip o usa PowerShell 5+)');
line(true, 'Navegador', 'Chrome ≥ 110 o Edge ≥ 110 (comprobar manualmente en chrome://version o edge://version)', false);
process.exit(fail ? 1 : 0);
