# The Dashboard Interface

The DevPulse Dashboard is designed to serve as a high-fidelity command center for your engineering and operations teams.

---

## Layout Sections

The dashboard is structured into three clean semantic layout areas:

### 1. Navigation Sidebar

- **Repositories Feed**: Chronological list of your connected GitHub repositories.
- **Repository Metadata**: Real-time branch switcher, repository star counts, and last synchronization timestamps.

### 2. Main Analytics Body

- **Score Widget**: Glassmorphic radial gauge representing your repository's latest **DevPulse Score**.
- **Historical Chart**: Dynamic area line-chart (powered by Recharts) showing your score progression across your last 10 simulated commits or pipeline scans.
- **Vulnerabilities Widget**: Real-time tabular catalog of scanned package vulnerabilities, including package names, CVE IDs, installed/fixed versions, and severity tags.

### 3. Pipeline Telemetry Terminal

- Standard ANSI-colored terminal emulator rendering raw execution telemetry directly from the background worker. Shows live logs for `git clone`, `dependency auditing`, and `trivy security scans`.

---

## Managing Dashboard State

The React frontend utilizes a central `DashboardContext` and custom `useDashboard` hook to prevent performance regressions:

- State transitions are isolated to avoid full page re-renders.
- AI conversation and logs states are automatically refreshed upon selecting a new repository from the sidebar.

> [!TIP]
> Ensure your browser zoom is at 100% and dark mode is enabled to experience the premium glassmorphic UI aesthetics in their intended beauty!
