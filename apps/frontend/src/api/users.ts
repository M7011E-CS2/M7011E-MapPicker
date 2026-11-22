import { queryOptions } from '@tanstack/react-query'
import { apiFetch } from './client'

// All user-service calls. Paths are relative to /api (the user-service lives at /api/users).

/** Shape returned by the user-service (mirrors its User entity). */
export interface User {
  id: string
  username: string
}

// Query keys are defined once so components and cache invalidation always match.
export const userKeys = {
  all: ['users'] as const,
  list: () => [...userKeys.all, 'list'] as const,
}

export function listUsers(signal?: AbortSignal): Promise<User[]> {
  return apiFetch<User[]>('/users', { signal })
}

// queryOptions bundles key + fetcher so they can't drift apart, and gives full type inference.
// TanStack passes `signal`, so the request is cancelled if the component unmounts.
export const listUsersQuery = () =>
  queryOptions({
    queryKey: userKeys.list(),
    queryFn: ({ signal }) => listUsers(signal),
  })
