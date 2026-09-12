# Ledgerline frontend

React/Vite demo UI for the double-entry ledger API. It uses the backend's httpOnly auth cookies, so no auth state is stored in browser storage.

## Run locally

1. Start the backend on port `3000`. Vite proxies `/api` requests locally during development, so no CORS setting is needed.
2. In this directory, run `npm install`.
3. Copy `.env.example` to `.env` and set `VITE_API_URL` only when calling a deployed API directly.
4. Run `npm run dev` and open the displayed Vite URL.

The frontend uses the backend's real paths: `GET /accounts/:accountId` for balances and `POST /transactions` with `fromAccountId`, `toAccountId`, `amount`, and a client-generated `idempotencyKey`.
