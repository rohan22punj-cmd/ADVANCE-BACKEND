# LedgerLine
**A high‑throughput, double‑entry financial ledger engine with ACID‑compliant transfers and distributed concurrency control.**

---

## Badges
| Build | Tests | Node | License |
|-------|-------|------|---------|
| ![CI](https://img.shields.io/badge/CI-passing-brightgreen) | ![Tests](https://img.shields.io/badge/tests-22%2F22-brightgreen) | ![Node](https://img.shields.io/badge/node-%3E%3D18.x-339933) | ![License](https://img.shields.io/badge/license-ISC-blue) |

*(Replace the CI badge with your actual pipeline status when you add GitHub Actions / GitLab CI.)*

---

## Live Demo
🔗 **Live app:** `https://<your‑deployed‑url>.com`  
🎬 **Demo video:** `<!-- INSERT LINK TO 30‑sec walkthrough GIF / YouTube -->`

---

## Key Features
- **Double‑entry ledger** – every transfer writes a balanced *debit* and *credit* entry; total system balance is always zero.  
- **ACID‑compliant transfers** – MongoDB replica‑set multi‑document transactions guarantee atomicity across ledger + account updates.  
- **Distributed locking** – Redis `SETNX`‑based mutexes prevent race conditions on concurrent debits/credits to the same account.  
- **Idempotency keys** – client‑supplied keys make retries safe; duplicate requests return the original result without double‑charging.  
- **Role‑based access control** – `user` vs `admin` scopes; admin‑only reversal endpoint.  
- **Security hardening** – Helmet, strict CORS, `express‑rate‑limit` on auth & transfer routes, Zod request validation.  
- **Transaction search & pagination** – filter by account, status, date range, amount; cursor‑free page/limit API.  
- **Full test suite** – 22 automated tests (Jest + Supertest + mongodb‑memory‑server) covering auth, accounts, transfers, reversals, and ledger invariants.

---

## Architecture / Tech Stack
| Layer | Technology |
|-------|------------|
| Runtime | Node.js ≥ 18 (CommonJS) |
| API framework | Express 4 |
| Database | MongoDB 7 (Mongoose ODM) – single‑node replica set for transactions |
| Cache / Locks | Redis 7 (ioredis) |
| Front‑end | React 19 + Vite 7, Tailwind CSS, React‑Router 7 |
| Validation | Zod |
| Auth | JWT (access 15 min, refresh 7 days, HttpOnly cookies) + bcrypt |
| Testing | Jest, Supertest, mongodb‑memory‑server |
| Dev tooling | Nodemon, ESLint (optional), Prettier (optional) |

### Real code organisation (MVC‑ish, DAO‑service‑controller)

```
src/
 ├─ app.js                 ← Express bootstrap, middleware stack
 ├─ server.js              ← Entry point, DB connect
 ├─ config/
 │   └─ db.js              ← Mongoose connection helper
 ├─ middleware/
 │   ├─ auth.middleware.js   (JWT verify, role guard)
 │   ├─ error.middleware.js  (central error handler, AppError)
 │   └─ validate.middleware.js (Zod schemas)
 ├─ models/                ← Mongoose schemas (User, Account, Transaction, Ledger)
 ├─ controllers/           ← Business logic per domain
 │   ├─ auth.controller.js
 │   ├─ account.controller.js
 │   ├─ transactionController.js
 │   └─ demo.controller.js
 ├─ routes/                ← Thin route files wiring middleware → controller
 │   ├─ auth.route.js
 │   ├─ account.route.js
 │   ├─ transaction.route.js
 │   ├─ admin.route.js
 │   └─ demo.route.js
 ├─ services/
 │   └─ redis.service.js   ← Distributed lock + idempotency helpers
 └─ __tests__/             ← Jest suites (comprehensive, redis, transaction)
```

**Request flow (text diagram)**  

```
Client (React) ──► /api/* (Express)
   │
   ├─► Helmet / CORS / Rate‑limit
   │
   ├─► Auth middleware (JWT ➜ req.user)
   │
   ├─► Validation middleware (Zod)
   │
   ├─► Controller (auth / account / transaction / admin)
   │        │
   │        ├─► Service (redisService.acquireMultiLock, idempotency)
   │        │
   │        └─► Mongoose models ➜ MongoDB (session transaction)
   │
   └─► JSON response (or 4xx/5xx via errorHandler)
```

---

## Why These Design Decisions

| Decision | Rationale (tied to the code) |
|----------|------------------------------|
| **MongoDB + Replica Set** | The domain is *document‑centric* (accounts, transactions, ledger lines) and benefits from flexible schemas. A single‑node replica set gives us **multi‑document ACID transactions** without the operational overhead of a full sharded cluster. |
| **Redis distributed lock** | MongoDB lacks row‑level `SELECT … FOR UPDATE`. A Redis mutex (`SET key NX PX 8000`) serialises concurrent transfers that touch the same `fromAccount` / `toAccount`, eliminating lost‑update anomalies while keeping the critical section < 10 ms. |
| **Idempotency keys** | Financial APIs are retried on network glitches. The controller first checks `redisService.checkIdempotency(key)` and a persistent `Transaction.idempotencyKey` index; a duplicate key returns the original transaction instead of creating a second one. |
| **Double‑entry ledger** | Every `Transaction` creates **two `Ledger` documents** – a `debit` on the source account and a `credit` on the destination. Balance is derived by aggregating `type: credit` + `type: debit`; the invariant *Σcredits = Σdebits* holds by construction, making reconciliation trivial. |
| **JWT in HttpOnly cookies + refresh rotation** | Mitigates XSS token theft; short‑lived access tokens limit exposure, long‑lived refresh tokens are stored hashed in the `User.refreshTokens` array and revoked on logout. |
| **Admin‑only reversal** | Reversals mutate the ledger in the opposite direction; they require the same lock + balance‑check logic. Exposing it only to `role: admin` prevents users from “undoing” their own transfers after the fact. |

---

## Load‑Testing Results (JMeter – 500 concurrent users)

| Metric | Value |
|--------|-------|
| **Throughput** | **≈ 1 200 req/s** |
| **Avg latency** | **≈ 45 ms** |
| **p95 latency** | **≈ 120 ms** |
| **Error rate** | **0 %** |

> **⚠️ Placeholder** – replace the numbers above with the actual figures from `load-test-report.json` / the JMeter run you performed.

---

## Getting Started (local development)

### Prerequisites
- Node.js ≥ 18  
- MongoDB 7 (running as a replica set – `docker compose up mongodb mongo-init`)  
- Redis 7 (`docker compose up redis`)  

### 1. Clone & install
```bash
git clone https://github.com/<your‑handle>/ledgerline.git
cd ledgerline
npm ci               # backend deps
cd frontend && npm ci && cd ..
```

### 2. Environment variables (create `.env` in repo root)

| Variable | Description |
|----------|-------------|
| `PORT` | API port (default 3000) |
| `NODE_ENV` | `development` / `production` |
| `MONGO_URI` | MongoDB connection string **with replica‑set** (e.g. `mongodb://localhost:27017/ledgerline?replicaSet=rs0`) |
| `REDIS_URI` | Redis URL (`redis://localhost:6379`) |
| `JWT_SECRET` | ≥ 32‑char random string (`openssl rand -base64 32`) |
| `FRONTEND_URL` | Comma‑separated allowed origins (`http://localhost:5173,http://localhost:5174`) |
| `ENABLE_REDIS` | `true` / `false` (toggle lock service) |
| `EMAIL_USER`, `CLIENT_ID`, `CLIENT_SECRET`, `REFRESH_TOKEN` | Optional – Gmail OAuth for notification emails |

### 3. Run everything (dev)

```bash
# Terminal 1 – backend
npm run dev          # nodemon on :3000

# Terminal 2 – frontend
cd frontend && npm run dev   # Vite on :5174 (proxy → :3000)
```

Open **http://localhost:5174** → register → dashboard.

### 4. Tests
```bash
npm test                # 22 tests, runs in‑memory MongoDB + Redis
npm run test:coverage   # coverage report
```

---

## API Overview (core surface)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/auth/register` | – | Create user, issue access + refresh cookies |
| `POST` | `/api/auth/login` | – | Verify credentials, issue tokens |
| `POST` | `/api/auth/refresh-token` | – (cookie or body) | Rotate access token |
| `POST` | `/api/auth/logout` | – (cookie or body) | Revoke refresh token |
| `POST` | `/api/accounts` | User | Create new currency account |
| `GET`  | `/api/accounts` | User | List own accounts |
| `GET`  | `/api/accounts/:id` | User | Balance + meta for one account |
| `POST` | `/api/transactions` | User | Transfer between own accounts (idempotent) |
| `GET`  | `/api/transactions` | User | Paginated, filterable history |
| `POST` | `/api/transactions/:id/reverse` | User | Reverse a *completed* transfer (same‑user) |
| `POST` | `/api/demo/fund` | User | Dev‑only: credit an account from system ledger |
| `GET`  | `/api/admin/accounts` | Admin | All accounts with balances |
| `GET`  | `/api/admin/transactions` | Admin | Global transaction log |
| `POST` | `/api/admin/transactions/:id/reverse` | Admin | Force‑reverse any transaction |

*(Full request/response schemas live in `src/middleware/validate.middleware.js`.)*

---

## Screenshots (place‑holders)

| Landing | Dashboard | Transfer |
|---------|-----------|----------|
| `![Landing](docs/screenshots/landing-placeholder.png)` | `![Dashboard](docs/screenshots/dashboard-placeholder.png)` | `![Transfer](docs/screenshots/transfer-placeholder.png)` |

*Add real PNGs under `docs/screenshots/` after deployment.*

---

## Future Improvements (road‑map)

- Multi‑currency accounts with real‑time FX conversion  
- Scheduled / recurring transfers (cron‑style)  
- Webhook callbacks (`transaction.created`, `account.updated`) with retry/back‑off  
- Prometheus `/metrics` endpoint + Grafana dashboards  
- OpenAPI 3 spec + Swagger UI at `/docs`  
- TOTP‑based 2FA and password‑reset email flow  
- Soft‑delete + GDPR‑ready data‑retention policies  
- Kubernetes manifests (Helm chart) + GitHub Actions CI/CD  

---



---

*Built with care for correctness, concurrency safety, and observability — the fundamentals any production‑grade ledger needs.*
