# Kahuta Knights Armwrestling — Full Website (Node.js)

The original Flask app, ported to **JavaScript (Node.js + Express)**. All Python is gone; pages, URLs,
forms, CSV/JSON storage, admin panel and emails behave the same as before, and the HTML templates and CSS are reused
(rendered with [Nunjucks](https://mozilla.github.io/nunjucks/), which uses the same `{{ }}` / `{% %}` syntax as Jinja).

## Features
- **Multi-page layout**: Home, Team Roster, Rankings, Events, Contact, Team & Event registration.
- **No database**: events, rankings, roster and settings live in `events.json`, `rankings.json`, `team_members.json`, `settings.json`.
- **Registration system**: team applications and tournament entries (with fee-payment screenshot upload) are saved to CSV.
- **Admin panel**: approve / waiting-list / reject applicants (with emails), manage rankings and events, set the registration deadline.
- **Email**: Gmail SMTP via Nodemailer — admin gets one-click Approve / Waiting List / Reject links.

## Project structure
```
kahuta_knights_site/
├── server.js               # Entry point (starts the server)
├── package.json
├── .env.example            # Copy to .env and fill in
├── src/
│   ├── app.js              # Express setup (sessions, uploads, templates, error pages)
│   ├── config.js           # Paths, constants, environment variables
│   ├── defaults.js         # Core members + default events / rankings / settings
│   ├── data.js             # JSON + CSV storage helpers (events, rankings, roster, deadline)
│   ├── csv.js              # Small CSV reader / writer
│   ├── mailer.js           # Nodemailer transport + email bodies
│   ├── router.js           # Named routes + url_for(), admin login guard
│   ├── views.js            # Nunjucks setup + template globals
│   ├── flash.js            # Flash messages (stored in the signed session cookie)
│   ├── utils.js            # secure_filename, date parsing, helpers
│   └── routes/
│       ├── public.js       # Home, events, rankings, team, contact, register pages
│       ├── submit.js       # POST /submit (team + event registration)
│       └── admin.js        # Login, registrations review, rankings + events management
├── templates/              # Nunjucks/Jinja-style HTML templates
├── static/                 # css, images, uploads/ (payment screenshots, posters)
├── test/smoke.test.js      # `npm test`
└── *.json                  # Site content (edited from the admin panel)
```

## Run it locally
Requires **Node.js 20.12 or newer**.
```bash
cd kahuta_knights_site
npm install
cp .env.example .env        # then edit it (Windows: copy .env.example .env)
npm start                   # or: npm run dev   (auto-restart on changes)
```
Open http://127.0.0.1:5000

### Environment variables (`.env`)
| Variable | Purpose |
|---|---|
| `SECRET_KEY` | Signs the session cookie. **Set this to a long random string.** |
| `ADMIN_PASSWORD` | Password for the admin panel. Without it, nobody can log in. |
| `GMAIL_USER` / `GMAIL_PASSWORD` | Gmail account + [app password](https://myaccount.google.com/apppasswords) used to send mail. |
| `ADMIN_EMAIL` | Where new team-join requests are sent. |
| `WHATSAPP_GROUP_LINK` | Invite link included in approval emails. |
| `PORT` / `HOST` | Optional. Default `127.0.0.1:5000` (binds `0.0.0.0` automatically when a host injects `PORT`). |
| `TRUST_PROXY=1` | Optional. Set behind a reverse proxy so links in emails use the public host / https. |

## How to update site content
Use the **Admin Panel** (home page button): manage events, rankings and the registration deadline, and approve
team applicants (they are added to `team_members.json` automatically).
To add a member photo, put the image in `static/images/members/` and set that member's `photo_filename` in `team_members.json`.
The two founders shown on the home page are defined in `src/defaults.js` (`CORE_MEMBERS`).

## Deploy
Any Node host works (Render, Railway, Fly.io, a VPS with pm2, …): run `npm install && npm start` and set the
environment variables above. Data is stored in local files, so use a host with a **persistent disk** (or the JSON/CSV
files and `static/uploads/` will reset on redeploy).

## Notes on differences from the Flask version
- Applicant-supplied text (name, phone, etc.) is now HTML-escaped inside emails.
- Data files are written atomically (temp file + rename), and a team decision is saved *before* the email is sent.
