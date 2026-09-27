// End-to-end test of the cloud UI (sign-in wall, invites, roles, projects, sharing) against tests/mock-supabase.js.
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
const p = await ctx.newPage(); const errs = []; const dialogs = [];
p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => { dialogs.push(d.message()); d.accept(); });
// The Netlify invite function: "not deployed" (404) until inviteFn is switched on, then simulated against the mock database
let inviteFn = false; const fnCalls = [];
await p.route('**/.netlify/functions/invite', async route => {
  if (!inviteFn) return route.fulfill({ status: 404, body: 'Not found' });
  const req = route.request(), body = JSON.parse(req.postData()); fnCalls.push({ auth: req.headers()['authorization'], body });
  await p.evaluate(([e, r]) => window.__mock.inviteByEmail(e, r), [body.email, body.role]);
  return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, sent: true }) });
});
let n = 0; const ok = (c, what) => { if (!c) { console.error('FAIL', what); process.exitCode = 1; } else { n++; console.log('ok ', what); } };
const shot = async name => { if (SHOTS) await p.screenshot({ path: `${SHOTS}/${name}.png` }); };
const db = () => p.evaluate(() => window.__mock.db());
const chip = () => p.evaluate(() => { const c = document.getElementById('cloudChip'); return c.hidden ? '' : c.textContent; });
const msg = () => p.textContent('#cMsg');
const gate = () => p.isVisible('#gate');
const signIn = async (email, pw = 'password1') => { await p.fill('#cEmail', email); await p.fill('#cPass', pw); await p.click('#cGo'); await p.waitForTimeout(400); };
const setup = async (email, pw = 'password1', pw2 = pw) => { await p.click('[data-m=setup]'); await p.fill('#cEmail', email); await p.fill('#cPass', pw); await p.fill('#cPass2', pw2); await p.click('#cGo'); await p.waitForTimeout(300); };
const signOut = async () => { await p.click('#btnAccount'); await p.click('#cOut'); await p.waitForTimeout(300); };

await p.goto(BASE);
await p.evaluate(() => { localStorage.clear(); window.__mock.seed([['dane@vektorprojects.com', 'password1', 'admin']]); });
await p.reload(); await p.waitForTimeout(400);

// ---- the sign-in wall
ok(await gate() && await p.isVisible('#cEmail'), 'app opens on the sign-in screen');
ok(await p.isHidden('#btnAccount'), 'no account button until signed in');
await shot('gate');
await setup('nobody@crew.test');
ok(/not been invited/.test(await msg()), 'an uninvited email cannot set up an account');
await p.click('[data-m=in]');
await p.click('#cGoogle'); ok((await p.evaluate(() => window.__mock.calls)).some(c => c[0] === 'oauth' && c[1].provider === 'google'), 'Continue with Google starts Google sign-in');
await p.goto(BASE + '#error=server_error&error_description=Database+error+saving+new+user'); await p.reload(); await p.waitForTimeout(600);
ok(await gate() && /not been invited/.test(await msg()), 'Google sign-in for an uninvited email explains why');
ok(!(await p.evaluate(() => location.hash)), 'the error is cleared from the address bar');
await signIn('dane@vektorprojects.com', 'nope-nope');
ok(/Invalid/.test(await msg()), 'wrong password shows an error');

// ---- admin invites the crew
await signIn('dane@vektorprojects.com');
ok(!(await gate()) && await p.isVisible('#btnAccount'), 'admin signs in and the app opens');
await p.click('#btnAccount'); await p.click('#cTeam'); await p.waitForTimeout(300);
await p.fill('#cInvEmail', 'Ed@Crew.test'); await p.selectOption('#cInvRole', 'editor'); await p.click('#cInvForm button[type=submit]'); await p.waitForTimeout(300);
await p.fill('#cInvEmail', 'view@crew.test'); await p.selectOption('#cInvRole', 'viewer'); await p.click('#cInvForm button[type=submit]'); await p.waitForTimeout(300);
await shot('team-invites');
let d = await db();
ok(d.invites.some(i => i.email === 'ed@crew.test' && i.role === 'editor') && d.invites.some(i => i.email === 'view@crew.test' && i.role === 'viewer'), 'admin invites people with a role');
ok(/mailto:view%40crew\.test/.test(await p.getAttribute('#cTeamList a.btn >> nth=1', 'href') || await p.getAttribute('#cTeamList a.btn', 'href')), 'each pending invite has an Email invite link');
ok(await p.isDisabled('select[data-uid]'), 'admin cannot change their own role');
ok(/not set up/.test(await msg()), 'without the server function, the app says to send the steps by Email invite');
await p.click('[data-close]'); await signOut();
ok(await gate(), 'signing out returns to the sign-in screen');

