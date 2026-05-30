const axios = require('axios');
const logger = require('../utils/logger');

/**
 * AI Copilot Service (Action-First Architecture)
 * Uses Groq API as primary engine, falls back to intelligent heuristics if API fails or isn't configured.
 */

// ─── Primary Engine (LLM API) ────────────────────────────────────────────────
async function callPrimaryLLM(query, contextData, conversationHistory) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not configured.');
  }

  const { pipelineData, analysisResult } = contextData || {};
  const repoName = pipelineData?.devpulseScore?.repoId || 'Unknown Repo';
  const branchName = pipelineData?.devpulseScore?.branch || 'Unknown Branch';
  const score = pipelineData?.devpulseScore?.score || 'N/A';
  const riskCategory = pipelineData?.devpulseScore?.riskCategory || 'UNKNOWN';
  const stages = pipelineData?.stages || {};
  const security = stages.security || {};

  const testResults = stages.backend?.tests || stages.frontend?.tests || 'No tests run';
  const buildStatus =
    stages.backend?.build === 'failure' ||
    stages.frontend?.build === 'failure' ||
    stages.docker?.build === 'failure'
      ? 'failure'
      : 'success';

  // Detailed vulnerability context
  let vulnsText = 'None';
  if (security.vulnerabilities && security.vulnerabilities.length > 0) {
    const topVulns = security.vulnerabilities
      .slice(0, 5)
      .map((v) => `${v.severity} in ${v.pkgName} (${v.id}) - Fix: ${v.fixedVersion || 'None'}`);
    vulnsText = topVulns.join('\n');
  }

  const systemPrompt = `You are a production-grade DevSecOps AI assistant with memory of the conversation.

Current Pipeline Context:
- Repository: ${repoName}
- Branch: ${branchName}
- Latest DevPulse Score: ${score} (Risk: ${riskCategory})
- Test Results: ${testResults}
- Build Status: ${buildStatus}
- Vulnerability Summary: ${security.critical || 0} Critical, ${security.high || 0} High, ${security.medium || 0} Medium
- Specific Vulnerabilities (Top 5):
${vulnsText}

Instructions:
1. Provide action-first, compact, direct responses. No filler or fluff.
2. Structure exactly as requested: Issue, Immediate Fix, Short Explanation.
3. Keep technical depth: Include specific CVEs, versions, and clear commands (like pip install or npm audit).
4. Do NOT repeat yourself across sections.
5. Use BOTH conversation history and pipeline data. Resolve pronouns ("it", "this").
6. Output STRICTLY in JSON format.

Expected JSON schema:
{
  "issue": "Clear 1-2 line description of the problem. If none, state 'No issues found.'",
  "fix": "Immediate actionable steps to resolve. Use bullet points or commands. If none needed, state 'No action required.'",
  "explanation": "Short, precise technical explanation of why it matters.",
  "risk": "LOW", "MEDIUM", or "HIGH",
  "confidence": "HIGH" (since you have full data access),
  "limitations": "None (Full context provided)",
  "suggestedActions": ["Explain vulnerabilities", "View detailed report", "Explain further"]
}`;

  // Format the messages array to include history
  const messages = [{ role: 'system', content: systemPrompt }];

  if (conversationHistory && Array.isArray(conversationHistory)) {
    const recentHistory = conversationHistory.slice(-10);
    recentHistory.forEach((msg) => {
      const content = msg.isStructured && msg.data?.issue ? msg.data.issue : msg.text;
      if (content) {
        messages.push({ role: msg.role === 'ai' ? 'assistant' : 'user', content });
      }
    });
  }

  messages.push({ role: 'user', content: query });

  try {
    const llmStart = Date.now();
    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.3-70b-versatile',
        messages: messages,
        response_format: { type: 'json_object' },
        temperature: 0.2,
        max_tokens: 600,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 8000,
      },
    );
    const llmDurationMs = Date.now() - llmStart;

    const content = response.data.choices[0].message.content;
    const parsed = JSON.parse(content);
    const tokensUsed = response.data.usage?.total_tokens ?? null;

    logger.info('[Groq] LLM call succeeded', {
      model: 'llama-3.3-70b-versatile',
      duration_ms: llmDurationMs,
      tokens_used: tokensUsed,
      fallback: false,
    });

    // Ensure standard fields
    parsed.confidence = 'HIGH';
    if (!parsed.limitations) parsed.limitations = 'None (Full context provided)';
    if (!parsed.suggestedActions) parsed.suggestedActions = ['Explain further'];

    return parsed;
  } catch (err) {
    logger.warn('[Groq] LLM call failed', {
      model: 'llama-3.3-70b-versatile',
      message: err.response?.data?.error?.message || err.message,
      status: err.response?.status ?? null,
      fallback: true,
    });
    throw new Error('Primary LLM Failed');
  }
}

