import "dotenv/config"

import { z } from "zod"

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z
    .string()
    .min(1)
    .default(
      "sqlserver://localhost:1433;database=EasyReceiptSystem;user=sa;password=YourStrong(!)Password;encrypt=true;trustServerCertificate=true"
    ),
  JWT_SECRET: z.string().min(16).default("easyreceipt-local-dev-secret"),
  JWT_EXPIRES_IN: z.string().default("8h"),
  FRONTEND_ORIGIN: z.string().url().default("http://localhost:3000"),
  SESSION_COOKIE_NAME: z.string().default("easyreceipt_session"),
})

export const env = envSchema.parse(process.env)
