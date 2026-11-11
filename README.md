# Pontaj

Self-hosted time tracking for freelancers and small teams: log your hours,
group them by client and project, and turn them into the timesheet or
acceptance report you attach to an invoice.

One container, no database server, set up from the browser in a minute.

## Features

- **Calendar** — week, month and list views. Times and dates are typed
  freely, in the format you chose: `930` becomes `09:30`, and a date
  without a year takes the current one.
- **Timer** — start, keep working, stop; the entry form opens prefilled.
  *Duplicate* and *Continue* on any past entry.
- **Clients and projects** — created on the fly while typing, with colours.
  Past activities are suggested as you type and bring back their client and
  project.
- **Reports** — any period, filtered by client or project, with totals;
  export to CSV or print.
- **Documents** — one template per client or project, with your own text
  around the table: `{report: date, hours, activity}`, `{client}`, `{period}`,
  `{total}`… Prints as a clean A4 document, ready to sign. Two templates are
  included: a monthly activity report and an acceptance certificate.
- **Email** — send a report by hand, or every week or month automatically,
  through your own SMTP server.
- **Languages and formats** — English and Romanian; date format, 12/24-hour
  clock, first day of the week and decimal separator per user.
- **Security** — scrypt password hashing, optional two-factor authentication
  (TOTP), sign-in throttling, server-side HTML sanitising.
- Light and dark theme; works on phones.

## Requirements

- **Docker** with Compose v2 (Docker Engine 24 or newer), about 150 MB of RAM.
- Or, without Docker: **Node.js 24** or newer.

That is all: the database is SQLite, stored in a single file inside the app's
data folder. There is no database server to install, connect or update.

## Install

```sh
mkdir pontaj && cd pontaj
curl -fsSLO https://raw.githubusercontent.com/grimpels/pontaj/main/docker-compose.yml
docker compose up -d
docker compose logs pontaj
```

The log prints a setup address such as

```
http://<server>:3000/setup?token=3f1c0a9b2e7d4c6f8a1b2c3d
```

Open it (with your server's address instead of `<server>`) and choose:

1. **Language and formats** — can be changed later, per user.
2. **Site address** — filled in from your browser. Use `https://` if the site
   is served over HTTPS.
3. **Reverse proxy** — tick it only if a proxy (Caddy, nginx, Traefik…) sits
   in front of Pontaj. It is detected automatically in most cases.
4. **Administrator account.**

The setup page closes for good once the first account exists. The token in
the address is there so that nobody else can claim a freshly started server;
it changes on every restart.

### HTTPS

**If the server has no web server yet**, use the bundled Caddy, which gets and
renews a certificate on its own. Point a domain at the server, make sure ports
80 and 443 are free, then:

```sh
curl -fsSLO https://raw.githubusercontent.com/grimpels/pontaj/main/docker-compose.https.yml
echo "PONTAJ_DOMAIN=time.example.com" >> .env
echo "COMPOSE_FILE=docker-compose.yml:docker-compose.https.yml" >> .env
docker compose up -d
```

**If you already run a reverse proxy**, point it at port 3000. For Caddy:

```
time.example.com {
	reverse_proxy localhost:3000
}
```

Behind a CDN such as Cloudflare, make sure your proxy passes the visitor's
address, not the CDN's, in `X-Forwarded-For`. Otherwise sign-in throttling
counts all visitors of a CDN node together. With Caddy, add the CDN's ranges to
`trusted_proxies` and `header_up X-Forwarded-For {client_ip}`.

### Unattended install

To skip the setup page, set the first account and the address in `.env`
before the first start (see [.env.example](.env.example)):

```sh
PONTAJ_USER=admin
PONTAJ_PASS=at-least-10-characters
ORIGIN=https://time.example.com
```

## Configuration

Everything is optional. Put it in a `.env` file next to `docker-compose.yml`.

| Variable | Default | Meaning |
|---|---|---|
| `PONTAJ_PORT` | `3000` | Port on the host. |
| `TZ` | `UTC` | Time zone for scheduled emails, e.g. `Europe/Bucharest`. |
| `ORIGIN` | — | Site address. Overrides the setup page. |
| `PONTAJ_LANG` | `en` | Language of the sign-in page and new accounts (`en`, `ro`). Overrides the setup page. |
| `PONTAJ_USER`, `PONTAJ_PASS` | — | First account, created at first start. Ignored afterwards. |
| `ADDRESS_HEADER`, `XFF_DEPTH` | — | Read the client address from a header ([adapter-node](https://svelte.dev/docs/kit/adapter-node#Environment-variables)). Overrides the proxy option of the setup page. |
| `PONTAJ_DOMAIN` | — | Only with `docker-compose.https.yml`: the domain to get a certificate for. |

SMTP, document templates, your company details and the email schedule are set
in the app, under **Settings** and **Templates**.

## Backup

All data lives in `data/`. The database runs in WAL mode, so copying the file
while the app writes to it may miss the latest changes. Either stop the app
first:

```sh
docker compose stop && cp -r data data-backup && docker compose start
```

or take a consistent copy while it runs:

```sh
docker compose exec pontaj node -e "new (require('node:sqlite').DatabaseSync)('/data/pontaj.db').exec(\"VACUUM INTO '/data/backup.db'\")"
```

The SMTP password is stored in the database: keep backups private.

## Update

```sh
docker compose pull && docker compose up -d
```

Database changes are applied automatically at start. They only ever add
columns or tables; nothing is rewritten or removed.

## Without Docker

```sh
git clone https://github.com/grimpels/pontaj.git && cd pontaj
npm ci && npm run build
PONTAJ_DB=./data/pontaj.db PORT=3000 node build
```

The setup address is printed at start, as above.

## Development

```sh
npm ci
npm run dev       # http://localhost:5173
npm test          # unit tests, no framework
npm run check     # type checking
```

Built with [SvelteKit](https://svelte.dev/docs/kit) and Svelte 5, SQLite
through the built-in `node:sqlite`, `otpauth` and `qrcode` for two-factor
authentication, `nodemailer` for email. No ORM, no CSS framework.

Releases: pushing a tag such as `v1.2.0` runs the tests and publishes the
image to `ghcr.io/grimpels/pontaj` for amd64 and arm64.

## License

[MIT](LICENSE)