// ---- editor sets up an account, saves and shares
await setup('ed@crew.test', 'password1', 'password2');
ok(/do not match/.test(await msg()), 'set-up checks the two passwords match');
await p.fill('#cPass', 'password1'); await p.fill('#cPass2', 'password1'); await p.click('#cGo'); await p.waitForTimeout(300);
ok(/check your email/i.test(await msg()), 'invited person sets up an account and is asked to confirm their email');
await signIn('ed@crew.test');
ok(!(await gate()) && (await db()).profiles.find(x => x.email === 'ed@crew.test').role === 'editor', 'editor gets the role they were invited with');
await p.click('#btnSample'); await p.waitForTimeout(300);
await p.click('#btnCloudSave'); await p.waitForTimeout(300);
await p.fill('#cNewName', 'Arena Test'); await p.click('#cNewGo'); await p.waitForTimeout(400);
d = await db(); ok(d.projects.length === 1 && d.projects[0].name === 'Arena Test', 'editor saves the project to the cloud');
await p.click('[data-close]');
await p.evaluate(() => { toggleDone(S.hoists.find(h => h.ok && !h.datum).id); });
await p.click('.tabs >> text=Data'); await p.fill('input[data-ri="0"][data-k="id"]', 'USR-EDITED'); await p.press('input[data-ri="0"][data-k="id"]', 'Enter');
await p.waitForTimeout(2600); d = await db();
ok(JSON.stringify(d.projects[0].data).includes('USR-EDITED') && await chip() === 'Saved', 'edits auto-save to the cloud');
ok(!('done' in d.projects[0].data), 'done marks are not uploaded');
await p.click('#btnAccount'); await p.click('[data-share]');
await p.fill('#cShareEmail', 'VIEW@crew.test'); await p.click('#cShareForm button[type=submit]'); await p.waitForTimeout(300);
ok(/Shared with view@crew.test\.$/.test(await msg()), 'editor shares with an invited crew member');
await p.fill('#cShareEmail', 'later@crew.test'); await p.click('#cShareForm button[type=submit]'); await p.waitForTimeout(300);
ok(/not been invited/.test(await msg()), 'sharing with someone not invited warns the editor');
await p.click('[data-close]'); await signOut();

