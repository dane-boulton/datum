// Unit test for netlify/functions/invite.mjs with Supabase's HTTP API stubbed out. Run: node tests/invite-fn.test.mjs
import handler from '../netlify/functions/invite.mjs';
let n = 0, fail = 0; const ok = (c, what) => { if (c) { n++; console.log('ok ', what); } else { fail++; console.error('FAIL', what); } };
const SB = 'https://proj.supabase.co';
let calls, users, inviteStatus;
globalThis.fetch = async (u, o = {}) => {
  const url = String(u), h = o.headers || {}; calls.push({ url, method: o.method || 'GET', headers: h, body: o.body ? JSON.parse(o.body) : null });
  const res = (s, b) => new Response(JSON.stringify(b), { status: s });
  if (url === SB + '/auth/v1/user') { const u2 = users[(h.authorization || '').replace('Bearer ', '')]; return u2 ? res(200, { id: u2.id, email: u2.email }) : res(401, { msg: 'bad jwt' }); }
  if (url.startsWith(SB + '/rest/v1/profiles')) { if (h.apikey !== 'service-key') return res(401, {}); const id = decodeURIComponent(url.split('id=eq.')[1]); const u2 = Object.values(users).find(x => x.id === id); return res(200, u2 ? [{ role: u2.role }] : []); }
  if (url.startsWith(SB + '/rest/v1/invites')) return new Response(null, { status: 201 });
  if (url.startsWith(SB + '/auth/v1/invite')) return inviteStatus === 200 ? res(200, { id: 'new' }) : res(inviteStatus, { msg: inviteStatus === 422 ? 'A user with this email address has already been registered' : 'Error sending invite email' });
  return res(404, {});
};
const call = (body, token, method = 'POST') => handler(new Request('https://datum.netlify.app/.netlify/functions/invite', { method, headers: token ? { authorization: 'Bearer ' + token } : {}, body: method === 'POST' ? JSON.stringify(body) : undefined }));
const reset = () => { calls = []; inviteStatus = 200; users = { 'tok-admin': { id: 'a1', email: 'dane@vektorprojects.com', role: 'admin' }, 'tok-ed': { id: 'e1', email: 'ed@crew.test', role: 'editor' } }; };

reset(); delete process.env.SUPABASE_URL;
ok((await call({ email: 'x@y.z' }, 'tok-admin')).status === 501, 'reports 501 when the server keys are not set');
process.env.SUPABASE_URL = SB; process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key';
reset(); ok((await call({ email: 'x@y.z' }, 'tok-admin', 'GET')).status === 405, 'only POST');
reset(); ok((await call({ email: 'x@y.z' })).status === 401, 'refuses requests without a sign-in token');
reset(); ok((await call({ email: 'x@y.z' }, 'forged')).status === 401, 'refuses an invalid token');
reset(); ok((await call({ email: 'x@y.z' }, 'tok-ed')).status === 403 && !calls.some(c => c.url.includes('/invite')), 'refuses non-admins and sends nothing');
reset(); ok((await call({ email: 'not an email' }, 'tok-admin')).status === 400, 'rejects a bad email');
reset(); let r = await call({ email: ' New@Crew.test ', role: 'editor', redirectTo: 'https://datum.netlify.app/' }, 'tok-admin'); let b = await r.json();
const up = calls.find(c => c.url.includes('/rest/v1/invites')), iv = calls.find(c => c.url.includes('/auth/v1/invite'));
ok(r.status === 200 && b.sent === true, 'admin invite succeeds');
ok(up && up.body.email === 'new@crew.test' && up.body.role === 'editor' && up.body.invited_by === 'a1' && /merge-duplicates/.test(up.headers.prefer), 'saves the invite (lower-cased, with role) before sending');
ok(calls.indexOf(up) < calls.indexOf(iv), 'invite row is written before the account is created');
ok(iv && iv.body.email === 'new@crew.test' && iv.body.data.datum_needs_password === true && iv.url.includes('redirect_to=' + encodeURIComponent('https://datum.netlify.app/')), 'asks Supabase to email the invite with a link back to the app');
ok(iv.headers.apikey === 'service-key', 'uses the service key only on the server');
reset(); r = await call({ email: 'x@y.z', role: 'superuser' }, 'tok-admin'); ok(calls.find(c => c.url.includes('/rest/v1/invites')).body.role === 'viewer', 'unknown roles become viewer');
reset(); r = await call({ email: 'x@y.z', redirectTo: 'javascript:alert(1)' }, 'tok-admin'); ok(calls.find(c => c.url.includes('/auth/v1/invite')).url.includes(encodeURIComponent('https://datum.netlify.app/')), 'ignores a non-http redirect');
reset(); inviteStatus = 422; b = await (await call({ email: 'ed@crew.test' }, 'tok-admin')).json(); ok(b.ok && b.existing && !b.sent, 'existing account: invite saved, no email, reported as existing');
reset(); inviteStatus = 500; r = await call({ email: 'x@y.z' }, 'tok-admin'); b = await r.json(); ok(r.status === 502 && /could not be sent/.test(b.error), 'email failure is reported (e.g. SMTP not set up)');
reset(); await call({ email: 'x@y.z' }, 'tok-admin'); ok(calls.find(c => c.url.includes('/auth/v1/invite')).headers.authorization === 'Bearer service-key', 'legacy service_role key is also sent as a Bearer token');
process.env.SUPABASE_SERVICE_ROLE_KEY = 'sb_secret_abc';
reset(); const f0 = globalThis.fetch; globalThis.fetch = (u, o = {}) => { if (String(u).includes('/rest/v1/profiles')) o.headers = Object.assign({}, o.headers, { apikey: 'service-key' }); return f0(u, o); };
await call({ email: 'x@y.z' }, 'tok-admin'); const iv2 = calls.find(c => c.url.includes('/auth/v1/invite'));
ok(iv2 && !iv2.headers.authorization && iv2.headers.apikey === 'sb_secret_abc', 'new sb_secret_ keys are sent in the apikey header only');
globalThis.fetch = f0;
console.log(fail ? 'SOME TESTS FAILED' : `ALL ${n} INVITE FUNCTION TESTS PASSED`); process.exitCode = fail ? 1 : 0;
