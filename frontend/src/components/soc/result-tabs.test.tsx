import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ResultTabs } from "@/components/soc/result-tabs";
import type {
  AggregationResultItemDto,
  ChartMetadataDto,
  NaturalLanguageSearchResponseDto,
  SearchEventDto,
} from "@/types/soc";

afterEach(() => cleanup());

const baseProps = {
  mode: "search" as const,
  activeTab: "raw" as const,
  events: [],
  aggregationResults: [],
  chartMetadata: null,
  total: 0,
  page: 0,
  size: 10,
  totalPages: 0,
  isMockMode: false,
  queryId: "00000000-0000-4000-8000-000000000001",
  exportStatus: "idle" as const,
  exportMessage: null,
  exportDisabled: false,
  onTabChange: vi.fn(),
  onPageChange: vi.fn(),
  onSelectEvent: vi.fn(),
  onExport: vi.fn(),
  response: null,
};

const event: SearchEventDto = {
  event_id: "seed-42-1001",
  timestamp: "2026-06-18T01:02:03Z",
  source: "windows-auth",
  severity: "critical",
  event_type: "failed_login",
  user: "admin",
  host: "dc-prod-01",
  ip: "203.0.113.45",
  country_code: "CN",
  message: "Failed login detected",
};

const aggregationResults: AggregationResultItemDto[] = [
  { key: "admin", value: 42 },
  { key: "root", value: 12 },
];

const chartMetadata: ChartMetadataDto = {
  chart_type: "BAR",
  x_axis_label: "User",
  y_axis_label: "Events",
};

const searchResponse: NaturalLanguageSearchResponseDto = {
  query_id: "00000000-0000-4000-8000-000000000002",
  original_question: "Show failed login events",
  mode: "search",
  search_plan: {
    mode: "search",
    filters: {
      timestamp: { from: "now-24h", to: "now" },
      severity: null,
      event_type: null,
      user: null,
      host: null,
      ip: null,
      country_code: null,
    },
    aggregation: null,
    message_query: null,
    page: 0,
    size: 10,
  },
  generated_dsl: {},
  events: [],
  aggregation_results: [],
  chart_metadata: null,
  total: 0,
  page: 0,
  size: 10,
  total_pages: 0,
  llm_latency_ms: 0,
  search_latency_ms: 0,
  summary_latency_ms: 0,
  latency_ms: 0,
  summary: "",
  summary_source: "fallback",
  aggregation_type: null,
};

const aggregationResponse: NaturalLanguageSearchResponseDto = {
  ...searchResponse,
  mode: "aggregation",
  search_plan: {
    mode: "aggregation",
    filters: {
      timestamp: { from: "now-24h", to: "now" },
      severity: null,
      event_type: null,
      user: null,
      host: null,
      ip: null,
      country_code: null,
    },
    aggregation: {
      type: "top_n",
      field: "ip",
      top_n: 10,
      interval: null,
      order_by: "value",
      order: "desc",
    },
    message_query: null,
    page: 0,
    size: 10,
  },
};

describe("ResultTabs RBAC rendering", () => {
  it("disables CSV export for viewer role", () => {
    render(<ResultTabs {...baseProps} canExportCsv={false} exportDisabled />);

    expect(
      screen.getByRole("button", { name: /csv export requires analyst role/i }),
    ).toBeDisabled();
    expect(screen.getByText(/export locked/i)).toBeInTheDocument();
  });

  it("enables CSV export for analyst/admin roles", () => {
    render(<ResultTabs {...baseProps} canExportCsv />);

    expect(
      screen.getByRole("button", { name: /export results as csv/i }),
    ).toBeEnabled();
  });

  it("disables CSV export while the parent marks export unavailable", () => {
    render(
      <ResultTabs {...baseProps} canExportCsv queryId={null} exportDisabled />,
    );

    expect(
      screen.getByRole("button", { name: /export results as csv/i }),
    ).toBeDisabled();
    expect(screen.getByTitle(/no query available/i)).toBeInTheDocument();
  });
});

