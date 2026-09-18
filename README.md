# FB Automation — Full-Stack App

A working Page-content-manager: static dashboard (plain HTML/CSS/JS, no
build step) + Express backend on the Meta Graph API. One codebase runs
locally, on Vercel, or on any Node-capable host ("AI Studio"-style
sandboxes included, as long as they can run `npm install && npm start`
and let you set environment variables).

## ⚠️ Before you do anything

- If you've ever pasted a real Facebook access token anywhere shared
  (chat, screenshot, doc), **revoke/regenerate it** at
  Facebook → Settings → Business Integrations, or via the app's settings
  under "Apps and Websites." A user access token is as sensitive as a
  password for whatever it's scoped to.
- Don't commit `.env` or `data.json` — both are already in `.gitignore`.

## What's real vs. not (please read before promising features to users)

- **Division/state-level geo-targeting for organic posts is not a Graph
  API feature.** Organic `feed_targeting` only supports country, age,
  gender, and (for very large Pages) a short list of major cities. If you
  need real region-level delivery control, that's the **Marketing API**
  (paid ads) — a fundamentally different product from a Page post. This
  app is honest about that limit in the Upload screen instead of faking
  it.
- **Page Stories publishing via API requires special Meta partner
  approval** and isn't available through the standard Graph API for a
  normal app. Not implemented here for that reason.
- **The JSON file "database" (`utils/store.js`) is for local testing
  only.** On Vercel/serverless the filesystem resets between invocations,
  so tokens won't reliably persist. Swap in a real DB (Vercel KV, Upstash
  Redis, Supabase, MongoDB Atlas) before real use — `saveUser()` /
  `getUser()` are the only two functions to change.

## 1. Local setup

```bash
cp .env.example .env
# edit .env with your Meta App ID/Secret (developers.facebook.com)
npm install
npm run dev
```

Open http://localhost:5000 — that's the dashboard. `/index.html` is the
connect screen.

You'll need a Meta App with `pages_show_list`, `pages_read_engagement`,
`pages_manage_posts`, and `publish_video` permissions (App Review is
required for anyone besides the app's own admins/testers/developers).

## 2. Deploy to Vercel

```bash
npm install -g vercel   # if you don't have it
vercel
```

Then set your environment variables (Project → Settings → Environment
Variables): `FB_APP_ID`, `FB_APP_SECRET`, `GRAPH_API_VERSION`, and
`FB_REDIRECT_URI` set to `https://<your-project>.vercel.app/auth/facebook/callback`
— and add that exact URL to your Meta App's "Valid OAuth Redirect URIs."

`vercel.json` routes every request through `api/index.js`, which wraps the
same Express app (`app.js`) used locally via `serverless-http` — so the
static dashboard, `/auth`, `/pages`, and `/upload` all work from one
deployment. Remember the database caveat above before relying on it for
more than a quick test.

## 3. Run in a generic Node sandbox ("AI Studio" / similar)

Same as local setup: `npm install`, set the same env vars, `npm start`.
As long as the environment exposes a public HTTPS URL, set that as your
`FB_REDIRECT_URI` and whitelist it in the Meta App settings the same way.

## Project layout

```
app.js              Express app (routes + static file serving)
server.js           Local/production entrypoint (app.listen)
api/index.js         Vercel serverless entrypoint (same app, wrapped)
routes/auth.js       Facebook Login (OAuth + token-based), long-lived token exchange
routes/pages.js      Fetch/list connected Pages
routes/upload.js     Publish post/photo/video/reel (+ optional scheduling)
utils/graph.js       Graph API axios wrapper + error shaping
utils/store.js       Token/page storage (swap for a real DB — see note above)
public/              Static dashboard: index, dashboard, pages, upload pages
```

## API quick reference

| Method | Route | Purpose |
|---|---|---|
| GET | `/auth/facebook` | Start OAuth login |
| GET | `/auth/facebook/callback` | OAuth redirect target |
| POST | `/auth/facebook/token` | Accept a client-obtained token |
| GET | `/auth/status/:fbUserId` | Connection status |
| GET | `/pages/:fbUserId/sync` | Refresh Pages from Facebook |
| GET | `/pages/:fbUserId` | List already-synced Pages |
| POST | `/upload/post` | Text/link post (+ schedule, country targeting) |
| POST | `/upload/photo` | Photo upload (multipart `file`) |
| POST | `/upload/video` | Video upload (multipart `file`) |
| POST | `/upload/reel` | Reel upload, 3-step resumable flow (multipart `file`) |
