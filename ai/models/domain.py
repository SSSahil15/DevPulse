from typing import List, Optional
from pydantic import BaseModel


class RepositoryMetadata(BaseModel):
    id: int
    name: str
    fullName: str
    language: Optional[str] = None
    openIssuesCount: int
    stargazersCount: int
    updatedAt: str
    size: int


class SecuritySummary(BaseModel):
    critical: int
    high: int
    medium: int
    low: int
    unknown: int


class SecurityScan(BaseModel):
    status: str
    severityScore: float
    summary: SecuritySummary
    vulnerabilities: List[dict]


class PredictionResult(BaseModel):
    probability: float
    label: str
    rationale: str
