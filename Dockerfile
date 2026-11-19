# syntax=docker/dockerfile:1
#
# One Dockerfile for every NestJS service in apps/.
# Build from the repo root:
#   docker build --build-arg SERVICE=user-service -t user-service .
#
# Stage 1 (build) has the full toolchain and dev dependencies.
# Stage 2 (runtime) only gets compiled JS + production node_modules.

ARG NODE_IMAGE=node:22-alpine

# ---------------------------------------------------------------- build ----
FROM ${NODE_IMAGE} AS build
# Required. If it is missing the build fails at the COPY below with
# '"/apps/package.json": not found'.
ARG SERVICE

WORKDIR /repo
# Installs the pnpm version pinned in package.json "packageManager"
RUN corepack enable

# 1) Dependency manifests first: this layer is cached until the lockfile or a
#    package.json changes, so code-only changes skip the slow install.
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages ./packages
COPY apps/${SERVICE}/package.json ./apps/${SERVICE}/package.json

# "<service>..." = the service AND every workspace package it depends on
RUN pnpm install --frozen-lockfile --filter "${SERVICE}..."

# 2) Source code, then build. The same filter builds shared @mappick/*
#    packages first (pnpm runs them in dependency order), so their dist/
#    exists before the service compiles against it.
COPY apps/${SERVICE} ./apps/${SERVICE}
RUN pnpm --filter "${SERVICE}..." run build

# 3) Copy the service + production deps only into /out. Workspace packages
#    are copied in as real folders (not symlinks), so they work at runtime.
#    --legacy: the workspace does not enable inject-workspace-packages.
RUN pnpm --filter "${SERVICE}" deploy --prod --legacy /out

# -------------------------------------------------------------- runtime ----
FROM ${NODE_IMAGE} AS runtime
ARG SERVICE
ENV NODE_ENV=production \
    PORT=3000
WORKDIR /app

# Files stay owned by root and are only readable by the app user, so a
# compromised process cannot modify its own code.
COPY --from=build /out/package.json ./package.json
COPY --from=build /out/node_modules ./node_modules
COPY --from=build /repo/apps/${SERVICE}/dist ./dist

# "node" (uid 1000) is the unprivileged user that ships with the image
USER node
EXPOSE 3000
CMD ["node", "dist/main.js"]
