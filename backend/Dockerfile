# ─── DevPulse Backend ───────────────────────────────────
# Multi-stage production build for the Express API.
# Stage 1: Install deps in a clean environment.
# Stage 2: Copy only production artifacts (small image).
# ────────────────────────────────────────────────────────

FROM node:20-alpine AS builder

WORKDIR /app

# Native dependencies such as better-sqlite3 need build tools during npm ci.
RUN apk add --no-cache python3 make g++

# Copy dependency manifests first (cache layer)
COPY package.json package-lock.json* ./

# Install only production dependencies
RUN npm ci --omit=dev

# Copy source code
COPY . .

# ─── Production stage ──────────────────────────────────
FROM node:20-alpine AS production

# Security: run as non-root
RUN addgroup -S devpulse && adduser -S devpulse -G devpulse

ARG TRIVY_VERSION=0.64.1

# git is required for repository cloning; Trivy performs the vulnerability scan.
RUN apk add --no-cache ca-certificates git libstdc++ tar wget && \
  wget -qO /tmp/trivy.tar.gz "https://github.com/aquasecurity/trivy/releases/download/v${TRIVY_VERSION}/trivy_${TRIVY_VERSION}_Linux-64bit.tar.gz" && \
  tar -xzf /tmp/trivy.tar.gz -C /usr/local/bin trivy && \
  chmod +x /usr/local/bin/trivy && \
  rm /tmp/trivy.tar.gz

WORKDIR /app

# Copy from builder
COPY --from=builder --chown=devpulse:devpulse /app/node_modules ./node_modules
COPY --from=builder --chown=devpulse:devpulse /app/src ./src
COPY --from=builder --chown=devpulse:devpulse /app/package.json ./

# Create writable runtime directories for SQLite, Trivy cache, and scan clones.
RUN mkdir -p /app/.data /app/.temp_scans /home/devpulse/.cache && \
  chown -R devpulse:devpulse /app/.data /app/.temp_scans /home/devpulse/.cache

# Runtime config
ENV NODE_ENV=production
ENV PORT=4000
EXPOSE 4000

USER devpulse

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/health || exit 1

CMD ["node", "src/server.js"]
