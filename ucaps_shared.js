/* ─────────────────────────────────────────────────────────────
   UCAPS Shared Utilities
   Sign-in: Supabase email link, limited to the approved list in
   the ucaps_users table (managed in Register Tracker →
   Data & settings → Approved users).
   The URL and publishable key below are meant to be public — the
   database's row-level security is what protects the data.
   ───────────────────────────────────────────────────────────── */

const SUPABASE_URL = 'https://hcqedahzjtksndaxeczd.supabase.co';
const SUPABASE_KEY = 'sb_publishable_CeEkIIgVUc0WUJtZ8c7zwA_Y6j1Rhi_';
const SUPABASE_JS  = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';

/* ─── load the Supabase client once ───────────────────────── */
const ucapsClient = new Promise((resolve, reject) => {
  const make = () => resolve(window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY,
    { auth: { persistSession: true, detectSessionInUrl: true, flowType: 'pkce' } }));
  if (window.supabase && window.supabase.createClient) return make();
  const s = document.createElement('script');
  s.src = SUPABASE_JS; s.onload = make; s.onerror = () => reject(new Error('Could not load Supabase'));
  document.head.appendChild(s);
});

/* ─── sign-in gate ────────────────────────────────────────── */
let _ucapsUser = null;
let _ucapsReadyResolve;
const ucapsReady = new Promise(r => { _ucapsReadyResolve = r; });   // resolves with the approved user
let _gateStarted = false;

function ucapsUser() { return _ucapsUser; }        // {email, name, is_admin} once signed in

async function ucapsSignOut() {
  const sb = await ucapsClient; await sb.auth.signOut(); location.reload();
}

function _gateShell() {
  let gate = document.getElementById('ucaps-gate');
  if (gate) return gate;
  gate = document.createElement('div');
  gate.id = 'ucaps-gate';
  gate.innerHTML = `
    <div style="position:fixed;inset:0;background:#0E1F33;z-index:9999;display:flex;align-items:center;justify-content:center;padding:24px;font-family:-apple-system,'Segoe UI',Roboto,sans-serif;">
      <div style="background:#1F3A5C;border:1px solid rgba(255,255,255,.1);border-radius:14px;padding:40px 44px;width:100%;max-width:400px;box-shadow:0 24px 60px rgba(0,0,0,.4);">
        <div style="width:44px;height:44px;background:#C9953A;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:700;color:#0E1F33;margin-bottom:24px;">UC</div>
        <div style="font-size:24px;color:#fff;margin-bottom:6px;font-family:Georgia,serif;">UCAPS Tools</div>
        <div style="font-size:13px;color:rgba(255,255,255,.5);margin-bottom:28px;">University of Massachusetts Lowell</div>
        <div id="ucaps-gate-body" style="color:rgba(255,255,255,.7);font-size:14px;">Checking sign-in…</div>
        <div style="margin-top:24px;font-size:11px;color:rgba(255,255,255,.25);text-align:center;">UCAPS internal use only</div>
      </div>
    </div>`;
  (document.body || document.documentElement).insertBefore(gate, document.body ? document.body.firstChild : null);
  return gate;
}

const _btn = 'margin-top:6px;padding:12px;border-radius:8px;border:none;background:#C9953A;color:#0E1F33;font-size:14px;font-weight:700;cursor:pointer;width:100%;';
const _esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function _showLogin(sb, msg) {
  const body = document.getElementById('ucaps-gate-body');
  body.innerHTML = `
    <form id="ucaps-gate-form" style="display:flex;flex-direction:column;gap:10px;">
      <label style="font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:rgba(255,255,255,.45);">Email</label>
      <input id="ucaps-gate-input" type="email" required autocomplete="email" placeholder="you@uml.edu"
        style="padding:11px 14px;border-radius:8px;border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.07);color:#fff;font-size:14px;width:100%;outline:none;">
      <div id="ucaps-gate-error" style="font-size:12px;color:#F87171;${msg ? '' : 'display:none;'}">${_esc(msg)}</div>
      <button style="${_btn}">Email me a sign-in link →</button>
      <div style="font-size:12px;color:rgba(255,255,255,.4);">Only approved UCAPS staff can sign in.</div>
    </form>`;
  const input = document.getElementById('ucaps-gate-input');
  setTimeout(() => input.focus(), 50);
  document.getElementById('ucaps-gate-form').addEventListener('submit', async e => {
    e.preventDefault();
    const email = input.value.trim().toLowerCase();
    const btn = e.target.querySelector('button'); btn.disabled = true; btn.textContent = 'Sending…';
    const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin + location.pathname } });
    if (error) {
      btn.disabled = false; btn.textContent = 'Email me a sign-in link →';
      const err = document.getElementById('ucaps-gate-error'); err.textContent = error.message; err.style.display = 'block';
      return;
    }
    body.innerHTML = `<div style="color:#fff;font-size:16px;margin-bottom:8px;">Check your email</div>
      <div>We sent a sign-in link to <b style="color:#fff">${_esc(email)}</b>. Open it in this browser on this device.</div>`;
  });
}

