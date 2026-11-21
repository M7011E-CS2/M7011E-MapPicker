// Thin, typed wrapper around fetch. Every API call in the app goes through here,
// so base URL, headers, error handling (and later the Keycloak token) live in one place.

// Same-origin by default: in production the ingress routes /api/* to the services,
// in dev the Vite proxy does (see vite.config.ts).
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'

/** Thrown for any non-2xx response, so callers (and TanStack Query) see it as an error. */
export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')
  if (init.body !== undefined) {
    headers.set('Content-Type', 'application/json')
  }
  // TODO: when Keycloak is added, set `Authorization: Bearer <token>` here.

  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers })

  if (!response.ok) {
    throw new ApiError(response.status, `Request failed: ${response.status} ${response.statusText}`)
  }

  // 204 No Content (e.g. DELETE) has no body.
  if (response.status === 204) {
    return undefined as T
  }

  const contentType = response.headers.get('Content-Type') ?? ''
  if (contentType.includes('application/json')) {
    return (await response.json()) as T
  }
  return (await response.text()) as T
}
