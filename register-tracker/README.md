# Register Tracker

Inventory, testing and issue tracking for UCAPS cash registers, OTC kiosks and card terminals.

- **App:** `index.html` (single page, no build step). Served by GitHub Pages at `/ucaps-tools/register-tracker/`.
- **Backend:** Supabase project `ucaps-tools`, tables prefixed `reg_`. See `schema.sql`.
- **Sign-in:** email magic link. Only addresses in `reg_users` can read or change data (row-level security).
  Admins add people under **Data & settings → Approved users**.
- **Data:** register details (IPs, MACs, product keys) live only in Supabase. Never commit exports or CSVs to this public repo.

The Supabase URL and publishable key in `index.html` are meant to be public; the database rules are what protect the data.
