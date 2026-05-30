# API Error Envelope

To ensure predictable handling and parsing by the React frontend, all REST errors thrown by the backend follow a strictly consistent JSON structure.

---

## 1. Error Response Format

Every failed API query returns a corresponding HTTP status code alongside a standard error envelope payload:

```json
{
  "message": "Detailed description explaining what went wrong.",
  "requestId": "req-a1b2c3d4"
}
```

Validation failures additionally include an `errors` array with `field` and `message` entries.

---

## 2. Standard Error Codes

Here are the standard error code classifications used across DevPulse:

| HTTP Status             | Error Code Tag             | Common Trigger Scenario                                                         |
| ----------------------- | -------------------------- | ------------------------------------------------------------------------------- |
| `400 Bad Request`       | `VALIDATION_ERROR`         | Missing or invalid parameters in request body (e.g. wrong sharing token format) |
| `401 Unauthorized`      | `UNAUTHORIZED`             | Missing, malformed, or expired JWT in HTTP Authorization header                 |
| `403 Forbidden`         | `INSUFFICIENT_PERMISSIONS` | Requesting access to a private repository not authorized by OAuth scopes        |
| `404 Not Found`         | `RESOURCE_NOT_FOUND`       | Repository metadata, simulation job, or report snapshot does not exist          |
| `429 Too Many Requests` | `RATE_LIMIT_EXCEEDED`      | Exceeded typical client query limits on authentication or scan trigger routes   |
| `500 Internal Server`   | `INTERNAL_SERVER_ERROR`    | Connection failures with PostgreSQL or unexpected server-side process errors    |

---

## 3. Client Remediations

- **`UNAUTHORIZED`**: Prompt the developer or operator to log out and re-trigger the GitHub OAuth flow to refresh their JWT.
- **`RATE_LIMIT_EXCEEDED`**: DevPulse rate-limits authentication endpoints. Wait 15 minutes before attempting repeated login attempts.
- **`RESOURCE_NOT_FOUND`**: If a shared report returns a 404, verify if the 30-day expiration window has elapsed.
