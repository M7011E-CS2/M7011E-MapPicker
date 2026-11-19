# Build from the repo root so pnpm can see the lockfile and workspace packages:
#   docker build -f apps/frontend/Dockerfile -t mappick/frontend .

# ---------- 1. build: compile the React app to static files ----------
FROM node:24-alpine AS build
WORKDIR /repo
RUN corepack enable

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages ./packages
COPY apps/frontend/package.json ./apps/frontend/
RUN pnpm install --frozen-lockfile --filter frontend...

COPY apps/frontend ./apps/frontend
RUN pnpm --filter frontend build

# ---------- 2. runtime: serve static files with nginx as non-root ----------
# Traefik (K3s ingress) handles routing, TLS and headers; nginx only serves files,
# using the image's default config.
FROM nginxinc/nginx-unprivileged:1.27-alpine AS runtime
COPY --from=build /repo/apps/frontend/dist /usr/share/nginx/html
# nginx-unprivileged listens on 8080 and runs as uid 101
EXPOSE 8080
