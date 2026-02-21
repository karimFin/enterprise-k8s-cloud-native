# ============================================================================
# Stage 1: Build the React app
# ============================================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Install deps first (layer caching — deps change less often than code)
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .

# VITE_API_URL is baked in at build time.
# For K8s, the frontend calls /api/* which nginx proxies to the backend Service.
ARG VITE_API_URL=""
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# ============================================================================
# Stage 2: Serve with nginx
# ============================================================================
FROM nginx:1.25-alpine AS runtime

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy our nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Security: run as non-root
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid

USER nginx

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget -qO- http://localhost:8080/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
