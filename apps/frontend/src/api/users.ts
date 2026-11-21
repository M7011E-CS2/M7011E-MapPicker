import { queryOptions } from '@tanstack/react-query'
import { apiFetch } from './client'

// All user-service calls. Paths are relative to /api/users (the ingress prefix).

// Query keys are defined once so components and cache invalidation always match.
export const userKeys = {
  all: ['users'] as const,
  hello: () => [...userKeys.all, 'hello'] as const,
}

export function getUserServiceHello(signal?: AbortSignal): Promise<string> {
  return apiFetch<string>('/users', { signal })
}

// queryOptions bundles key + fetcher so they can't drift apart, and gives full type inference.
// TanStack passes `signal`, so the request is cancelled if the component unmounts.
export const userServiceHelloQuery = () =>
  queryOptions({
    queryKey: userKeys.hello(),
    queryFn: ({ signal }) => getUserServiceHello(signal),
  })
