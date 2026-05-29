# NipponBid — Japanese Car Procurement Platform

A full-stack web application for sourcing, bidding on, and managing Japanese auction vehicles. Built for car dealers and importers who source stock directly from Japanese auction houses.

---

## Features

### Customer Portal
- Browse live inventory scraped from Japanese auction houses (Shinchuo, etc.)
- Place bids with real-time status tracking (pending → won / lost)
- Track full purchase lifecycle: bid → purchase → shipment → delivery
- Personal ledger — view credits vs charges, balance at a glance
- Download proforma and final invoices as PDF
- Parts store — submit spare parts requests
- B/L tracking and shipment status updates
- Analytics dashboard — spending trends, win rates by auction house, top makes

### Admin Panel
- Dashboard with filterable KPIs (revenue, bids, remittances, receivables)
- Manage all bids and convert won bids to purchases in one click
- Full purchase management — pricing, B/L documents, shipping details
- Proforma + final invoice generation with PDF export
- Remittance tracking — confirm customer payments
- User management — create, edit, activate/deactivate accounts
- Broadcast push notifications to individual users or everyone
- Automated cleanup of stale auction listings via cron

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite 5, Tailwind CSS, React Router 6 |
| Backend | Node.js, Express 4 |
| Database | MySQL 8 |
| Auth | JWT + bcryptjs |
| Email | Nodemailer (Gmail SMTP) |
| File uploads | Multer |
| PDF export | jsPDF + html2canvas |
| Scraping | Cheerio + Axios (Shinchuo.jp) |
| Scheduling | node-cron |

---

## Project Structure

```
nipponbid/
├── src/                        # React frontend
│   ├── components/             # Reusable UI (Navbar, BidModal, etc.)
│   ├── context/AuthContext.jsx  # JWT auth state
│   ├── pages/                  # All route pages
│   │   └── admin/              # Admin-only pages
│   ├── services/api.js         # All axios API calls
│   └── utils/dates.js
├── public/                     # Static assets (logo.svg, icons.svg)
├── server/                     # Express backend
│   ├── src/
│   │   ├── app.js              # Entry point — all routes mounted here
│   │   ├── config/database.js  # MySQL connection pool
│   │   ├── middleware/auth.js   # userAuth / adminAuth middleware
│   │   └── routes/             # One file per resource
│   │       ├── auth.js
│   │       ├── japan.js        # Cars, bids, purchases (Japan auctions)
│   │       ├── admin.js
│   │       ├── remittances.js
│   │       ├── shipments.js
│   │       ├── invoices.js
│   │       ├── accounting.js
│   │       └── ...
│   ├── uploads/                # User file uploads (gitignored)
│   └── .env.example
├── database/
│   └── nipponbid_schema.sql    # Complete MySQL schema — run this to set up DB
├── vercel.json                 # Vercel SPA routing config
├── render.yaml                 # Render.com backend deployment config
└── package.json
```

---

## Local Setup

### Prerequisites
- Node.js 18+
- MySQL 8+

### 1 — Clone

```bash
git clone https://github.com/YOUR_USERNAME/nipponbid.git
cd nipponbid
```

### 2 — Create the database

```bash
mysql -u root -p < database/nipponbid_schema.sql
```

Creates the `nipponbid` database with all 22 tables.

### 3 — Configure the backend

```bash
cd server
cp .env.example .env
```

Edit `server/.env` — minimum required fields:

```env
DB_PASSWORD=your_mysql_password
JWT_SECRET=any_long_random_string_at_least_32_chars
CLIENT_URL=http://localhost:5173
```

### 4 — Install & run

```bash
# Terminal 1 — backend (port 5001)
cd server && npm install && npm run dev

# Terminal 2 — frontend (port 5173)
cd .. && npm install && npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

### 5 — Create admin account

```bash
# From project root
node server/src/scripts/createAdmin.js
# OR insert directly into the DB:
```

```sql
INSERT INTO users (name, email, password, role, is_active)
VALUES (
  'Admin',
  'admin@nipponbid.com',
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lMIy',
  'admin',
  1
);
-- Password above is: admin123 — change it immediately after first login
```

---

## Deployment (Cheapest Stack)

| Service | Platform | Monthly Cost |
|---|---|---|
| Frontend | Vercel (Hobby) | **Free** |
| Backend API | Render (Free tier) | **Free*** |
| MySQL Database | Railway (Starter) | **~$5/mo** |
| Domain | Porkbun / Namecheap | **~$9/year** |

> *Render free tier spins down after 15 min idle (cold start ~30 s). Upgrade to $7/mo Starter for always-on.

---

### Step 1 — MySQL on Railway

1. [railway.app](https://railway.app) → **New Project** → **Add MySQL**
2. Once running, open the service → **Variables** tab → copy the connection details
3. Connect a MySQL client and run the schema:
   ```bash
   mysql -h $MYSQL_HOST -P $MYSQL_PORT -u $MYSQL_USER -p$MYSQL_PASSWORD < database/nipponbid_schema.sql
   ```
4. Insert your admin user (SQL above).

---

### Step 2 — Backend on Render

1. [render.com](https://render.com) → **New Web Service** → connect GitHub repo
2. Settings:
   - **Root Directory:** `server`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
3. Add every variable from `server/.env.example` using Railway DB credentials
4. Set `CLIENT_URL` to your Vercel URL (fill in after Step 3, redeploy)
5. Deploy → note your Render URL: `https://nipponbid-api.onrender.com`

