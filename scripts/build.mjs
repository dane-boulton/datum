// Builds the single-file app into site/index.html and stamps the service worker cache version.
// Cloud sign-in is switched on when a Supabase URL and anon key are available, from the environment
// (SUPABASE_URL, SUPABASE_ANON_KEY - set these in Netlify) or from datum.config.json.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
const read = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const write = (p, s) => writeFileSync(new URL('../' + p, import.meta.url), s);
const lib = read('node_modules/jspdf/dist/jspdf.umd.min.js').replace('//# sourceMappingURL=jspdf.umd.min.js.map', '');
const sb = read('node_modules/@supabase/supabase-js/dist/umd/supabase.js').replace(/\/\/# sourceMappingURL=\S+/g, '');
const brand = read('src/brand.b64').trim();
const file = existsSync(new URL('../datum.config.json', import.meta.url)) ? JSON.parse(read('datum.config.json')) : {};
const cloud = { url: process.env.SUPABASE_URL || file.supabaseUrl || '', key: process.env.SUPABASE_ANON_KEY || file.supabaseAnonKey || '' };
const cloudJs = 'window.DATUM_CLOUD=' + JSON.stringify(cloud.url && cloud.key ? cloud : null).replace(/</g, '\\u003c') + ';';
const html = read('src/app.html').replace('/*__JSPDF__*/', () => lib).replace('/*__SUPABASE__*/', () => sb)
  .replace('/*__CLOUD_CONFIG__*/', () => cloudJs).replaceAll('__BRAND_ICON__', () => brand);
write('site/index.html', html);
const stamp = new Date().toISOString().replace(/\D/g, '').slice(0, 14);
write('site/sw.js', read('src/sw.js.tpl').replace('__BUILD__', stamp));
console.log('Built site/index.html (' + Math.round(html.length / 1024) + ' KB), cache ' + stamp + ', cloud ' + (cloud.url && cloud.key ? 'on (' + cloud.url + ')' : 'off'));
