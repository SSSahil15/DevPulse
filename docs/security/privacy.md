# Data Privacy & Tokens Lifespan

We prioritize user privacy and data security. Below are the rules and system processes that DevPulse enforces to handle your data safely.

---

## 1. Repository Handling

- **No Remote Storage**: DevPulse clones your repository temporarily to execute standard Trivy static analysis scans. Your source files are stored inside secure, isolated sandbox directories.
- **Immediate Cleanup**: Once the scan job completes (or if the job terminates with an error), the background worker immediately executes local cleanup operations to wipe the cloned directory from the host system.
- **No Code Commits**: DevPulse operates in a strict read-only fashion. It never writes back, modifies branches, or pushes commits to your GitHub repositories.

---

## 2. Token Lifetime & Eviction

To minimize the impact of compromised session keys:
- **Short-Lived JWTs**: DevPulse session JWTs are signed with a strict **7-day expiration window**.
- **Instant Eviction on Logout**: When a user logs out or deletes their account:
  1. The backend deletes the encrypted GitHub OAuth token from PostgreSQL.
  2. The service hashes the user session keys and immediately purges all cached repository lists (`user:repos:${tokenHash}`) from Redis.
- **Revoking OAuth Access**: Users can revoke the DevPulse integration instantly from their GitHub Developer Settings at any time.

---

> [!TIP]
> Periodically audit your authorized OAuth applications on GitHub to ensure only active, trusted integrations maintain access to your repositories.
