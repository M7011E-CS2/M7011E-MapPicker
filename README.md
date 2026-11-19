# MapPick

MapPick recommends which CS2 map a player or a squad should play, based on win
rate and personal performance from Leetify match data.

It is a **pnpm monorepo** with one NestJS app per microservice, a React frontend,
and a GitOps deploy (GitHub Actions → GHCR → Argo CD on K3s).

> Rules for how code must be written (architecture, security, testing) live in
> [AGENTS.md](AGENTS.md). Deployment details live in
> [docs/deployment.md](docs/deployment.md). This README is the **command cheat sheet**.

---

## Contents

1. [Prerequisites](#prerequisites)
2. [Repository layout](#repository-layout)
3. [Daily development commands](#daily-development-commands)
4. [Working with dependencies](#working-with-dependencies)
5. [Docker (build an image locally)](#docker-build-an-image-locally)
6. [Creating a new service](#creating-a-new-service)
7. [Cluster / deploy commands](#cluster--deploy-commands)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

| Tool | Version | Why |
|---|---|---|
| Node.js | 24 | Same as the Docker image (`node:24-alpine`) |
| pnpm | pinned in `package.json` (`packageManager`) | Run `corepack enable` once and the right version is used automatically |
| Docker | any recent | Build images, run local infrastructure |
| kubectl | any recent | Only needed if you work on the cluster |

```bash
corepack enable          # once per machine: makes `pnpm` use the pinned version
pnpm install             # install everything (all apps + packages)
```

> **Never use `npm` or `yarn`.** They ignore the workspace and the lockfile.

---

## Repository layout

```
apps/                    one folder per deployable app
  frontend/              React + Vite SPA
  user-service/          NestJS service (use as the template for new services)
packages/                shared types / small helpers only (no business logic)
  auth/  contracts/  tsconfig/
deploy/
  charts/nest-service/   ONE generic Helm chart for every Nest service
  values/<service>.yaml  per-service settings (image tag is written by CI)
  argocd/                Argo CD root app + one Application per service
  infra/                 shared cluster resources (TLS certificate)
docs/                    architecture, deployment, ...
Dockerfile               ONE Dockerfile for all Nest services (SERVICE build arg)
```

---

## Daily development commands

All commands are run from the **repo root**. `--filter <name>` picks a workspace
package by the `name` in its `package.json`.

### Run

```bash
pnpm dev                                   # start ALL apps in watch mode (parallel)
pnpm --filter user-service start:dev       # start ONE service in watch mode
pnpm --filter user-service start:debug     # watch mode + Node inspector (attach VS Code)
pnpm --filter frontend dev                 # start the frontend (Vite)
```

A Nest service listens on `PORT` (default `3000`). Check it is alive:

```bash
curl http://localhost:3000/health          # -> {"status":"ok"}
```

> Running two services at once? Give them different ports:
> `PORT=3001 pnpm --filter group-service start:dev`

### Test

```bash
pnpm --filter user-service test            # unit tests (Vitest)
pnpm --filter user-service test:watch      # re-run on save
pnpm --filter user-service test:cov        # with coverage report (goal: >= 50%)
pnpm --filter user-service test:e2e        # e2e / failure tests
pnpm --filter "./apps/*" test              # unit tests for every app
```

### Lint, format, build

```bash
pnpm lint                                  # lint every package
pnpm --filter user-service lint            # lint one service (oxlint)
pnpm --filter user-service format          # prettier --write
pnpm build                                 # build every package
pnpm --filter user-service build           # build one service -> apps/user-service/dist
pnpm --filter "user-service..." build      # build the service AND the packages it depends on
```

### Before you push

Run lint, build and tests **for every package you changed**:

```bash
pnpm --filter user-service lint && \
pnpm --filter user-service build && \
pnpm --filter user-service test
```

### Filter syntax cheat sheet

| Filter | Selects |
|---|---|
| `--filter user-service` | only that package |
| `--filter "user-service..."` | the package **and its dependencies** |
| `--filter "...contracts"` | `contracts` **and everything that depends on it** |
| `--filter "./apps/*"` | every app |
| `--filter "./packages/*"` | every shared package |
| `-r` | every package in the workspace |

---

## Working with dependencies

> Ask the team before adding a new dependency (see [AGENTS.md](AGENTS.md)).

```bash
pnpm --filter user-service add @nestjs/config          # runtime dependency
pnpm --filter user-service add -D @types/foo           # dev dependency
pnpm --filter user-service remove some-package         # remove
pnpm add -w -D some-tool                               # root-level dev tool (rare)
```

Use a shared workspace package (e.g. `contracts`) inside a service:

```bash
pnpm --filter user-service add contracts --workspace   # adds "contracts": "workspace:*"
```

Always commit `pnpm-lock.yaml` together with the `package.json` change — CI
installs with `--frozen-lockfile` and fails if they do not match.

---

## Docker (build an image locally)

The same [Dockerfile](Dockerfile) builds every Nest service. `SERVICE` must be
the folder name under `apps/`. Build from the **repo root**:

```bash
docker build --build-arg SERVICE=user-service -t user-service .
docker run --rm -p 3000:3000 user-service
curl http://localhost:3000/health
```

Useful when CI fails at the Docker step: reproducing it locally is much faster
than pushing again.

---

## Creating a new service

Example: `group-service`, reachable at `https://<domain>/api/groups`.
Replace `group-service` / `groups` with your names.

### 1. Copy the template service

`user-service` already has everything a service needs (ESM setup, Vitest,
oxlint, `GET /health`), so copy it instead of running `nest new`:

```bash
rsync -a --exclude node_modules --exclude dist --exclude coverage \
      --exclude '*.tsbuildinfo' --exclude .env \
      apps/user-service/ apps/group-service/
```

Then rename it:

- `apps/group-service/package.json` → `"name": "group-service"`
- Delete the user-service–specific code you do not need, and rewrite
  `apps/group-service/README.md`.

```bash
pnpm install                                   # links the new workspace package
pnpm --filter group-service start:dev          # does it start?
curl http://localhost:3000/health
```

### 2. Requirements every service must meet

- Builds to `dist/main.js` and listens on `process.env.PORT`.
- Exposes `GET /health` (Kubernetes probes) and `GET /metrics`.
- Reads all config from env vars (`@nestjs/config`), no hard-coded URLs/secrets.
- Has its **own** database + DB user; handles the `user.deleted` event if it stores user data.
- Has tests: ≥ 50 % coverage and at least two failure tests (401, 400, 404 …).

Generate code with the Nest CLI (run inside the service so files land in its `src/`):

```bash
cd apps/group-service
pnpm exec nest g resource groups       # controller + service + module + DTOs
pnpm exec nest g controller invites    # single pieces
pnpm exec nest g service invites
```

### 3. Register it for CI/CD

| Step | File | What to change |
|---|---|---|
| a | [.github/workflows/build.yml](.github/workflows/build.yml) | add `"group-service"` to `SERVICES` |
| b | `deploy/values/group-service.yaml` | copy [user-service.yaml](deploy/values/user-service.yaml); change `image.repository`, `ingress.path`, add `secretEnv` |
| c | `deploy/argocd/apps/group-service.yaml` | copy [user-service.yaml](deploy/argocd/apps/user-service.yaml); change `metadata.name`, `releaseName`, values file path |

```bash
cp deploy/values/user-service.yaml      deploy/values/group-service.yaml
cp deploy/argocd/apps/user-service.yaml deploy/argocd/apps/group-service.yaml
```

Example values file (keep it **free of blank lines** — CI rewrites it with `yq`):

```yaml
image:
  repository: ghcr.io/m7011e-cs2/group-service
  tag: "initial"             # placeholder: the chart requires a tag; CI overwrites it on the first build
imagePullSecrets:
  - name: ghcr-pull
env:
  NODE_ENV: production
secretEnv:
  DATABASE_URL: { secretName: group-service-db, key: DATABASE_URL }
ingress:
  enabled: true
  path: /api/groups
```

TLS needs no settings: the chart defaults already use the shared `cs2-tls`
certificate from `deploy/infra/certificate.yaml`.

### 4. Create its secrets in the cluster

Secrets are never committed. Create them once (`read -rs` keeps them out of
shell history):

```bash
read -rs DATABASE_URL
kubectl -n mappick create secret generic group-service-db \
  --from-literal=DATABASE_URL="$DATABASE_URL"
unset DATABASE_URL
```

### 5. Push to `main`

CI builds `ghcr.io/m7011e-cs2/group-service:<sha>`, writes the tag into the
values file, and Argo CD deploys it. Check with:

```bash
kubectl -n argocd get applications                 # group-service: Synced / Healthy
curl https://<domain>/api/groups/health
```

---

## Cluster / deploy commands

Nobody runs `kubectl apply` for services — Argo CD deploys what is in `main`.
These commands are for **looking** and for **secrets**.

```bash
# Status
kubectl -n argocd get applications                     # sync/health per service
kubectl -n mappick get pods                            # running pods
kubectl -n mappick describe pod <pod>                  # why is it not starting?

# Logs
kubectl -n mappick logs deploy/user-service            # current logs
kubectl -n mappick logs deploy/user-service -f         # follow
kubectl -n mappick logs deploy/user-service --previous # logs from the crashed container

# Reach a service without the ingress
kubectl -n mappick port-forward svc/user-service 8080:80
curl http://localhost:8080/health

# Restart (e.g. after changing a secret — env vars are only read at start)
kubectl -n mappick rollout restart deployment/user-service
kubectl -n mappick rollout status  deployment/user-service

# Secrets
kubectl -n mappick get secrets
kubectl -n mappick delete secret <name>                # then create it again
```

**Roll back** a deploy: revert the `deploy: image tag … [skip ci]` commit on
`main`. Argo CD will deploy the previous image.

Render the Helm chart locally to check a values file before pushing:

```bash
helm template user-service deploy/charts/nest-service \
  -f deploy/values/user-service.yaml
```

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `pnpm: command not found` or wrong version | `corepack enable` |
| CI fails on `pnpm install --frozen-lockfile` | Run `pnpm install` locally and commit `pnpm-lock.yaml` |
| Docker build: `"/apps/package.json": not found` | You forgot `--build-arg SERVICE=<name>` |
| `Cannot find module './x'` at runtime | ESM project: relative imports must end in `.js` (`import { X } from './x.js'`) |
| `EADDRINUSE: 3000` | Another service is running; start with `PORT=3001 ...` |
| Pod in `ImagePullBackOff` | The `ghcr-pull` secret is missing or the token expired |
| Pod in `CrashLoopBackOff` | `kubectl -n mappick logs deploy/<svc> --previous` — usually a missing env var / secret |
| Argo CD app `OutOfSync` | Check that `deploy/values/<svc>.yaml` is valid YAML and the image tag exists in GHCR |
