# TriStar Baseball — Speed & Arm Strength Tracker

Tracks player home-to-first sprint times and 3rd-to-1st throw velocity, with a
coach entry page and a player progress dashboard. Data is stored in a Google
Sheet via a small Apps Script web app — no database to manage.

## Setup

1. Create a new Google Sheet.
2. Open **Extensions > Apps Script**, delete the default code, and paste in
   the contents of [`apps-script/Code.gs`](apps-script/Code.gs).
3. Click **Deploy > New deployment**, choose type **Web app**, set:
   - Execute as: **Me**
   - Who has access: **Anyone with the link**
4. Deploy and copy the resulting web app URL.
5. Copy `.env.local.example` to `.env.local` and set `SHEETS_WEBAPP_URL` to that URL.
6. `npm install && npm run dev`.

The script auto-creates `Players` and `Entries` tabs in the sheet on first use.

## Pages

- `/` — team dashboard, latest best times/velocities per player with
  session-over-session deltas.
- `/entry` — coach input. Paste lines like:
  `Cafrey - 4.53; 4.43; 4.78 / 50; 48` (sprint times / throw velocities), or
  `Bryson - n/a` for players with no data that day.
- `/players/[name]` — individual player charts and full session history.
