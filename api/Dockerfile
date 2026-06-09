# ---- Build stage ----
FROM node:22-alpine AS builder
WORKDIR /app

# Install dependencies (cache-friendly).
COPY package.json package-lock.json* ./
RUN npm install

# Copy source and generate Prisma client, then build.
COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig*.json nest-cli.json ./
COPY src ./src
RUN npm run build

# Prune dev dependencies for a slim runtime.
RUN npm prune --omit=dev

# ---- Runtime stage ----
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json

EXPOSE 4000

# Apply migrations, then start the compiled server.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
