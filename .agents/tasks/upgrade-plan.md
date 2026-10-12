# Campus Event Finder — Package Upgrade Plan

## Context

Monorepo root: `c:\Users\Shreyas\Documents\campus event`  
Workspaces: `client`, `server`, `shared`  
Build command: `npm run build --workspaces --if-present`  
Test command: `npm run test` (from root, runs all workspaces)

---

## Version Decision Summary

| Package | Decision | Rationale |
|---|---|---|
| Jest 29 → 30 | **Upgrade** to 30.5.2 | Latest stable, all three workspaces |
| ts-jest 29 → latest | **Upgrade** to 29.4.14 | Already supports Jest 30 via `^29.0.0 \|\| ^30.0.0` peer dep; no major bump needed |
| @types/jest 29 → 30 | **Upgrade** to 30.0.0 | Matches Jest 30 |
| jest-environment-jsdom 29 → 30 | **Upgrade** to 30.5.2 | Must match Jest major version |
| @testing-library/jest-dom 6 → 7 | **Upgrade** to 7.0.1 | `/extend-expect` export is REMOVED in v7; setup must change to `@testing-library/jest-dom` (root export) |
| @testing-library/react 16 → 16.3.3 | **Upgrade** (patch/minor) | Safe within v16 |
| vite 5 → 6 | **Upgrade** to 6.4.4 | Latest stable v6 |
| @vitejs/plugin-react 4 → 5 | **Upgrade** to 5.2.0 | v5 supports Vite 4–8; v6.1.2 (latest) requires Vite 8 — do NOT use v6 |
| @tailwindcss/vite 4.3.0 → 4.3.3 | **Upgrade** (patch) | Safe within v4 |
| TypeScript 5.9.3 | **No change** | Already at latest 5.x; v7 is a new major (not yet stable for this stack) |
| Express 4 | **No change** | Express 5 has breaking changes (async error handling, route matching) requiring app logic changes |
| @types/express 4 | **No change** | Must stay aligned with Express 4 |
| dotenv 16 | **No change** | dotenv v18 is a major with breaking API changes |
| fast-check 3 | **No change** | fast-check v4 has breaking API changes to arbitraries |
| framer-motion 12 → 12.43.0 | **Upgrade** (minor) | Stays in v12; v14 is a major |
| @types/node 20 | **Upgrade** to 20.19.43 | Stays in v20 range; v26 would require Node 26 |
| @types/supertest 6 → 7.2.1 | **Upgrade** | supertest stays at v7 |
| supertest 7.2.2 → 7.3.1 | **Upgrade** (patch) | Safe |
| Radix UI components | **Upgrade** to latest (see table below) | All are compatible minor/patch bumps within v1/v2 |
| tailwind-merge 3.6.0 → 3.7.0 | **Upgrade** (minor) | Safe |
| tailwindcss 4.3.0 → 4.3.3 | **Upgrade** (patch) | Safe |
| autoprefixer 10.5.0 → 10.6.1 | **Upgrade** (patch) | Safe |
| lucide-react 1.14.0 → 1.55.0 | **Upgrade** (minor) | Safe within v1 |
| postcss 8.5.14 → 8.5.29 | **Upgrade** (patch) | Safe |
| zod 4.4.3 → 4.6.5 | **Upgrade** (minor) | Safe within v4 |
| multer 2.1.1 → 2.4.0 | **Upgrade** (minor) | Safe within v2 |
| @types/multer 2.1.0 → 2.3.0 | **Upgrade** (minor) | Safe |
| @types/pg 8.11.6 → 8.23.1 | **Upgrade** (minor) | Safe |
| pg 8.11.5 → 8.23.1 | **Upgrade** (minor) | Safe |
| nodemon 3.1.0 → 3.1.14 | **Upgrade** (patch) | Safe within v3 |
| concurrently 10.0.6 | **No change** | Already at latest |
| Prisma / @prisma/client 6.x | **No change** | Prisma 8 is rc.22; keep v6 stable |
| bcrypt 6.0.0 | **No change** | Already at latest v6 |
| jsonwebtoken 9.0.3 | **No change** | Already at latest v9 |
| @types/react 18.3.28 → 18.3.31 | **Upgrade** (patch) | Stays in v18 range |
| @types/react-dom 18.3.7 | **No change** | Already at latest 18.x |

