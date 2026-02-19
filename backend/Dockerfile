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
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:8080/health || exit 1

# Use tini as entrypoint for proper signal handling
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "src/server.js"]
