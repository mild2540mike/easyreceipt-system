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

Production API startup runs `npm run db:migrate:deploy` automatically before
starting the server. Keep deployment environments on `npm run api:start` so
committed migrations are applied before a new Prisma client begins serving
requests.

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

## Table Meaning
| Table | ใช้ทำอะไร | เชื่อมกับหน้าจอ |
|---|---|---|
| `organizations` | องค์กรหลักของระบบ เช่น บริษัท/โรงเรียนเจ้าของหลายสาขา | ใช้เป็น root data ตอน login/permission ยังไม่มีหน้าจอแยก |
| `branches` | ข้อมูลโรงเรียน/สาขา 5 สาขา | ปุ่ม switch สาขา, Dashboard, Purchase, Stock, Recipes, Reports |
| `members` | ผู้ใช้งาน, email, password hash, role, status | Login, หน้าสมาชิก, สิทธิ์การเข้าถึง |
| `member_branch_access` | ตารางเชื่อมสมาชิกกับสาขาที่มีสิทธิ์ | Login session, switch สาขา, Reports รวมตามสิทธิ์, หน้าสมาชิก |
| `ingredients` | ฐานข้อมูลวัตถุดิบหลักระดับองค์กร เช่น อกไก่, ไข่ไก่ | บันทึกการซื้อ, คลังวัตถุดิบ, สูตรอาหาร |
| `branch_inventory` | จำนวนคงเหลือ/จองใช้/จุดสั่งซื้อของวัตถุดิบแต่ละสาขา | Dashboard, คลังวัตถุดิบ, บันทึกการซื้อ, สูตรอาหาร |
| `purchases` | หัวใบซื้อ เช่น วันที่ซื้อ, vendor, ยอดรวม, สาขา | หน้าบันทึกการซื้อ, Dashboard, Reports |
| `purchase_items` | รายการวัตถุดิบในใบซื้อ | หน้าบันทึกการซื้อ, update stock |
| `recipes` | เมนู/สูตรอาหารของแต่ละสาขา | หน้าสูตรอาหาร |
| `recipe_items` | วัตถุดิบที่ใช้ในแต่ละสูตร | หน้าสูตรอาหาร, คำนวณจองวัตถุดิบ |
| `recipe_plans` | สูตรที่ปักหมุด/เตรียมปรุง | หน้าสูตรอาหาร |
| `stock_reservations` | รายการจองวัตถุดิบจากสูตรที่ปักหมุด | Dashboard, คลังวัตถุดิบ, สูตรอาหาร |
| `cooking_runs` | ประวัติการกดปรุงอาหารสำเร็จ | สูตรอาหาร, Reports |
| `stock_movements` | ledger การเคลื่อนไหว stock เข้า/ออก | Reports, audit stock, ตรวจย้อนหลัง |
| `audit_logs` | เก็บ log การกระทำสำคัญในระบบ | ยังไม่มีหน้าจอหลัก ใช้ต่อยอด audit/admin |
