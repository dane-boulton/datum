# DATUM - Production Markout Tool

Single-page app for arena floor markout: import a CSV of chain motors, plot them, work through markout rows on your phone, and export a PDF markout sheet. Installable as a PWA and works offline.

- `src/app.html` - the whole app (edit this)
- `scripts/build.mjs` - inlines jsPDF + icon and writes `site/index.html` and `site/sw.js`
- `site/` - what Netlify publishes (manifest, icons, headers; `index.html` and `sw.js` are generated)
- `supabase/schema.sql` - database tables and access rules for cloud sign-in (optional; see `docs/CLOUD_SETUP.md`)
- `tests/` - browser test for the cloud screens, using a stand-in Supabase client

## Develop
    npm install
    npm run build
    npx serve site        # or: python3 -m http.server -d site

## Deploy
Netlify builds automatically from `netlify.toml` (build: `npm install && node scripts/build.mjs`, publish: `site`). Push to `main` to deploy.

## Cloud sign-in (optional)
Set `SUPABASE_URL` and `SUPABASE_ANON_KEY` in Netlify to turn on sign-in, cloud projects and sharing. Without them the app works offline-only, as before. Full steps: `docs/CLOUD_SETUP.md`.
