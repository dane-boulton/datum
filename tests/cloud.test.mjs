// End-to-end test of the cloud UI against tests/mock-supabase.js.
// Run: SUPABASE_URL=https://mock.supabase.co SUPABASE_ANON_KEY=mock npm run build && node tests/cloud.test.mjs
// Needs playwright (npm i --no-save playwright). Screenshots go to $SHOTS if set.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';

const PORT = 8765, BASE = `http://127.0.0.1:${PORT}/`, SHOTS = process.env.SHOTS;
const srv = spawn('python3', ['-m', 'http.server', String(PORT), '-d', 'site'], { stdio: 'ignore' });
await new Promise(r => setTimeout(r, 800));
const mock = readFileSync(new URL('./mock-supabase.js', import.meta.url), 'utf8');
const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });
const ctx = await b.newContext({ viewport: { width: 1300, height: 900 }, serviceWorkers: 'block' });
await ctx.addInitScript(mock);
const p = await ctx.newPage(); const errs = []; const dialogs = []; p.on('dialog', d => { dialogs.push(d.message()); d.accept(); }); p.on('pageerror', e => errs.push(e.message));
let n = 0; const ok = (c, what) => { if (!c) { console.error('FAIL', what); process.exitCode = 1; } else { n++; console.log('ok ', what); } };
const shot = async name => { if (SHOTS) await p.screenshot({ path: `${SHOTS}/${name}.png` }); };
const db = () => p.evaluate(() => window.__mock.db());
const chip = () => p.evaluate(() => { const c = document.getElementById('cloudChip'); return c.hidden ? '' : c.textContent; });
const signIn = async (email, pw = 'pw123456') => { await p.click('#btnAccount'); await p.fill('#cEmail', email); await p.fill('#cPass', pw); await p.click('#cGo'); await p.waitForTimeout(300); };
const signOut = async () => { await p.click('#btnAccount'); await p.click('#cOut'); await p.waitForTimeout(200); };

await p.goto(BASE);
await p.evaluate(() => { localStorage.clear(); window.__mock.seed([['admin@crew.test', 'pw123456', 'admin'], ['ed@crew.test', 'pw123456', 'editor'], ['view@crew.test', 'pw123456', 'viewer']]); });
await p.reload(); await p.waitForTimeout(300);
ok(await p.isVisible('#btnAccount'), 'account button shows when cloud is configured');
await p.click('#btnAccount'); await shot('signin'); ok(await p.isVisible('#cGoogle'), 'sign-in dialog offers Google');
await p.click('#cGoogle'); ok((await p.evaluate(() => window.__mock.calls))[0][1].provider === 'google', 'Google button starts Google OAuth');
await p.fill('#cEmail', 'ed@crew.test'); await p.fill('#cPass', 'wrong-password'); await p.click('#cGo'); await p.waitForTimeout(200);
ok(/Invalid/.test(await p.textContent('#cMsg')), 'wrong password shows an error');
await p.fill('#cPass', 'pw123456'); await p.click('#cGo'); await p.waitForTimeout(300);
ok(await p.isHidden('#cloudModal'), 'editor signs in');

// editor: save to cloud, auto-save edits, done marks stay local
await p.click('#btnSample'); await p.waitForTimeout(300);
await p.click('#btnCloudSave'); await p.waitForTimeout(300); await shot('projects-editor');
await p.fill('#cNewName', 'Arena Test'); await p.click('#cNewGo'); await p.waitForTimeout(400);
let d = await db(); ok(d.projects.length === 1 && d.projects[0].name === 'Arena Test', 'editor saves the current project to the cloud');
await p.click('[data-close]'); ok(await chip() === 'Saved', 'status shows Saved');
await p.evaluate(() => { toggleDone(S.hoists.find(h => h.ok && !h.datum).id); });
await p.click('.tabs >> text=Data'); await p.fill('input[data-ri="0"][data-k="id"]', 'USR-EDITED'); await p.press('input[data-ri="0"][data-k="id"]', 'Enter');
await p.waitForTimeout(2600); d = await db();
ok(JSON.stringify(d.projects[0].data).includes('USR-EDITED'), 'edits auto-save to the cloud');
ok(!('done' in d.projects[0].data), 'done marks are not uploaded');
ok(await chip() === 'Saved', 'status back to Saved after auto-save');

// share
await p.click('#btnAccount'); await p.click('[data-share]'); await p.fill('#cShareEmail', 'VIEW@crew.test'); await p.click('#cShareForm button[type=submit]'); await p.waitForTimeout(300);
await p.fill('#cShareEmail', 'later@crew.test'); await p.click('#cShareForm button[type=submit]'); await p.waitForTimeout(300); await shot('share');
d = await db(); ok(d.project_shares.map(s => s.email).sort().join() === 'later@crew.test,view@crew.test', 'editor shares by email (lower-cased), including someone not signed up yet');
await p.click('[data-close]'); await signOut();
ok(await chip() === '' && await p.evaluate(() => !S.cloud), 'signing out detaches the cloud project');

