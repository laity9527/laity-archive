# 文件：Dockerfile
# 描述：生产镜像多阶段构建（deps → builder → runner），run 阶段只带 Next.js standalone 产物；另出 migrator 目标跑数据库迁移
# 作者：张磊
# 创建日期：2026-10-30
# 说明：对应 DESIGN.md D6。基础镜像用 Debian slim 而非 alpine——Prisma 查询引擎在 musl 上要额外处理 openssl，slim 直接带 openssl 3
# 修改记录：
# - 2026-10-30: 初始创建（Phase 6 环境准备）
# - 2026-10-30: 补 apt install openssl——node:24-slim 只有 libssl3 没有 openssl 可执行文件，Prisma 探测版本时会退回 openssl-1.1.x 并告警

ARG BASE_IMAGE=node:24-slim

# ---- deps：只装依赖，好让下面几层在 package.json 不变时命中缓存 ----
FROM ${BASE_IMAGE} AS deps
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
# 内网/墙内可 --build-arg NPM_REGISTRY=https://<镜像源> 覆盖；默认走官方源
ARG NPM_REGISTRY=""
RUN if [ -n "$NPM_REGISTRY" ]; then npm config set registry "$NPM_REGISTRY"; fi \
 && npm ci --no-audit --no-fund

# ---- builder：生成 Prisma 客户端（决定引擎二进制）再构建 ----
FROM deps AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY prisma ./prisma
COPY tsconfig.json next.config.ts package.json package-lock.json ./
COPY src ./src
COPY public ./public
RUN npx prisma generate && npm run build

# ---- runner：只带运行期需要的文件，非 root 用户 ----
FROM ${BASE_IMAGE} AS runner
# 运行期同样要 openssl：Prisma 引擎在启动时二次探测版本
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# standalone 不含 public 与 .next/static（Next 文档明确要手工拷），这里在镜像里补齐
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# node 镜像自带的非 root 用户
USER node
EXPOSE 3000
CMD ["node", "server.js"]

# ---- migrator：一次性任务镜像，跑 npx prisma migrate deploy ----
FROM deps AS migrator
WORKDIR /app
COPY prisma ./prisma
COPY package.json package-lock.json ./
ENTRYPOINT ["npx", "prisma"]
CMD ["migrate", "deploy"]
