# DevPulse Deployment Checklist

## Render Backend Deployment Issues - Troubleshooting Guide

### ✅ Required Environment Variables (All MUST be set in Render)

These variables must be configured in your Render backend service settings:

#### Authentication & Security

- `GITHUB_CLIENT_ID` - Your GitHub OAuth App Client ID
- `GITHUB_CLIENT_SECRET` - Your GitHub OAuth App Client Secret
- `TOKEN_ENCRYPTION_SECRET` - **Must be 32+ characters** (use a strong random string)
- `JWT_SECRET` - **Must be 32+ characters** (use a strong random string)

#### URLs

- `BACKEND_URL` - Your Render backend URL (e.g., `https://devpulse-backend-xxxxx.onrender.com`)
- `FRONTEND_URL` - Your Vercel frontend URL (e.g., `https://devpulse.vercel.app`)
- `AI_SERVICE_URL` - Your Render AI service URL (e.g., `https://devpulse-ai-xxxxx.onrender.com`)

#### Database, Cache & Optional

- `GROQ_API_KEY` - For AI copilot features (optional but recommended)
- `DATABASE_URL` - Managed PostgreSQL connection string
- `REDIS_URL` - Redis connection string for cache/rate-limit sharing (optional but recommended)
- `NODE_ENV` - Should be `production`
- `PORT` - Should be `4000`

---

## Common Issues & Solutions

### Issue 1: `net::ERR_BLOCKED_BY_CLIENT`

**Cause**: Ad blocker or browser extension blocking requests
**Solution**: Disable ad blockers or try in incognito mode

### Issue 2: 404 Error on `/api/pipeline/simulate/status/undefined`

**Cause**: `jobId` is undefined - backend not returning it properly
**Check**:

1. Backend logs show `[Pipeline] Created jobId: job_xxxxx`?
2. Response includes `jobId` field?
3. Is `ensureGitHubTokenSynced` middleware passing (need valid GitHub token)?

### Issue 3: Backend Crashes on Startup

**Check these**:

1. All required environment variables are set
2. `TOKEN_ENCRYPTION_SECRET` is at least 32 characters
3. `JWT_SECRET` is at least 32 characters
4. `BACKEND_URL`, `FRONTEND_URL`, `AI_SERVICE_URL` are valid URLs
5. `DATABASE_URL` points to a reachable PostgreSQL instance

### Issue 4: GitHub OAuth Not Working

**Checklist**:

1. GitHub OAuth App callback URL matches deployment URL:
   - For Render: `https://your-backend.onrender.com/auth/github/callback`
   - For Local: `http://localhost:4000/auth/github/callback`
2. `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` are correct
3. OAuth App has "Authorization callback URL" configured in GitHub settings

### Issue 5: Cannot Access `/api/pipeline/simulate`

**Middleware chain**:

- `simulateLimiter` - Rate limiting
- `ensureAuthenticated` - Must have valid JWT
- `ensureGitHubTokenSynced` - Must have GitHub token stored

**Solutions**:

1. Ensure you're logged in (have valid JWT token)
2. Go to GitHub login first to sync token
3. Check backend logs for specific error

---

## Step-by-Step Deployment Setup

### 1. Create GitHub OAuth App

- Go to https://github.com/settings/developers
- Create "New OAuth App"
- Set "Authorization callback URL" to `https://your-backend.onrender.com/auth/github/callback`
- Copy `Client ID` and `Client Secret`

### 2. Generate Secrets

```bash
# Generate a random 32+ character secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Run this command twice - once for `TOKEN_ENCRYPTION_SECRET` and once for `JWT_SECRET`

### 3. Set Render Environment Variables

In your Render backend service dashboard:

1. Go to "Environment" tab
2. Add all variables from "Required Environment Variables" section above
3. Make sure `NODE_ENV=production`
4. Make sure `DATABASE_URL` points to the managed PostgreSQL instance

### 4. Verify Deployment

After deployment:

1. Open backend health check: `https://your-backend.onrender.com/health/live`
2. Check response includes:
   - `"status": "alive"`
3. Check backend logs for any startup errors

### 5. Test Authentication Flow

1. Visit frontend (Vercel URL)
2. Click "Sign in with GitHub"
3. Authorize the app
4. Should redirect to dashboard
5. Backend logs should show OAuth callback

### 6. Test CI/CD Simulation

1. Select a repository
2. Click "Simulate CI/CD"
3. Check browser console for API response
4. Backend logs should show `[Pipeline] Created jobId: job_xxxxx`

---

## Debugging Tips

### Check Backend Logs

1. Go to Render dashboard
2. Select your backend service
3. Click "Logs" tab
4. Look for:
   - `[Config] ✓ Environment loaded successfully`
   - `[DB] PostgreSQL database ready and migrated.`
   - `DevPulse backend listening on`
   - Any `❌` or `ERROR` messages

### Check Browser Console

1. Open DevTools (F12)
2. Go to "Console" tab
3. Look for API errors
4. Check "Network" tab to see full request/response

### Test API Directly

```bash
# Test health endpoint
curl https://your-backend.onrender.com/health/live

# Test GitHub OAuth (should redirect)
curl -i https://your-backend.onrender.com/auth/github
```

---

## Environment Variables Reference

```env
# Production Render Deployment
NODE_ENV=production
PORT=4000

# GitHub OAuth
GITHUB_CLIENT_ID=<your-github-client-id>
GITHUB_CLIENT_SECRET=<your-github-client-secret>

# Secrets (Generate fresh ones for each environment)
TOKEN_ENCRYPTION_SECRET=<generate-a-32-char-secret>
JWT_SECRET=<generate-a-32-char-secret>

# URLs (Update after first deploy)
BACKEND_URL=https://devpulse-backend-xxxxx.onrender.com
FRONTEND_URL=https://devpulse.vercel.app
AI_SERVICE_URL=https://devpulse-ai-xxxxx.onrender.com

# Database and cache
DATABASE_URL=postgresql://<user>:<password>@<host>:5432/<database>
REDIS_URL=redis://default:<password>@<host>:6379

# Optional
GROQ_API_KEY=<your-groq-api-key>
```

---

## Quick Deployment Command

After setting all environment variables in Render:

```bash
git push  # Render auto-deploys on push
```

Watch the logs in Render dashboard to confirm startup.
