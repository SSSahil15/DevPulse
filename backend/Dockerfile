# ─── DevPulse Backend ───────────────────────────────────
# Multi-stage production build for the Express API.
# Stage 1: Install deps in a clean environment.
# Stage 2: Copy only production artifacts (small image).
# ────────────────────────────────────────────────────────

FROM node:20-alpine AS builder

WORKDIR /app

# Native dependencies may need build tools during npm ci.
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

ARG TRIVY_VERSION=0.70.0

# git is required for repository cloning; Trivy performs the vulnerability scan.
# Install basic tools first
RUN apk add --no-cache ca-certificates git libstdc++ tar wget curl

# Install Trivy (stable for Docker/CI): use the official install script
RUN set -eux; \
  apk add --no-cache --virtual .trivy-deps ca-certificates wget tar; \
  wget -O /tmp/install-trivy.sh "https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh"; \
  echo "[Trivy] install.sh downloaded (first 5 lines):"; \
  head -n 5 /tmp/install-trivy.sh || true; \
  chmod +x /tmp/install-trivy.sh; \
  # install.sh usage: [-b] bindir [-c] client [-d] [-x] [tag]
  # Provide TRIVY_VERSION as the tag (e.g., v0.70.0). No '--version' flag.
  sh -x /tmp/install-trivy.sh -b /usr/local/bin "v${TRIVY_VERSION}"; \
  test -x /usr/local/bin/trivy; \
  /usr/local/bin/trivy --version; \
  apk del .trivy-deps; \
  rm -f /tmp/install-trivy.sh


WORKDIR /app

# Copy from builder
COPY --from=builder --chown=devpulse:devpulse /app/node_modules ./node_modules
COPY --from=builder --chown=devpulse:devpulse /app/src ./src
COPY --from=builder --chown=devpulse:devpulse /app/package.json ./

# Create writable runtime directories for Trivy cache, scan clones, and logs.
RUN mkdir -p /app/.data /app/.temp_scans /app/logs /home/devpulse/.cache && \
  chown -R devpulse:devpulse /app/.data /app/.temp_scans /app/logs /home/devpulse/.cache

# Runtime config
ENV NODE_ENV=production
ENV PORT=4000
EXPOSE 4000

USER devpulse

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/health/live || exit 1

CMD ["node", "src/server.js"]
