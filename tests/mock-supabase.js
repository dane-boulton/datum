// In-browser stand-in for supabase-js, used by tests/cloud.test.mjs. Data lives in localStorage so it survives reloads.
// Access rules mirror supabase/schema.sql (tested separately against Postgres by supabase/test/rls_test.sql).
(() => {
  const DBK = '__mockdb', SK = '__mocksession';
  const load = () => JSON.parse(localStorage.getItem(DBK) || 'null') || { users: {}, profiles: [], projects: [], project_shares: [], invites: [] };
  const save = db => localStorage.setItem(DBK, JSON.stringify(db));
  const uuid = () => 'xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx'.replace(/x/g, () => (Math.random() * 16 | 0).toString(16));
  let tick = 0; const now = () => new Date(Date.now() + (tick++)).toISOString();
  window.__mock = {
    seed(users) { const db = load(); for (const [email, pw, role] of users) { const id = uuid(); db.users[email] = { id, pw }; db.profiles.push({ id, email, role }); db.invites.push({ email, role: role === 'disabled' ? 'viewer' : role, created_at: now() }); } save(db); },
    invite(email, role) { const db = load(); db.invites.push({ email, role: role || 'viewer', created_at: now() }); save(db); },
    // what the Netlify invite function + Supabase do: save the invite, create the account, email a sign-in link
    inviteByEmail(email, role) { const db = load(); email = email.toLowerCase(); const i = db.invites.find(x => x.email === email);
      if (i) i.role = role; else db.invites.push({ email, role, created_at: now() });
      if (!db.users[email]) { const id = uuid(); db.users[email] = { id, pw: null, meta: { datum_needs_password: true } }; db.profiles.push({ id, email, role }); }
      save(db); },
    // clicking the link in the invite email signs the person in
    openInviteLink(email) { const db = load(), u = db.users[email]; u.signedIn = true; save(db);
      localStorage.setItem(SK, JSON.stringify({ access_token: 'tok-' + u.id, user: { id: u.id, email, user_metadata: Object.assign({}, u.meta) } })); },
    db: load, save, calls: [],
  };
  function client() {
    const listeners = [];
    const session = () => JSON.parse(localStorage.getItem(SK) || 'null');
    const emit = (ev, s) => listeners.forEach(cb => cb(ev, s));
    const me = () => session() && session().user;
    const role = db => { const u = me(); const p = u && db.profiles.find(p => p.id === u.id); return p ? p.role : 'disabled'; };
    const author = db => ['editor', 'admin'].includes(role(db));
    const access = db => ['viewer', 'editor', 'admin'].includes(role(db));
    const owns = (db, pid) => db.projects.some(p => p.id === pid && p.owner === me().id);
    const canRead = { projects: (db, r) => access(db) && (r.owner === me().id || db.project_shares.some(s => s.project_id === r.id && s.email === me().email)),
      project_shares: (db, r) => access(db) && (owns(db, r.project_id) || r.email === me().email),
      invites: db => role(db) === 'admin',
      profiles: (db, r) => r.id === me().id || role(db) === 'admin' };
    const auth = {
      onAuthStateChange(cb) { listeners.push(cb); setTimeout(() => cb('INITIAL_SESSION', session()), 0); return { data: { subscription: { unsubscribe() {} } } }; },
      async signInWithPassword({ email, password }) { const db = load(), u = db.users[email.toLowerCase()];
        if (!u || u.pw !== password) return { error: { message: 'Invalid login credentials' } };
        u.signedIn = true; save(db);
        const s = { access_token: 'tok-' + u.id, user: { id: u.id, email: email.toLowerCase(), user_metadata: Object.assign({}, u.meta || {}) } }; localStorage.setItem(SK, JSON.stringify(s)); emit('SIGNED_IN', s); return { data: s, error: null }; },
      async getSession() { return { data: { session: session() }, error: null }; },
      async refreshSession() { window.__mock.calls.push(['refresh']); const s = session(); return s ? { data: { session: s }, error: null } : { data: { session: null }, error: { message: 'no session' } }; },
      async getUser() { const s = session(); return s ? { data: { user: s.user }, error: null } : { data: { user: null }, error: { message: 'not signed in' } }; },
      async signUp({ email, password }) { const db = load(); email = email.toLowerCase(); if (db.users[email]) return { error: { message: 'User already registered' } };
        const inv = db.invites.find(i => i.email === email); if (!inv) return { data: null, error: { message: 'Database error saving new user', status: 500 } };
        const id = uuid(); db.users[email] = { id, pw: password }; db.profiles.push({ id, email, role: inv.role }); save(db); return { data: { session: null, user: { id } }, error: null }; },
      async signOut() { localStorage.removeItem(SK); emit('SIGNED_OUT', null); return { error: null }; },
      async signInWithOAuth(o) { window.__mock.calls.push(['oauth', o]); return { error: null }; },
      async resetPasswordForEmail(e, o) { window.__mock.calls.push(['reset', e, o]); return { error: null }; },
      async updateUser(o) { window.__mock.calls.push(['updateUser', o]); const s = session(); if (!s) return { error: { message: 'not signed in' } };
        const db = load(), u = db.users[s.user.email]; if (o.password) u.pw = o.password; if (o.data) u.meta = Object.assign({}, u.meta, o.data); save(db);
        s.user.user_metadata = Object.assign({}, u.meta); localStorage.setItem(SK, JSON.stringify(s)); emit('USER_UPDATED', s); return { data: { user: s.user }, error: null }; },
    };
    function from(t) {
      const q = { op: 'select', f: [], ord: null, one: null, body: null, ret: false };
      const b = {
        select() { if (q.op !== 'select') q.ret = true; return b; },
        insert(o) { q.op = 'insert'; q.body = o; return b; }, update(o) { q.op = 'update'; q.body = o; return b; }, delete() { q.op = 'delete'; return b; },
        eq(c, v) { q.f.push([c, v]); return b; }, order(c, o) { q.ord = [c, !o || o.ascending !== false]; return b; },
        single() { q.one = 'single'; return b; }, maybeSingle() { q.one = 'maybe'; return b; },
        then(res, rej) { return Promise.resolve().then(run).then(res, rej); },
      };
      function run() {
        if (!me()) return { data: null, error: { message: 'not signed in' } };
        if (window.__mock.hideProfiles && t === 'profiles' && q.op === 'select') return { data: q.one ? null : [], error: null };
        if (window.__mock.failTable === t) return { data: null, error: { message: 'relation "public.' + t + '" does not exist' } };
        const db = load(), rows = db[t], match = r => q.f.every(([c, v]) => r[c] === v) && canRead[t](db, r);
        let out;
        if (q.op === 'select') out = rows.filter(match);
        else if (q.op === 'insert') {
          const r = Object.assign({}, q.body);
          if (t === 'projects') { if (!author(db)) return { data: null, error: { message: 'new row violates row-level security policy for table "projects"', code: '42501' } };
            Object.assign(r, { id: uuid(), owner: me().id, owner_email: me().email, created_at: now(), updated_at: now() }); }
          if (t === 'project_shares') { if (!(owns(db, r.project_id) && author(db))) return { data: null, error: { message: 'new row violates row-level security policy', code: '42501' } };
            if (rows.some(s => s.project_id === r.project_id && s.email === r.email)) return { data: null, error: { message: 'duplicate key value violates unique constraint', code: '23505' } }; }
          if (t === 'invites') { if (role(db) !== 'admin') return { data: null, error: { message: 'new row violates row-level security policy', code: '42501' } };
            if (rows.some(i => i.email === r.email)) return { data: null, error: { message: 'duplicate key value violates unique constraint', code: '23505' } }; r.created_at = now(); }
          rows.push(r); out = [r];
        } else if (q.op === 'update') {
          out = rows.filter(match).filter(r => t === 'projects' ? (r.owner === me().id && author(db)) : (t === 'profiles' || t === 'invites') ? role(db) === 'admin' : false);
          for (const r of out) { Object.assign(r, q.body); if (t === 'projects') r.updated_at = now(); }
        } else {
          out = rows.filter(match).filter(r => t === 'projects' ? (r.owner === me().id && author(db)) : t === 'project_shares' ? (owns(db, r.project_id) || r.email === me().email) : t === 'invites' ? role(db) === 'admin' : false);
          db[t] = rows.filter(r => !out.includes(r)); if (t === 'projects') db.project_shares = db.project_shares.filter(s => !out.some(p => p.id === s.project_id));
        }
        save(db);
        if (q.ord) out = out.slice().sort((a, b2) => (a[q.ord[0]] < b2[q.ord[0]] ? -1 : a[q.ord[0]] > b2[q.ord[0]] ? 1 : 0) * (q.ord[1] ? 1 : -1));
        out = JSON.parse(JSON.stringify(out));
        if (q.one === 'single') return out.length === 1 ? { data: out[0], error: null } : { data: null, error: { message: 'JSON object requested, multiple (or no) rows returned' } };
        if (q.one === 'maybe') return { data: out[0] || null, error: null };
        return { data: out, error: null };
      }
      return b;
    }
    async function rpc(fn, args) { const db = load();
      if (fn === 'team') return { data: role(db) === 'admin' ? db.profiles.map(p => ({ id: p.id, email: p.email, role: p.role, signed_in: !!(Object.values(db.users).find(u => u.id === p.id) || {}).signedIn })).sort((a, b2) => a.email < b2.email ? -1 : 1) : [], error: null };
      if (fn === 'my_email') return { data: me() ? me().email : '', error: null };
      if (fn === 'my_role') return window.__mock.failTable === 'profiles' ? { data: null, error: { message: 'relation "public.profiles" does not exist' } } : { data: role(db), error: null };
      if (fn === 'is_invited') return { data: access(db) && db.invites.some(i => i.email === String(args.e).toLowerCase()), error: null }; return { data: null, error: { message: 'unknown rpc' } }; }
    return { auth, from, rpc };
  }
  window.__datumSupabase = () => client();
})();
