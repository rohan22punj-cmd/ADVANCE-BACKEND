# Logging & Centralized Error Handler Implementation

## Overview
Replaced scattered `console.error` and ad-hoc error handling with a centralized, production-grade error management system and Morgan request logging.

---

## What Was Built

### 1. Morgan Request Logging

**File:** `src/app.js`

```javascript
const morgan = require('morgan');

if (process.env.NODE_ENV !== 'test') {
    const morganFormat = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';
    app.use(morgan(morganFormat));
}
```

#### Development Mode (`NODE_ENV=development`):
Produces concise, color-coded terminal output for every incoming HTTP request:
```text
POST /api/auth/login 200 45.213 ms - 182
POST /api/transactions 201 112.450 ms - 245
GET /api/accounts/66ded0123 404 12.110 ms - 52
```

#### Production Mode (`NODE_ENV=production`):
Produces standard Apache Combined format logs suitable for Datadog, CloudWatch, or ELK Stack:
```text
::ffff:127.0.0.1 - - [10/Sep/2026:14:32:10 +0000] "POST /api/auth/login HTTP/1.1" 200 182 "-" "Mozilla/5.0..."
```

---

### 2. Custom `AppError` Class

**File:** `src/middleware/error.middleware.js`

```javascript
class AppError extends Error {
    constructor(message, statusCode = 500, errors = null) {
        super(message);
        this.statusCode = statusCode;
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
        this.isOperational = true; // Marks known business errors vs unknown crashes
        this.errors = errors;

        Error.captureStackTrace(this, this.constructor);
    }
}
```

#### Usage in Controllers:
```javascript
// Throwing custom operational errors
throw new AppError('Account not found', 404);
throw new AppError('Insufficient balance for transfer', 400);
```

---

### 3. 404 Not Found Handler

**File:** `src/middleware/error.middleware.js`

Catches all requests to non-existent endpoints before they get lost:

```javascript
function notFoundHandler(req, res, next) {
    const error = new AppError(`Cannot ${req.method} ${req.originalUrl} - Route not found`, 404);
    next(error);
}
```

**Response (404 Not Found):**
```json
{
  "success": false,
  "message": "Cannot GET /api/non-existent-route - Route not found"
}
```

---

### 4. Centralized Error Handler Middleware

**File:** `src/middleware/error.middleware.js`

A single Express error middleware `(err, req, res, next)` mounted at the very end of `app.js` that automatically translates database and runtime errors into clean, structured HTTP responses:

#### Error Translation Rules:

| Error Type | Trigger | Output Status | Clean Response Message |
|:---|:---|:---|:---|
| **Mongoose CastError** | Malformed ObjectId (e.g. `id: "123"`) | `400 Bad Request` | `"Invalid _id: 123"` |
| **Mongoose Duplicate Key (11000)** | Duplicate unique field (e.g. email) | `409 Conflict` | `"Duplicate value for 'email': 'x@x.com'"` |
| **Mongoose ValidationError** | Schema validation failed | `400 Bad Request` | `"Validation failed"` + field errors |
| **JWT JsonWebTokenError** | Corrupted or altered token | `401 Unauthorized` | `"Invalid token. Please authenticate again."` |
| **JWT TokenExpiredError** | Expired access token | `401 Unauthorized` | `"Token expired. Please refresh your token..."` |
| **Zod ValidationError** | Request body schema failure | `400 Bad Request` | `"Validation failed"` + field errors |
| **Operational AppError** | Business logic violation | Custom (4xx) | Custom error message |
| **Unknown Bug / Crash** | Unhandled exception | `500 Internal Server` | `"Internal Server Error"` |

---

### 5. Environment-Aware Error Responses

#### In Production (`NODE_ENV=production`):
Hides internal stack traces and server details from clients to prevent information disclosure:
```json
{
  "success": false,
  "message": "Insufficient funds"
}
```

#### In Development (`NODE_ENV=development`):
Includes the full stack trace and original error object for effortless local debugging:
```json
{
  "success": false,
  "message": "Insufficient funds",
  "stack": "AppError: Insufficient funds\n    at createTransaction (/src/controllers/transactionController.js:110:19)..."
}
```

---

## Express 5 Native Async Error Handling

Because this project uses **Express 5.2.1**, any rejected promise or thrown exception in an async controller is **automatically passed to the centralized error middleware without needing `try/catch` boilerplate everywhere**:

```javascript
// Express 5 automatically forwards async errors to errorHandler:
async function getAccount(req, res) {
    const account = await accountModel.findById(req.params.id);
    if (!account) {
        throw new AppError('Account not found', 404); // Caught by errorHandler automatically!
    }
    res.status(200).json({ account });
}
```

---

## Files Modified / Created

| File | Action | Purpose |
|:---|:---|:---|
| `src/middleware/error.middleware.js` | ✅ Created | `AppError`, `notFoundHandler`, `errorHandler` |
| `src/app.js` | ✅ Updated | Added Morgan logging, 404 handler, centralized error middleware |
| `package.json` | ✅ Updated | Added `morgan@^1.10.0` dependency |
| `LOGGING-ERROR-HANDLING.md` | ✅ Created | Complete implementation documentation |

---

## Progress Update: 5 out of 8 Features Complete! 🎉

1. ✅ **Real balance & history endpoints** (aggregation + pagination)
2. ✅ **Harden input validation** (Zod schemas)
3. ✅ **Tighten auth & security** (Rate limiting, Helmet, CORS, refresh tokens)
4. ✅ **Transaction lifecycle** (Reversals + failure notifications)
5. ✅ **Logging & centralized error handler** (Morgan + Express error middleware)
6. ⏳ **Automated tests** (Jest + Supertest + mongodb-memory-server)
7. ⏳ **Documentation** (README + Swagger + architecture diagram)
8. ⏳ **Containerization** (Dockerfile + docker-compose.yml)
