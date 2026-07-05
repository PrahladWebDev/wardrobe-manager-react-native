# Wardrobe Manager

Full-stack wardrobe management app — React Native (Expo Go) frontend + Node/Express/MongoDB backend.

## Features

- JWT auth (register/login), editable profile with home city
- Add / **edit** / delete clothing items with camera or gallery photo, category, color, season, occasion tags, brand, price
- Optional **automatic background removal** on item photos (via remove.bg, gracefully skipped if no API key is set)
- Wardrobe grid with search, category filters, and infinite-scroll pagination
- Outfit builder — combine items into reusable outfits, fully **editable** afterwards
- Log a wear (item or whole outfit) → increments wearCount, feeds stats
- Laundry tracker — mark items dirty; suggestions and packing automatically skip them
- Favorites
- **"Today" tab** — weather-aware outfit suggestion (live weather via OpenWeatherMap using device location, falls back to a mock if no API key is set, so it works out of the box)
- **Packing list generator** — pick trip dates + occasion, get a weather-aware packing list pulled from your actual closet
- **Stats tab** — real charts (react-native-svg, Expo Go-safe): wear-activity timeline (7/30/90-day toggle), most-worn bar chart, highest cost-per-wear bar chart, closet value, category breakdown — all backed by MongoDB aggregation pipelines
- **In-app server settings** — set/test the backend URL from a Settings screen (Profile → Server Settings, or from the Login screen before signing in). No source-code edits required to point the app at your backend.
- Custom app icon, splash screen, adaptive icon (Android), and web favicon

## Project structure

```
wardrobe-manager/
  backend/     Node + Express + MongoDB API
  frontend/    Expo (React Native) app — runs in Expo Go
```

## Backend setup

```bash
cd backend
npm install
cp .env.example .env
# edit .env: set MONGO_URI, JWT_SECRET, and (optionally) OPENWEATHER_API_KEY / REMOVEBG_API_KEY
npm run seed     # creates a demo user (demo@wardrobe.app / demo1234) + starter wardrobe
npm run dev      # starts on http://localhost:5000
```

`OPENWEATHER_API_KEY` (free at https://openweathermap.org/api) and `REMOVEBG_API_KEY` (free tier at https://www.remove.bg/api) are both optional. Without them, weather suggestions fall back to a fixed mild-weather mock, and the "remove background" toggle on item photos is simply ignored — the app stays fully functional either way.

The seed script is idempotent for the demo user: re-running it won't duplicate items or wipe wear history — it only seeds items if the demo user has none yet.

### API endpoints

| Method | Route | Description |
|---|---|---|
| POST | /api/auth/register | Create account |
| POST | /api/auth/login | Log in |
| GET/PUT | /api/auth/me | Get/update profile |
| GET/POST | /api/items | List (paginated) / create clothing items (multipart image upload, optional `removeBackground`) |
| GET/PUT/DELETE | /api/items/:id | Item detail / update (incl. photo replace) / delete |
| PATCH | /api/items/:id/laundry | Toggle laundry status |
| POST | /api/items/:id/wear | Log a wear (increments wearCount) |
| GET/POST | /api/outfits | List (paginated) / create outfits |
| GET/PUT/DELETE | /api/outfits/:id | Outfit detail / update / delete |
| POST | /api/outfits/:id/wear | Log a wear for the whole outfit |
| GET | /api/stats/overview | Totals, closet value, by-category breakdown |
| GET | /api/stats/cost-per-wear | Cost-per-wear leaderboard |
| GET | /api/stats/most-worn / least-worn | Wear leaderboards |
| GET | /api/stats/wear-timeline?days= | Wear counts per day (feeds the Stats timeline chart) |
| GET | /api/suggestion/today | Weather-aware outfit suggestion |
| POST | /api/suggestion/packing | Weather-aware packing list for a trip |

List endpoints (`/api/items`, `/api/outfits`) accept `page` and `limit` query params and return a `pagination` object (`page`, `limit`, `total`, `totalPages`, `hasMore`).

## Frontend setup (Expo Go)

```bash
cd frontend
npm install
npx expo start
```

Scan the QR code with the Expo Go app (iOS/Android). On first launch, log in with the demo account or register, then go to **Server Settings** (from the Login screen, or Profile → Server Settings once logged in) and enter your backend's address — no code edits needed:
- Physical phone via Expo Go on the same WiFi: `http://<your-machine-LAN-IP>:5000` (find it with `ipconfig`/`ifconfig`)
- Android emulator: `http://10.0.2.2:5000`
- Deployed backend (e.g. your Hostinger VPS): `https://api.yourdomain.com`

Use the **Test Connection** button on that screen to confirm it can reach `/api/health` before saving.

## Notes / next steps if you want to extend this further

- Images are stored on local disk under `backend/uploads` and served via `/uploads/...`. Swap in Cloudinary (like your Mythlok setup) if you want images to survive redeploys / scale better.
- Deployment mirrors your existing ShareVault/Mythlok pattern: PM2 + nginx reverse proxy + Certbot on your Hostinger VPS. Remember to raise nginx's `client_max_body_size` for image uploads like you did for ShareVault.
- For a resume-ready differentiator, lean on the cost-per-wear aggregation pipeline and the weather-aware suggestion/packing engine — those go beyond basic CRUD.
- The app icon/splash are simple generated placeholders (terracotta hanger mark) — swap `frontend/assets/*.png` for real branded art whenever you want.
