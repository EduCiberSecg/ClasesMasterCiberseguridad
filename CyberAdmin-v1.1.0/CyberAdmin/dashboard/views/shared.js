import { h, badge } from '../ui.js';
import { PRIORITY_LABEL, STATUS_LABEL } from '../../modules/incidents/incidents.js';
import { SEVERITY_LABEL } from '../../modules/alerts/alerts.js';
export const pageHeader = (title, sub, right) => h('div', { class: 'top' }, h('div', {}, h('h1', {}, title), h('div', { class: 'sub' }, sub)), h('div', { class: 'sp' }), right || h('span', { class: 'live' }, 'Operativo'));
export const prioBadge = (p) => badge(PRIORITY_LABEL[p] || p, p);
export const sevBadge = (s) => badge(SEVERITY_LABEL[s] || s, s);
export const statusBadge = (s) => badge(STATUS_LABEL[s] || s, s === 'closed' || s === 'resolved' ? 'low' : s === 'contained' ? 'info' : 'mut');
