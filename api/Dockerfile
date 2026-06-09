# ---- Build stage ----
FROM node:22-alpine AS builder
WORKDIR /app

# Prisma engines need OpenSSL (not bundled in alpine).
RUN apk add --no-cache openssl

# Install dependencies (cache-friendly).
COPY package.json package-lock.json* ./
RUN npm install

# Copy source and generate Prisma client, then build.
COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig*.json nest-cli.json ./
COPY src ./src
RUN npm run build

# Compile the Prisma seed to plain JS so the runtime can run it with node (no ts-node).
RUN npx tsc prisma/seed.ts --outDir dist-seed --module commonjs --target ES2021 \
    --esModuleInterop --skipLibCheck --moduleResolution node

# Prune dev dependencies for a slim runtime.
RUN npm prune --omit=dev

# ---- Runtime stage ----
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Prisma migrate/query engines need OpenSSL at runtime.
RUN apk add --no-cache openssl

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/dist-seed ./dist-seed
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json

EXPOSE 4000

# Apply migrations, seed (idempotent upsert), then start the compiled server.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist-seed/seed.js && node dist/main.js"]
