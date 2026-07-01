import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { FollowUpSuggestions } from "@/components/soc/follow-up-suggestions";
import { getFollowUpSuggestions } from "@/services/follow-up-suggestions-api";
import type { NaturalLanguageSearchResponseDto } from "@/types/soc";

vi.mock("@/services/follow-up-suggestions-api", () => ({
  getFollowUpSuggestions: vi.fn(),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const response: NaturalLanguageSearchResponseDto = {
  query_id: "00000000-0000-4000-8000-000000000023",
  original_question: "Show failed login attempts from China in the last 24h",
  mode: "search",
  search_plan: {
    mode: "search",
    filters: {
      timestamp: { from: "now-24h", to: "now" },
      severity: null,
      event_type: ["failed_login"],
      user: null,
      host: null,
      ip: null,
      country_code: ["CN"],
    },
    aggregation: null,
    message_query: null,
    page: 0,
    size: 10,
  },
  generated_dsl: {},
  total: 188,
  page: 0,
  size: 10,
  total_pages: 19,
  llm_latency_ms: 120,
  search_latency_ms: 8,
  summary_latency_ms: 90,
  latency_ms: 218,
  summary: "Failed login activity was detected.",
  summary_source: "llm",
  aggregation_type: null,
  aggregation_results: [],
  chart_metadata: null,
  events: [
    {
      event_id: "seed-1",
      timestamp: "2026-06-29T10:00:00Z",
      source: "windows-auth",
      severity: "high",
      event_type: "failed_login",
      user: "admin",
      host: "vpn-gw-01",
      ip: "203.0.113.45",
      country_code: "CN",
      message: "Failed login detected",
    },
  ],
};

describe("FollowUpSuggestions", () => {
  it("shows a loading skeleton while requesting suggestions", () => {
    vi.mocked(getFollowUpSuggestions).mockReturnValue(new Promise(() => undefined));

    render(
      <FollowUpSuggestions
        response={response}
        question={response.original_question}
        enabled
        onSelectSuggestion={vi.fn()}
      />,
    );

    expect(screen.getByText("Next Investigation Steps")).toBeInTheDocument();
    expect(screen.queryByText("AI")).not.toBeInTheDocument();
    expect(getFollowUpSuggestions).toHaveBeenCalledTimes(1);
  });

  it("renders LLM suggestions and lets the user select without submitting", async () => {
    const onSelectSuggestion = vi.fn();
    vi.mocked(getFollowUpSuggestions).mockResolvedValue({
      source: "llm",
      suggestions: [
        {
          title: "Top source IPs",
          question:
            "Show the top 5 source IPs for failed_login events in the last 24 hours",
        },
        {
          title: "Affected users",
          question: "Group failed_login events by user in the last 24 hours",
        },
        {
          title: "Failed login trend",
          question: "Show failed_login trend by hour in the last 24 hours",
        },
      ],
    });

    render(
      <FollowUpSuggestions
        response={response}
        question={response.original_question}
        enabled
        onSelectSuggestion={onSelectSuggestion}
      />,
    );

    await screen.findByText("Top source IPs");
    
    expect(screen.getByText("Next Investigation Steps")).toBeInTheDocument();
    expect(screen.queryByText("AI")).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("Top source IPs"));

    expect(onSelectSuggestion).toHaveBeenCalledWith(
      "Show the top 5 source IPs for failed_login events in the last 24 hours",
    );
  });

  it("hides the section when the backend returns empty suggestions", async () => {
    vi.mocked(getFollowUpSuggestions).mockResolvedValue({
      source: "none",
      suggestions: [],
    });

    render(
      <FollowUpSuggestions
        response={response}
        question={response.original_question}
        enabled
        onSelectSuggestion={vi.fn()}
      />,
    );

    await waitFor(() =>
      expect(screen.queryByText("Next Investigation Steps")).not.toBeInTheDocument(),
    );
  });

  it("does not request suggestions when disabled", () => {
    render(
      <FollowUpSuggestions
        response={response}
        question={response.original_question}
        enabled={false}
        onSelectSuggestion={vi.fn()}
      />,
    );

    expect(getFollowUpSuggestions).not.toHaveBeenCalled();
    expect(screen.queryByText("Next Investigation Steps")).not.toBeInTheDocument();
  });
});
