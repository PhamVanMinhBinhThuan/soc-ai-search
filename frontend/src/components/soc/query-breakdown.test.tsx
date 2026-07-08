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
    expect(screen.getByText("CN")).toBeInTheDocument();
    expect(screen.queryByText("China")).not.toBeInTheDocument();
    expect(screen.getByText("Event logs table")).toBeInTheDocument();
    expect(screen.queryByText("Host")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Human-readable SearchPlan fields"),
    ).not.toBeInTheDocument();
  });

  it("formats multiple known country codes and keeps unknown codes readable", () => {
    render(
      <QueryBreakdown
        searchPlan={{
          ...searchPlan,
          filters: {
            ...searchPlan.filters,
            country_code: ["VN", "CN", "XX"],
          },
        }}
      />,
    );

    expect(screen.getByText("VN")).toBeInTheDocument();
    expect(screen.getByText("CN")).toBeInTheDocument();
    expect(screen.getByText("XX")).toBeInTheDocument();
  });

  it("renders multi-value entity filters", () => {
    render(
      <QueryBreakdown
        searchPlan={{
          ...searchPlan,
          filters: {
            ...searchPlan.filters,
            source: ["vpn", "windows-auth"],
            event_id: ["6f1d4c8e-1d93-4a27-9e87-9b7a9e9d8a12"],
            user: ["admin", "vpn.user"],
            host: ["vpn-gw-01", "web-01"],
            ip: ["203.0.113.45", "198.51.100.200"],
          },
        }}
      />,
    );

    expect(screen.getByText("vpn, windows-auth")).toBeInTheDocument();
    expect(screen.getByText("6f1d4c8e-1d93-4a27-9e87-9b7a9e9d8a12")).toBeInTheDocument();
    expect(screen.getByText("admin, vpn.user")).toBeInTheDocument();
    expect(screen.getByText("vpn-gw-01, web-01")).toBeInTheDocument();
    expect(screen.getByText("203.0.113.45, 198.51.100.200")).toBeInTheDocument();
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
