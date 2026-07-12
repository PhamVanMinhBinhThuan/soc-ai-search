import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { QueryTransparency } from "@/features/search/components/query-transparency";
import type { SearchPlanDto } from "@/shared/types/soc";

vi.mock("@uiw/react-codemirror", () => ({
  default: () => <textarea aria-label="SearchPlan editor" />,
}));

vi.mock("@/features/search/services/query-refinement-api", () => ({
  refineQuery: vi.fn(async () => ({
    rewritten_question:
      "Show failed login events from China for admin or vpn.user in the last 7 days",
    source: "gemini",
    latency_ms: 12,
  })),
}));

afterEach(() => cleanup());

const searchPlan: SearchPlanDto = {
  mode: "search",
  filters: {
    timestamp: { from: "now-24h", to: "now" },
    severity: null,
    event_type: ["failed_login"],
    user: null,
    host: null,
    ip: null,
    country_code: null,
  },
  aggregation: null,
  message_query: null,
  page: 0,
  size: 10,
};

describe("QueryTransparency", () => {
  it("shows Query Breakdown before SearchPlan and DSL tabs", () => {
    render(
      <QueryTransparency
        searchPlan={searchPlan}
        generatedDsl={{ query: { match_all: {} } }}
      />,
    );

    const tabs = screen.getAllByRole("tab").map((tab) => tab.textContent);
    expect(tabs).toEqual([
      "Query Breakdown",
      "Validated SearchPlan",
      "Compiled DSL",
    ]);
    expect(screen.getByText("Event logs table")).toBeInTheDocument();
  });

  it("applies an AI query correction and reruns the safe search flow", async () => {
    const onApplyQueryUpdate = vi.fn();

    render(
      <QueryTransparency
        searchPlan={searchPlan}
        generatedDsl={{ query: { match_all: {} } }}
        currentQuestion="Show failed login events from China in the last 24h"
        originalQuestion="Show failed login events from China in the last 24h"
        onApplyQueryUpdate={onApplyQueryUpdate}
      />,
    );

    expect(screen.getByText("Correct or Refine Query")).toBeInTheDocument();
    
    expect(screen.queryByText(/AI assisted/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Describe what should be corrected or refined/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/AI only updates the question/i)).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Correction or refinement note"), {
      target: {
        value: "Add admin or vpn.user and change the time range to 7 days",
      },
    });
    fireEvent.click(screen.getByRole("button", { name: /^Refine$/i }));

    await waitFor(() =>
      expect(onApplyQueryUpdate).toHaveBeenCalledWith({
        rewrittenQuestion:
          "Show failed login events from China for admin or vpn.user in the last 7 days",
        feedback: "Add admin or vpn.user and change the time range to 7 days",
        originalQuestion: "Show failed login events from China in the last 24h",
      }),
    );
  });

  it("shows the Compiled DSL read-only badge only once", async () => {
    render(
      <QueryTransparency
        searchPlan={searchPlan}
        generatedDsl={{ query: { match_all: {} } }}
      />,
    );

    fireEvent.click(screen.getByRole("tab", { name: /compiled dsl/i }));

    await waitFor(() =>
      expect(screen.getByText("compiled_dsl.json")).toBeInTheDocument(),
    );
    expect(screen.getAllByText("Read-only")).toHaveLength(1);
  });
});
