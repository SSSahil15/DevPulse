# Using the AI Copilot

The DevPulse **AI Copilot** is a Socratic virtual assistant integrated directly into your workspace. It guides developers to explain and resolve critical security vulnerabilities.

---

## Key Capabilities

- **Interactive Triage**: Explains _why_ a specific CVE was triggered and the risks associated with the vulnerable dependency.
- **Remediation Code Generation**: Provides structural diffs and copy-paste commands (e.g. `npm install package@fixed-version`) to resolve findings.
- **Socratic Code Explanations**: Ask natural language questions regarding file structures, PostgreSQL configurations, or test failures.

---

## Interface Integration

The Copilot can be accessed from two convenient interface handles:

### 1. Tabular Ask Buttons

- Every vulnerability listed in the **Vulnerabilities Widget** features a direct **Ask Copilot** button. Clicking this automatically opens the chat sidebar, injects the CVE payload, and triggers an explanation request.

### 2. Floating AI Chat Sidebar

- Click the floating brain icon in the bottom-right corner to toggle the full-screen chat drawer. You can hold contextual conversations here about the selected repository.

---

## Sample Prompts

Here are some standard prompts you can ask the Copilot:

```text
"Explain the critical CVE found in package axios and how I can update it safely without breaking standard HTTP routing."

"Explain the PostgreSQL JSONB structure in devpulse and why it's better than standard SQLite columns."

"My CI/CD pipeline failed during the E2E Playwright step. Can you analyze typical reasons for E2E flakiness and how to resolve them?"
```

---

> [!TIP]
> The AI Copilot caches typical responses in Redis. If the repository and its latest analysis status remain unchanged, repeated questions will return instantly and save AI token costs!
