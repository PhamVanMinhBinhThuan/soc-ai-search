import "@testing-library/jest-dom/vitest";

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AggregationChart } from "@/components/soc/aggregation-chart";

describe("AggregationChart", () => {
  it("renders top entity aggregations as top results", () => {
    render(
      <AggregationChart
        data={[
          { key: "198.51.100.200", value: 1599 },
          { key: "10.10.1.15", value: 1589 },
        ]}
        metadata={{
          chart_type: "BAR",
          x_axis_label: "IP",
          y_axis_label: "Count",
        }}
        aggregationField="ip"
        aggregationType="top_n"
      />,
    );

    expect(screen.getByText(/top results/i)).toBeInTheDocument();
    expect(screen.queryByText(/threat ranking/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/top buckets by/i)).not.toBeInTheDocument();
    expect(screen.getByText("#1")).toBeInTheDocument();
    expect(screen.getByText("198.51.100.200")).toBeInTheDocument();
    expect(screen.getByText("1,599")).toBeInTheDocument();
  });
});
