# API Authentication

DevPulse implements a double-layered security authentication layout using **GitHub OAuth** and custom **JSON Web Tokens (JWT)**.

---

## 1. Authentication Topology

1. The client initiates authentication by redirecting to `/auth/github`.
2. The user consents on GitHub, which redirects back to `/auth/github/callback` with a temporal authorization code.
3. DevPulse exchanges the code for a GitHub Access Token, saves it securely in PostgreSQL (encrypted with AES-256-GCM), and signs a stateless DevPulse JWT.
4. The client receives the JWT and stores it in secure storage.
5. All subsequent requests to secure `/api/*` routes must include the token in the HTTP Authorization header:
   ```text
   Authorization: Bearer <your_devpulse_jwt>
   ```

---

## 2. GitHub Scopes Requested

DevPulse requests a minimal set of OAuth scopes required to perform health analyses:

| Scope | Purpose |
|-------|---------|
| `repo` | Full control of private/public repositories (needed to clone and execute Trivy fs scans) |
| `read:user` | Read user profile data (needed to synchronize names and avatars) |
| `user:email` | Read primary email address (needed for email status alerts) |

---

## 3. JWT Payloads

A typical signed DevPulse JWT payload contains the following metadata:

```json
{
  "sub": "12345678",
  "username": "sahil_developer",
  "displayName": "Sahil Developer",
  "avatarUrl": "https://avatars.githubusercontent.com/u/123",
  "profileUrl": "https://github.com/sahil_developer",
  "iat": 1600000000,
  "exp": 1600086400
}
```

- **Algorithm**: `HS256`
- **Validity**: **7 days** (Requires re-authentication upon expiration)
- **Signature Secret**: Managed via the `JWT_SECRET` environment variable.
