// Genera dist/CyberAdmin-v<version>.zip con SOLO los archivos de la extensión (sin tests ni scripts de desarrollo).
import { readFileSync, mkdirSync, rmSync, cpSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const version = JSON.parse(readFileSync(join(root, 'manifest.json'), 'utf8')).version;
const dist = join(root, 'dist'), stage = join(dist, 'CyberAdmin'), out = join(dist, `CyberAdmin-v${version}.zip`);
rmSync(dist, { recursive: true, force: true }); mkdirSync(stage, { recursive: true });
for (const p of ['manifest.json', 'package.json', 'popup.html', 'popup.css', 'popup.js', 'background', 'dashboard', 'modules', 'services', 'storage', 'utils', 'assets', 'config', 'README.md', 'INSTALL.md', 'CHANGELOG.md', 'docs', 'scripts', 'tests', 'backend', 'install.ps1', 'install.bat']) if (existsSync(join(root, p))) cpSync(join(root, p), join(stage, p), { recursive: true });
let r = spawnSync('zip', ['-r', '-q', out, 'CyberAdmin'], { cwd: dist });
if (r.status !== 0) r = spawnSync('tar', ['-a', '-c', '-f', out, 'CyberAdmin'], { cwd: dist, shell: process.platform === 'win32' });
if (r.status !== 0 || !existsSync(out)) { console.error('No se pudo crear el ZIP (instala zip o usa install.ps1)'); process.exit(1); }
console.log('ZIP creado:', out);
