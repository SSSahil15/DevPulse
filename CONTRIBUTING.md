# Contributing to DevPulse

First off, thank you for considering contributing to DevPulse! It's people like you that make DevPulse such a great tool.

This document provides guidelines and instructions for contributing to this project. Please read it carefully before submitting any changes.

## 1. Getting Started

### Forking and Cloning

1. **Fork** the repository on GitHub.
2. **Clone** your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/DevPulse.git
   cd DevPulse
   ```
3. **Add the upstream remote**:
   ```bash
   git remote add upstream https://github.com/SSSahil15/DevPulse.git
   ```

### Setting up the Development Environment

DevPulse consists of three main services: Frontend (Vite/React), Backend (Express.js), and AI Service (FastAPI).

1. **Frontend Setup**:

   ```bash
   cd frontend
   npm install
   npm run dev
   ```

2. **Backend Setup**:

   ```bash
   cd backend
   npm install
   # Create a .env file based on the config documentation
   npm run dev
   ```

3. **AI Service Setup**:
   ```bash
   cd ai
   python -m venv venv
   source venv/bin/activate # Windows: venv\Scripts\activate
   pip install -r requirements.txt
   uvicorn main:app --reload
   ```

### Verification

Ensure all three services are running. The frontend should be accessible at `http://localhost:5173`, the backend at `http://localhost:4000`, and the AI service at `http://localhost:8000`.

## 2. Development Workflow

### Branch Naming Convention

Please create a new branch for each feature or bug fix. Use the following convention:

- **Feature**: `feature/description` (e.g., `feature/add-pdf-reports`)
- **Bug Fix**: `bugfix/description` (e.g., `bugfix/login-redirect-loop`)
- **Documentation**: `docs/description` (e.g., `docs/update-readme`)

### Commit Message Format

We follow [Conventional Commits](https://www.conventionalcommits.org/). This leads to more readable messages that are easy to follow when looking through the project history.

- `feat:` new feature
- `fix:` bug fix
- `docs:` documentation updates
- `test:` test additions or updates
- `refactor:` code refactoring (no functional changes)
- `chore:` maintenance tasks, dependency updates

Example: `feat: add support for PDF report generation`

### Pull Request Process

1. Push your branch to your fork.
2. Open a Pull Request against the `main` branch of the `DevPulse` repository.
3. Fill out the PR template. Provide clear descriptions of the problem you are solving and how your changes address it.
4. Make sure all CI checks pass.
5. Expect a review within 48-72 hours.

## 3. Testing Requirements

We take quality seriously.

- **Backend Tests**: We aim for 70%+ coverage. Run backend tests with `cd backend && npm run test`.
- **Frontend Tests**: Run frontend component tests with `cd frontend && npm run test`.
- **Adding Tests**: Any new feature or bugfix should include corresponding tests.
- **E2E Tests**: Playwright is used for E2E testing. Run them from the root with `npx playwright test`.

## 4. Code Review Process

- Reviewers will look for code quality, adherence to style guidelines, and adequate test coverage.
- Please respond to feedback promptly. If you disagree with a comment, feel free to discuss it!
- Approval from at least one core maintainer is required.
- We typically use the "Squash and Merge" strategy to keep the commit history clean.

## 5. Documentation Standards

- **README updates**: Update the README if your changes affect how the project runs or behaves.
- **API Documentation**: If you modify the backend API, update the OpenAPI specification (`backend/docs/openapi.yaml`).
- **Inline Comments**: Use comments for complex logic. Avoid stating the obvious.

## 6. Security Considerations

- **No Secrets**: NEVER commit API keys, secrets, or passwords.
- **Dependencies**: Keep dependencies up to date and check for vulnerabilities (`npm audit`).
- **Security Reporting**: If you discover a security vulnerability, please do NOT open a public issue. Email the maintainers directly.

## 7. Community Guidelines

By participating in this project, you agree to abide by our Code of Conduct. Please be respectful, constructive, and welcoming to everyone.
For feature requests or bug reports, please use the provided issue templates on GitHub.

Thank you for contributing!
