# Campus Event Finder

A robust web application built with **PostgreSQL**, **Prisma**, and **React** that helps students discover campus events, manage registrations, and find one-time sports play sessions.

## Features

- Events Discovery — browse and search upcoming campus events with date, time, location, price, and entry requirements.
- Smart Directions — Google Maps directions offered when a student is off-campus.
- Live Registration — authenticated users can join events, track participant counts, and manage their own dashboard.
- Sports Play Sessions — find and post one-time sports sessions.
- Following — follow organizers and see a personalised feed of their upcoming events.
- Saved Events — bookmark events to a personal list.
- Notifications — in-app notifications for registrations, event updates, and new followers.
- Reminder Preferences — configure 24 h, 1 h, and at-start email and in-app reminders.
- JWT Authentication — signup, login, token refresh, and protected routes.

## Project Structure

```text
campus-event-finder/
├── client/                  # React + TypeScript + Vite frontend
│   ├── src/
│   │   ├── components/      # Shared UI components
│   │   ├── pages/           # Route-level page components
│   │   ├── services/        # API service layer
│   │   └── styles/
│   └── vite.config.mts
├── server/                  # Express + TypeScript + Prisma + PostgreSQL API
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── migrations/
│   │   └── seed.ts
│   └── src/
│       ├── config/          # Validated environment configuration (env.ts)
│       ├── controllers/
│       ├── lib/             # Shared utilities (prisma client, token helpers)
│       ├── middleware/      # Express middleware (auth, error handler)
│       ├── routes/          # Route handlers
│       ├── services/        # Business logic services
│       └── validation/      # Zod input schemas
├── shared/                  # Shared TypeScript models and service interfaces
└── docker-compose.yml
```

## Prerequisites

- Node.js v20 or higher
- npm v9 or higher
- PostgreSQL 14 or higher (a running local instance)

## Getting Started

### 1. Clone and install

```bash
npm install
```

### 2. Configure environment

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

Edit `server/.env` and set `DATABASE_URL` and `JWT_SECRET`.

### 3. Database setup

```bash
cd server
npx prisma migrate deploy
npx prisma db seed
```

### 4. Start development servers

```bash
npm run dev
```

The API is available at `http://localhost:3000` and the frontend at `http://localhost:5173`.

## Environment Variables

### server/.env

| Variable | Required | Default | Description |
| -------------------- | -------- | ------------ | ------------------------------------------ |
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `JWT_SECRET` | Yes | — | JWT signing secret, minimum 32 characters |
| `API_PORT` | No | `3000` | TCP port for the API server |
| `NODE_ENV` | No | `production` | `development`, `test`, or `production` |
| `BCRYPT_COST` | No | `12` | Bcrypt cost factor, 10-14 (higher = slower but more secure) |

**Test-only authentication guard:** `AUTH_RAW_BEARER_IDS` may be set in `NODE_ENV=test` environments to enable raw student ID bearer tokens. The server refuses to start if this variable is set in production or development.

### client/.env

| Variable | Required | Default | Description |
| ---------------- | -------- | ------------------------- | ---------------------------------------------- |
| `VITE_API_URL` | No | `http://localhost:3000` | API base URL (used in production builds only) |

## Demo Accounts

The seed script creates these accounts for local testing:

| Email | Password | Role |
| --------------------- | ----------- | ---------------------- |
| dev.lead@campus.edu | password123 | Alex Chen (Tech Lead) |
| events@campus.edu | password123 | Sarah Miller (Campus Events) |

## 📜 Available Scripts

| Command          | Description                                         |
| ---------------- | --------------------------------------------------- |
| `npm run dev`    | Starts development servers for all workspaces       |
| `npm run build`  | Builds all packages (shared, server, client)        |
| `npm test`       | Runs the test suite across the entire project       |
| `npm run lint`   | Runs ESLint across all workspaces                   |

## ⚖️ License

This project is licensed under the [MIT License](LICENSE).
