# EasyReceipt Database Notes

EasyReceipt uses Next.js App Router as the backend-for-frontend. The browser should not connect to SQL Server or Prisma directly. Server Components, Server Actions, and server-only helpers are responsible for all database access.

## Stack

- Database: Microsoft SQL Server 2019/2022 or Azure SQL
- ORM: Prisma with `provider = "sqlserver"`
- Runtime: Next.js server layer in the same app
- Public APIs: add `app/api/*` route handlers only when an external client or webhook needs HTTP access

The Express API scaffold lives in `apps/api` and uses the same Prisma schema and SQL Server database. It exposes REST endpoints under `/api/v1` for frontend integration while the current Next.js prototype can continue using local mock state during the transition.

## Setup

1. Copy `.env.example` to `.env`.
2. Update `DATABASE_URL` for the local SQL Server or Azure SQL instance.
3. Run:

```bash
npm run db:validate
npm run db:generate
npm run db:migrate
npm run db:seed
```

`npm run db:migrate` requires a reachable SQL Server database. `db:validate` and `db:generate` can run without connecting to the database.

## Data Boundaries

- Dashboard, Purchase, Stock, and Recipes are branch-scoped.
- Reports aggregate only branches that the signed-in member can access.
- Member branch access is stored in `member_branch_access`.
- Stock changes are written to `stock_movements` so purchase and cooking changes can be audited.

## Core Flows

- Purchase: create `purchases` and `purchase_items`, increment `branch_inventory.onHand`, then write `purchase_in` movements.
- Pin recipe: create a `recipe_plan`, create `stock_reservations`, then increment `branch_inventory.reservedQuantity`.
- Cook recipe: validate enough `onHand`, decrement `onHand`, release reservations, create a `cooking_run`, and write `cook_out` movements in one transaction.
- Dashboard purchase need: `max(reservedQuantity - onHand, 0)`.
