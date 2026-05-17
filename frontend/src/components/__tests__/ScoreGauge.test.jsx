import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import ScoreGauge from "../ScoreGauge";

describe("ScoreGauge", () => {
  it("renders score number correctly", () => {
    render(<ScoreGauge score={85} status="SAFE" riskCategory="LOW" />);
    expect(screen.getByText("85")).toBeInTheDocument();
  });

  it("renders SAFE status badge", () => {
    render(<ScoreGauge score={90} status="SAFE" riskCategory="LOW" />);
    expect(screen.getByTestId("score-status")).toHaveTextContent("SAFE");
  });

  it("renders WARNING status badge", () => {
    render(<ScoreGauge score={65} status="WARNING" riskCategory="MEDIUM" />);
    expect(screen.getByTestId("score-status")).toHaveTextContent("WARNING");
  });

  it("renders CRITICAL status badge", () => {
    render(<ScoreGauge score={20} status="CRITICAL" riskCategory="HIGH" />);
    expect(screen.getByTestId("score-status")).toHaveTextContent("CRITICAL");
  });

  it("renders -- when score is missing", () => {
    render(<ScoreGauge score="--" />);
    expect(screen.getByText("--")).toBeInTheDocument();
  });

  it("renders positive trend indicator", () => {
    render(<ScoreGauge score={80} status="SAFE" trend={5} />);
    expect(screen.getByText(/\+5/)).toBeInTheDocument();
  });

  it("renders negative trend indicator", () => {
    render(<ScoreGauge score={60} status="WARNING" trend={-8} />);
    expect(screen.getByText(/-8/)).toBeInTheDocument();
  });
});
