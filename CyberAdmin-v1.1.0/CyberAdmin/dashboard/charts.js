import { svg, h } from './ui.js';
export const PALETTE = ['#2f7bff', '#19e68c', '#ffb020', '#ff3b5c', '#9b6bff', '#18c8e0', '#ff7a45', '#7bd88f', '#e056a0', '#8aa4d6', '#c7d34a', '#4ad0b8', '#b0b6c8'];

export function donut(data, { size = 180, centerLabel = '' } = {}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const r = 62, c = 2 * Math.PI * r;
  const root = svg('svg', { viewBox: '0 0 180 180', width: size, height: size, role: 'img', 'aria-label': 'Distribución por categoría' });
  root.append(svg('circle', { cx: 90, cy: 90, r, fill: 'none', stroke: '#10244a', 'stroke-width': 22 }));
  let off = 0;
  data.forEach((d, i) => {
    const len = total ? (d.value / total) * c : 0;
    const seg = svg('circle', { cx: 90, cy: 90, r, fill: 'none', stroke: d.color || PALETTE[i % PALETTE.length], 'stroke-width': 22, 'stroke-dasharray': `${len} ${c - len}`, 'stroke-dashoffset': -off, transform: 'rotate(-90 90 90)', class: 'seg' }, svg('title', {}, `${d.label}: ${d.value}`));
    root.append(seg); off += len;
  });
  root.append(svg('text', { x: 90, y: 88, 'text-anchor': 'middle', class: 'ct-n' }, String(total)), svg('text', { x: 90, y: 106, 'text-anchor': 'middle', class: 'ct-l' }, centerLabel));
  const legend = h('ul', { class: 'legend' }, data.map((d, i) => h('li', {}, h('i', { class: 'dot', 'data-c': d.color || PALETTE[i % PALETTE.length] }), `${d.label} `, h('b', {}, d.value))));
  legend.querySelectorAll('.dot').forEach((el) => { el.style.background = el.dataset.c; });
  return h('div', { class: 'donut' }, root, legend);
}
function axes(w, hgt, pad, max, labels) {
  const g = svg('g', {});
  for (let i = 0; i <= 4; i++) {
    const y = pad.t + ((hgt - pad.t - pad.b) * i) / 4;
    g.append(svg('line', { x1: pad.l, x2: w - pad.r, y1: y, y2: y, class: 'grid' }), svg('text', { x: pad.l - 6, y: y + 4, 'text-anchor': 'end', class: 'ax' }, String(Math.round(max - (max * i) / 4))));
  }
  labels.forEach((l, i) => { if (i % Math.ceil(labels.length / 7) === 0) g.append(svg('text', { x: pad.l + (i + 0.5) * ((w - pad.l - pad.r) / labels.length), y: hgt - 8, 'text-anchor': 'middle', class: 'ax' }, l.slice(5))); });
  return g;
}
export function lineChart(points, { color = '#2f7bff', label = 'Evolución' } = {}) {
  const w = 560, H = 210, pad = { l: 30, r: 10, t: 10, b: 26 };
  const max = Math.max(4, ...points.map((p) => p.value));
  const step = (w - pad.l - pad.r) / points.length;
  const xy = points.map((p, i) => [pad.l + (i + 0.5) * step, pad.t + (H - pad.t - pad.b) * (1 - p.value / max)]);
  const root = svg('svg', { viewBox: `0 0 ${w} ${H}`, class: 'chart', role: 'img', 'aria-label': label }, axes(w, H, pad, max, points.map((p) => p.label)));
  const area = `M${xy[0][0]},${H - pad.b} ` + xy.map((p) => `L${p[0]},${p[1]}`).join(' ') + ` L${xy.at(-1)[0]},${H - pad.b}Z`;
  root.append(svg('path', { d: area, fill: color, opacity: 0.15 }), svg('polyline', { points: xy.map((p) => p.join(',')).join(' '), fill: 'none', stroke: color, 'stroke-width': 2.2 }));
  xy.forEach((p, i) => root.append(svg('circle', { cx: p[0], cy: p[1], r: 4, fill: color, class: 'pt' }, svg('title', {}, `${points[i].label}: ${points[i].value}`))));
  return root;
}
export function barChart(points, { color = '#19e68c', label = 'Actividad' } = {}) {
  const w = 560, H = 210, pad = { l: 30, r: 10, t: 10, b: 26 };
  const max = Math.max(4, ...points.map((p) => p.value));
  const step = (w - pad.l - pad.r) / points.length;
  const root = svg('svg', { viewBox: `0 0 ${w} ${H}`, class: 'chart', role: 'img', 'aria-label': label }, axes(w, H, pad, max, points.map((p) => p.label)));
  points.forEach((p, i) => {
    const bh = (H - pad.t - pad.b) * (p.value / max);
    root.append(svg('rect', { x: pad.l + i * step + step * 0.18, y: H - pad.b - bh, width: step * 0.64, height: bh, rx: 3, fill: color, class: 'bar' }, svg('title', {}, `${p.label}: ${p.value}`)));
  });
  return root;
}
export function gauge(score, color) {
  const root = svg('svg', { viewBox: '0 0 120 70', width: 140, role: 'img', 'aria-label': `Puntuación ${score} de 100` });
  const len = Math.PI * 50;
  root.append(svg('path', { d: 'M10,60 A50,50 0 0 1 110,60', fill: 'none', stroke: '#10244a', 'stroke-width': 10, 'stroke-linecap': 'round' }),
    svg('path', { d: 'M10,60 A50,50 0 0 1 110,60', fill: 'none', stroke: color, 'stroke-width': 10, 'stroke-linecap': 'round', 'stroke-dasharray': `${(Math.min(score, 100) / 100) * len} ${len}`, class: 'gauge-fill' }),
    svg('text', { x: 60, y: 56, 'text-anchor': 'middle', class: 'ct-n' }, String(score)));
  return root;
}