// ─── Intelligent Fallback Engine (Data-Driven Heuristics) ────────────────────
function callFallbackEngine(query, pipelineData, analysisResult, conversationHistory) {
  const q = query.toLowerCase();

  const score = pipelineData?.devpulseScore?.score || 'N/A';
  const stages = pipelineData?.stages || {};
  const security = stages.security || {};
  const failureProb = analysisResult?.analysis?.failurePrediction?.probability || 0;

  const hasVulnerabilities =
    (security.critical || 0) + (security.high || 0) + (security.medium || 0) > 0;
  const hasBuildFailures =
    stages.backend?.tests === 'failure' ||
    stages.frontend?.build === 'failure' ||
    stages.docker?.build === 'failure';

  const isFollowUp = conversationHistory && conversationHistory.length > 2;

  // Default structure
  const result = {
    issue: isFollowUp
      ? 'Context limited for follow-up question.'
      : 'Analysis based on high-level numeric metrics.',
    fix: 'Review recent commits or pipeline logs for exact context.',
    explanation: 'AI API is currently unavailable. Using localized metrics.',
    risk: score < 80 ? 'MEDIUM' : 'LOW',
    confidence: 'LOW',
    limitations: 'LLM API failed; analyzing based on high-level numeric metrics only.',
    suggestedActions: ['Explain further'],
  };

  if (q.includes('score') || q.includes('health')) {
    if (score < 80) {
      if (hasVulnerabilities) {
        result.issue = `DevPulse score dropped to ${score}/100 due to known vulnerabilities (${security.critical || 0} critical, ${security.high || 0} high).`;
        result.fix =
          '- Review package dependency tree\n- Apply necessary version upgrades starting with critical severity items.';
        result.explanation =
          'Unpatched dependencies introduce known CVEs, exposing the software to immediate risk.';
        result.risk = 'HIGH';
        result.suggestedActions = ['Fix vulnerabilities', 'Explain further'];
      } else if (hasBuildFailures) {
        result.issue = `DevPulse score dropped to ${score}/100 due to failing integration gates.`;
        result.fix =
          '- Investigate failing CI/CD stages (backend tests or docker builds)\n- Revert breaking changes or fix broken tests.';
        result.explanation =
          'Failed pipeline stages prevent safe deployment and degrade integration health.';
        result.risk = 'HIGH';
        result.suggestedActions = ['View detailed report', 'Explain further'];
      } else {
        result.issue = `DevPulse score dropped to ${score}/100 due to historical failure rates or high code churn.`;
        result.fix = '- Stabilize flaky tests\n- Minimize large sweeping commits.';
        result.explanation =
          'High churn and test instability decrease overall project reliability.';
        result.risk = 'MEDIUM';
        result.suggestedActions = ['Explain further'];
      }
    } else {
      result.issue = 'No active issues found. Repository is healthy.';
      result.fix = 'No immediate action required.';
      result.explanation =
        'All core integration and security metrics are within acceptable thresholds.';
      result.risk = 'LOW';
    }
  } else if (q.includes('fail') || q.includes('error')) {
    if (hasBuildFailures) {
      result.issue = 'Recent pipeline execution failed at a critical CI/CD stage.';
      result.fix =
        "- Isolate the exact failing stage in logs\n- If it's a test suite, run locally to reproduce.";
      result.explanation =
        'Non-zero exit codes block the deployment pipeline and indicate broken integrations.';
      result.risk = 'HIGH';
      result.suggestedActions = ['View detailed report', 'Explain further'];
    } else {
      result.issue = `Pipeline hasn't failed, but there is a ${Math.round(failureProb)}% predicted risk of future failure.`;
      result.fix =
        '- Review potentially flaky tests\n- Monitor the next few integration cycles closely.';
      result.explanation =
        'Predictive analysis indicates elevated risk based on historical commit patterns and code churn.';
      result.risk = 'MEDIUM';
      result.suggestedActions = ['Explain further'];
    }
  } else if (q.includes('vulnerabilities') || q.includes('security') || q.includes('cve')) {
    if (hasVulnerabilities) {
      const topVuln = security.vulnerabilities?.[0];
      if (topVuln) {
        result.issue = `${security.critical || 0} critical, ${security.high || 0} high vulnerabilities. Most severe: ${topVuln.pkgName} (${topVuln.id}).`;
        result.fix = `- Upgrade ${topVuln.pkgName} to version ${topVuln.fixedVersion || 'a secure patched version'} immediately.`;
        result.explanation = `The ${topVuln.severity} vulnerability in ${topVuln.pkgName} can lead to exploits if exposed in production.`;
      } else {
        result.issue = `${security.critical || 0} critical, ${security.high || 0} high vulnerabilities detected.`;
        result.fix =
          "- Run a standard security audit (e.g., 'npm audit')\n- Bulk-patch minor version bumps.";
        result.explanation =
          'Multiple dependencies contain known CVEs, increasing your software supply chain risk.';
      }
      result.risk = 'HIGH';
      result.suggestedActions = ['Fix vulnerabilities', 'Explain further'];
    } else {
      result.issue = 'No critical, high, or medium vulnerabilities detected.';
      result.fix = 'No action needed.';
      result.explanation = 'The current dependency manifest is secure against known CVEs.';
      result.risk = 'LOW';
    }
  }

  return result;
}

// ─── Main Orchestrator ───────────────────────────────────────────────────────
async function generateHybridChatResponse(query, context, conversationHistory = []) {
  const { pipelineData, analysisResult } = context || {};

  // 1. Try Primary LLM
  try {
    const primaryResult = await callPrimaryLLM(query, context, conversationHistory);
    return primaryResult;
  } catch (err) {
    // 2. Fallback — log the switch so it's visible in metrics
    logger.warn('[Groq] Falling back to heuristic engine', {
      reason: err.message,
      fallback: true,
    });
    const fallbackResult = callFallbackEngine(
      query,
      pipelineData,
      analysisResult,
      conversationHistory,
    );
    return fallbackResult;
  }
}

module.exports = {
  generateHybridChatResponse,
};
