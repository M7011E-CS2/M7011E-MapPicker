# Build from the repo root so pnpm can see the lockfile and workspace packages:
#   docker build -f apps/user-service/Dockerfile -t mappick/user-service .

# ---------- 1. build: install all deps and compile TypeScript ----------
FROM node:24-alpine AS build
WORKDIR /repo
# pnpm version comes from "packageManager" in the root package.json
RUN corepack enable

# Copy manifests first so the dependency layer is cached between code changes
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages ./packages
COPY apps/user-service/package.json ./apps/user-service/
RUN pnpm install --frozen-lockfile --filter user-service...

COPY apps/user-service ./apps/user-service
RUN pnpm --filter user-service build

# Copy the service with production dependencies only into /out
RUN pnpm --filter user-service deploy --prod --legacy /out

# ---------- 2. runtime: small image, no dev deps, non-root ----------
FROM node:24-alpine AS runtime
ENV NODE_ENV=production \
    PORT=3000
WORKDIR /app

COPY --from=build --chown=node:node /out/package.json ./
COPY --from=build --chown=node:node /out/node_modules ./node_modules
COPY --from=build --chown=node:node /repo/apps/user-service/dist ./dist

# Built-in unprivileged user from the node image
USER node
EXPOSE 3000
CMD ["node", "dist/main.js"]
