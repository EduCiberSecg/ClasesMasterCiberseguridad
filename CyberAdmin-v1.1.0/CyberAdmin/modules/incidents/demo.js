// Datos de demostración (claramente marcados como demo; se pueden eliminar desde Configuración).
import { createIncident, addAction, addComment, closeIncident, listIncidents, deleteIncident } from './incidents.js';
import { createAlert } from '../alerts/alerts.js';

const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString();
const SAMPLES = [
  ['Campaña de phishing con falsa factura de DHL', 'phishing', 'high', 13, 'resolved'],
  ['Cifrado de carpeta compartida en servidor de ficheros', 'ransomware', 'critical', 11, 'contained'],
  ['Intentos de fuerza bruta contra VPN corporativa', 'fuerza-bruta', 'medium', 9, 'closed'],
  ['Credenciales corporativas aparecidas en filtración', 'credenciales', 'high', 8, 'investigating'],
  ['Portátil de comercial extraviado en aeropuerto', 'perdida-dispositivo', 'medium', 6, 'resolved'],
  ['Panel de administración expuesto en Internet', 'exposicion-servidores', 'high', 5, 'open'],
  ['Buzón de dirección comprometido (reglas de reenvío)', 'cuenta-comprometida', 'critical', 3, 'investigating'],
  ['CVE crítica en gateway sin parchear', 'vulnerabilidad', 'high', 2, 'open'],
  ['Troyano bancario detectado por EDR en estación de trabajo', 'malware', 'medium', 1, 'open'],
  ['Picos de tráfico sospechoso en web pública', 'ddos', 'low', 0, 'open']
];
export async function loadDemo() {
  for (const [title, category, priority, ago, state] of SAMPLES) {
    const inc = await createIncident({ title, category, priority, detectedAt: daysAgo(ago), assignee: 'Equipo SOC', description: 'Incidente de demostración (datos ficticios).', demo: true, source: 'demo' });
    await addComment(inc.id, 'Triaje inicial realizado.');
    if (state !== 'open') await addAction(inc.id, 'Contención y análisis realizados según protocolo.');
    if (state === 'closed') await closeIncident(inc.id, { resolution: 'Resuelto y verificado (demo).', lessons: 'Revisar controles preventivos.' });
  }
  await createAlert({ severity: 'critical', title: 'DEMO: cifrado masivo detectado en servidor de ficheros', source: 'demo' });
  await createAlert({ severity: 'medium', title: 'DEMO: 250 intentos fallidos de login desde una IP', source: 'demo' });
}
export async function removeDemo() {
  const all = await listIncidents();
  for (const i of all.filter((x) => x.demo)) await deleteIncident(i.id);
}
