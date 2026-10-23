import { randomUUID } from "node:crypto"

import pinoHttp from "pino-http"

import { env } from "../config/env"

function requestPath(url: string | undefined) {
  return url?.split("?", 1)[0] ?? "unknown-path"
}

export const requestLogger = pinoHttp({
  enabled: env.NODE_ENV !== "test",
  level: env.API_LOG_LEVEL,
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "res.headers.set-cookie",
    ],
    censor: "[Redacted]",
  },
  serializers: {
    req(req) {
      return {
        id: req.id,
        method: req.method,
        path: requestPath(req.url),
        remoteAddress: req.remoteAddress,
        userAgent: req.headers?.["user-agent"],
      }
    },
    res(res) {
      return { statusCode: res.statusCode }
    },
  },
  genReqId(req, res) {
    const incomingRequestId = req.headers["x-request-id"]
    const normalizedRequestId =
      typeof incomingRequestId === "string" ? incomingRequestId.trim() : ""
    const requestId = /^[A-Za-z0-9._:-]{1,128}$/.test(normalizedRequestId)
      ? normalizedRequestId
      : randomUUID()

    res.setHeader("X-Request-Id", requestId)
    return requestId
  },
  customLogLevel(_req, res, error) {
    if (error || res.statusCode >= 500) {
      return "error"
    }

    if (res.statusCode >= 400) {
      return "warn"
    }

    return "info"
  },
  customSuccessMessage(req, res) {
    return `${req.method} ${requestPath(req.url)} completed with ${res.statusCode}`
  },
  customErrorMessage(req, res) {
    return `${req.method} ${requestPath(req.url)} failed with ${res.statusCode}`
  },
})

export const apiLogger = requestLogger.logger
