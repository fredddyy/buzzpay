FROM node:20-alpine AS base
RUN npm install -g pnpm tsx

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

# Expose port
EXPOSE 3000

# Run migrations + start API
CMD cd packages/db && npx prisma migrate deploy && cd /app && tsx apps/api/src/index.ts
