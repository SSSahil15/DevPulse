# DevPulse AI Service

This directory contains the Python FastAPI microservice that powers the AI Copilot and predictive analysis features of DevPulse.

## Components

- **FastAPI Application (`app.py`)**: The main entry point exposing endpoints for AI analysis and metrics.
- **pipelines/**: Orchestrates the analysis flow (e.g., retrieving vulnerabilities and querying the LLM).
- **inference/**: Wrappers for the LangChain and Groq/OpenAI APIs.
- **models/**: Pydantic schemas for request/response validation.
- **evaluators/**: The automated evaluation framework to benchmark LLM outputs against ground truth datasets.
- **datasets/**: Gold standard datasets for the evaluation framework.
- **prompts/**: LLM prompt templates and instructions.
- **training/**: Scripts and utilities for model training and fine-tuning.

## Local Setup

1. Create a Python virtual environment: `python3 -m venv venv && source venv/bin/activate`
2. Install dependencies: `pip install -r requirements.txt`
3. Copy `.env.example` to `.env` and fill in your `GROQ_API_KEY`.
4. Run the development server: `uvicorn app:app --reload --port 8000`

The API will be available at `http://localhost:8000`.
