# Code Style & Quality Standards

Maintaining exceptional code readability and architectural cleanliness is critical to scaling the DevPulse platform.

---

## 1. Quality Rules

All JavaScript and React contributions must satisfy these critical code styles:

### Semantic Elements & Accessibility (a11y)

- **Rule**: React pages must use semantic structural HTML elements (`<main>`, `<aside>`, `<nav>`) rather than nested generic `<div />` blocks.
- **Rule**: All interactive icons, links, and buttons must be declared with descriptive `aria-label` tags, correct `aria-current` flags, and strict `tabIndex` parameters to ensure optimal keyboard-navigation.

### Asynchronous Operations

- **Rule**: Standard database queries are asynchronous. Express route handlers must be wrapped in an `asyncHandler` wrapper block to catch any unhandled promise rejections cleanly.
- **Rule**: Always clean up system resources (cloned folders, temporary streams) inside a `finally` code block.

---

## 2. Naming Conventions

### File Naming

- **React Components**: PascalCase (e.g. `DashboardPage.jsx`, `AnalysisPanel.jsx`).
- **Services & Controllers**: camelCase with descriptive suffixes (e.g. `redis.service.js`, `pipeline.controller.js`).

### SQL / DB Schemas

- Table names must be in CamelCase or lower_snake_case.
- Keep raw SQL keywords uppercase (e.g. `SELECT`, `INSERT`, `FROM`, `WHERE`) to keep SQL blocks highly legible.

---

## 3. Automated Linting

DevPulse incorporates `eslint-plugin-jsx-a11y` within its frontend configurations.

- **Check Style**: Run the compiler or linter prior to making any commits:
  ```bash
  cd frontend && npm run build
  ```
  _Any accessibility warnings or structural errors will block compilation and fail the GitHub quality gate._