describe("ResultTabs polymorphic rendering", () => {
  it("activates event logs for search mode and disables analytics", () => {
    const onSelectEvent = vi.fn();
    render(
      <ResultTabs
        {...baseProps}
        canExportCsv
        events={[event]}
        total={1}
        totalPages={1}
        onSelectEvent={onSelectEvent}
      />,
    );

    expect(screen.queryByRole("tab")).not.toBeInTheDocument();
    expect(screen.queryByText(/analytics view/i)).not.toBeInTheDocument();
    expect(screen.getByText("Source")).toBeInTheDocument();
    expect(screen.getByText("windows-auth")).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("row", { name: /open event seed-42-1001/i }),
    );
    expect(onSelectEvent).toHaveBeenCalledWith("seed-42-1001");
  });

  it("activates analytics for aggregation mode and disables event logs", () => {
    render(
      <ResultTabs
        {...baseProps}
        mode="aggregation"
        activeTab="analytics"
        canExportCsv
        aggregationResults={aggregationResults}
        chartMetadata={chartMetadata}
        total={54}
      />,
    );

    expect(screen.getByRole("tab", { name: /analytics view/i })).toBeEnabled();
    expect(
      screen.queryByRole("tab", { name: /event logs/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/summary table/i)).toBeInTheDocument();
    expect(screen.getByText("admin")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("paginates aggregation summary table at 10 rows without trimming chart data", () => {
    const manyAggregationResults = Array.from({ length: 12 }, (_, index) => ({
      key: `bucket-${index + 1}`,
      value: index + 1,
    }));

    render(
      <ResultTabs
        {...baseProps}
        mode="aggregation"
        activeTab="analytics"
        canExportCsv
        aggregationResults={manyAggregationResults}
        chartMetadata={chartMetadata}
        total={78}
      />,
    );

    expect(screen.getByRole("cell", { name: "bucket-1" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "bucket-10" })).toBeInTheDocument();
    expect(screen.queryByRole("cell", { name: "bucket-11" })).not.toBeInTheDocument();
    expect(screen.getByText(/showing/i)).toHaveTextContent(
      "Showing 1 - 10 of 12",
    );

    fireEvent.click(screen.getByRole("button", { name: /next summary page/i }));

    expect(screen.queryByRole("cell", { name: "bucket-1" })).not.toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "bucket-11" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "bucket-12" })).toBeInTheDocument();
  });

  it("formats date histogram summary table time instead of showing raw UTC ISO", () => {
    render(
      <ResultTabs
        {...baseProps}
        mode="aggregation"
        activeTab="analytics"
        canExportCsv
        aggregationResults={[
          { key: "2026-07-04T11:00:00.000Z", value: 65 },
        ]}
        chartMetadata={{
          chart_type: "LINE",
          x_axis_label: "Time",
          y_axis_label: "Event Count",
        }}
        total={65}
      />,
    );

    expect(
      screen.queryByText("2026-07-04T11:00:00.000Z"),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/04\/07\/2026/)).toBeInTheDocument();
    expect(screen.getByText("65")).toBeInTheDocument();
  });

  it("renders empty state for successful search with no events", () => {
    render(<ResultTabs {...baseProps} canExportCsv />);

    expect(screen.getByText(/no matching events/i)).toBeInTheDocument();
    expect(
      screen.getByText(/no event logs matched the validated SearchPlan/i),
    ).toBeInTheDocument();
  });
});

