# Repository Guidelines

## Project Structure & Module Organization

This repository is a monorepo-style EasyReceipt prototype. The Next.js App Router frontend lives in `src/app`, shared UI in `src/components`, business hooks in `src/hooks`, and shared models/API clients in `src/lib`. The Express REST API lives in `apps/api/src`; compiled output goes to `apps/api/dist` and should not be edited by hand. Prisma MSSQL schema, migrations, and seed scripts are in `prisma/`. Static assets are in `public/`; supporting notes can live in `docs/`.

## Build, Test, and Development Commands

- `npm run dev`: start the Next.js frontend locally.
- `npm run api:dev`: start the Express API with `tsx watch`.
- `npm run build`: production-build the Next.js app.
- `npm run api:build`: type-check/build the API TypeScript project.
- `npm run lint`: run ESLint across the repo.
- `npm run db:validate`: validate `prisma/schema.prisma`.
- `npm run db:migrate`: run Prisma migrations in development.
- `npm run db:seed`: seed MSSQL with mock EasyReceipt data.

## Coding Style & Naming Conventions

Use TypeScript, React function components, and App Router conventions. Prefer existing shadcn/Base UI components and lucide icons before adding new UI primitives. Keep files and folders kebab-case where already established, for example `easyreceipt-app.tsx`; use PascalCase for React components and camelCase for functions/variables. Run `npm run lint` before handing off changes. This project uses Next.js 16.2.9, so check local Next docs/deprecations when changing framework APIs.

## Testing Guidelines

There is no dedicated test framework configured yet. Treat `npm run lint`, `npm run build`, `npm run api:build`, and targeted API smoke checks as the current verification baseline. When adding tests later, colocate them near the feature or use a clear `*.test.ts(x)` naming pattern, and cover branch access, inventory reservation, recipe cooking, and auth flows.

## Commit & Pull Request Guidelines

Recent history uses Conventional Commit style such as `feat(members): ...` and `docs: ...`. Keep commits focused and scoped. Pull requests should include a short summary, verification commands run, linked issues if any, screenshots for UI changes, and notes for database/API changes such as new migrations or environment variables.

## Security & Configuration Tips

Keep secrets in `.env`; use `.env.example` for safe placeholders. Do not commit real database credentials or JWT secrets. API auth uses HttpOnly cookie JWTs, and frontend API calls should include credentials. For MSSQL/Prisma work, keep migrations deterministic and document any collation or seed-data assumptions.
