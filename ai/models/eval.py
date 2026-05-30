from pydantic import BaseModel, Field
from typing import List, Dict, Any


class EvalTestCase(BaseModel):
    id: str
    query: str
    context: str
    expected_output: str
    metadata: Dict[str, Any] = Field(default_factory=dict)


class EvalDataset(BaseModel):
    name: str
    description: str
    cases: List[EvalTestCase]


class AccuracyScore(BaseModel):
    score: int = Field(
        description="Score from 1 (completely wrong) to 5 (perfect match)"
    )
    rationale: str = Field(description="Explanation for the given score")


class HallucinationScore(BaseModel):
    has_hallucination: bool = Field(
        description="True if the response contains information not supported by the context"
    )
    rationale: str = Field(
        description="Explanation of any detected hallucinations or why it is clean"
    )


class EvalResult(BaseModel):
    test_case_id: str
    generated_response: str
    accuracy: AccuracyScore
    hallucination: HallucinationScore
    duration_ms: int


class EvalReport(BaseModel):
    dataset_name: str
    timestamp: str
    total_cases: int
    average_accuracy: float
    hallucination_rate: float
    results: List[EvalResult]