---

## Full Upgrade Tables by Workspace

### Shared (`shared/package.json` — devDependencies only)

| Package | Current | Target | Config change? |
|---|---|---|---|
| jest | ^29.7.0 | ^30.5.2 | No (testEnvironment: 'node' already explicit) |
| ts-jest | ^29.1.4 | ^29.4.14 | No |
| @types/jest | ^29.5.12 | ^30.0.0 | No |
| fast-check | ^3.19.0 | ^3.19.0 | **No change** |
| typescript | ^5.4.5 | ^5.4.5 | **No change** |

### Server (`server/package.json`)

**Dependencies:**

| Package | Current | Target | Config change? |
|---|---|---|---|
| express | ^4.22.3 | ^4.22.3 | **No change** |
| dotenv | ^16.4.5 | ^16.4.5 | **No change** |
| zod | ^4.4.3 | ^4.6.5 | No |
| multer | ^2.1.1 | ^2.4.0 | No |
| pg | ^8.11.5 | ^8.23.1 | No |
| bcrypt, jsonwebtoken, @prisma/client | unchanged | unchanged | — |

**devDependencies:**

| Package | Current | Target | Config change? |
|---|---|---|---|
| jest | ^29.7.0 | ^30.5.2 | No (testEnvironment: 'node' already explicit) |
| ts-jest | ^29.1.4 | ^29.4.14 | No |
| @types/jest | ^29.5.12 | ^30.0.0 | No |
| @types/node | ^20.12.12 | ^20.19.43 | No |
| @types/multer | ^2.1.0 | ^2.3.0 | No |
| @types/pg | ^8.11.6 | ^8.23.1 | No |
| @types/supertest | ^6.0.2 | ^7.2.1 | No |
| supertest | ^7.0.0 | ^7.3.1 | No |
| nodemon | ^3.1.0 | ^3.1.14 | No |
| fast-check | ^3.19.0 | ^3.19.0 | **No change** |
| typescript | ^5.4.5 | ^5.4.5 | **No change** |
| @types/express, @types/bcrypt, @types/jsonwebtoken, prisma | unchanged | unchanged | — |

### Client (`client/package.json`)

**Dependencies:**

| Package | Current | Target | Config change? |
|---|---|---|---|
| framer-motion | ^12.38.0 | ^12.43.0 | No |
| lucide-react | ^1.14.0 | ^1.55.0 | No |
| tailwind-merge | ^3.6.0 | ^3.7.0 | No |
| @radix-ui/react-avatar | ^1.1.11 | ^1.2.7 | No |
| @radix-ui/react-checkbox | ^1.3.3 | ^1.3.12 | No |
| @radix-ui/react-dialog | ^1.1.15 | ^1.2.0 | No |
| @radix-ui/react-dropdown-menu | ^2.1.16 | ^2.1.25 | No |
| @radix-ui/react-label | ^2.1.8 | ^2.1.16 | No |
| @radix-ui/react-popover | ^1.1.15 | ^1.2.0 | No |
| @radix-ui/react-progress | ^1.1.8 | ^1.1.17 | No |
| @radix-ui/react-scroll-area | ^1.2.10 | ^1.3.0 | No |
| @radix-ui/react-select | ^2.2.6 | ^2.3.8 | No |
| @radix-ui/react-slot | ^1.2.4 | ^1.4.0 | No |
| @radix-ui/react-switch | ^1.2.6 | ^1.3.8 | No |
| @radix-ui/react-tabs | ^1.1.13 | ^1.1.22 | No |
| @radix-ui/react-toast | ^1.2.15 | ^1.2.24 | No |
| @radix-ui/react-tooltip | ^1.2.8 | ^1.3.0 | No |
| react, react-dom, class-variance-authority, clsx, tailwindcss-animate | unchanged | unchanged | — |

**devDependencies:**

