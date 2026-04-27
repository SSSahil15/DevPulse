import math
from datetime import datetime

class FailurePredictor:
    def __init__(self):
        # In a real app, we would load a scikit-learn model here
        # self.model = joblib.load('models/failure_model.pkl')
        pass

    def _days_since(self, date_string: str) -> int:
        try:
            target_time = datetime.fromisoformat(date_string.replace('Z', '+00:00'))
            delta = datetime.now(target_time.tzinfo) - target_time
            return max(0, delta.days)
        except ValueError:
            return 0

    def predict(self, repository, security_scan=None):
        # Simulated AI logic using weighted metadata
        days_inactive = self._days_since(repository.updatedAt)
        
        # Model Weights (Simulated)
        age_weight = 0.8
        issue_weight = 1.5
        size_weight = 0.5
        security_weight = 0.4
        
        # Base failure probability calculation
        age_score = min(days_inactive * age_weight, 40)
        issue_score = min(repository.openIssuesCount * issue_weight, 45)
        size_score = min(math.log10(max(repository.size, 1)) * size_weight * 5, 15)
        
        probability = min(max(round(age_score + issue_score + size_score), 5), 95)
        
        # Security Impact
        security_score = 0
        if security_scan and "severityScore" in security_scan:
            security_score = security_scan["severityScore"]
        
        # Rationale Generation (Natural Language)
        rationale_parts = []
        if days_inactive > 30:
            rationale_parts.append(f"Repository has been inactive for {days_inactive} days.")
        if repository.openIssuesCount > 50:
            rationale_parts.append(f"High volume of open issues ({repository.openIssuesCount}) indicates technical debt.")
        
        if security_score > 50:
            rationale_parts.append(f"Critical security vulnerabilities detected (Severity Score: {security_score}).")
        
        if not rationale_parts:
            rationale_parts.append("Repository shows healthy activity and manageable issue volume.")
            
        rationale = " ".join(rationale_parts)
        
        label = "high" if (probability >= 70 or security_score >= 60) else "moderate" if (probability >= 40 or security_score >= 30) else "low"
        
        # Combined Risk Score
        risk_score = min(max(round(probability * 0.6 + security_score * 0.4), 0), 100)
        
        return {
            "riskScore": risk_score,
            "decision": "BLOCK" if risk_score >= 60 else "SAFE",
            "failurePrediction": {
                "probability": float(probability),
                "label": label,
                "rationale": f"AI Prediction: {rationale}"
            },
            "securityScan": security_scan or {
                "status": "not_scanned",
                "severityScore": 0.0,
                "summary": {"critical": 0, "high": 0, "medium": 0, "low": 0, "unknown": 0},
                "vulnerabilities": []
            },
            "suggestions": self._get_suggestions(repository, probability, security_score)
        }

    def _get_suggestions(self, repository, probability, security_score):
        suggestions = [
            "Enable GitHub branch protection for production branches.",
            "Schedule a dependency audit to identify outdated packages."
        ]
        if probability > 50:
            suggestions.append("Consider breaking down large PRs to reduce the probability of CI failure.")
        if security_score > 30:
            suggestions.append("Apply security patches immediately to resolve high-severity vulnerabilities.")
        return suggestions
