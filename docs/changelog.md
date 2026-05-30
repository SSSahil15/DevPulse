# Changelog

All notable changes and enhancements to the DevPulse platform will be documented in this file.

---

## [v1.2.0] - 2026-05-18

### Added

- **Redis Caching Layer (Phase 7.2)**: Integrated a fail-safe Redis service. User repositories, metadata, and shared reports are cached (1-hour and 30-day TTLs) with automatic SHA-256 key hashing and seamless database fallbacks.
- **Unified CI/CD Matrix Pipeline (Phase 7.3)**: Merged separate tests into a unified parallel GitHub Actions workflow. Runs testing matrices across Node `18`, `20`, and `22`, uploads Vitest/Jest code coverage artifacts, and runs Playwright E2E suites.
- **Hierarchical Documentation Tree (Phase 7.4)**: Established a complete Markdown documentation suite under `docs/` detailing installation, guides, developer architectures, API specs, and compliance postures.

---

## [v1.1.0] - 2026-05-15

### Changed

- **PostgreSQL Database Migration (Phase 7.1)**: Swapped lightweight SQLite with production-grade PostgreSQL (`postgres:15-alpine`), mapping columns to high-performance `JSONB` structures and supporting secure raw async transactions.
- **Dashboard State Management (Phase 6)**: Created `DashboardContext` and `useDashboard` to manage UI telemetry state centrally.
- **Accessibility (a11y)**: Restructured frontend with semantic HTML (`<main>`, `<aside>`, `<nav>`) and correct ARIA tags.

---

## [v1.0.0] - 2026-05-01

### Added

- Initial Release of DevPulse Platform.
- GitHub OAuth integration.
- AI Copilot Socratic code suggestion drawer.
- Telemetry simulation terminals.
- Trivy vulnerability scanner integration.
