# AGENTS.md

Instructions for AI coding agents working in this repository.
Keep this file short and up to date: if a rule here is wrong.

## Project

**MapPick** recommends which CS2 map a player or a squad should play, based on
win rate and personal performance from Leetify match data.

Focus on **backend architecture, security, scalability and documentation**, not UI polish. Every team member must be able
to explain all code in an oral exam, so prefer clear, explicit code over clever code.

## Stack

- **Frontend:** React + TypeScript (Vite) + Tailwinds CSS
- **Backend:** NestJS (TypeScript), one app per microservice
- **Package manager:** pnpm workspaces (monorepo). Never use npm or yarn.
- **Database:** PostgreSQL, one logical database + user per service
- **Messaging:** RabbitMQ (topic exchange `mappick.events`)
- **Cache:** Redis
- **Auth:** Keycloak (JWT)
- **Deploy:** Docker → GitHub Actions → Helm → Argo CD on K3s

## Repository layout

```
apps/
  frontend/                 React SPA
  login-service/            login, if server is on cetran % this error should shut down and not let new people in
  user-service/             profile, Steam64 ID, consent, account deletion
  group-service/            squads, invites, membership
  stats-service/            wins/losses per player and map
  recommendation-service/   group map ranking, lobby WebSocket (Redis only)
  leetify-service/          fetches matches from Leetify API (Redis cache only)
  demoparcer-service/       extracts data from cs2 demo files
packages/
  contracts/                shared event payload types + DTOs (types only)
  auth/                     shared Keycloak JWT guard + roles decorator
  tsconfig/                 shared TS / ESLint config
  deploy/                   
  charts/nest-service/      ONE generic Helm chart for all Nest services
  values/                   per-service and third-party values files
  argocd/                   Argo CD applications
local/                      docker-compose for Postgres, RabbitMQ, Redis, Keycloak
load-tests/                 k3s scripts
docs/                       architecture, API, database, security, privacy
```

## Commands

```bash
pnpm install                              # install everything
docker compose -f local/docker-compose.yml up -d   # local infrastructure
pnpm --filter <service> dev               # run one service
pnpm --filter <service> test              # unit tests
pnpm --filter <service> test:cov          # tests with coverage
pnpm --filter <service> test:e2e          # e2e / failure tests
pnpm lint                                 # lint all packages
pnpm build                                # build all packages
```

Before saying a task is done: run lint, build and tests for every package you changed.

## Architecture rules (do not break these)

1. **Database per service.** A service only connects to its own database. Never query,
   join or migrate another service's tables.
2. **Services talk through RabbitMQ events.** Publish "something happened" events
   (`match.imported`, `stats.updated`, `group.member_joined`, `user.deleted`…).
   Direct REST calls between services are an exception and must be justified in the PR.
3. **Event types live in `packages/contracts`.** Never redefine a payload inline.
   Changing an existing event is a breaking change: add a new field as optional,
   or create a new event name.
4. **`packages/` holds types and small helpers only.** No business logic.
5. **Consumers are idempotent.** The same event may be delivered twice
   (e.g. store `matchId` and skip duplicates). Ack only after processing succeeds.
6. **Queues are durable, messages persistent, manual ack.** Failing messages go to a
   dead-letter queue after retries.
7. **Services are stateless.** No in-memory state that must survive a restart;
   use Postgres or Redis.
8. **Redis is a cache, never the source of truth.** Everything in it must be rebuildable.
9. **User identity = Keycloak `sub`.** Use it as `user_id` everywhere. Do not copy
   emails, names or passwords into service databases.
10. **`user.deleted` must be handled by every service** that stores user data (GDPR).

## NestJS conventions

- One folder per feature: `controller`, `service`, `entity`, `dto/`.
- Validate all input with DTOs + `class-validator`; enable the global `ValidationPipe`
  with `whitelist: true, forbidNonUnknownValues: true`.
- Document every endpoint with `@nestjs/swagger` decorators (OpenAPI is a requirement).
- Use correct HTTP status codes: 201 on create, 204 on delete, 400 validation,
  401 no/invalid token, 403 wrong role, 404 not found, 409 conflict.
- Every service exposes `GET /health` (liveness/readiness probes) and `GET /metrics`.
- Read configuration from environment variables via `@nestjs/config`. Never hard-code
  URLs, ports or credentials.
- Use the logger, never `console.log`.

## Security rules

- Every endpoint is protected by the shared JWT guard unless explicitly marked public
  (only `/health` and `/metrics`).
- Check roles/ownership server-side: a user may only read stats of groups they belong to.
- No raw SQL string concatenation. Use the ORM or parameterized queries (SQL injection).
- Never render user input as HTML in the frontend (no `dangerouslySetInnerHTML`) (XSS).
- Never commit secrets, `.env` files, tokens or Leetify API keys. Use Kubernetes Secrets.
- Do not log tokens, passwords or personal data.

## Leetify

- Respect their developer guidelines: show "Data Provided by Leetify" attribution,
  do not recalculate or alter Leetify's own scores.
- Handle 429 (rate limited) with backoff. Never call Leetify from load tests:
  use the mock / seed data.

## Testing

- Requirement: **≥ 50% backend coverage** (aim for 60%+), and **at least two
  failure tests per service** (e.g. 401 without token, 400 on invalid body,
  404 on missing resource).
- Write tests in the same PR as the code they test.
- Unit tests mock the database and RabbitMQ; integration tests use Testcontainers.

## How to work with us

- **Explain your changes.** Summarize what you did and why, and point out anything non-obvious.
- Ask before adding a new dependency, a new service, or changing an event contract.
- Prefer small, reviewable changes over large rewrites.
- If something in this file conflicts with the task, stop and ask.w