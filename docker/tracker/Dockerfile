##
# Production Tracker image
#
# Aligned with API Dockerfile: multi-stage, pinned Node, lockfile, minimal runtime.
# Runs TypeScript via tsx (no pre-built JS).
##

FROM node:22-bookworm AS deps

RUN apt-get update \
  && apt-get install -y --no-install-recommends build-essential python3 \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app
ENV NODE_ENV=production

# Dependency install (cache-friendly)
COPY package.json yarn.lock ./
COPY packages/tracker/package.json ./packages/tracker/package.json
COPY packages/common/package.json ./packages/common/package.json
RUN yarn install --frozen-lockfile --production --non-interactive

FROM node:22-bookworm-slim AS runner

WORKDIR /usr/src/app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=80

COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY --from=deps /usr/src/app/package.json ./package.json

# Runtime source/config needed by the tracker
COPY config ./config
COPY packages/tracker ./packages/tracker
COPY packages/common ./packages/common
COPY mmdb ./mmdb

# GeoIP: mmdb/ in repo root; override with MMDB_FILE if needed

EXPOSE 80

CMD ["npx", "tsx", "packages/tracker/index.ts"]
