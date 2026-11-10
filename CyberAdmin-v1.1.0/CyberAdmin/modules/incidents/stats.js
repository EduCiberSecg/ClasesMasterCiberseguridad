// Cálculo puro de estadísticas del dashboard (sin acceso a almacenamiento: fácil de testear).
const OPEN = new Set(['open', 'investigating', 'contained']);
const WEIGHT = { critical: 10, high: 5, medium: 2, low: 1 };
export const RISK_LEVELS = [
  { max: 5, key: 'low', label: 'BAJO' }, { max: 15, key: 'medium', label: 'MODERADO' },
  { max: 30, key: 'high', label: 'ALTO' }, { max: Infinity, key: 'critical', label: 'CRÍTICO' }
];
export function riskFromScore(score) { return RISK_LEVELS.find((l) => score <= l.max); }
const dayKey = (iso) => iso.slice(0, 10);
export function lastDays(n, now = Date.now()) {
  return Array.from({ length: n }, (_, i) => new Date(now - (n - 1 - i) * 86400000).toISOString().slice(0, 10));
}
export function computeStats({ incidents = [], alerts = [], audit = [], analyses = [] }, now = Date.now(), days = 14) {
  const open = incidents.filter((i) => OPEN.has(i.status));
  const pendingAlerts = alerts.filter((a) => a.status === 'pending');
  const score = open.reduce((s, i) => s + (WEIGHT[i.priority] || 0), 0) + pendingAlerts.filter((a) => a.severity === 'critical').length * 5;
  const byCategory = {};
  for (const i of incidents) byCategory[i.category] = (byCategory[i.category] || 0) + 1;
  const dl = lastDays(days, now);
  const inc = Object.fromEntries(dl.map((d) => [d, 0]));
  const act = Object.fromEntries(dl.map((d) => [d, 0]));
  for (const i of incidents) { const k = dayKey(i.detectedAt); if (k in inc) inc[k]++; }
  for (const e of [...audit, ...analyses]) { const k = dayKey(e.ts); if (k in act) act[k]++; }
  const bySeverity = {};
  for (const a of alerts) bySeverity[a.severity] = (bySeverity[a.severity] || 0) + 1;
  return {
    total: incidents.length,
    critical: incidents.filter((i) => i.priority === 'critical').length,
    criticalOpen: open.filter((i) => i.priority === 'critical').length,
    pending: open.length,
    resolved: incidents.filter((i) => i.status === 'resolved' || i.status === 'closed').length,
    pendingAlerts: pendingAlerts.length, riskScore: score, risk: riskFromScore(score),
    byCategory, bySeverity, incidentsPerDay: dl.map((d) => ({ label: d, value: inc[d] })), activityPerDay: dl.map((d) => ({ label: d, value: act[d] })),
    analysesTotal: analyses.length, analysesHigh: analyses.filter((a) => a.level === 'high' || a.level === 'critical').length
  };
}
