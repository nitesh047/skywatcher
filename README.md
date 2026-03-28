# ✈ SkyWatcher

**Real-time aircraft proximity alerts — installable as a PWA**

SkyWatcher shows aircraft flying near your current location on a live map, with airline info, flight routes, plane models, and browser notifications when a new aircraft enters your radius.

---

## Features

- **Live radar map** — Leaflet-powered dark map with animated aircraft icons showing callsign, model, and heading
- **Flight details** — airline name, origin/destination (IATA codes), aircraft type (e.g. A320, B738), registration
- **Trail on tap** — tap any aircraft to see its recent flight path as a blue dashed trail
- **Proximity alerts** — browser/push notification when a new plane enters your set radius
- **Radius control** — 5 km to 100 km slider, adjustable on the fly
- **Installable PWA** — works offline (cached assets), installable on Android/iOS/desktop via the **⬇ Install App** button
- **Dark UI** — Space Grotesk + JetBrains Mono, fully responsive for mobile

---

## Data Sources

| Source | Usage |
|---|---|
| [airplanes.live](https://airplanes.live) `/v2/point/{lat}/{lon}/{nm}` | Live aircraft positions, altitude, speed, heading, type code, model description |
| [adsbdb.com](https://www.adsbdb.com) `/v0/callsign/{callsign}` | Airline name, IATA origin & destination per callsign (cached per session) |

---

## Project Structure

```
skywatcher-pwa/
├── index.html      # Single-file app — all HTML, CSS, and JavaScript
├── manifest.json   # PWA manifest (name, icons, display mode)
├── sw.js           # Service worker — caching + notification dispatch
└── icons/
    ├── icon-96.png
    ├── icon-192.png
    └── icon-512.png
```

---

## How It Works

1. On load, the app requests the user's **GPS location**
2. Every **15 seconds** it calls the airplanes.live API for aircraft within the selected radius
3. Each aircraft with a callsign triggers a background **adsbdb lookup** for airline + route (results are cached)
4. New aircraft (not seen in the previous fetch) trigger a **browser notification** if alerts are enabled
5. The **service worker** caches static assets for offline use and relays notifications

---

## Running Locally

No build step required — it's a single HTML file.

```bash
# Any static server works, e.g.:
npx serve .
# or
python -m http.server 8080
```

Then open `http://localhost:8080`.

> **Note:** Geolocation and service workers require HTTPS in production. Use localhost for development — browsers treat it as a secure context.

---

## Deploying to GitHub Pages

1. Create a repository on GitHub (e.g. `skywatcher-pwa`)
2. Push the files:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/<your-username>/skywatcher-pwa.git
   git push -u origin main
   ```
3. Go to **Settings → Pages → Source** and select `main` branch, root (`/`)
4. Your app will be live at `https://<your-username>.github.io/skywatcher-pwa/`

> If the app is served from a subfolder (not the root), update `"start_url"` in `manifest.json` to `"/skywatcher-pwa/"` to ensure the PWA installs correctly.

---

## Permissions

| Permission | Why |
|---|---|
| Geolocation | To determine your position and query nearby aircraft |
| Notifications | To alert you when new aircraft enter your radius |

Both are optional — the map works without notifications, and a default location is used if geolocation is denied.

---

## Tech Stack

- **Leaflet 1.9.4** — map rendering
- **Service Worker** — PWA caching + notification relay
- **Web Notifications API** — browser alerts
- **Fonts** — Space Grotesk (UI), JetBrains Mono (data)
- Zero build tools, zero dependencies to install

---

## License

MIT
