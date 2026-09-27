# syntax=docker/dockerfile:1.7
# ---------------------------------------------------------------
# قیمت — تصویر وب (Next.js standalone)
# ---------------------------------------------------------------

FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# ---------- نصب وابستگی‌ها ----------
FROM base AS deps
COPY package.json package-lock.json .npmrc ./
COPY packages/db/package.json       packages/db/
COPY packages/shared/package.json   packages/shared/
COPY apps/web/package.json          apps/web/
COPY apps/worker/package.json       apps/worker/
RUN npm ci --no-audit --no-fund

# ---------- ساخت ----------
FROM base AS builder
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# کلاینت Prisma باید پیش از بیلد ساخته شود تا تایپ‌ها موجود باشند
RUN npx prisma generate --schema packages/db/prisma/schema.prisma

# AUTH_SECRET فقط برای عبور از بررسی زمان بیلد است؛ مقدار واقعی در زمان اجرا می‌آید
RUN AUTH_SECRET=build-time-placeholder-value-not-used-in-runtime \
    npm run build --workspace=@qeymat/web

# ---------- اجرا ----------
FROM base AS runner
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    TZ=Asia/Tehran

RUN addgroup -g 1001 -S nodejs && adduser -u 1001 -S nextjs -G nodejs

# خروجی standalone سرور کمینه را با وابستگی‌های لازم می‌آورد
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static     ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public           ./apps/web/public

# schema و کلاینت برای اجرای migration در زمان استقرار
COPY --from=builder --chown=nextjs:nodejs /app/packages/db/prisma        ./packages/db/prisma
COPY --from=builder --chown=nextjs:nodejs /app/packages/db/generated     ./packages/db/generated

# فیش‌های واریزی؛ در compose یک volume دائمی روی این مسیر سوار می‌شود
RUN mkdir -p /app/uploads && chown nextjs:nodejs /app/uploads
ENV UPLOAD_DIR=/app/uploads

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=25s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/push/key').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "apps/web/server.js"]
