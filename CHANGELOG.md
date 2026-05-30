# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Interactive API Documentation powered by Swagger UI available at `/api-docs`.
- Comprehensive OpenAPI 3.0 specifications for backend endpoints.
- Extensive test coverage including Jest (backend), Vitest & MSW (frontend), and Playwright (E2E).
- CI/CD integration with GitHub Actions for automated unit and E2E testing on Pull Requests and merges.
- Comprehensive `CONTRIBUTING.md` and `TROUBLESHOOTING.md` guides.
- New architecture documentation providing deep dives into system components and data flow.

### Changed

- Dashboard UI overhaul replacing basic styles with a premium glassmorphic SaaS design.
- Recharts visualizations upgraded with subtle glowing graph lines, smooth gradients, and depth.
- AI Copilot interface upgraded with micro-animations and holographic scanning effects.
- Unified environment variable management utilizing Zod for strict backend configuration validation.

### Fixed

- Stabilized database connections for SQLite testing environment.
- Resolved MSW unhandled request warnings during frontend testing execution.

## [1.0.0] - 2026-05-15

### Added

- Initial release of the DevPulse platform.
- GitHub OAuth Authentication flow.
- Core React dashboard layout (sidebar, header, analysis panels).
- AI Copilot integration utilizing the Groq API.
- Initial backend setup with Express.js and an SQLite database.
- Production deployment configuration via Render (backend/AI) and Vercel (frontend).
