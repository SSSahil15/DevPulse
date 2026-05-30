from typing import List, Optional
from pydantic import BaseModel
from .domain import RepositoryMetadata, SecurityScan, PredictionResult


class AnalysisRequest(BaseModel):
    repository: RepositoryMetadata
    securityScan: Optional[dict] = None


class AnalysisResponse(BaseModel):
    riskScore: int
    decision: str
    failurePrediction: PredictionResult
    securityScan: SecurityScan
    suggestions: List[str]
    generatedAt: str
    source: str


class RAGQueryRequest(BaseModel):
    query: str
    repository_id: Optional[int] = None


class IngestDocument(BaseModel):
    content: str
    metadata: dict


class IngestRequest(BaseModel):
    documents: List[IngestDocument]
