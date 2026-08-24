# Backend — Service Architecture

School CRM backend follows the same **API Gateway + Microservices** pattern as the reference template.

## Layout

```text
backend/
├── package.json              # npm run dev -> services/start.js
└── services/
    ├── start.js              # starts all services in dev
    ├── package.json
    ├── shared/               # common code across services
    │   ├── connectDB.js
    │   ├── generateToken.js
    │   └── AppError.js
    ├── api-gateway/
    ├── auth-service/
    └── platform-service/
```

## Standard service structure

Har runtime service mein yeh pattern:

```text
service-name/
├── .env
├── package.json
└── src/
    ├── app.js          # Express setup, middleware, routes mount
    ├── server.js       # DB connect, seed, app.listen()
    ├── config/
    │   └── env.js
    ├── routes/
    ├── controllers/
    └── models/
```

## Request flow

```text
Frontend
  -> api-gateway (:5000)
    -> auth-service (:5001)      /api/v1/platform/auth/*
    -> platform-service (:5002)  /api/v1/platform/*
          -> routes -> controllers -> services -> models
```

## Services

| Service | Port | Role |
|---|---|---|
| `api-gateway` | 5000 | CORS, rate limit, proxy to other services |
| `auth-service` | 5001 | Super Admin login, JWT, seed |
| `platform-service` | 5002 | Schools, subscriptions, billing, revenue, etc. |

## Health endpoints

| Service | URL |
|---|---|
| Gateway | `GET /api/health` |
| Auth | `GET /health` |
| Platform | `GET /health` |

## Setup

Har service mein install:

```powershell
cd services/api-gateway && npm install
cd ../auth-service && npm install
cd ../platform-service && npm install
```

Seed Super Admin:

```powershell
cd backend
npm run seed
```

Sab services ek saath:

```powershell
cd backend
npm run dev
```

Frontend sirf Gateway use karta hai: `http://localhost:5000/api/v1`

## Folder responsibilities

| Folder | Use |
|---|---|
| `routes/` | Endpoint mapping only |
| `controllers/` | Request/response handlers |
| `models/` | Mongoose schemas |
| `services/` | Reusable business logic (auth-service) |
| `repositories/` | DB queries (auth-service) |
| `shared/` | Cross-service utilities |
| `middleware/` | Gateway proxy helpers |

## Seeding

Auth service startup par `seedSuperAdmin.js` auto-run hota hai.

Manual seed:

```powershell
cd services/auth-service
npm run seed
```
