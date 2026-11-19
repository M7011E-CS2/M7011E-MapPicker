# Deployment

MapPick is deployed with GitOps: **git is the source of truth for what runs in
the cluster**. Nobody runs `kubectl apply` for services; Argo CD applies what is
in `main`.

## How the pipeline works

```
push to main
  └─ GitHub Actions (.github/workflows/build.yml)
       1. build   – for each service: docker build --build-arg SERVICE=<name> .
                    push ghcr.io/m7011e-cs2/<name>:<commit-sha>
       2. bump    – write <commit-sha> into deploy/values/<name>.yaml
                    commit "deploy: image tag <sha> [skip ci]" to main
  └─ Argo CD (watches main)
       sees the changed values file → renders deploy/charts/nest-service
       → rolling update in namespace "mappick"
```

| Path | Purpose |
|---|---|
| `Dockerfile` | One multi-stage image recipe for every Nest service (`SERVICE` build arg) |
| `deploy/charts/nest-service/` | One generic Helm chart: Deployment, Service, Ingress (+ Traefik strip-prefix Middleware) |
| `deploy/values/<service>.yaml` | What is different per service (image, path, env, secrets) |
| `deploy/argocd/root-app.yaml` | App-of-apps; the only thing applied by hand |
| `deploy/argocd/apps/<service>.yaml` | One Argo CD Application per service |

**Why the bump commit does not start a new build (no loop):**
1. The workflow ignores pushes that only touch `deploy/values/**` (`paths-ignore`).
2. The commit message contains `[skip ci]`.
3. Commits pushed with the default `GITHUB_TOKEN` never trigger workflows.

**Why tag = commit SHA:** every image is immutable and traceable to the exact
code it was built from. Rolling back = reverting the bump commit in git.

**Routing:** Traefik receives `https://<domain>/api/users/...`, removes the
`/api/users` prefix (Middleware) and forwards to the `user-service` Service.
The app itself serves `/health`, `/...` with no prefix. cert-manager issues the
TLS certificate through the `letsencrypt-prod` ClusterIssuer.

## Secrets that must be created by hand

Secrets are **never** stored in git. Create them once, in this order. `read -rs`
keeps the values out of your shell history.

```bash
# 0. Namespace (Argo CD would also create it, but secrets must exist first)
kubectl create namespace mappick

# 1. Database connection for user-service
read -rs DATABASE_URL   # paste e.g. postgres://user_service:<password>@<host>:5432/user_service
kubectl -n mappick create secret generic user-service-db \
  --from-literal=DATABASE_URL="$DATABASE_URL"
unset DATABASE_URL

# 2. Pull secret for GHCR (only needed while the packages are private).
#    Token: GitHub → Settings → Developer settings → PAT (classic) with only read:packages
read -rs GHCR_TOKEN
kubectl -n mappick create secret docker-registry ghcr-pull \
  --docker-server=ghcr.io \
  --docker-username=<your-github-username> \
  --docker-password="$GHCR_TOKEN"
unset GHCR_TOKEN

# 3. Repo access for Argo CD (only if the GitHub repo is private).
#    Token: fine-grained PAT, this repo only, Contents: read-only
read -rs REPO_TOKEN
kubectl -n argocd create secret generic mappick-repo \
  --from-literal=type=git \
  --from-literal=url=https://github.com/M7011E-CS2/M7011E-MapPicker.git \
  --from-literal=username=<your-github-username> \
  --from-literal=password="$REPO_TOKEN"
kubectl -n argocd label secret mappick-repo argocd.argoproj.io/secret-type=repository
unset REPO_TOKEN
```

To change a secret: `kubectl -n mappick delete secret <name>`, create it again,
then `kubectl -n mappick rollout restart deployment/<service>` (pods only read
env vars at start).

## Starting Argo CD (once)

```bash
kubectl apply -n argocd -f deploy/argocd/root-app.yaml
```

Then check: `kubectl -n argocd get applications` → `user-service` should be
`Synced` / `Healthy`.

## Adding a new service

Example: `group-service` at `/api/groups`.

1. The service must build to `dist/main.js`, read `PORT`, and expose `GET /health`.
2. Add `"group-service"` to `SERVICES` in `.github/workflows/build.yml`.
3. Copy `deploy/values/user-service.yaml` to `deploy/values/group-service.yaml`;
   change `image.repository`, `ingress.path`, `secretEnv`. Keep the file
   free of blank lines (the bump step rewrites it with `yq`).
4. Copy `deploy/argocd/apps/user-service.yaml` to `group-service.yaml`; change
   `metadata.name`, `releaseName` and the values file path.
5. Create the service's secrets in namespace `mappick` (see above).
6. Push to main. CI builds the image and bumps the tag, the root app picks up
   the new Application, and Argo CD deploys it.

> **Let's Encrypt limit:** each service's Ingress gets its own certificate for
> the same domain, and Let's Encrypt allows max 5 identical certificates per
> week. When adding many services at once, set the same
> `ingress.tls.secretName` (e.g. `mappick-tls`) in every values file and
> `ingress.tls.clusterIssuer: ""` in all but one of them.
