# MDW Panel

A game hack/cheat authentication panel with neon blue cyberpunk theme. Manages license keys, users, and games, with a public `/connect` REST endpoint for C++ game client integration.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind v4 (neon blue dark theme)
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Auth: JWT (stored in localStorage as `mdw_token`)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/mdw-panel/` — React frontend (Vite)
- `artifacts/api-server/` — Express 5 API backend
- `lib/db/` — Drizzle ORM schema + client
- `lib/api-client-react/` — Generated React Query hooks (from OpenAPI)
- `lib/api-zod/` — Generated Zod schemas (from OpenAPI)
- `lib/api-spec/openapi.yaml` — Source of truth for API contract

## Architecture decisions

- First registered user automatically becomes admin (no initial seed required)
- `/connect` endpoint is at root (not `/api/connect`) for C++ libcurl compatibility — POST form-urlencoded
- HWID binding: first use of a key binds the device serial; subsequent uses check the HWID
- JWT auth: 7-day tokens stored in localStorage, attached via Bearer header on all API calls
- All other API routes are under `/api/*`

## Product

- **Login/Register**: Register-first flow. Login shows "User tidak tersedia, silahkan register dulu" if username not found.
- **Dashboard**: Live stats (total/active/expired/banned keys, users, games, today's connects) + activity log.
- **License Keys**: Generate single or bulk keys per game; filter by game/status; ban or delete keys.
- **Users**: Admin-only view to manage users; ban/unban, delete.
- **Games**: CRUD for supported games (PUBG, FF, ML, CODM, HOK); status management.
- **API Docs**: Inline docs for all public endpoints with copy-able curl examples.
- **Connect Guide**: C++ libcurl integration guide with error codes and request/response format.

## User preferences

- Blue neon cyberpunk theme (electric cyan primary `hsl(186 100% 50%)` on dark navy background)
- Indonesian language for user-facing messages (e.g., error messages, notices)
- Scrolling marquee ticker at top of all pages

## Gotchas

- The `@workspace/db` lib must be built (`pnpm run typecheck:libs`) before API server typechecks work.
- Admin account: register first via UI — first registered user becomes admin automatically.
- Seed data: 5 games seeded (PUBG, FF, ML, CODM, HOK).
- `html class="dark"` is set in index.html (not via CSS `@apply dark`) — required for Tailwind v4.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
