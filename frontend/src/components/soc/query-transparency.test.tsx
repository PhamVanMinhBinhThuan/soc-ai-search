import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { QueryTransparency } from "@/components/soc/query-transparency";
import type { SearchPlanDto } from "@/types/soc";

vi.mock("@uiw/react-codemirror", () => ({
  default: () => <textarea aria-label="SearchPlan editor" />,
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
});
