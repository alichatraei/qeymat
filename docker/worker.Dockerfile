# syntax=docker/dockerfile:1.7
# ---------------------------------------------------------------
# قیمت — تصویر کرالر (زمان‌بند و آداپتورهای منابع نرخ)
# ---------------------------------------------------------------

FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json .npmrc ./
COPY packages/db/package.json       packages/db/
COPY packages/shared/package.json   packages/shared/
COPY apps/web/package.json          apps/web/
COPY apps/worker/package.json       apps/worker/
RUN npm ci --no-audit --no-fund --omit=dev

FROM base AS runner
ENV NODE_ENV=production \
    TZ=Asia/Tehran

RUN addgroup -g 1001 -S nodejs && adduser -u 1001 -S worker -G nodejs

COPY --from=deps --chown=worker:nodejs /app/node_modules ./node_modules
COPY --chown=worker:nodejs packages     ./packages
COPY --chown=worker:nodejs apps/worker  ./apps/worker

RUN npx prisma generate --schema packages/db/prisma/schema.prisma \
 && chown -R worker:nodejs packages/db/generated

USER worker
EXPOSE 4001

HEALTHCHECK --interval=60s --timeout=8s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:4001/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "apps/worker/src/index.js"]
