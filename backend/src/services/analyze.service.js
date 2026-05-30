const axios = require('axios');
const config = require('../config/env');

const { runTrivyScan } = require('./security.service');

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function daysSince(dateString) {
  const targetTime = new Date(dateString).getTime();
  const now = Date.now();

  if (Number.isNaN(targetTime)) {
    return 0;
  }

  return Math.max(0, Math.floor((now - targetTime) / (1000 * 60 * 60 * 24)));
}

function buildSuggestions(repository, failureProbability) {
  const suggestions = [
    'Wire this repository into the upcoming DevPulse GitHub Actions workflow so tests and Trivy results feed the dashboard.',
    'Protect the default branch and require status checks before merge.',
    'Add or refresh repository secrets so CI jobs do not fail on missing configuration.',
  ];

  if (repository.openIssuesCount > 20) {
    suggestions.push(
      'There is noticeable issue pressure on this repository. Clearing flaky or CI-related issues will usually improve pipeline stability.',
    );
  }

  if (daysSince(repository.updatedAt) > 30) {
    suggestions.push(
      'The repository has not been updated recently. Run a dependency refresh before enabling stricter pipeline gates.',
    );
  }

  if (failureProbability >= 60) {
    suggestions.push(
      'Start with a dry-run pipeline and treat failing steps as warnings until the failure prediction model is trained with real CI logs.',
    );
  }

  return suggestions;
}

async function buildInitialAnalysis(repository, githubAccessToken) {
  try {
    // Skip Trivy here — security scan is handled by the async scan job separately.
    // Calling Trivy here would block the request for minutes (git clone + scan).
    // The FastAPI AI service uses repository metadata for failure prediction.
    const emptyScan = {
      status: 'handled_by_pipeline',
      severityScore: 0,
      summary: { critical: 0, high: 0, medium: 0, low: 0, unknown: 0 },
      vulnerabilities: [],
    };

    // Call Python AI microservice with repo metadata
    const response = await axios.post(`${config.aiServiceUrl}/analyze`, {
      repository,
      securityScan: emptyScan,
    });

    return response.data;
  } catch (error) {
    console.error('AI Analysis failed, falling back to basic logic:', error.message);

    // Fallback to basic logic if AI service is down
    const repositoryAgePressure = clamp(daysSince(repository.updatedAt) * 0.7, 0, 30);
    const issuePressure = clamp(repository.openIssuesCount * 1.8, 0, 35);
    const sizePressure = clamp(Math.log10(Math.max(repository.size, 10)) * 8, 5, 20);

    const failureProbability = clamp(
      Math.round(repositoryAgePressure + issuePressure + sizePressure),
      5,
      90,
    );

    const securityScan = {
      severityScore: 0,
      status: 'pending_trivy_integration',
      summary: {
        critical: 0,
        high: 0,
        low: 0,
        medium: 0,
        unknown: 0,
      },
      vulnerabilities: [],
    };

    const riskScore = clamp(
      Math.round(failureProbability * 0.65 + securityScan.severityScore * 0.35),
      0,
      100,
    );

    return {
      decision: riskScore >= 60 ? 'BLOCK' : 'SAFE',
      failurePrediction: {
        label: failureProbability >= 60 ? 'high' : failureProbability >= 35 ? 'moderate' : 'low',
        probability: failureProbability,
        rationale:
          'This starter prediction is based on GitHub repository metadata. It will be replaced by a trained CI failure model in the AI step.',
      },
      generatedAt: new Date().toISOString(),
      riskScore,
      scoringBreakdown: {
        failureWeight: 0.65,
        securityWeight: 0.35,
      },
      securityScan,
      source: 'bootstrap-github-metadata',
      suggestions: buildSuggestions(repository, failureProbability),
    };
  }
}

module.exports = {
  buildInitialAnalysis,
};
