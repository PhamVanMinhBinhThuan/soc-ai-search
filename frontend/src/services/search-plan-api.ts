import { requestJson } from "@/services/api-client";
import { isMockMode } from "@/services/search-api";
import { searchMockEvents } from "@/services/mock-search-api";
import {
  assertSearchPlanResponse,
  normalizeSearchPlanResponse,
} from "@/services/search-plan-response";
import type { NaturalLanguageSearchResponseDto, SearchPlanDto } from "@/types/soc";

export async function runSearchPlan(
  searchPlan: SearchPlanDto,
  signal?: AbortSignal,
  summaryQuestion?: string,
  includeSummary = true,
  audit = true,
): Promise<NaturalLanguageSearchResponseDto> {
  const normalizedSummaryQuestion =
    summaryQuestion?.trim() || "Edited SearchPlan";

  if (isMockMode) {
    // For mock mode, just run a standard search with an explicit mock question
    return searchMockEvents(
      {
        question: normalizedSummaryQuestion,
        page: searchPlan.page,
        size: searchPlan.size,
      },
      signal,
    );
  }

  const params = new URLSearchParams({
    include_summary: includeSummary ? "true" : "false",
    audit: audit ? "true" : "false",
  });
  params.set("summary_question", normalizedSummaryQuestion);

  const payload = (await requestJson(
    `/api/v1/search/plan?${params.toString()}`,
    {
      method: "POST",
      signal,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(searchPlan),
    },
  )) as unknown;

  assertSearchPlanResponse(payload, { requireSummary: includeSummary });
  return normalizeSearchPlanResponse(
    payload,
    searchPlan,
    normalizedSummaryQuestion,
  );
}
