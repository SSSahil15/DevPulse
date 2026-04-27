# ─── DevPulse Backend ───────────────────────────────────
# Multi-stage production build for the Express API.
# Stage 1: Install deps in a clean environment.
# Stage 2: Copy only production artifacts (small image).
# ────────────────────────────────────────────────────────

FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests first (cache layer)
COPY package.json package-lock.json* ./

# Install only production dependencies
RUN npm ci --omit=dev --ignore-scripts

# Copy source code
COPY . .

# ─── Production stage ──────────────────────────────────
FROM node:20-alpine AS production

# Security: run as non-root
RUN addgroup -S devpulse && adduser -S devpulse -G devpulse

WORKDIR /app

# Copy from builder
COPY --from=builder --chown=devpulse:devpulse /app/node_modules ./node_modules
COPY --from=builder --chown=devpulse:devpulse /app/src ./src
COPY --from=builder --chown=devpulse:devpulse /app/package.json ./

# Create data directory for token store
RUN mkdir -p /app/.data && chown devpulse:devpulse /app/.data

# Runtime config
ENV NODE_ENV=production
ENV PORT=4000
EXPOSE 4000

USER devpulse

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/health || exit 1

CMD ["node", "src/server.js"]
