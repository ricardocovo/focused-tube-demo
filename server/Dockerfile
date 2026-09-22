# ── Stage 1: Build ────────────────────────────────────
FROM node:26-alpine AS builder

WORKDIR /app

# Copy workspace root files needed for install and build
COPY package.json package-lock.json tsconfig.base.json ./
COPY server/package.json server/

# Copy Prisma schema before install so the postinstall script can find it
COPY server/src/prisma server/src/prisma/

# Install all dependencies (including dev, needed for tsc + prisma generate)
RUN npm ci --workspace=server --include-workspace-root

# Copy server source
COPY server/ server/

# Generate Prisma client and compile TypeScript
RUN npx prisma generate --schema=server/src/prisma/schema.prisma
RUN npm run build --workspace=server

# ── Stage 2: Production runtime ──────────────────────
FROM node:26-alpine

WORKDIR /app

# Copy package files for production-only install
COPY package.json package-lock.json ./
COPY server/package.json server/

# Copy Prisma schema + migrations before install so the postinstall script can find it
COPY server/src/prisma server/src/prisma/

# Install production dependencies only (postinstall runs prisma generate)
RUN npm ci --workspace=server --include-workspace-root --omit=dev

# Copy compiled output from builder stage
COPY --from=builder /app/server/dist server/dist/

# Run as non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 3001

WORKDIR /app/server
CMD ["node", "dist/index.js"]