| Package | Current | Target | Config change? |
|---|---|---|---|
| vite | ^5.4.21 | ^6.4.4 | No (vite.config.mts has no deprecated options) |
| @vitejs/plugin-react | ^4.7.0 | ^5.2.0 | No (v5 peer dep: `^4.2.0 \|\| ^5.0.0 \|\| ^6.0.0 \|\| ^7.0.0 \|\| ^8.0.0`) |
| @tailwindcss/vite | ^4.3.0 | ^4.3.3 | No |
| tailwindcss | ^4.3.0 | ^4.3.3 | No |
| autoprefixer | ^10.5.0 | ^10.6.1 | No |
| postcss | ^8.5.14 | ^8.5.29 | No |
| jest | ^29.7.0 | ^30.5.2 | Yes — see jest.config.js changes below |
| jest-environment-jsdom | ^29.7.0 | ^30.5.2 | No (matches Jest 30) |
| ts-jest | ^29.1.4 | ^29.4.14 | No |
| @types/jest | ^29.5.12 | ^30.0.0 | No |
| @testing-library/react | ^16.0.0 | ^16.3.3 | No |
| @testing-library/jest-dom | ^6.4.5 | ^7.0.1 | Yes — see jest.config.js changes below |
| @types/node | ^20.19.40 | ^20.19.43 | No |
| @types/react | ^18.3.3 | ^18.3.31 | No |
| fast-check | ^3.19.0 | ^3.19.0 | **No change** |
| typescript | ^5.4.5 | ^5.4.5 | **No change** |

---

## Configuration File Changes Required

### 1. `client/jest.config.js` — two changes

**Change A — Fix typo** (`setupFilesAfterFramework` → `setupFilesAfterEnv`):  
The key `setupFilesAfterFramework` is silently ignored by Jest; it has never been valid. Must be `setupFilesAfterEnv`.

**Change B — Fix setup import path** (`@testing-library/jest-dom/extend-expect` → `@testing-library/jest-dom`):  
The `/extend-expect` subpath export was removed in `@testing-library/jest-dom` v7. The root export now registers the matchers automatically.

Current:
```js
setupFilesAfterFramework: ['@testing-library/jest-dom/extend-expect'],
```

Replace with:
```js
setupFilesAfterEnv: ['@testing-library/jest-dom'],
```

File: `client/jest.config.js`

### 2. `client/vite.config.mts` — no changes needed

The config uses `plugins`, `resolve.alias`, `server.proxy`, and `build.outDir` — all valid in Vite 6. No deprecated options present.

### 3. `server/jest.config.js` — no changes needed

Already has `testEnvironment: 'node'` and `setupFilesAfterEnv`. Jest 30 is compatible as-is.

### 4. `shared/jest.config.js` — no changes needed

Already has `testEnvironment: 'node'`. Jest 30 is compatible as-is.

---

## Order of Operations

### Step 1 — Upgrade `shared` workspace

Upgrade Jest stack in shared first (no UI dependencies, safest starting point).

```
npm install --workspace=shared \
  jest@^30.5.2 \
  ts-jest@^29.4.14 \
  "@types/jest@^30.0.0"
```

PowerShell (semicolons, no &&, with cwd param):
```powershell
npm install --workspace=shared jest@^30.5.2 ts-jest@^29.4.14 "@types/jest@^30.0.0"
```

Files modified: `shared/package.json`

Verify: `npm run test:shared` — all tests pass.

---

### Step 2 — Upgrade `server` workspace

Upgrade Jest stack + runtime/dev deps.

```powershell
npm install --workspace=server jest@^30.5.2 ts-jest@^29.4.14 "@types/jest@^30.0.0" "@types/node@^20.19.43" "@types/multer@^2.3.0" "@types/pg@^8.23.1" "@types/supertest@^7.2.1" supertest@^7.3.1 nodemon@^3.1.14 zod@^4.6.5 multer@^2.4.0 pg@^8.23.1
```

Files modified: `server/package.json`

Verify: `npm run test:server` — all tests pass.

---

### Step 3 — Fix `client/jest.config.js`

Before upgrading client packages, fix the config file so tests can run after the upgrade.

Edit `client/jest.config.js`:
- Replace `setupFilesAfterFramework: ['@testing-library/jest-dom/extend-expect']`
- With `setupFilesAfterEnv: ['@testing-library/jest-dom']`

