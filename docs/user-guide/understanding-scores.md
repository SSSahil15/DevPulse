# Understanding the DevPulse Score

The **DevPulse Score** is a dynamic, unified indicator of your repository's overall engineering excellence, security posture, and lifecycle health. It ranges from **0 to 100**.

---

## The Scoring Algorithm

The score is calculated inside the AI service (`scanJob.service.js` and FastAPI components) using a weighted composition of three primary pillars:

```
DevPulse Score = (Security Posture * 0.40) + (Code Quality & Build * 0.30) + (Lifecycle Health * 0.30)
```

---

## 1. Security Posture (40% Weight)

This pillar evaluates dependency vulnerabilities, secrets leakage, and misconfigurations discovered by **Trivy**.

- **Deductions**:
  - Each **CRITICAL** vulnerability: **-15 points**
  - Each **HIGH** vulnerability: **-8 points**
  - Each **MEDIUM** vulnerability: **-3 points**
  - Each discovered **Exposed Secret**: **-40 points** (Forces critical warning)

---

## 2. Code Quality & Build Stability (30% Weight)

This pillar monitors test coverage metrics and pipeline build status:

- **Deductions**:
  - Failing unit tests or compilation failures: **-25 points**
  - Test coverage below the **70% quality gate**: **-1.5 points** per 1% deficit (e.g. 60% coverage results in -15 points deduction)
  - Missing Docker configurations or linting errors: **-5 points**

---

## 3. Lifecycle & Activity Health (30% Weight)

This pillar evaluates developer metrics pulled from the GitHub API:

- **Activity Penalties**:
  - No commit activity in last 14 days: **-10 points**
  - Low number of active contributors: **-5 points**
  - Outdated dependencies (detected during dependency check): **-5 points**

---

## Score Classification

| Score Range  | Tier          | Visual Theme    | Action Required                                       |
| ------------ | ------------- | --------------- | ----------------------------------------------------- |
| **90 - 100** | A (Excellent) | Vibrant Green   | Perfect. Keep dependencies updated.                   |
| **75 - 89**  | B (Healthy)   | Soft Yellow     | Safe. Plan minor vulnerability upgrades.              |
| **50 - 74**  | C (Warning)   | Orange Gradient | Caution. High CVEs require immediate attention.       |
| **0 - 49**   | F (Critical)  | Fiery Red       | Blocked! Deployment prohibited due to critical risks. |

---

> [!IMPORTANT]
> A score of **&lt;50** or the presence of any **CRITICAL** vulnerability automatically blocks the [Deployment Quality Gate](file:///Users/sssa15/DevPulse/docs/intro.md) during your CI/CD builds, preventing production deployment until resolved.