async function _checkSession() {
  const sb = await ucapsClient;
  const { data: { session } } = await sb.auth.getSession();
  if (!session) { _showLogin(sb); return; }
  const email = (session.user.email || '').toLowerCase();
  const { data, error } = await sb.from('ucaps_users').select('email,name,is_admin').eq('email', email).maybeSingle();
  if (error || !data) {
    document.getElementById('ucaps-gate-body').innerHTML = `
      <div style="color:#fff;font-size:16px;margin-bottom:8px;">Not on the approved list</div>
      <div><b style="color:#fff">${_esc(email)}</b> is signed in but hasn't been approved for UCAPS Tools. Ask a UCAPS admin to add you.</div>
      <button id="ucaps-gate-out" style="${_btn}margin-top:18px;">Use a different email</button>`;
    document.getElementById('ucaps-gate-out').onclick = ucapsSignOut;
    return;
  }
  _ucapsUser = data;
  const gate = document.getElementById('ucaps-gate'); if (gate) gate.remove();
  document.dispatchEvent(new CustomEvent('ucaps:signedin', { detail: data }));
  _ucapsReadyResolve(data);
}

function ucapsGate() {
  if (_gateStarted) return ucapsReady;
  _gateStarted = true;
  const start = () => { _gateShell(); _checkSession().catch(e => {
    const b = document.getElementById('ucaps-gate-body'); if (b) b.textContent = 'Sign-in unavailable: ' + e.message; }); };
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
  ucapsClient.then(sb => sb.auth.onAuthStateChange(ev => { if (ev === 'SIGNED_IN' && !_ucapsUser) _checkSession(); }));
  return ucapsReady;
}

/* ─── shared key/value store (ucaps_store) ────────────────────
   Same API as before: db.get(key) → parsed value, db.set(key, value).
   Every call waits for an approved sign-in. db.set(key, null) or
   db.del(key) removes the key.                                    */
const db = {
  async get(key) {
    try {
      await ucapsGate(); const sb = await ucapsClient;
      const { data, error } = await sb.from('ucaps_store').select('value').eq('key', key).maybeSingle();
      if (error) throw error;
      if (data) return JSON.parse(data.value);
    } catch (e) { console.warn('db.get failed', e); }
    return null;
  },
  async set(key, value) {
    if (value === null || value === undefined) return db.del(key);
    try {
      await ucapsGate(); const sb = await ucapsClient;
      const { error } = await sb.from('ucaps_store').upsert({ key, value: JSON.stringify(value), updated_at: new Date().toISOString(), updated_by: _ucapsUser && _ucapsUser.email });
      if (error) throw error;
    } catch (e) { console.warn('db.set failed', e); }
  },
  async del(key) {
    try {
      await ucapsGate(); const sb = await ucapsClient;
      const { error } = await sb.from('ucaps_store').delete().eq('key', key);
      if (error) throw error;
    } catch (e) { console.warn('db.del failed', e); }
  }
};

/* ─── database setup (already applied; kept for reference) ──
   See register-tracker/schema.sql for ucaps_users and the
   ucaps_private.is_approved() / is_admin() helpers.

create table if not exists public.ucaps_store (
  key        text primary key,
  value      text not null,
  updated_at timestamptz default now(),
  updated_by text default (auth.jwt() ->> 'email')
);
alter table public.ucaps_store enable row level security;
revoke all on public.ucaps_store from anon;
create policy "approved users" on public.ucaps_store for all to authenticated
  using ((select ucaps_private.is_approved())) with check ((select ucaps_private.is_approved()));
*/
