import json
import time
from datetime import datetime
from typing import List
from pathlib import Path
from langchain_core.output_parsers import StrOutputParser

from models.eval import EvalDataset, EvalResult, EvalReport
from evaluators.scorers import Evaluator
from pipelines.rag_pipeline import RagPipeline
from utils.logger import log


def run_evaluation(dataset_path: str, output_path: str):
    # Load Dataset
    log.info(f"Loading dataset from {dataset_path}")
    with open(dataset_path, "r") as f:
        data = json.load(f)
    dataset = EvalDataset(**data)

    pipeline = RagPipeline()
    evaluator = Evaluator()

    # The RAG pipeline LLM generation chain (bypassing the retriever for strict context eval)
    llm_chain = pipeline.prompt | pipeline.llm | StrOutputParser()

    results: List[EvalResult] = []
    total_acc = 0.0
    hallucination_count = 0

    log.info(f"Starting evaluation of {len(dataset.cases)} cases in '{dataset.name}'")

    for case in dataset.cases:
        log.info(f"Evaluating case: {case.id}")
        start_time = time.perf_counter()

        # 1. Generate Response using production prompt & model
        response = llm_chain.invoke({"context": case.context, "query": case.query})

        # 2. Evaluate Accuracy (1-5)
        acc_score = evaluator.score_accuracy(
            response=response, expected=case.expected_output
        )

        # 3. Detect Hallucinations
        hallucination_score = evaluator.detect_hallucination(
            response=response, context=case.context
        )

        duration = int((time.perf_counter() - start_time) * 1000)

        results.append(
            EvalResult(
                test_case_id=case.id,
                generated_response=response,
                accuracy=acc_score,
                hallucination=hallucination_score,
                duration_ms=duration,
            )
        )

        total_acc += acc_score.score
        if hallucination_score.has_hallucination:
            hallucination_count += 1

    # Generate Report
    avg_acc = total_acc / len(dataset.cases) if dataset.cases else 0.0
    hall_rate = hallucination_count / len(dataset.cases) if dataset.cases else 0.0

    report = EvalReport(
        dataset_name=dataset.name,
        timestamp=datetime.utcnow().isoformat(),
        total_cases=len(dataset.cases),
        average_accuracy=avg_acc,
        hallucination_rate=hall_rate,
        results=results,
    )

    # Save to disk
    out_file = Path(output_path)
    out_file.parent.mkdir(parents=True, exist_ok=True)
    out_file.write_text(report.model_dump_json(indent=2))

    log.info(f"Evaluation complete. Report saved to {output_path}")
    log.info(
        f"Avg Accuracy: {avg_acc:.2f}/5.0 | Hallucination Rate: {hall_rate * 100:.1f}%"
    )

    # CI Enforcement: Fail if accuracy is too low or hallucination is too high
    if avg_acc < 4.0:
        log.error("CI failure: Average accuracy dropped below 4.0")
        exit(1)
    if hall_rate > 0.0:
        log.error("CI failure: Hallucinations detected!")
        exit(1)


if __name__ == "__main__":
    base_dir = Path(__file__).parent.parent
    ds_path = base_dir / "datasets" / "security_benchmark.json"
    ts = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    out_path = Path("/tmp") / "reports" / f"evaluation_report_{ts}.json"

    run_evaluation(str(ds_path), str(out_path))