// ---- viewer
await setup('view@crew.test'); await signIn('view@crew.test');
ok(!(await gate()) && await p.evaluate(() => S.raw.rows.length) === 0, 'a different person signing in starts with a clean screen');
ok(await p.isVisible('#cloudModal') && /view-only access/.test(await p.textContent('#cList')), 'viewer lands on their shared projects');
await shot('projects-viewer');
await p.click('[data-close]');
ok(await p.isHidden('#drop') && await p.isHidden('#btnSample') && await p.isHidden('#btnSaveProj') && await p.isVisible('#btnViewerOpen'), 'viewer has no import, file or new-project controls');
await p.evaluate(() => loadCSVText('Hoist Type,Hoist Function,Hoist ID,Origin X,Origin Y\n1 t,Audio,A1,0,0\n', 'x.csv'));
ok(await p.evaluate(() => S.raw.rows.length) === 0, 'viewer cannot import a CSV');
await p.click('#btnViewerOpen'); await p.waitForTimeout(300); await p.click('[data-open]'); await p.waitForTimeout(500);
ok(await chip() === 'View only' && await p.evaluate(() => S.hoists[0].id) === 'USR-EDITED', 'viewer opens the shared project, view only');
ok(await p.evaluate(() => S.done.size) === 0, 'editor done marks are not shared');
ok(await p.evaluate(() => getComputedStyle(document.querySelector('#v-data input[data-k=id]')).pointerEvents) === 'none', 'data table is locked for viewers');
await p.evaluate(() => { alignX(); addRow(0); });
ok(await p.evaluate(() => S.raw.rows.length) === 95, 'viewer cannot add rows or align');
const tickId = await p.evaluate(() => { const id = S.hoists.find(h => h.ok && !h.datum).id; toggleDone(id); return id; });
await p.waitForTimeout(2500); d = await db(); ok(d.projects[0].data.raw.rows.length === 95 && JSON.stringify(d.projects[0].data).includes('USR-EDITED'), 'viewer ticks do not write to the cloud');
ok(await p.evaluate(() => { const { rec, info } = buildSheet(); return info.pages >= 1 && rec.doc.output('blob').size > 1000; }), 'viewer can export a PDF');
await p.evaluate(() => { const db = window.__mock.db(); db.projects[0].data.raw.rows[0][2] = 'USR-V2'; db.projects[0].updated_at = new Date(Date.now() + 60000).toISOString(); window.__mock.save(db); });
await p.reload(); await p.waitForTimeout(900);
ok(!(await gate()) && await p.evaluate(() => S.hoists[0].id) === 'USR-V2', 'viewer stays signed in and gets the owner\'s newer version on reload');
ok(await p.evaluate(id => S.done.has(id), tickId), 'viewer\'s own done marks are kept on the device');
await shot('viewer-plot');
await p.evaluate(() => { const db = window.__mock.db(); db.project_shares = db.project_shares.filter(s => s.email !== 'view@crew.test'); window.__mock.save(db); });
await p.reload(); await p.waitForTimeout(900);
ok(await p.evaluate(() => !S.cloud && S.raw.rows.length === 0), 'when a share is removed the viewer loses the project');
await p.click('[data-close]').catch(() => {}); await signOut();

// ---- admin removes access
await signIn('dane@vektorprojects.com');
await p.click('#btnAccount'); await p.click('#cTeam'); await p.waitForTimeout(300);
const vid = (await db()).profiles.find(x => x.email === 'view@crew.test').id;
await p.click(`[data-off="${vid}"]`); await p.click(`[data-off="${vid}"]`); await p.waitForTimeout(400);
d = await db(); ok(d.profiles.find(x => x.email === 'view@crew.test').role === 'disabled' && !d.invites.some(i => i.email === 'view@crew.test'), 'admin removes someone\'s access');
await p.click('[data-close]'); await signOut();
await signIn('view@crew.test');
ok(await gate() && /Access removed/.test(await p.textContent('#gateBody')), 'a removed person sees "Access removed" and nothing else');
await p.click('#cOut2'); await p.waitForTimeout(300);

// ---- automatic invite emails (server function available)
inviteFn = true;
await signIn('dane@vektorprojects.com');
await p.click('#btnAccount'); await p.click('#cTeam'); await p.waitForTimeout(300);
await p.fill('#cInvEmail', 'crew2@crew.test'); await p.selectOption('#cInvRole', 'editor'); await p.click('#cInvGo'); await p.waitForTimeout(500);
ok(/Invite email sent to crew2@crew.test/.test(await msg()), 'Invite sends the email through the server function');
ok(fnCalls[0] && /^Bearer tok-/.test(fnCalls[0].auth) && fnCalls[0].body.role === 'editor' && /^http/.test(fnCalls[0].body.redirectTo), 'the function gets the admin\'s sign-in token, the role and the link back to the app');
let tl = await p.textContent('#cTeamList');
ok(/invite email sent/.test(tl) && tl.indexOf('crew2@crew.test') > tl.indexOf('Invited, not signed in yet'), 'the invitee shows as invited until they sign in');
await p.click('[data-resend="crew2@crew.test"]'); await p.waitForTimeout(300);
ok(fnCalls.length === 2, 'Resend email calls the function again');
await shot('team-emailed');
await p.click('[data-close]'); await signOut();
await p.evaluate(() => window.__mock.openInviteLink('crew2@crew.test')); await p.reload(); await p.waitForTimeout(600);
ok(await gate() && /Welcome to DATUM/.test(await p.textContent('#gateBody')), 'the invite link opens a choose-your-password step');
await shot('welcome');
await p.fill('#cPass', 'password9'); await p.fill('#cPass2', 'password8'); await p.click('#cGo'); await p.waitForTimeout(200);
ok(/do not match/.test(await msg()), 'the password step checks both entries match');
await p.fill('#cPass2', 'password9'); await p.click('#cGo'); await p.waitForTimeout(500);
d = await db();
ok(!(await gate()) && d.users['crew2@crew.test'].pw === 'password9' && d.users['crew2@crew.test'].meta.datum_needs_password === false, 'after choosing a password the invitee is in the app');
ok(await p.evaluate(() => canAuthor()), 'the invitee has the role they were invited with (editor)');
await signOut(); await signIn('crew2@crew.test', 'password9');
ok(!(await gate()), 'from then on they sign in with email and password');
await signOut();
await signIn('dane@vektorprojects.com'); await p.click('#btnAccount'); await p.click('#cTeam'); await p.waitForTimeout(300);
tl = await p.textContent('#cTeamList');
ok(tl.indexOf('crew2@crew.test') < tl.indexOf('Invited, not signed in yet'), 'once they have signed in they move to People');
await p.fill('#cInvEmail', 'gpal@crew.test'); await p.click('#cInvGo'); await p.waitForTimeout(400);
await p.click('[data-close]'); await signOut();
await p.evaluate(() => window.__mock.openInviteLink('gpal@crew.test')); await p.reload(); await p.waitForTimeout(600);
await p.click('#cSkipPw'); await p.waitForTimeout(400);
ok(!(await gate()) && (await db()).users['gpal@crew.test'].meta.datum_needs_password === false, 'Google users can skip the password step');
await p.click('[data-close]').catch(() => {}); await signOut();

