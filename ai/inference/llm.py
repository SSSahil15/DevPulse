import json
from typing import Any, Optional, List
from pydantic import BaseModel, Field
from langchain_openai import ChatOpenAI
from langchain_core.prompts import PromptTemplate

from .base import PredictorInterface
from models.domain import RepositoryMetadata
from models.config import settings


class LLMPrediction(BaseModel):
    riskScore: int = Field(
        description="A score from 0 to 100 where higher means higher risk of pipeline failure."
    )
    decision: str = Field(description="Must be 'BLOCK' or 'PASS'.")
    failureProbability: float = Field(
        description="A float from 0 to 100 indicating failure probability."
    )
    failureLabel: str = Field(
        description="A short label, e.g. 'High Risk', 'Safe', 'Warning'."
    )
    rationale: str = Field(
        description="A detailed explanation for the score and decision."
    )
    suggestions: List[str] = Field(
        description="A list of 2-3 specific, actionable remediation steps."
    )


class AdvancedLLMPredictor(PredictorInterface):
    """
    Advanced LLM Predictor using LangChain and structured output (JSON).
    """

    def __init__(self):
        # We use the generic ChatOpenAI interface which is compatible with Groq/vLLM
        # via the OPENAI_API_BASE environment variable.
        api_key = settings.OPENAI_API_KEY or "dummy"
        self.llm = ChatOpenAI(
            model=settings.MODEL_NAME,
            openai_api_key=api_key,
            openai_api_base=settings.OPENAI_API_BASE,
            temperature=0.0,
        )
        self.structured_llm = self.llm.with_structured_output(
            LLMPrediction, method="json_mode"
        )

        self.prompt = PromptTemplate.from_template(
            """You are DevPulse, an elite DevSecOps AI. Analyze the provided GitHub repository metadata and CI/CD security scan results.
Your job is to predict the likelihood of this codebase causing a CI/CD pipeline failure or introducing critical security/stability issues.

REPOSITORY METADATA:
Name: {name}
Language: {language}
Stars: {stars}
Open Issues: {issues}

SECURITY SCAN RESULTS:
{security_scan}

INSTRUCTIONS:
1. Review the vulnerabilities and general repository health.
2. If there are critical or high vulnerabilities, risk should be appropriately elevated.
3. If the repository has very low activity (e.g., 0 stars, 0 issues), explicitly mention that it is a new or inactive repository lacking a track record, rather than simply calling it "healthy" or "secure".
4. If the security scan status is "handled_by_pipeline" or "pending_trivy_integration", it means the deep security scan has not run yet. Do NOT assume the codebase is perfectly secure just because vulnerabilities are currently empty.
5. Determine a riskScore (0-100), failureProbability (0-100), and a final decision ('BLOCK' or 'PASS').
4. Provide a clear rationale explaining your reasoning.
5. Provide a few actionable suggestions for the developer.

You MUST respond strictly in valid JSON matching the following schema:
{{
  "riskScore": int,
  "decision": "BLOCK" | "PASS",
  "failureProbability": float,
  "failureLabel": "string",
  "rationale": "string",
  "suggestions": ["string"]
}}
"""
        )

    def predict(
        self, repository: RepositoryMetadata, security_scan: Optional[dict] = None
    ) -> dict[str, Any]:
        """
        Produces an analysis result via LLM inference.
        """
        scan_str = (
            json.dumps(security_scan, indent=2)
            if security_scan
            else "No security scan provided."
        )

        prompt_text = self.prompt.format(
            name=repository.fullName,
            language=repository.language or "Unknown",
            stars=repository.stargazersCount,
            issues=repository.openIssuesCount,
            security_scan=scan_str,
        )

        # Invoke the LLM
        prediction: LLMPrediction = self.structured_llm.invoke(prompt_text)

        # Map the Pydantic structured output back to the dictionary expected by AnalysisPipeline
        return {
            "riskScore": prediction.riskScore,
            "decision": prediction.decision,
            "failurePrediction": {
                "probability": prediction.failureProbability,
                "label": prediction.failureLabel,
                "rationale": prediction.rationale,
            },
            "suggestions": prediction.suggestions,
        }

    def model_info(self) -> dict[str, Any]:
        return {
            "name": "AdvancedLLMPredictor",
            "version": "1.0",
            "type": "llm",
            "model": settings.MODEL_NAME,
        }
