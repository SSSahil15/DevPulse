from langchain_openai import ChatOpenAI
from langchain_core.prompts import PromptTemplate
from models.config import settings
from models.eval import AccuracyScore, HallucinationScore


class Evaluator:
    def __init__(self):
        # We use a stronger model for evaluation if configured
        api_key = settings.OPENAI_API_KEY or "dummy"
        self.llm = ChatOpenAI(
            model=settings.EVAL_MODEL_NAME,
            openai_api_key=api_key,
            openai_api_base=settings.OPENAI_API_BASE,
            temperature=0.0,
        )

        # LLM bound to Pydantic outputs (using json_mode for Groq compatibility)
        self.accuracy_judge = self.llm.with_structured_output(
            AccuracyScore, method="json_mode"
        )
        self.hallucination_judge = self.llm.with_structured_output(
            HallucinationScore, method="json_mode"
        )

        self.accuracy_prompt = PromptTemplate.from_template(
            """You are an expert evaluator. Compare the generated AI response to the expected ground truth.
Score the accuracy from 1 to 5.
1 = Completely wrong or irrelevant
3 = Partially correct but missing key points
5 = Perfectly matches the core meaning of the ground truth

You MUST output your response in JSON format exactly matching this schema:
{{ "score": int, "rationale": "string" }}

Ground Truth:
{expected}

Generated Response:
{response}
"""
        )

        self.hallucination_prompt = PromptTemplate.from_template(
            """You are a strict hallucination detector. Read the provided Context and the Generated Response.
Does the response claim any facts, metrics, or details that are NOT explicitly stated or logically deduced from the Context?
If yes, flag it as a hallucination.

EXCEPTION: Recommending widely accepted industry security best practices (such as using a Secrets Manager, rotating keys, or using environment variables) is perfectly acceptable and should NOT be flagged as a hallucination.

You MUST output your response in JSON format exactly matching this schema:
{{ "has_hallucination": boolean, "rationale": "string" }}

Context:
{context}

Generated Response:
{response}
"""
        )

    def score_accuracy(self, response: str, expected: str) -> AccuracyScore:
        prompt = self.accuracy_prompt.format(response=response, expected=expected)
        return self.accuracy_judge.invoke(prompt)

    def detect_hallucination(self, response: str, context: str) -> HallucinationScore:
        prompt = self.hallucination_prompt.format(response=response, context=context)
        return self.hallucination_judge.invoke(prompt)
