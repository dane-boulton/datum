// Minimal Markdown to HTML for docs/MANUAL.md: headings, paragraphs, bold, inline code, links, ordered and
// bullet lists, pipe tables and fenced code blocks. Level-2 headings get ids for the contents list.
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const slug = s => 'm-' + s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const inline = s => esc(s).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
  .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
const cells = l => l.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim());
export function md(src) {
  const L = src.replace(/\r/g, '').split('\n'), out = [], toc = []; let i = 0;
  while (i < L.length) {
    const l = L[i];
    if (!l.trim()) { i++; continue; }
    if (l.startsWith('```')) { const b = []; i++; while (i < L.length && !L[i].startsWith('```')) b.push(L[i++]); i++; out.push('<pre>' + esc(b.join('\n')) + '</pre>'); continue; }
    const h = l.match(/^(#{1,4})\s+(.*)$/);
    if (h) { const n = h[1].length, t = h[2]; if (n === 2) { toc.push([slug(t), t]); out.push(`<h2 id="${slug(t)}">${inline(t)}</h2>`); } else out.push(`<h${n}>${inline(t)}</h${n}>`); i++; continue; }
    if (l.trim().startsWith('|') && L[i + 1] && /^\s*\|[\s:|-]+\|\s*$/.test(L[i + 1])) {
      const head = cells(l); i += 2; const rows = []; while (i < L.length && L[i].trim().startsWith('|')) rows.push(cells(L[i++]));
      out.push('<div class="mtw"><table><thead><tr>' + head.map(c => `<th>${inline(c)}</th>`).join('') + '</tr></thead><tbody>' + rows.map(r => '<tr>' + r.map(c => `<td>${inline(c)}</td>`).join('') + '</tr>').join('') + '</tbody></table></div>');
      continue; }
    const li = l.match(/^(\d+\.|[-*])\s+/);
    if (li) { const ol = /\d/.test(li[1]), re = ol ? /^\d+\.\s+/ : /^[-*]\s+/, items = [];
      while (i < L.length && re.test(L[i])) items.push(L[i++].replace(re, ''));
      out.push(`<${ol ? 'ol' : 'ul'}>` + items.map(t => `<li>${inline(t)}</li>`).join('') + `</${ol ? 'ol' : 'ul'}>`); continue; }
    const p = []; while (i < L.length && L[i].trim() && !/^(#|```|\||\d+\.\s|[-*]\s)/.test(L[i].trim())) p.push(L[i++]);
    if (!p.length) p.push(L[i++]);
    out.push('<p>' + inline(p.join(' ')) + '</p>');
  }
  return { html: out.join('\n'), toc };
}
