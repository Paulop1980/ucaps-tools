/* ─────────────────────────────────────────────────────────────
   UCAPS Shared Utilities
   ─── Edit the two lines below with your Supabase credentials ─
   ───────────────────────────────────────────────────────────── */

const SUPABASE_URL  = 'https://hcqedahzjtksndaxeczd.supabase.co/rest/v1/';   // e.g. https://xyzabcdef.supabase.co
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjcWVkYWh6anRrc25kYXhlY3pkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMjcwMDIsImV4cCI6MjA5NjYwMzAwMn0.gB1fNlp4uMa04hVJt-BDKqg8zF7CPWqyYP7OFqGulxk'; // from Settings → API

/* ─── password config ─────────────────────────────────────── */
const ACCESS_PASSWORD = 'RIPSouthDining2026!';  // change this to your password
const SESSION_KEY     = 'ucaps-auth';
const SESSION_EXPIRY  = 8;             // hours

/* ─── password gate ───────────────────────────────────────── */
function ucapsGate() {
  const stored = sessionStorage.getItem(SESSION_KEY);
  if (stored && parseInt(stored) > Date.now()) return; // already authed

  const gate = document.createElement('div');
  gate.id = 'ucaps-gate';
  gate.innerHTML = `
    <div style="position:fixed;inset:0;background:#0E1F33;z-index:9999;display:flex;align-items:center;justify-content:center;padding:24px;">
      <div id="ucaps-gate-box" style="background:#1F3A5C;border:1px solid rgba(255,255,255,.1);border-radius:14px;padding:40px 44px;width:100%;max-width:380px;box-shadow:0 24px 60px rgba(0,0,0,.4);transition:transform .08s;">
        <div style="width:44px;height:44px;background:#C9953A;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:700;color:#0E1F33;margin-bottom:24px;font-family:sans-serif;">UC</div>
        <div style="font-size:24px;color:#fff;margin-bottom:6px;font-family:Georgia,serif;">UCAPS Tools</div>
        <div style="font-size:13px;color:rgba(255,255,255,.5);margin-bottom:28px;font-family:sans-serif;">University of Massachusetts Lowell</div>
        <div style="display:flex;flex-direction:column;gap:10px;">
          <label style="font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:rgba(255,255,255,.45);font-family:sans-serif;">Password</label>
          <input id="ucaps-gate-input" type="password" placeholder="Enter access password"
            style="padding:11px 14px;border-radius:8px;border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.07);color:#fff;font-size:14px;width:100%;outline:none;font-family:sans-serif;">
          <div id="ucaps-gate-error" style="font-size:12px;color:#F87171;display:none;font-family:sans-serif;">Incorrect password. Try again.</div>
          <button id="ucaps-gate-btn"
            style="margin-top:6px;padding:12px;border-radius:8px;border:none;background:#C9953A;color:#0E1F33;font-size:14px;font-weight:700;cursor:pointer;font-family:sans-serif;">
            Sign in →
          </button>
        </div>
        <div style="margin-top:24px;font-size:11px;color:rgba(255,255,255,.25);text-align:center;font-family:sans-serif;">UCAPS internal use only</div>
      </div>
    </div>`;
  document.body.insertBefore(gate, document.body.firstChild);

  function attempt() {
    const input = document.getElementById('ucaps-gate-input');
    const error = document.getElementById('ucaps-gate-error');
    if (input.value === ACCESS_PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, Date.now() + SESSION_EXPIRY * 3600000);
      gate.remove();
    } else {
      error.style.display = 'block';
      input.value = '';
      input.focus();
      const box = document.getElementById('ucaps-gate-box');
      ['-8px','8px','-4px','0'].forEach((x,i) =>
        setTimeout(() => box.style.transform = `translateX(${x})`, i * 80));
    }
  }
  document.getElementById('ucaps-gate-btn').addEventListener('click', attempt);
  document.getElementById('ucaps-gate-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') attempt();
  });
  setTimeout(() => document.getElementById('ucaps-gate-input').focus(), 100);
}

/* ─── supabase client (lightweight REST wrapper) ──────────── */
const db = {
  async get(key) {
    try {
      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/ucaps_store?key=eq.${encodeURIComponent(key)}&select=value`,
        { headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` } }
      );
      const rows = await r.json();
      if (rows && rows.length) return JSON.parse(rows[0].value);
    } catch(e) { console.warn('db.get failed', e); }
    return null;
  },

  async set(key, value) {
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/ucaps_store`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_ANON,
          Authorization: `Bearer ${SUPABASE_ANON}`,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates',
        },
        body: JSON.stringify({ key, value: JSON.stringify(value), updated_at: new Date().toISOString() }),
      });
    } catch(e) { console.warn('db.set failed', e); }
  }
};

/* ─── SQL to run once in Supabase SQL editor ──────────────── */
/*
CREATE TABLE IF NOT EXISTS ucaps_store (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Allow read/write from the browser (anon key)
ALTER TABLE ucaps_store ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read"  ON ucaps_store FOR SELECT USING (true);
CREATE POLICY "public write" ON ucaps_store FOR INSERT WITH CHECK (true);
CREATE POLICY "public update" ON ucaps_store FOR UPDATE USING (true);
*/
