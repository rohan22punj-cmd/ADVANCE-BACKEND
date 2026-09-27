# LedgerLine

**A high-throughput, double-entry financial ledger engine with ACID-compliant transfers and distributed concurrency control.**

🔗 **Live app:** https://advance-backend-theta.vercel.app
🔗 **API base:** https://advance-backend-nvwp.onrender.com

---

## Badges

| Build | Tests | Node | License |
|-------|-------|------|---------|
| ![Status](https://img.shields.io/badge/status-deployed-brightgreen) | ![Tests](https://img.shields.io/badge/tests-22%2F22-brightgreen) | ![Node](https://img.shields.io/badge/node-20.x-339933) | ![License](https://img.shields.io/badge/license-ISC-blue) |

---

## Key Features

- **Double-entry ledger** – every transfer writes a balanced *debit* and *credit* entry; total system balance is always zero.
- **ACID-compliant transfers** – MongoDB replica-set multi-document transactions guarantee atomicity across ledger + account updates.
- **Distributed locking** – Redis-based mutexes prevent race conditions on concurrent debits/credits to the same account.
- **Idempotency keys** – client-supplied keys make retries safe; duplicate requests return the original result without double-charging.
- **Failed transaction tracking** – failed transfers (insufficient funds, inactive account, currency mismatch, or a rolled-back session) are recorded with a `failed` status and reason, not silently dropped — full audit trail either way.
- **Role-based access control** – `user` vs `admin` scopes. Only admins can force-reverse a completed transaction; regular users cannot unilaterally reverse a transfer they already sent.
- **Security hardening** – Helmet, strict CORS (origin allowlist via `FRONTEND_URL`), `express-rate-limit` on auth & transfer routes (with OPTIONS preflight requests correctly exempted), input validation.
- **Transaction search & pagination** – filter by account, status, date range, amount; paginated history API.
- **Responsive frontend** – mobile-first layout with a collapsible nav, stacked cards, and touch-friendly forms.
- **Full test suite** – 22 automated tests (Jest + Supertest + mongodb-memory-server) covering auth, accounts, transfers, reversals, and ledger invariants.

---

## Architecture / Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Node.js 20.x (CommonJS) |
| API framework | Express 4 |
| Database | MongoDB 7 via **MongoDB Atlas** (M0 replica set) |
| Cache / Locks | Redis via **Upstash** (TLS) |
| Front-end | React + Vite, deployed on **Vercel** |
| Backend hosting | **Render** (Docker-based deploy) |
| Auth | JWT (access + refresh tokens, HttpOnly cookies) + bcrypt |
| Testing | Jest, Supertest, mongodb-memory-server |

### Code organisation (DAO-service-controller pattern)

```
src/
 ├─ app.js                 ← Express bootstrap, middleware stack
 ├─ server.js              ← Entry point, DB connect
 ├─ config/db.js           ← Mongoose connection helper
 ├─ middleware/
 │   ├─ auth.middleware.js    (JWT verify, role guard)
 │   ├─ error.middleware.js   (central error handler, AppError, 404 handler)
 │   └─ validate.middleware.js
 ├─ models/                ← Mongoose schemas (User, Account, Transaction, Ledger)
 ├─ controllers/           ← Business logic per domain
 ├─ routes/                ← Thin route files wiring middleware → controller
 ├─ services/redis.service.js  ← Distributed lock + idempotency helpers
 └─ __tests__/             ← Jest suites
```

**Request flow**

```
Client (React, Vercel) ──► /api/* (Express, Render)
   │
   ├─► Helmet / CORS (origin allowlist) / Rate-limit (OPTIONS exempted)
   ├─► Auth middleware (JWT ➜ req.user)
   ├─► Controller (auth / account / transaction / admin)
   │        ├─► Service (redisService.acquireMultiLock, idempotency)
   │        └─► Mongoose models ➜ MongoDB Atlas (session transaction)
   └─► JSON response (or 4xx/5xx via central errorHandler)
```

---

## Why These Design Decisions

| Decision | Rationale |
|----------|-----------|
| **MongoDB Atlas + Replica Set** | Document-centric domain (accounts, transactions, ledger lines). Atlas's free M0 tier is a genuine 3-node replica set by default, enabling multi-document ACID transactions with no extra setup. |
| **Redis distributed lock (Upstash)** | MongoDB lacks row-level locking. A Redis mutex serialises concurrent transfers touching the same account, preventing lost-update anomalies. |
| **Idempotency keys** | Financial APIs get retried on network glitches. A duplicate key returns the original transaction instead of creating a second one. |
| **Double-entry ledger** | Every transfer creates two `Ledger` documents — a debit and a credit. Σcredits = Σdebits holds by construction. |
| **Failed transactions are recorded, not discarded** | A financial system with zero record of *why* money didn't move is a red flag. Failed attempts (pre-validation or mid-transaction rollback) are logged with a reason, without creating ledger entries. |
| **Admin-only reversal** | A sender should never be able to unilaterally take back money they already sent successfully. Reversal is restricted to admins; regular users get a `403` if they attempt it on a completed transfer. |
| **JWT in HttpOnly cookies + refresh rotation** | Mitigates XSS token theft; short-lived access tokens limit exposure. |

---

## Load Testing Results (JMeter – 500 concurrent users)

| Metric | Value |
|--------|-------|
| **Throughput** | *(fill in from your actual load-test-report.json)* |
| **Avg latency** | *(fill in)* |
| **p95 latency** | *(fill in)* |
| **Error rate** | *(fill in)* |

> Load test was performed and completed — insert the real numbers from your report here before publishing.

---

## Live Deployment

| Component | Platform | URL |
|-----------|----------|-----|
| Frontend | Vercel | https://advance-backend-theta.vercel.app |
| Backend API | Render | https://advance-backend-nvwp.onrender.com |
| Database | MongoDB Atlas | (private connection string) |
| Cache/Locks | Upstash Redis | (private connection string) |

**Note:** the backend runs on Render's free tier, which spins down after 15 minutes of inactivity. The first request after idle time may take 30–60 seconds to wake up.

---

## Getting Started (local development)

### Prerequisites
- Node.js 20.x
- MongoDB (Atlas, or local replica set via `docker compose up mongodb mongo-init`)
- Redis (Upstash, or local via `docker compose up redis`)

### 1. Clone & install
```bash
git clone https://github.com/rohan22punj-cmd/ADVANCE-BACKEND.git
cd ADVANCE-BACKEND
npm ci
cd frontend && npm ci && cd ..
```

### 2. Environment variables (create `.env` in repo root)

| Variable | Description |
|----------|-------------|
| `PORT` | API port (default 3000) |
| `NODE_ENV` | `development` / `production` |
| `MONGO_URI` | MongoDB Atlas connection string (`mongodb+srv://...`) |
| `REDIS_URI` | Redis URL (`rediss://...` if using Upstash — TLS required) |
| `JWT_SECRET` | ≥32-char random string |
| `FRONTEND_URL` | Comma-separated allowed origins for CORS |
| `ENABLE_REDIS` | `true` / `false` |

### 3. Run locally
```bash
npm run dev              # backend, nodemon on :3000
cd frontend && npm run dev   # frontend, Vite on :5173
```

### 4. Tests
```bash
npm test
```

---

## API Overview (core surface)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/auth/register` | – | Create user, issue tokens |
| `POST` | `/api/auth/login` | – | Verify credentials, issue tokens |
| `POST` | `/api/auth/refresh-token` | – | Rotate access token |
| `POST` | `/api/auth/logout` | – | Revoke refresh token |
| `POST` | `/api/accounts` | User | Create account |
| `GET`  | `/api/accounts` | User | List own accounts |
| `POST` | `/api/transactions` | User | Transfer between accounts (idempotent) |
| `GET`  | `/api/transactions` | User | Paginated, filterable history (includes failed transactions) |
| `POST` | `/api/transactions/:id/reverse` | – | Stub — `403` for regular users |
| `GET`  | `/api/admin/accounts` | Admin | All accounts, system-wide |
| `GET`  | `/api/admin/transactions` | Admin | Global transaction log |
| `POST` | `/api/admin/transactions/:id/reverse` | Admin | Force-reverse any transaction |

---

## Screenshots

| Landing Page | Sign In |
|---|---|
| ![Landing](images/landing.png) | ![Auth](images/auth.png) |

| Dashboard | Transfer Funds |
|---|---|
| ![Dashboard](images/dashboard.png) | ![Transfer](images/transfer.png) |

**Activity & Audit** — showing both completed and failed transactions, with full filtering (status, date range, amount, direction):
![Activity Audit](images/activity-audit.png)

---

## Future Improvements

- Multi-currency accounts with FX conversion
- Scheduled/recurring transfers
- Webhook callbacks with retry/back-off
- Prometheus metrics + Grafana dashboards
- OpenAPI/Swagger documentation
- TOTP-based 2FA

---

## Author

**Rohan**
- GitHub: https://github.com/rohan22punj-cmd
- Email: rohan22punj@gmail.com

---

*Built with care for correctness, concurrency safety, and observability.*