Files modified: `client/jest.config.js`

No install needed for this step — just the file edit.

---

### Step 4 — Upgrade `client` workspace (Jest + testing-library)

```powershell
npm install --workspace=client jest@^30.5.2 jest-environment-jsdom@^30.5.2 ts-jest@^29.4.14 "@types/jest@^30.0.0" "@testing-library/react@^16.3.3" "@testing-library/jest-dom@^7.0.1"
```

Files modified: `client/package.json`

Verify (after Step 5 is also done): `npm run test:client` — all tests pass.

---

### Step 5 — Upgrade `client` workspace (Vite + UI packages)

```powershell
npm install --workspace=client vite@^6.4.4 "@vitejs/plugin-react@^5.2.0" "@tailwindcss/vite@^4.3.3" tailwindcss@^4.3.3 autoprefixer@^10.6.1 postcss@^8.5.29 "@types/node@^20.19.43" "@types/react@^18.3.31" "tailwind-merge@^3.7.0" "lucide-react@^1.55.0" "framer-motion@^12.43.0" "@radix-ui/react-avatar@^1.2.7" "@radix-ui/react-checkbox@^1.3.12" "@radix-ui/react-dialog@^1.2.0" "@radix-ui/react-dropdown-menu@^2.1.25" "@radix-ui/react-label@^2.1.16" "@radix-ui/react-popover@^1.2.0" "@radix-ui/react-progress@^1.1.17" "@radix-ui/react-scroll-area@^1.3.0" "@radix-ui/react-select@^2.3.8" "@radix-ui/react-slot@^1.4.0" "@radix-ui/react-switch@^1.3.8" "@radix-ui/react-tabs@^1.1.22" "@radix-ui/react-toast@^1.2.24" "@radix-ui/react-tooltip@^1.3.0"
```

Files modified: `client/package.json`

Verify: `npm run build --workspace=client` — Vite 6 build completes without errors.

---

### Step 6 — Full verification

Run all tests and builds from the repo root:

```powershell
npm run test
```

Expected: all test suites in `shared`, `server`, and `client` pass.

```powershell
npm run build
```

Expected: shared, server (tsc), and client (vite build) all succeed without errors.

```powershell
npm run dev
```

Expected:
- Backend starts at http://localhost:3000
- Frontend starts at http://localhost:5173
- No TypeScript errors in startup logs

---

## Packages Deliberately NOT Upgraded

| Package | Latest Available | Reason |
|---|---|---|
| typescript | 7.0.2 | TypeScript 7 is a major release; current 5.9.3 is latest 5.x. No downgrade risk since 5.9.3 > ^5.4.5. No upgrade needed. |
| express | 5.3.0 | Express 5 has breaking changes: removed `app.del()`, changed async error handling, stricter path matching. Requires application code changes. |
| @types/express | 5.0.6 | Must align with express major version. Stays at v4. |
| dotenv | 18.0.7 | dotenv v17+ changed the module structure; v18 removes the default export used by `-r dotenv/config` flag. Breaking change for `dev` script. |
| fast-check | 4.10.2 | fast-check v4 renamed/removed several arbitraries (e.g., `fc.integer()` options changed). Application test code would need auditing. |
| framer-motion | 14.1.0 | framer-motion v13+ changed motion component API. Upgrade to v12.43.0 (latest v12) is safe. |
| prisma / @prisma/client | 8.0.0-rc.22 | Release candidate, not stable. Constraint: keep v6. |
| concurrently | 10.0.6 | Already at latest. |
| bcrypt / @types/bcrypt | 6.0.0 | Already at latest v6. |
| jsonwebtoken | 9.0.3 | Already at latest v9. |
| @types/react / @types/react-dom | 19.3.0 | React 19 types require react@19. App uses react@18. Stays at ^18.x. |
| @vitejs/plugin-react | 6.1.2 | v6 requires Vite 8 (peer dep `^8.0.0`). Since we target Vite 6, plugin-react v5.2.0 is the correct choice. |
| react / react-dom | 19.3.0 | React 19 upgrade is a separate tracked effort requiring app-level API review. |
| @types/supertest (old: 6.x) | 7.2.1 | Upgraded to v7 in Step 2. |
