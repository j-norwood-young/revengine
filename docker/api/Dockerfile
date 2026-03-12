##
# Production API image
#
# Notes:
# - Uses Yarn v1 workspaces, so we install at repo root.
# - Multi-stage keeps build tooling out of the final runtime image.
##

FROM node:22-bookworm AS deps

RUN apt-get update \
  && apt-get install -y --no-install-recommends build-essential python3 \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app
ENV NODE_ENV=production

# Dependency install (cache-friendly)
COPY package.json yarn.lock ./
COPY packages/api/package.json ./packages/api/package.json
COPY packages/common/package.json ./packages/common/package.json
RUN yarn install --frozen-lockfile --production --non-interactive

FROM node:22-bookworm-slim AS runner

WORKDIR /usr/src/app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4001

COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY --from=deps /usr/src/app/package.json ./package.json

# Runtime source/config needed by the API
COPY config ./config
COPY packages/api ./packages/api
COPY packages/common ./packages/common

EXPOSE 4001

CMD ["node", "--max-old-space-size=6144", "packages/api/bin/server.js"]