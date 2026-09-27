// Builds the single-file app into site/index.html and stamps the service worker cache version.
import { readFileSync, writeFileSync } from 'node:fs';
const read = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const write = (p, s) => writeFileSync(new URL('../' + p, import.meta.url), s);
const lib = read('node_modules/jspdf/dist/jspdf.umd.min.js').replace('//# sourceMappingURL=jspdf.umd.min.js.map', '');
const brand = read('src/brand.b64').trim();
const html = read('src/app.html').replace('/*__JSPDF__*/', () => lib).replace('__BRAND_ICON__', () => brand);
write('site/index.html', html);
const stamp = new Date().toISOString().replace(/\D/g, '').slice(0, 14);
write('site/sw.js', read('src/sw.js.tpl').replace('__BUILD__', stamp));
console.log('Built site/index.html (' + Math.round(html.length / 1024) + ' KB), cache ' + stamp);
