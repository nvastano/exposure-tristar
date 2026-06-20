# TriStar Baseball — Speed & Arm Strength Tracker

Tracks player home-to-first sprint times and 3rd-to-1st throw velocity, with a
coach entry page and a player progress dashboard. Data is stored in a Google
Sheet via a small Apps Script web app — no database to manage. The app is a
static export, deployed to GitHub Pages, the same way as
[V3D_Creative](https://nvastano.github.io/V3D_Creative/index.html).

Live at: https://nvastano.github.io/exposure-tristar/

## Setup

1. Create a new Google Sheet.
2. Open **Extensions > Apps Script**, delete the default code, and paste in
   the contents of [`apps-script/Code.gs`](apps-script/Code.gs).
3. Click **Deploy > New deployment**, choose type **Web app**, set:
   - Execute as: **Me**
   - Who has access: **Anyone with the link**
4. Deploy and copy the resulting web app URL.
5. In the GitHub repo, go to **Settings > Secrets and variables > Actions >
   Variables** and add `NEXT_PUBLIC_SHEETS_WEBAPP_URL` set to that URL (the
   deploy workflow reads it at build time).
6. In **Settings > Pages**, set Source to **GitHub Actions**.
7. Push to `main` — the workflow in `.github/workflows/deploy.yml` builds and
   publishes to GitHub Pages automatically.

For local development: copy `.env.local.example` to `.env.local`, set
`NEXT_PUBLIC_SHEETS_WEBAPP_URL`, then `npm install && npm run dev`.

The script auto-creates `Players` and `Entries` tabs in the sheet on first use.

## Pages

- `/` — team dashboard, latest best times/velocities per player with
  session-over-session deltas.
- `/entry` — coach input. Paste lines like:
  `Cafrey - 4.53; 4.43; 4.78 / 50; 48` (sprint times / throw velocities), or
  `Bryson - n/a` for players with no data that day.
- `/players/[name]` — individual player charts and full session history.