// viewer (clear this browser's done marks so it behaves like the crew member's own phone)
await p.evaluate(() => localStorage.removeItem('markoutTool.cloudDone.v1'));
await signIn('view@crew.test');
await p.click('#btnAccount'); await p.waitForTimeout(300); await shot('projects-viewer');
ok(await p.isHidden('#cNewGo') && /ask an admin/i.test(await p.textContent('#cList')), 'viewer cannot create cloud projects');
await p.click('[data-open]'); await p.waitForTimeout(500);
ok(dialogs.some(m => /only on this device/.test(m)), 'opening a cloud project over a local-only one asks first');
ok(await chip() === 'View only', 'viewer opens the shared project as view only');
ok(await p.evaluate(() => S.hoists[0].id) === 'USR-EDITED', 'viewer sees the latest saved data');
ok(await p.evaluate(() => S.done.size) === 0, 'editor done marks are not shared');
ok(await p.evaluate(() => getComputedStyle(document.querySelector('#v-data input[data-k=id]')).pointerEvents) === 'none', 'data table is locked for viewers');
await p.evaluate(() => { alignX(); addRow(0); });
ok(await p.evaluate(() => S.raw.rows.length) === 95, 'viewer cannot add rows or align');
const tickId = await p.evaluate(() => { const id = S.hoists.find(h => h.ok && !h.datum).id; toggleDone(id); return id; });
await p.waitForTimeout(2500); d = await db(); ok(JSON.stringify(d.projects[0].data).includes('USR-EDITED') && d.projects[0].data.raw.rows.length === 95, 'viewer ticking marks does not write to the cloud');
const pdfOk = await p.evaluate(() => { const { rec, info } = buildSheet(); return info.pages >= 1 && rec.doc.output('blob').size > 1000; });
ok(pdfOk, 'viewer can export a PDF');

// owner changes it; viewer picks up the new version on reload, keeps own ticks
await p.evaluate(() => { const db = window.__mock.db(); db.projects[0].data.raw.rows[0][2] = 'USR-V2'; db.projects[0].updated_at = new Date(Date.now() + 60000).toISOString(); window.__mock.save(db); });
await p.reload(); await p.waitForTimeout(800);
ok(await p.evaluate(() => S.hoists[0].id) === 'USR-V2', 'viewer gets the owner\'s newer version on reload');
ok(await p.evaluate(id => S.done.has(id), tickId), 'viewer\'s own done marks survive the update (kept on this device)');
await shot('viewer-plot');

// access removed
await p.evaluate(() => { const db = window.__mock.db(); db.project_shares = db.project_shares.filter(s => s.email !== 'view@crew.test'); window.__mock.save(db); });
await p.reload(); await p.waitForTimeout(800);
ok(await p.evaluate(() => !S.cloud && S.raw.rows.length === 95), 'when a share is removed the viewer keeps a local copy and is detached');
await signOut();

// admin team screen
await signIn('admin@crew.test'); await p.click('#btnAccount'); await p.click('#cTeam'); await p.waitForTimeout(300); await shot('team');
const vid = await p.evaluate(() => window.__mock.db().profiles.find(x => x.email === 'view@crew.test').id);
await p.selectOption(`select[data-uid="${vid}"]`, 'editor'); await p.waitForTimeout(300);
ok((await db()).profiles.find(x => x.email === 'view@crew.test').role === 'editor', 'admin promotes a viewer to editor');
ok(await p.isDisabled(`select[data-uid="${(await db()).profiles.find(x => x.email === 'admin@crew.test').id}"]`), 'admin cannot change their own role from the app');
await p.click('[data-close]'); await signOut();

// sign-up and password reset
await p.click('#btnAccount'); await p.click('[data-m=up]'); await p.fill('#cEmail', 'new@crew.test'); await p.fill('#cPass', 'pw123456'); await p.click('#cGo'); await p.waitForTimeout(200);
ok(/confirm/i.test(await p.textContent('#cMsg')) && (await db()).profiles.find(x => x.email === 'new@crew.test').role === 'viewer', 'sign-up asks to confirm email and starts as viewer');
await p.click('[data-m=in]'); await p.click('[data-m=reset]'); await p.fill('#cEmail', 'ed@crew.test'); await p.click('#cGo'); await p.waitForTimeout(200);
ok((await p.evaluate(() => window.__mock.calls)).some(c => c[0] === 'reset' && c[1] === 'ed@crew.test'), 'forgot password sends a reset email');

// phone layout
await p.setViewportSize({ width: 390, height: 800 }); await p.click('[data-m=in]'); await shot('signin-phone');
await p.click('[data-close]');

ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs.join(' | ') : ''));
console.log(process.exitCode ? 'SOME TESTS FAILED' : `ALL ${n} CLOUD UI TESTS PASSED`);
await b.close(); srv.kill();
