# DevPulse API Quick Start Guide

This document provides a quick overview of interacting with the DevPulse backend API.

## Interactive Documentation
For full, interactive documentation, start the backend server and navigate to:
**[http://localhost:4000/api-docs](http://localhost:4000/api-docs)**

The interactive Swagger UI allows you to test endpoints directly from your browser.

## Authentication Flow
DevPulse uses GitHub OAuth. The frontend directs the user to `/auth/github`. Upon successful authorization, GitHub redirects to `/auth/github/callback`, which issues a custom DevPulse JWT.

This JWT must be sent in the `Authorization` header as a Bearer token for all protected routes.

Example:
```bash
curl -X GET http://localhost:4000/auth/me \
  -H "Authorization: Bearer YOUR_DEVPULSE_JWT"
```

## Key Endpoints
1. **User Info**: `GET /auth/me`
2. **Repositories**: `GET /repos`
3. **Analyze**: `POST /analyze`
4. **Historical Scores**: `GET /api/pipeline/score/:repoFullName/history`
5. **AI Chat**: `POST /api/ai/chat`

## Error Handling
All APIs use standard HTTP status codes. Errors will generally return a JSON payload in this format:
```json
{
  "message": "Human readable error message.",
  "details": "Optional technical details."
}
```
