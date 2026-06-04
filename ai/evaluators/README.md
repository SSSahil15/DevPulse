# AI Evaluators

This directory contains the evaluation framework for the DevPulse AI Copilot.

## Overview

The evaluators automatically assess the performance of the LLM pipeline against gold-standard datasets. They track metrics such as:
- Precision & Recall
- Hallucination Rate
- Actionability of suggested fixes

## Components

- **scorers.py**: Contains the logic for comparing LLM outputs against expected results and assigning performance scores.
