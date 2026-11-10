// Ejecuta todos los tests de tests/*.test.mjs (compatible con Node 18+ en Windows/Linux/macOS).
import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const files = readdirSync(join(root, 'tests')).filter((f) => f.endsWith('.test.mjs')).map((f) => join('tests', f));
const r = spawnSync(process.execPath, ['--test', ...files], { cwd: root, stdio: 'inherit' });
process.exit(r.status ?? 1);
