// Generador PDF mínimo (texto, Helvetica, paginado) sin dependencias ni código remoto.
const W = 595, H = 842, M = 48, LH = 12.5, FS = 9.5;
const esc = (s) => s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
const latin1 = (s) => String(s).replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"').replace(/[\u2013\u2014]/g, '-').replace(/\u2026/g, '...').replace(/[•·]/g, '-')
  .replace(/[^\x09\x0A\x20-\x7E\xA0-\xFF]/g, '?');
function wrap(line, max) {
  const out = []; let cur = '';
  for (const w of line.split(' ')) {
    if (w.length > max) { if (cur) { out.push(cur); cur = ''; } for (let i = 0; i < w.length; i += max) out.push(w.slice(i, i + max)); continue; }
    if ((cur + ' ' + w).trim().length > max) { out.push(cur); cur = w; } else cur = (cur ? cur + ' ' : '') + w;
  }
  if (cur || !out.length) out.push(cur);
  return out;
}
// lines: array de strings o {t:'texto', h:1|2} (títulos)
export function buildPdf(title, lines, footer = 'CyberAdmin Security Center') {
  const rows = [];
  for (const l of lines) {
    const o = typeof l === 'string' ? { t: l } : l;
    const t = latin1(o.t);
    for (const part of t.split('\n')) for (const w of wrap(part, o.h === 1 ? 62 : 100)) rows.push({ t: w, h: o.h || 0 });
  }
  const perPage = Math.floor((H - 2 * M - 20) / LH);
  const pages = [];
  for (let i = 0; i < rows.length; i += perPage) pages.push(rows.slice(i, i + perPage));
  if (!pages.length) pages.push([]);
  const objs = [];
  const add = (s) => { objs.push(s); return objs.length; };
  add('<< /Type /Catalog /Pages 2 0 R >>');
  add(''); // pages placeholder
  add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
  const kids = [];
  pages.forEach((pg, idx) => {
    let y = H - M;
    let c = `BT /F2 12 Tf ${M} ${H - M + 18} Td (${esc(latin1(title))}) Tj ET\n`;
    for (const r of pg) {
      const font = r.h ? '/F2' : '/F1', size = r.h === 1 ? 12 : r.h === 2 ? 10.5 : FS;
      c += `BT ${font} ${size} Tf ${M} ${y} Td (${esc(r.t)}) Tj ET\n`; y -= r.h === 1 ? LH + 4 : LH;
    }
    c += `BT /F1 8 Tf ${M} 28 Td (${esc(latin1(footer))}  -  Pagina ${idx + 1} de ${pages.length}) Tj ET\n`;
    const cid = add(`<< /Length ${c.length} >>\nstream\n${c}endstream`);
    const pid = add(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${cid} 0 R >>`);
    kids.push(`${pid} 0 R`);
  });
  objs[1] = `<< /Type /Pages /Kids [${kids.join(' ')}] /Count ${kids.length} >>`;
  let out = '%PDF-1.4\n'; const offs = [];
  objs.forEach((o, i) => { offs.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + offs.map((o) => String(o).padStart(10, '0') + ' 00000 n \n').join('');
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  const bytes = new Uint8Array(out.length);
  for (let i = 0; i < out.length; i++) bytes[i] = out.charCodeAt(i) & 0xff;
  return bytes;
}
