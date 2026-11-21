import { useQuery } from '@tanstack/react-query'
import { userServiceHelloQuery } from '../api/users'

type Status = 'checking' | 'online' | 'offline'

// Full class strings (not built dynamically) so Tailwind can find them when scanning.
const badgeStyles: Record<Status, string> = {
  checking: 'bg-elevated text-muted',
  online: 'bg-success/10 text-success',
  offline: 'bg-danger/10 text-danger',
}

// Shows the response from the user-service, to check that frontend → ingress → service works.
export function UserServiceStatus() {
  const { data, error, isPending, isFetching, refetch } = useQuery(userServiceHelloQuery())

  const status: Status = isPending ? 'checking' : error ? 'offline' : 'online'

  return (
    <section className="rounded-xl border border-border bg-card px-6 py-5 shadow-lg shadow-black/35 transition-colors hover:bg-card-hover">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xs font-semibold tracking-widest text-muted uppercase">User service</h2>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${badgeStyles[status]}`}
        >
          <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
          {status}
        </span>
      </div>

      {isPending && <p className="mb-5 font-mono text-xl font-semibold text-muted">Loading…</p>}
      {error && (
        <p className="mb-5 font-mono text-sm font-semibold text-danger" role="alert">
          {error.message}
        </p>
      )}
      {/* Rendered as text, never as HTML (XSS). */}
      {data !== undefined && <p className="mb-5 font-mono text-xl font-semibold break-words">{data}</p>}

      <button
        type="button"
        onClick={() => refetch()}
        disabled={isFetching}
        className="rounded-lg bg-accent px-4 py-2 font-semibold text-white transition-colors hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isFetching ? 'Refreshing…' : 'Refresh'}
      </button>
    </section>
  )
}
