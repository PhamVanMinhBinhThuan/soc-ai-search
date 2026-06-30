import { requestJson } from "@/services/api-client";
import { isMockMode } from "@/services/search-api";
import { searchMockEvents } from "@/services/mock-search-api";
import type {
  NaturalLanguageSearchResponseDto,
  SearchPlanDto,
  SearchMode,
  AggregationType,
  AggregationResultItemDto,
  ChartMetadataDto,
  SearchEventDto,
} from "@/types/soc";

export async function runSearchPlan(
  searchPlan: SearchPlanDto,
  signal?: AbortSignal,
  summaryQuestion?: string,
  includeSummary = true,
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

  if (!payload || typeof payload !== "object") {
    throw new Error(
      "Backend returned invalid response for search plan execution",
    );
  }

  const responsePayload = payload as Record<string, unknown>;

  // Normalize the backend response (SearchPlanSearchResponse / AggregationSearchResponse)
  // to NaturalLanguageSearchResponseDto so the UI can reuse it.

  const normalizedPayload: NaturalLanguageSearchResponseDto = {
    query_id: `edited-${Date.now()}`,
    original_question: normalizedSummaryQuestion,
    summary:
      (responsePayload.summary as string) || "Executed custom SearchPlan.",
    summary_source:
      responsePayload.summary_source === "llm" ? "llm" : "fallback",
    mode: (responsePayload.mode as SearchMode) || searchPlan.mode,
    search_plan: searchPlan,
    generated_dsl:
      (responsePayload.generated_dsl as Record<string, unknown>) || {},
    total: (responsePayload.total as number) || 0,
    page: (responsePayload.page as number) || searchPlan.page,
    size: (responsePayload.size as number) || searchPlan.size,
    total_pages: (responsePayload.total_pages as number) || 0,
    llm_latency_ms: 0,
    summary_latency_ms: (responsePayload.summary_latency_ms as number) || 0,
    search_latency_ms:
      (responsePayload.search_latency_ms as number) ||
      (responsePayload.latency_ms as number) ||
      0,
    latency_ms: (responsePayload.latency_ms as number) || 0,
    aggregation_type:
      (responsePayload.aggregation_type as AggregationType) || null,
    aggregation_results:
      (responsePayload.aggregation_results as AggregationResultItemDto[]) || [],
    chart_metadata:
      (responsePayload.chart_metadata as ChartMetadataDto) || null,
    events: (responsePayload.events as SearchEventDto[]) || [],
  };

  return normalizedPayload;
}
