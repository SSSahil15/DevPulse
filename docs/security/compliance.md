# Security Compliance Stance

DevPulse is aligned with modern software security standards, ensuring that your automated scanning platform meets standard enterprise compliance requirements.

---

## 1. Compliance Alignment

### OWASP Top 10
- **A01:2021-Broken Access Control**: Enforced through secure, stateless JWT middleware validating active user sessions.
- **A02:2021-Cryptographic Failures**: Symmetric authenticated encryption using AES-256-GCM blocks direct access to stored developer tokens.
- **A03:2021-Injection**: Raw SQL statements are parameterized to completely prevent SQL injection vulnerabilities in PostgreSQL.

### SOC 2 & ISO 27001 Preparedness
- **Access Review**: Clear logging of all user synchronizations and pipeline simulations.
- **Vulnerability Management**: Automatically integrates filesystem scans (Trivy) in the build process to capture and block critical CVEs in production deployments.
- **Secrets Scanning**: Unified security gates execute deep scanning to prevent committing plain-text AWS/GitHub developer credentials to repositories.

---

## 2. Dynamic Vulnerability Thresholds

During our continuous integration processes, the quality gate enforces compliance with standard security thresholds:

| Severity | Threshold Rule | Action on Deficit |
|----------|----------------|-------------------|
| **CRITICAL** | Zero Allowed | **Blocks build immediately** |
| **HIGH** | Max 2 Allowed | Warns operator, blocks deployment if exceeded |
| **MEDIUM** | Max 10 Allowed | Logs warning message |
| **LOW** | Unlimited | Logs warning message |
