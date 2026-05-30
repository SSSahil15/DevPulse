# Sharing Reports

DevPulse allows security engineers and developers to securely export and share read-only snapshots of repository scan results using **Tokenized Public Reports**.

---

## 1. How Report Tokens Work

When you click **Share Report** in the dashboard:

1. DevPulse captures the current static snapshot of the selected repository's score, vulnerabilities, and commit activity.
2. The backend generates a secure token using a unique prefix pattern:
   `dp_rpt_[a-f0-9]{24}`
3. The snapshot is saved to PostgreSQL and cached for 30 days in Redis under the cache key:
   `report:${token}`

---

## 2. Generating a Shareable Link

1. Open the repository details view.
2. Click the **Share** button in the top right.
3. A popup will display your unique public sharing link (e.g. `http://localhost:5173/reports/dp_rpt_5f8a2e...`).
4. Click **Copy Link** to share it with stakeholders, external clients, or compliance auditors.

---

## 3. Security & Expiration Policies

To ensure complete data protection and privacy:

- **No Private Credentials**: Shared reports are completely stripped of raw environment variables, secrets, and repository access tokens.
- **Read-Only**: Shared reports are static snapshots. Users viewing a shared report cannot trigger new simulations or access other dashboard pages.
- **Expiration Policy**: By default, shared reports expire and become invalid after **30 days**. Once expired, querying the endpoint will return a clean `404 Not Found` response.

---

> [!NOTE]
> Querying shared reports is extremely fast! Because shared reports are static and immutable, their content is cached directly inside the Redis cluster for the full 30-day duration, bypassing database hits entirely.
