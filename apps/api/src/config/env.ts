import "dotenv/config"

import { z } from "zod"

import { normalizeGoogleSheetsSyncToken } from "./google-sheets-sync"

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
  GOOGLE_SHEETS_SYNC_CREDENTIALS: z
    .string()
    .default("")
    .transform((value, context) => {
      try {
        return normalizeGoogleSheetsSyncToken(value)
      } catch (error) {
        context.addIssue({
          code: "custom",
          message:
            error instanceof Error
              ? error.message
              : "Invalid Google Sheets sync credentials.",
        })

        return z.NEVER
      }
    }),
  OPENAI_API_KEY: z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? undefined : value,
    z.string().trim().min(1).optional()
  ),
  OPENAI_RECEIPT_MODEL: z.string().trim().min(1).default("gpt-5.6-sol"),
  OPENAI_RECEIPT_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .min(30_000)
    .max(120_000)
    .default(90_000),
})

export const env = envSchema.parse(process.env)
