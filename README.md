# DailyCheck Backend (Node.js)

TypeScript migration of the original FastAPI backend. It preserves the existing PostgreSQL tables and API paths.

## Requirements

- Node.js 20 or newer
- PostgreSQL
- Corepack (included with Node.js)

## Local setup

```powershell
corepack enable
pnpm install
Copy-Item .env.example .env
pnpm db:generate
pnpm db:migrate
pnpm dev
```

If Windows does not allow Corepack to create global shims, use `corepack pnpm` in place of `pnpm`; the pinned version is already declared in `package.json`.

The API runs on `http://localhost:8000`; health is available at `/health`.

For a new database, `db:migrate` creates the tables and records the migration history.

For an existing Python backend database, Prisma initially reports `P3005` because the schema is not empty. Run the following once to apply the idempotent baseline SQL and register it in Prisma's migration history. The SQL preserves existing `users`, `habits`, and `habit_logs` data.

```powershell
corepack pnpm exec prisma db execute --file "prisma/migrations/00000000000000_baseline/migration.sql" --schema "prisma/schema.prisma"
corepack pnpm exec prisma migrate resolve --applied 00000000000000_baseline
corepack pnpm db:migrate
```

Run `migrate resolve` only after the SQL command succeeds. Subsequent deployments can use `db:migrate` normally.

## Commands

- `pnpm dev`: development server with reload
- `pnpm build`: compile TypeScript
- `pnpm start`: run the compiled server
- `pnpm typecheck`: type-check without emitting files
- `pnpm test`: run tests
- `pnpm db:migrate`: apply production migrations
- `pnpm db:studio`: open Prisma Studio

## API compatibility

Routes remain under `/api/auth`, `/api/users`, `/api/habits`, and `/api/logs`. JWTs use the same `SECRET_KEY`, `ALGORITHM`, expiration setting, and `sub` user ID claim as the Python service.
