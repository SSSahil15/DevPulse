# Analyzing Repositories

DevPulse allows both manual trigger analyses and live interactive **CI/CD Simulations** to mimic developers committing code or pushing vulnerabilities.

---

## 1. Triggering a Basic Scan

1. From the repository details view, click the **Synchronize** button in the header.
2. DevPulse will call the GitHub API (utilizing the cached user session in Redis) to fetch the latest metadata, commit history, and contributors.
3. This performs a fast, non-cloning metadata health analysis.

---

## 2. Interactive CI/CD Simulations

To test how DevPulse scores adapt to real-world code quality changes, you can use the **Pipeline Simulator**:

### Simulation Presets

| Preset Name               | Simulated Vulnerability                   | Score Impact   | Purpose                                               |
| ------------------------- | ----------------------------------------- | -------------- | ----------------------------------------------------- |
| **Standard PR Commit**    | Clean build, passing unit tests           | **+5 to +10**  | Simulates a healthy pull request check                |
| **Vulnerable Dependency** | Introduces high-severity npm packages     | **-20 to -35** | Simulates a developer installing compromised packages |
| **Exposed Secret**        | Injects mock AWS API keys into repository | **-40 to -50** | Simulates pushing sensitive credentials in plain text |
| **Broken CI Build**       | Failing pipeline checks                   | **-15 to -20** | Simulates build failures                              |

### Triggering the Simulation

1. Click the **Pipeline Simulator** button.
2. Select your desired preset.
3. Click **Simulate**. The pipeline job is queued in our Postgres-backed queue.
4. The terminal panel will automatically boot up, rendering step-by-step processing details in real time.
5. Once complete, the central dashboard will automatically flash, load the new metrics, and update the Recharts progress timeline.

---

> [!NOTE]
> When a new simulation is triggered, DevPulse immediately invalidates the corresponding Redis cache keys (`repo:${repoName}`) to guarantee that all subsequent screen renders show fresh metrics.
