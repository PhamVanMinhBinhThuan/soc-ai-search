import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { QueryBreakdown } from "@/components/soc/query-breakdown";
import type { SearchPlanDto } from "@/types/soc";

afterEach(() => cleanup());

const searchPlan: SearchPlanDto = {
  mode: "search",
  filters: {
    timestamp: { from: "now-24h", to: "now" },
    severity: ["high"],
    event_type: ["failed_login"],
    user: "admin",
    host: null,
    ip: null,
    country_code: ["CN"],
  },
  aggregation: null,
  message_query: null,
  sort: [{ field: "timestamp", order: "desc" }],
  page: 0,
  size: 10,
};

describe("QueryBreakdown", () => {
  it("renders search mode fields without null rows", () => {
    render(<QueryBreakdown searchPlan={searchPlan} />);

    expect(screen.getByText("Query Breakdown")).toBeInTheDocument();
    expect(screen.getByText("Search")).toBeInTheDocument();
    expect(screen.getByText("Last 24 hours to now")).toBeInTheDocument();
    expect(screen.getByText("failed_login")).toBeInTheDocument();
    expect(screen.getByText("Event logs table")).toBeInTheDocument();
    expect(screen.queryByText("Host")).not.toBeInTheDocument();
  });

  it("renders top_n aggregation details", () => {
    render(
      <QueryBreakdown
        searchPlan={{
          ...searchPlan,
          mode: "aggregation",
          aggregation: {
            type: "top_n",
            field: "ip",
            top_n: 5,
            interval: null,
            order_by: "value",
            order: "desc",
          },
          sort: null,
        }}
      />,
    );

    expect(screen.getAllByText("Aggregation").length).toBeGreaterThan(0);
    expect(screen.getByText("Top N")).toBeInTheDocument();
    expect(screen.getByText("Source IP")).toBeInTheDocument();
    expect(screen.getByText("Top 5")).toBeInTheDocument();
    expect(screen.getByText("Bar chart")).toBeInTheDocument();
  });

  it("renders date_histogram as a line chart", () => {
    render(
      <QueryBreakdown
        searchPlan={{
          ...searchPlan,
          mode: "aggregation",
          aggregation: {
            type: "date_histogram",
            field: null,
            top_n: null,
            interval: "hour",
          },
        }}
      />,
    );

    expect(screen.getByText("Time series")).toBeInTheDocument();
    expect(screen.getByText("hour")).toBeInTheDocument();
    expect(screen.getByText("Line chart")).toBeInTheDocument();
  });

  it("renders an empty state when SearchPlan is missing", () => {
    render(<QueryBreakdown searchPlan={null} />);

    expect(
      screen.getByText("No SearchPlan available to build a query breakdown."),
    ).toBeInTheDocument();
  });
});
