# ============================================================================
# Stage 1: Install dependencies
# ============================================================================
FROM node:20-alpine AS deps

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# ============================================================================
# Stage 2: Test (used in CI — `docker build --target test`)
# ============================================================================
FROM node:20-alpine AS test

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm test

FROM node:20-alpine AS dev

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ENV NODE_ENV=development
ENV PORT=8080
EXPOSE 8080

# ============================================================================
# Stage 3: Production runtime
# ============================================================================
FROM node:20-alpine AS runtime

# Security: create non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Add tini for proper PID 1 signal handling (important for K8s SIGTERM)
RUN apk add --no-cache tini

WORKDIR /app

# Copy production dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy application code
COPY src/ ./src/
COPY package.json ./

# Set environment
ENV NODE_ENV=production
ENV PORT=8080

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 8080

# Health check for Docker (K8s uses its own probes, but this helps locally)
HEALTHCHECK --interval=10s --timeout=5s --start-period=15s --retries=5 \
  CMD wget -qO- http://127.0.0.1:8080/health || exit 1

# Use tini as entrypoint for proper signal handling
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "src/server.js"]