describe("ResultTabs filter and sort controls", () => {
  it("renders compact search filters with multi-select dropdowns and text inputs", () => {
    render(
      <ResultTabs
        {...baseProps}
        canExportCsv
        response={searchResponse}
        onApplyResultPlan={vi.fn()}
      />,
    );

    expect(screen.getByText(/filter & sort results/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /filter & sort results/i }));
    expect(screen.queryByText(/filters are applied/i)).not.toBeInTheDocument();
    expect(screen.getByText("Severity")).toBeInTheDocument();
    expect(screen.getByText("Event Type")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /select severities/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /select event types/i }),
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText("User")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Source IP")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Message contains")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Newest first")).toBeInTheDocument();
    expect(screen.queryByText(/refine the current result set/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/adjust aggregation bucket ordering/i)).not.toBeInTheDocument();
  });

  it("collapses and expands search filter controls", () => {
    render(
      <ResultTabs
        {...baseProps}
        canExportCsv
        response={searchResponse}
        onApplyResultPlan={vi.fn()}
      />,
    );

    const toggle = screen.getByRole("button", {
      name: /filter & sort results/i,
    });

    expect(screen.queryByPlaceholderText("User")).not.toBeInTheDocument();
    fireEvent.click(toggle);
    expect(screen.getByPlaceholderText("User")).toBeInTheDocument();
    fireEvent.click(toggle);
    expect(screen.queryByPlaceholderText("User")).not.toBeInTheDocument();
  });

  it("applies selected search filters and sort through the callback", () => {
    const onApplyResultPlan = vi.fn();

    render(
      <ResultTabs
        {...baseProps}
        canExportCsv
        response={searchResponse}
        onApplyResultPlan={onApplyResultPlan}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /filter & sort results/i }));

    fireEvent.click(screen.getByRole("button", { name: /select severities/i }));
    fireEvent.click(screen.getByRole("button", { name: /^critical$/i }));
    fireEvent.change(screen.getByPlaceholderText("Source, e.g. vpn"), {
      target: { value: "vpn, windows-auth" },
    });
    fireEvent.change(screen.getByPlaceholderText("User"), {
      target: { value: "admin, vpn.user" },
    });
    fireEvent.change(screen.getByDisplayValue("Newest first"), {
      target: { value: "severity:desc" },
    });
    fireEvent.click(screen.getByRole("button", { name: /apply filters/i }));

    expect(onApplyResultPlan).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "search",
        page: 0,
        filters: expect.objectContaining({
          severity: ["critical"],
          source: ["vpn", "windows-auth"],
          user: ["admin", "vpn.user"],
        }),
        sort: [{ field: "severity", order: "desc" }],
      }),
    );
  });

  it("does not render filter controls for top_n aggregation results", () => {
    render(
      <ResultTabs
        {...baseProps}
        mode="aggregation"
        activeTab="analytics"
        canExportCsv
        aggregationResults={aggregationResults}
        chartMetadata={chartMetadata}
        response={aggregationResponse}
        onApplyResultPlan={vi.fn()}
      />,
    );

    expect(screen.queryByText(/filter & sort results/i)).not.toBeInTheDocument();
    expect(screen.queryByText("Severity")).not.toBeInTheDocument();
    expect(screen.queryByText("Event Type")).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText("User")).not.toBeInTheDocument();
  });

  it("does not render filter controls for count aggregation results", () => {
    render(
      <ResultTabs
        {...baseProps}
        mode="aggregation"
        activeTab="analytics"
        canExportCsv
        aggregationResults={[{ key: "count", value: 137 }]}
        chartMetadata={{
          chart_type: "NUMBER",
          x_axis_label: "Metric",
          y_axis_label: "Events",
        }}
        response={{
          ...aggregationResponse,
          search_plan: {
            ...aggregationResponse.search_plan,
            aggregation: {
              type: "count",
              field: null,
              top_n: null,
              interval: null,
              order_by: null,
              order: null,
            },
          },
        }}
        onApplyResultPlan={vi.fn()}
      />,
    );

    expect(screen.queryByText(/filter & sort results/i)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /apply filters/i }),
    ).not.toBeInTheDocument();
  });

  it("keeps date histogram aggregations time ordered without bucket value sort", () => {
    render(
      <ResultTabs
        {...baseProps}
        mode="aggregation"
        activeTab="analytics"
        canExportCsv
        aggregationResults={aggregationResults}
        chartMetadata={{ ...chartMetadata, chart_type: "LINE" }}
        response={{
          ...aggregationResponse,
          search_plan: {
            ...aggregationResponse.search_plan,
            aggregation: {
              type: "date_histogram",
              field: null,
              top_n: null,
              interval: "hour",
              order_by: null,
              order: null,
            },
          },
        }}
        onApplyResultPlan={vi.fn()}
      />,
    );

    expect(screen.queryByText(/filter & sort results/i)).not.toBeInTheDocument();
    expect(screen.queryByText("Bucket")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /apply filters/i }),
    ).not.toBeInTheDocument();
  });
});
