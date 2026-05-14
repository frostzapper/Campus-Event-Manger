# Campus Event Finder

A robust web application built with **PostgreSQL**, **Prisma**, and **React** that helps students discover campus events, manage registrations, and find one-time sports play sessions.

## 🚀 Features

-   **Events Discovery** — Browse and search upcoming campus events with date, time, location, price, and entry requirements.
-   **Smart Directions** — Google Maps directions are dynamically offered when students are off-campus.
-   **Live Registration** — Authenticated users can join events, track participant counts, and manage their own event dashboard.
-   **Sports Play Sessions** — A dedicated space for finding and posting one-time sports sessions.
-   **Real-time Notifications** — In-app notifications for registration confirmations and event updates.
-   **Account Management** — Secure JWT-based authentication with signup, login, and personalized reminder preferences.

## 📁 Project Structure

```text
campus-event-finder/
├── client/          # React + TypeScript + Vite frontend
├── server/          # Express + TypeScript + Prisma + PostgreSQL API
├── shared/          # Shared TypeScript models and service interfaces
└── .kiro/specs/     # Specification and design documents
```

## 🛠 Prerequisites

-   **Node.js**: v18 or higher
-   **npm**: v9 or higher
-   **PostgreSQL**: A running instance (local or remote)

## 🏁 Getting Started

### 1. Clone & Install

```bash
npm install
```

### 2. Configure Environment

Create a `.env` file in the root directory by copying the example:

```bash
cp .env.example .env
```

Edit `.env` and set your `DATABASE_URL` and `JWT_SECRET`.

### 3. Database Setup (Prisma)

Initialize the database schema and seed the initial data:

```bash
cd server
npx prisma migrate dev --name init
npx prisma db seed
```

### 4. Start Development

From the root directory:

```bash
# Run both client and server in parallel
npm run dev
```

The API will be available at `http://localhost:3000` and the frontend at `http://localhost:5173`.

## 🧪 Demo Accounts

The project includes pre-seeded accounts for testing:

| Email             | Password    |
| ----------------- | ----------- |
| alice@campus.edu  | password123 |
| bob@campus.edu    | securepass  |

## 📜 Available Scripts

| Command          | Description                                         |
| ---------------- | --------------------------------------------------- |
| `npm run dev`    | Starts development servers for all workspaces       |
| `npm run build`  | Builds all packages (shared, server, client)        |
| `npm test`       | Runs the test suite across the entire project       |
| `npm run lint`   | Runs ESLint across all workspaces                   |

## ⚖️ License

This project is licensed under the [MIT License](LICENSE).