---

### Step 3 — Frontend on Vercel

1. [vercel.com](https://vercel.com) → **New Project** → import repo
2. **Framework Preset:** Vite
3. **Root Directory:** *(leave blank — Vite config is at project root)*
4. Add environment variable:
   ```
   VITE_API_URL = https://nipponbid-api.onrender.com
   ```
5. In `src/services/api.js`, update the axios baseURL:
   ```js
   const api = axios.create({
     baseURL: import.meta.env.VITE_API_URL
       ? import.meta.env.VITE_API_URL + '/api'
       : '/api',
   });
   ```
6. Commit that change, push — Vercel auto-deploys.
7. Copy your Vercel URL and update `CLIENT_URL` on Render.

---

### Step 4 — Custom Domain

**Cheapest registrars:**

| Registrar | .com/year | Notes |
|---|---|---|
| [Porkbun](https://porkbun.com) | ~$8.35 | Free WHOIS privacy included |
| [Namecheap](https://namecheap.com) | ~$9 | Frequent discount coupons |
| [Cloudflare](https://cloudflare.com/registrar) | ~$9.15 | At-cost, great if using Cloudflare DNS |

**Cheapest TLD alternatives:**

| Domain | Cost/Year |
|---|---|
| nipponbid.com | ~$9 |
| nipponbid.online | ~$2 |
| nipponbid.site | ~$2 |
| nipponbid.xyz | ~$1 |

**Connecting the domain:**
- **Vercel:** Project Settings → Domains → Add Domain → follow DNS instructions
- **Render:** Service → Settings → Custom Domain → add CNAME in registrar DNS

---

## Environment Variables

### Backend (`server/.env`)

| Variable | Required | Description |
|---|---|---|
| `PORT` | Yes | Server port (default 5001) |
| `DB_HOST` | Yes | MySQL hostname |
| `DB_PORT` | Yes | MySQL port |
| `DB_USER` | Yes | MySQL username |
| `DB_PASSWORD` | Yes | MySQL password |
| `DB_NAME` | Yes | Database name (`nipponbid`) |
| `JWT_SECRET` | Yes | Long random string for JWT signing |
| `CLIENT_URL` | Yes | Frontend origin (CORS) |
| `EMAIL_USER` | Optional | Gmail for sending emails |
| `EMAIL_PASS` | Optional | Gmail App Password |
| `SHINCHUO_USER` | Optional | Shinchuo.jp account username |
| `SHINCHUO_PASS` | Optional | Shinchuo.jp account password |
| `DEEPL_API_KEY` | Optional | DeepL API key (translation) |
| `YAHOO_CLIENT_ID` | Optional | Yahoo Auctions API key |

### Frontend (Vercel env vars)

| Variable | Description |
|---|---|
| `VITE_API_URL` | Backend base URL (e.g. `https://nipponbid-api.onrender.com`) |

---

## API Reference

All endpoints are prefixed `/api`.

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/auth/login` | Public | Login |
| POST | `/auth/register` | Public | Register |
| GET | `/japan/cars` | User | Browse auction listings |
| POST | `/japan/bids` | User | Place a bid |
| GET | `/japan/bids/my` | User | My bids |
| GET | `/japan/purchases/my` | User | My purchases |
| GET | `/accounting/my` | User | Personal ledger & balance |
| GET | `/remittances/my` | User | My payment submissions |
| GET | `/admin/stats` | Admin | Dashboard KPIs |
| GET | `/admin/users` | Admin | User list with counts |
| POST | `/admin/users` | Admin | Create user |
| PUT | `/admin/users/:id/toggle` | Admin | Activate/deactivate user |
| GET | `/japan/purchases` | Admin | All purchases |
| GET | `/remittances` | Admin | All remittances |
| PUT | `/remittances/:id/confirm` | Admin | Confirm payment |
| GET | `/shipments` | Admin | All shipments |
| GET | `/invoices/proforma` | Admin | Proforma invoices |
| GET | `/invoices/final` | Admin | Final invoices |
| POST | `/admin/notify` | Admin | Send push notification |
| POST | `/admin/cleanup-cars` | Admin | Remove stale listings |

---

## Database

22 tables. Run `database/nipponbid_schema.sql` on a fresh MySQL 8+ instance.

**Key relationships:**
```
users
 ├── japan_bids          bid placed on a japan_car
 ├── japan_purchases     car purchased (from won bid or manual entry)
 │    └── japan_documents  attached PDFs
 ├── remittances         payment submissions
 ├── proforma_invoices
 ├── final_invoices
 ├── parts_purchases
 └── notifications

japan_cars ──── japan_bids
           └─── japan_purchases ──── shipments / bl_requests
```

---

## License

MIT
