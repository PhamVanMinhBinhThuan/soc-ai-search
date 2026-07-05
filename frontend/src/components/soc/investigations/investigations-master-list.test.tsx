import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { InvestigationsMasterList } from "./investigations-master-list";
import type { SearchHistoryItemDto } from "@/types/soc";

afterEach(() => cleanup());

const items: SearchHistoryItemDto[] = [
  {
    query_id: "00000000-0000-4000-8000-000000000001",
    question:
      "[Edited SearchPlan] Original question: Show failed login attempts from China in the last 24h",
    mode: "search",
    result_count: 43,
    latency_ms: 12,
    status: "SUCCESS",
    created_at: "2026-07-05T01:02:03Z",
    pinned: false,
    pinned_at: null,
  },
  {
    query_id: "00000000-0000-4000-8000-000000000002",
    question: "Show failed login trend by hour in the last 24 hours",
    mode: "aggregation",
    result_count: 188,
    latency_ms: 18,
    status: "SUCCESS",
    created_at: "2026-07-05T02:02:03Z",
    pinned: true,
    pinned_at: "2026-07-05T02:03:03Z",
  },
];

function renderList(overrides: Partial<Parameters<typeof InvestigationsMasterList>[0]> = {}) {
  render(
    <InvestigationsMasterList
      items={items}
      activeId={null}
      onSelect={vi.fn()}
      questionQuery=""
      onQuestionQueryChange={vi.fn()}
      pinnedOnly={false}
      onPinnedOnlyChange={vi.fn()}
      modeFilter="all"
      onModeFilterChange={vi.fn()}
      statusFilter="all"
      onStatusFilterChange={vi.fn()}
      page={0}
      total={items.length}
      totalPages={1}
      onPageChange={vi.fn()}
      expanded
      onTogglePin={vi.fn()}
      {...overrides}
    />,
  );
}

describe("InvestigationsMasterList enterprise UI behavior", () => {
  it("renders filters, prefix badges, and one-page footer", () => {
    renderList();

    expect(screen.getAllByPlaceholderText(/search questions/i).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: /pinned only/i }).length).toBeGreaterThan(0);
    expect(screen.getByText("Edited SearchPlan")).toBeInTheDocument();
    expect(
      screen.getByText("Show failed login attempts from China in the last 24h"),
    ).toBeInTheDocument();
    expect(screen.getByText(/Page 1 of 1/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /previous page/i })).not.toBeInTheDocument();
  });

  it("renders empty state without pagination when there are no results", () => {
    renderList({ items: [], total: 0, totalPages: 0 });

    expect(screen.getByText("No investigations found")).toBeInTheDocument();
    expect(screen.queryByText(/Page 1 of 1/i)).not.toBeInTheDocument();
  });
});
