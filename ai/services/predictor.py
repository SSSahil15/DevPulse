"""
DevPulse AI Failure Predictor — Heuristic Engine v2
=====================================================

This is a deterministic, rule-based heuristic predictor, NOT a trained ML model.
It uses weighted metadata signals to estimate pipeline failure probability.

Signals used:
  - Days since last repo update (staleness)
  - Open issue count (technical debt proxy)
  - Repository size (complexity proxy)
  - Security severity score (from Trivy scan)

Model weights were chosen empirically to give intuitive risk thresholds.
A future version will train a proper RandomForestClassifier on real CI/CD data
using the pipeline_results table as ground truth.

Endpoint: POST /analyze
Model info: GET /model-info
"""

import math
from datetime import datetime, timezone


class FailurePredictor:
    """
    Heuristic pipeline failure predictor.

    Returns a normalized risk score (0-100) and a human-readable decision.
    """

    # ─── Configurable Weights ─────────────────────────────────────────────────
    WEIGHTS = {
        "age":      0.8,   # Points per inactive day (capped at 40)
        "issues":   1.5,   # Points per open issue (capped at 45)
        "size":     0.5,   # Log-scaled repo size multiplier (capped at 15)
        "security": 0.4,   # Security score blend weight (0-100 input)
    }

    THRESHOLDS = {
        "block":    60,    # Risk score >= this → BLOCK decision
        "high":     70,    # Failure probability >= this → "high" label
        "moderate": 40,    # Failure probability >= this → "moderate" label
    }

    # ─── Utilities ────────────────────────────────────────────────────────────

    def _days_since(self, date_string: str) -> int:
        """Returns number of days since the given ISO date string."""
        try:
            target_time = datetime.fromisoformat(date_string.replace("Z", "+00:00"))
            delta = datetime.now(timezone.utc) - target_time
            return max(0, delta.days)
        except (ValueError, TypeError):
            return 0

    def _compute_probability(self, days_inactive: int, open_issues: int, size: int) -> int:
        """
        Computes a raw failure probability percentage (5-95).

        Formula:
            probability = age_score + issue_score + size_score
            where each component is capped to prevent single-factor dominance.
        """
        age_score   = min(days_inactive * self.WEIGHTS["age"], 40)
        issue_score = min(open_issues   * self.WEIGHTS["issues"], 45)
        size_score  = min(math.log10(max(size, 1)) * self.WEIGHTS["size"] * 5, 15)

        raw = round(age_score + issue_score + size_score)
        return min(max(raw, 5), 95)

    def _classify_label(self, probability: int, security_score: float) -> str:
        """Maps probability + security score to a risk label."""
        if probability >= self.THRESHOLDS["high"] or security_score >= 60:
            return "high"
        if probability >= self.THRESHOLDS["moderate"] or security_score >= 30:
            return "moderate"
        return "low"

    def _build_rationale(self, days_inactive: int, open_issues: int, security_score: float) -> str:
        """Generates a natural-language rationale for the prediction."""
        parts = []
        if days_inactive > 30:
            parts.append(f"Repository has been inactive for {days_inactive} days, increasing regression risk.")
        if open_issues > 50:
            parts.append(f"High volume of open issues ({open_issues}) indicates unresolved technical debt.")
        if security_score > 50:
            parts.append(f"Critical security vulnerabilities detected (severity score: {security_score:.0f}/100).")
        if not parts:
            parts.append("Repository shows healthy activity and manageable issue volume.")
        return " ".join(parts)

    def _get_suggestions(self, probability: int, security_score: float) -> list[str]:
        """Returns actionable improvement suggestions based on risk signals."""
        suggestions = [
            "Enable GitHub branch protection for production branches.",
            "Schedule a dependency audit to identify outdated packages.",
        ]
        if probability > 50:
            suggestions.append(
                "Break large PRs into smaller, focused changes to reduce CI failure probability."
            )
        if security_score > 30:
            suggestions.append(
                "Apply security patches immediately to resolve high-severity vulnerabilities."
            )
        if probability > 70:
            suggestions.append(
                "Consider freezing feature work and focusing on stability and test coverage."
            )
        return suggestions

    # ─── Main Predict Method ──────────────────────────────────────────────────

    def predict(self, repository, security_scan=None):
        """
        Runs the heuristic prediction for a given repository.

        Args:
            repository: RepositoryMetadata pydantic model
            security_scan: Optional dict with 'severityScore' key

        Returns:
            dict with riskScore, decision, failurePrediction, securityScan, suggestions
        """
        days_inactive = self._days_since(repository.updatedAt)
        security_score = float(security_scan.get("severityScore", 0)) if security_scan else 0.0

        probability = self._compute_probability(
            days_inactive,
            repository.openIssuesCount,
            repository.size,
        )

        label = self._classify_label(probability, security_score)
        rationale = self._build_rationale(days_inactive, repository.openIssuesCount, security_score)

        # Blend probability and security into final risk score
        risk_score = min(max(round(probability * 0.6 + security_score * 0.4), 0), 100)
        decision = "BLOCK" if risk_score >= self.THRESHOLDS["block"] else "SAFE"

        return {
            "riskScore": risk_score,
            "decision": decision,
            "failurePrediction": {
                "probability": float(probability),
                "label": label,
                "rationale": f"Heuristic Analysis: {rationale}",
            },
            "securityScan": security_scan or {
                "status": "not_scanned",
                "severityScore": 0.0,
                "summary": {"critical": 0, "high": 0, "medium": 0, "low": 0, "unknown": 0},
                "vulnerabilities": [],
            },
            "suggestions": self._get_suggestions(probability, security_score),
        }

    def model_info(self) -> dict:
        """Returns metadata about this predictor for transparency."""
        return {
            "type": "heuristic",
            "version": "2.0",
            "description": (
                "Deterministic weighted heuristic engine. Not a trained ML model. "
                "Uses repository metadata signals to estimate pipeline failure probability."
            ),
            "signals": list(self.WEIGHTS.keys()),
            "weights": self.WEIGHTS,
            "thresholds": self.THRESHOLDS,
            "futureWork": (
                "Train a RandomForestClassifier on pipeline_results table data "
                "once sufficient labeled runs are collected."
            ),
        }
