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

ARG TRIVY_VERSION=0.70.0

# git is required for repository cloning; Trivy performs the vulnerability scan.
# Install basic tools first
RUN apk add --no-cache ca-certificates git libstdc++ tar wget curl

# Install Trivy (robust): resolve the correct asset filename via GitHub releases API
RUN set -eux; \
  apk add --no-cache --virtual .trivy-deps jq; \
  release_json="$(wget -qO- "https://api.github.com/repos/aquasecurity/trivy/releases/tags/v${TRIVY_VERSION}" -U "Docker" )"; \
  echo "[Trivy] Release API response size: $(printf "%s" "$release_json" | wc -c)"; \
  asset_url="$(printf "%s" "$release_json" | jq -r '.assets[]? | select(.name|test("Linux-64bit")) | .browser_download_url' | head -n 1)"; \
  echo "[Trivy] Resolved asset url: $asset_url"; \
  if [ -z "$asset_url" ] || [ "$asset_url" = "null" ]; then echo "Trivy asset not found for v${TRIVY_VERSION}. Assets: $(printf "%s" "$release_json" | jq -r '.assets[].name' 2>/dev/null || true)" >&2; exit 2; fi; \
  wget -qO /tmp/trivy.tar.gz "$asset_url"; \

  tar -xzf /tmp/trivy.tar.gz -C /usr/local/bin trivy; \
  chmod +x /usr/local/bin/trivy; \
  rm -f /tmp/trivy.tar.gz; \
  trivy --version; \
  apk del .trivy-deps


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
