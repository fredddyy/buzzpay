FROM node:20-alpine AS base
RUN npm install -g pnpm

WORKDIR /app

# Copy workspace root files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./

# Copy packages
COPY packages/shared ./packages/shared
COPY packages/db ./packages/db

# Copy api
COPY apps/api ./apps/api

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Generate Prisma client
RUN cd packages/db && npx prisma generate

# Build shared package
RUN cd packages/shared && pnpm build || true

# Expose port
EXPOSE 3000

# Start API
CMD ["npx", "tsx", "apps/api/src/index.ts"]
