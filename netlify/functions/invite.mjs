// POST /.netlify/functions/invite  {email, role}  with the admin's Supabase access token as a Bearer token.
// Adds the email to public.invites and asks Supabase to send its "You have been invited" email.
// Needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (the secret or legacy service_role key) in Netlify's environment.
// The key is only read here on the server; the build never puts it in the page.
const ROLES = ['viewer', 'editor', 'admin'];
const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

export default async function handler(req) {
  if (req.method !== 'POST') return json(405, { error: 'Use POST.' });
  let url = ''; try { url = new URL((process.env.SUPABASE_URL || '').trim()).origin; } catch {}
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!url || !key) return json(501, { error: 'Invite emails are not set up on the server.' });
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token) return json(401, { error: 'Sign in first.' });
  let body; try { body = await req.json(); } catch { return json(400, { error: 'Bad request.' }); }
  const email = String(body.email || '').trim().toLowerCase(), role = ROLES.includes(body.role) ? body.role : 'viewer';
  const redirectTo = /^https?:\/\//.test(body.redirectTo || '') ? body.redirectTo : new URL(req.url).origin + '/';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json(400, { error: 'That does not look like an email address.' });

  // New-style secret keys (sb_secret_...) go in the apikey header only; legacy service_role keys are JWTs and also go in Authorization
  const admin = { apikey: key, 'content-type': 'application/json' };
  if (!key.startsWith('sb_secret_')) admin.authorization = 'Bearer ' + key;
  // who is asking?
  const who = await fetch(url + '/auth/v1/user', { headers: { apikey: key, authorization: 'Bearer ' + token } });
  if (!who.ok) return json(401, { error: 'Your sign-in has expired. Sign in again.' });
  const user = await who.json();
  const pr = await fetch(url + '/rest/v1/profiles?select=role&id=eq.' + encodeURIComponent(user.id), { headers: admin });
  const rows = pr.ok ? await pr.json() : [];
  if (!rows[0] || rows[0].role !== 'admin') return json(403, { error: 'Only admins can invite people.' });

  // add or update the invite (this is what allows the account to be created)
  const up = await fetch(url + '/rest/v1/invites?on_conflict=email', { method: 'POST', headers: { ...admin, prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ email, role, invited_by: user.id }) });
  if (!up.ok) return json(500, { error: 'Could not save the invite: ' + (await up.text()) });

  // send Supabase's invite email; the link signs them in and the app asks them to choose a password
  const inv = await fetch(url + '/auth/v1/invite?redirect_to=' + encodeURIComponent(redirectTo), { method: 'POST', headers: admin,
    body: JSON.stringify({ email, data: { datum_needs_password: true } }) });
  if (inv.ok) return json(200, { ok: true, sent: true });
  const err = await inv.json().catch(() => ({}));
  const msg = err.msg || err.message || err.error_description || err.error || ('HTTP ' + inv.status);
  if (inv.status === 422 || /already been registered|already registered|exists/i.test(msg)) return json(200, { ok: true, sent: false, existing: true });
  return json(502, { ok: true, sent: false, error: 'The invite was saved but the email could not be sent: ' + msg });
}
