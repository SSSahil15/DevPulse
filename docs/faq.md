# Frequently Asked Questions (FAQ)

Find answers to common questions about the DevPulse DevSecOps platform below.

---

## 1. General Questions

### What is DevPulse?
DevPulse is a high-fidelity DevSecOps dashboard that automates code analysis, dependency audits, security scanning via Trivy, and dynamic ML-driven scoring, featuring an interactive AI Copilot to guide vulnerability remediation.

### Is DevPulse free to use?
Yes! DevPulse is fully open-source and designed to run easily using lightweight Docker containers.

---

## 2. Security & Data Privacy

### Does DevPulse store my GitHub access tokens in plain text?
**No.** All user and organization access tokens are encrypted with `AES-256-GCM` at the storage layer prior to writing to PostgreSQL. Decryption occurs only at the service layer, isolated from direct database queries.

### Will DevPulse ever push code or write to my repository?
**Never.** DevPulse requires read-only scopes (`repo`, `read:user`) to clone, scan dependencies, and retrieve metadata. It never modifies, creates, or writes back commits to your repositories.

---

## 3. Caching & Caches Invalidation

### Why are my scoring dashboards loaded instantly?
We incorporate an enterprise-grade **Redis Caching** layer. All expensive GitHub API listings, repository details, and static shared reports are cached. 

### How do I get fresh simulation metrics?
When you click **Trigger Simulation**, DevPulse automatically executes a cache eviction call, clearing `repo:${repoName}` and `repo:health:${repoName}` from Redis to ensure the dashboard instantly renders fresh, real-time metrics.

---

## 4. API & Customization

### Can I share reports with stakeholders who don't have GitHub accounts?
**Yes.** Use the **Share Report** feature to generate a secure, tokenized public report snapshot (`dp_rpt_...`). Anyone with the link can view the read-only dashboard without signing in. These snapshots automatically expire after 7 days.
