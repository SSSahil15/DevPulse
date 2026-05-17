import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import InsightsPanel from "../InsightsPanel";

const healthyInsights = {
  explanation: "All pipeline stages completed successfully. No vulnerabilities or failures detected.",
  rootCause: null,
  issues: [],
  suggestions: [
    "Pipeline is healthy. Consider adding integration tests.",
    "Review code coverage reports.",
  ],
};

const problemInsights = {
  explanation: "DevPulse detected 2 issues in this pipeline run. The repository scored 45/100.",
  rootCause: "2 critical CVEs detected. Backend tests failed.",
  issues: ["Critical CVEs found", "Backend tests failed"],
  suggestions: [
    "Run npm audit fix --force",
    "Fix failing backend tests before pushing.",
  ],
};

describe("InsightsPanel", () => {
  it("renders nothing when insights is null", () => {
    const { container } = render(<InsightsPanel insights={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders all-clear state correctly", () => {
    render(<InsightsPanel insights={healthyInsights} />);
    expect(screen.getByTestId("insights-explanation")).toHaveTextContent("All pipeline stages");
  });

  it("does not render root cause when all-clear", () => {
    render(<InsightsPanel insights={healthyInsights} />);
    expect(screen.queryByTestId("insights-rootcause")).not.toBeInTheDocument();
  });

  it("renders explanation for problem state", () => {
    render(<InsightsPanel insights={problemInsights} />);
    expect(screen.getByTestId("insights-explanation")).toHaveTextContent("DevPulse detected 2 issues");
  });

  it("renders root cause when issues exist", () => {
    render(<InsightsPanel insights={problemInsights} />);
    expect(screen.getByTestId("insights-rootcause")).toHaveTextContent("critical CVEs detected");
  });

  it("renders suggestions list", () => {
    render(<InsightsPanel insights={problemInsights} />);
    const suggestions = screen.getByTestId("insights-suggestions");
    expect(suggestions.children).toHaveLength(2);
  });
});
