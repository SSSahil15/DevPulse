import time
from datetime import datetime
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
from models.api import AnalysisRequest, AnalysisResponse
from inference.base import PredictorInterface
from inference.llm import AdvancedLLMPredictor
from utils.logger import log

class AnalysisPipeline:
    """
    Orchestrates the analysis process, combining retrieval, inference,
    evaluation, and packaging the final response.
    """
    
    def __init__(self, predictor: PredictorInterface = None):
        # Default to AdvancedLLMPredictor, allowing dependency injection
        self.predictor = predictor or AdvancedLLMPredictor()

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type(Exception),
        reraise=True
    )
    def _execute_inference(self, request: AnalysisRequest) -> dict:
        """
        Executes inference with retry logic to handle transient issues
        (e.g., if we were using an external LLM API here).
        """
        return self.predictor.predict(request.repository, request.securityScan)

    def run(self, request: AnalysisRequest) -> AnalysisResponse:
        """
        Execute the full pipeline to analyze the repository.
        """
        start_time = time.perf_counter()
        log.info("Starting analysis pipeline", extra={"repositoryId": request.repository.id})

        try:
            # 1. Retrieval (Mocked for now, would fetch more data if needed)
            # 2. Inference
            raw_result = self._execute_inference(request)
            
            # 3. Evaluation (Mocked for now, would score/audit the response)
            
            # 4. Packaging
            # We must include securityScan to satisfy the AnalysisResponse Pydantic model
            security_scan_data = request.securityScan or {
                "status": "unknown", 
                "severityScore": 0, 
                "summary": {"critical": 0, "high": 0, "medium": 0, "low": 0, "unknown": 0}, 
                "vulnerabilities": []
            }
            response = AnalysisResponse(
                **raw_result,
                securityScan=security_scan_data,
                generatedAt=datetime.utcnow().isoformat(),
                source="devpulse-ai-pipeline-v1"
            )
            
            duration_ms = round((time.perf_counter() - start_time) * 1000)
            log.info("Analysis pipeline completed", extra={"repositoryId": request.repository.id, "duration_ms": duration_ms})
            
            return response

        except Exception as e:
            duration_ms = round((time.perf_counter() - start_time) * 1000)
            log.error("Analysis pipeline failed", extra={"repositoryId": request.repository.id, "duration_ms": duration_ms, "error": str(e)})
            raise
