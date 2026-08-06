FROM node:20-slim AS base
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
RUN npm i -g pnpm@10.27.0
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/db/ packages/db/
COPY packages/shared/ packages/shared/
COPY apps/api/ apps/api/

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @buzzpay/db exec prisma generate
RUN pnpm --filter @buzzpay/api build

EXPOSE 3000
CMD ["sh", "-c", "pnpm --filter @buzzpay/db exec prisma migrate deploy && node apps/api/dist/index.js"]