// ---- setup problems are explained, not shown as "access removed"
await p.evaluate(() => { const db = window.__mock.db(); db.profiles = db.profiles.filter(x => x.email !== 'ed@crew.test'); window.__mock.save(db); localStorage.removeItem('markoutTool.cloudUser.v1'); });
await signIn('ed@crew.test');
ok(await gate() && /not set up in DATUM yet/.test(await p.textContent('#gateBody')) && await p.isVisible('#cRetry'), 'a signed-in person with no account record is told why, with Try again');
ok((await p.evaluate(() => window.__mock.calls)).some(c => c[0] === 'refresh'), 'it refreshes the sign-in once before giving up');
const diag = await p.textContent('.cdiag');
ok(/Database sees email\s*ed@crew\.test/.test(diag) && /Database sees role\s*disabled/.test(diag) && /Sign-in server\s*accepted/.test(diag), 'the screen shows what the browser and the database see');
await shot('signin-diag');
await p.evaluate(() => { const db = window.__mock.db(), u = db.users['ed@crew.test']; db.profiles.push({ id: u.id, email: 'ed@crew.test', role: 'editor' }); window.__mock.save(db); });
await p.click('#cRetry'); await p.waitForTimeout(500);
ok(!(await gate()) && await p.evaluate(() => canAuthor()), 'Try again gets in once the account record exists');
await p.click('[data-close]').catch(() => {}); await signOut();
await p.evaluate(() => { window.__mock.failTable = 'profiles'; localStorage.removeItem('markoutTool.cloudUser.v1'); });
await signIn('crew2@crew.test', 'password9');
ok(await gate() && /could not check your access/.test(await p.textContent('#gateBody')) && /does not exist/.test(await p.textContent('#gateBody')), 'a database error is shown instead of "access removed"');
await p.evaluate(() => { window.__mock.failTable = null; });
await p.click('#cRetry'); await p.waitForTimeout(500);
ok(!(await gate()), 'Try again works once the database is reachable');
await p.click('[data-close]').catch(() => {}); await signOut();

// ---- password reset
await p.click('[data-m=reset]'); await p.fill('#cEmail', 'ed@crew.test'); await p.click('#cGo'); await p.waitForTimeout(200);
ok((await p.evaluate(() => window.__mock.calls)).some(c => c[0] === 'reset' && c[1] === 'ed@crew.test'), 'forgot password sends a reset email');

await p.setViewportSize({ width: 390, height: 800 }); await p.click('[data-m=in]'); await shot('gate-phone');
ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs.join(' | ') : ''));
console.log(process.exitCode ? 'SOME TESTS FAILED' : `ALL ${n} CLOUD UI TESTS PASSED`);
await b.close(); srv.kill();
