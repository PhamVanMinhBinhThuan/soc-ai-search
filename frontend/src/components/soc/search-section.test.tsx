import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SearchSection } from "@/components/soc/search-section";
import type { MockScenario } from "@/types/soc";

afterEach(() => cleanup());

const scenario = {
  question: "Show failed login attempts from China in the last 24h",
  shortLabel: "Failed login from China",
  mode: "search",
  total: 0,
  llm_latency_ms: 0,
  search_latency_ms: 0,
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
  aggregation_results: [],
  events: [],
  summary: "",
} satisfies MockScenario;

function SearchSectionHarness({
  onSubmit,
}: {
  onSubmit: (question: string) => void;
}) {
  const [question, setQuestion] = useState("");
  const [focusSignal, setFocusSignal] = useState(0);

  return (
    <SearchSection
      question={question}
      scenarios={[scenario]}
      isLoading={false}
      isMockMode={false}
      onQuestionChange={setQuestion}
      onSubmitQuestion={onSubmit}
      onSelectSuggestion={(nextQuestion) => {
        setQuestion(nextQuestion);
        setFocusSignal((value) => value + 1);
      }}
      focusSignal={focusSignal}
    />
  );
}

describe("SearchSection suggestions", () => {
  it("fills and focuses the search box without submitting immediately", async () => {
    const onSubmit = vi.fn();

    render(<SearchSectionHarness onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole("button", { name: /failed login from china/i }));

    const searchBox = screen.getByRole("textbox", {
      name: /natural language search question/i,
    });

    expect(searchBox).toHaveValue(scenario.question);
    await waitFor(() => expect(searchBox).toHaveFocus());
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

describe("SearchSection additional buttons", () => {
  it("renders View queries and Recent Queries when handlers are provided", () => {
    const onOpenLibrary = vi.fn();
    const onOpenRecent = vi.fn();
    render(
      <SearchSection
        question=""
        scenarios={[]}
        isLoading={false}
        isMockMode={false}
        onQuestionChange={vi.fn()}
        onSubmitQuestion={vi.fn()}
        onSelectSuggestion={vi.fn()}
        onOpenQueryLibrary={onOpenLibrary}
        onOpenRecentQueries={onOpenRecent}
      />
    );

    const libBtn = screen.getByRole("button", { name: /view queries/i });
    const recentBtn = screen.getByRole("button", { name: /recent queries/i });
    
    expect(libBtn).toBeInTheDocument();
    expect(recentBtn).toBeInTheDocument();

    fireEvent.click(libBtn);
    expect(onOpenLibrary).toHaveBeenCalledTimes(1);

    fireEvent.click(recentBtn);
    expect(onOpenRecent).toHaveBeenCalledTimes(1);
  });
});
