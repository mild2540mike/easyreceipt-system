import { Prisma } from "@prisma/client"
import type { ErrorRequestHandler, RequestHandler } from "express"
import { ZodError } from "zod"

import { HttpError } from "../utils/http-error"

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new HttpError(404, `Route ${req.method} ${req.path} not found.`))
}

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  void _next

  if (error instanceof HttpError) {
    res.status(error.statusCode).json({
      error: {
        message: error.message,
        details: error.details,
      },
    })
    return
  }

  if (error instanceof ZodError) {
    res.status(400).json({
      error: {
        message: "Invalid request payload.",
        details: error.flatten(),
      },
    })
    return
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    res.status(400).json({
      error: {
        message: "Database request failed.",
        code: error.code,
      },
    })
    return
  }

  console.error(error)
  res.status(500).json({
    error: {
      message: "Internal server error.",
    },
  })
}
