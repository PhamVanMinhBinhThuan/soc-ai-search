import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { InvestigationDetailPanel } from "@/components/soc/investigations/investigation-detail-panel";
import type { SearchHistoryDetailDto } from "@/types/soc";

afterEach(() => cleanup());

const detail: SearchHistoryDetailDto = {
  query_id: "00000000-0000-4000-8000-000000000123",
  question: "Show failed login events",
  mode: "search",
  result_count: 12,
  latency_ms: 7,
  status: "SUCCESS",
  created_at: "2026-06-18T01:02:03Z",
  pinned: false,
  pinned_at: null,
  summary: null,
  search_plan: {
    mode: "search",
    filters: {
      timestamp: { from: "now-24h", to: "now" },
      severity: null,
      event_type: ["failed_login"],
      user: "admin",
      host: null,
      ip: null,
      country_code: null,
    },
    aggregation: null,
    message_query: null,
    page: 0,
    size: 10,
  },
  generated_dsl: { query: { match_all: {} } },
};

describe("InvestigationDetailPanel", () => {
  it("shows Query Breakdown as the default detail tab", () => {
    render(<InvestigationDetailPanel item={detail} onClose={() => undefined} />);

    expect(screen.getByRole("button", { name: "Query Breakdown" })).toHaveClass(
      "text-cyan-300",
    );
    expect(screen.getByText("failed_login")).toBeInTheDocument();
    expect(screen.getByText("Event logs table")).toBeInTheDocument();
  });

  it("keeps tabs but shows empty states for old records without plan or DSL", () => {
    render(
      <InvestigationDetailPanel
        item={{ ...detail, search_plan: null, generated_dsl: null }}
        onClose={() => undefined}
      />,
    );

    expect(
      screen.getByText("No SearchPlan available to build a query breakdown."),
    ).toBeInTheDocument();
  });
});
