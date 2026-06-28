import { badRequest } from "./http-error"

export function routeParam(
  value: string | string[] | undefined,
  name: string
) {
  if (!value || Array.isArray(value)) {
    throw badRequest(`Route parameter ${name} is required.`)
  }

  return value
}
