import { requestJson } from "@/shared/services/api/api-client";
import { assertSearchPlanResponse } from "@/shared/services/api/search-plan-response";
import type {
  SearchPlanDto,
  SearchPlanResponseDto,
} from "@/shared/types/soc";

export const isSearchPlanExecutionMockMode =
  import.meta.env.VITE_USE_MOCK === "true";

export async function executeSearchPlan(
  plan: SearchPlanDto,
  signal?: AbortSignal,
  options: { audit?: boolean } = {},
): Promise<SearchPlanResponseDto> {
  if (isSearchPlanExecutionMockMode) {
    return executeMockSearchPlan(plan, signal);
  }

  const params = new URLSearchParams();
  if (options.audit === false) {
    params.set("audit", "false");
  }
  const query = params.toString();
  const url = query ? `/api/v1/search/plan?${query}` : "/api/v1/search/plan";

  const payload = await requestJson(url, {
    method: "POST",
    signal,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(plan),
  });
  assertSearchPlanResponse(payload);
  return payload;
}

async function executeMockSearchPlan(
  plan: SearchPlanDto,
  signal?: AbortSignal,
): Promise<SearchPlanResponseDto> {
  await waitForMock(signal);

  const isFailedLogins = plan.filters?.event_type?.includes("failed_login");
  const isCriticalHigh = plan.filters?.severity?.includes("critical");
  const baseResponse = (
    total: number,
    latencyMs: number,
  ): Pick<
    SearchPlanResponseDto,
    | "query_id"
    | "total"
    | "page"
    | "size"
    | "total_pages"
    | "latency_ms"
    | "search_latency_ms"
    | "summary_latency_ms"
    | "summary"
    | "summary_source"
  > => ({
    query_id: `00000000-0000-4000-8000-${String(plan.page + plan.size).padStart(12, "0")}`,
    total,
    page: plan.page,
    size: plan.size,
    total_pages:
      plan.mode === "search" && plan.size > 0
        ? Math.ceil(total / plan.size)
        : 0,
    latency_ms: latencyMs,
    search_latency_ms: latencyMs,
    summary_latency_ms: 0,
    summary: null,
    summary_source: null,
  });

  if (plan.mode === "search") {
    const total = isFailedLogins ? 312 : isCriticalHigh ? 482 : 1946;
    return {
      ...baseResponse(total, 50),
      mode: "search",
      generated_dsl: { query: "mock search plan" },
      events: [],
    };
  }

  if (plan.aggregation?.type === "date_histogram") {
    return {
      ...baseResponse(1946, 100),
      mode: "aggregation",
      aggregation_type: "date_histogram",
      generated_dsl: { aggs: "mock date histogram" },
      aggregation_results: Array.from({ length: 24 }).map((_, i) => ({
        key: new Date(Date.now() - (24 - i) * 60 * 60 * 1000).toISOString(),
        value: Math.floor(Math.random() * 500) + 100,
      })),
    };
  }

  if (
    plan.aggregation?.type === "group_by" &&
    plan.aggregation.field === "severity"
  ) {
    return {
      ...baseResponse(1946, 45),
      mode: "aggregation",
      aggregation_type: "group_by",
      generated_dsl: { aggs: "mock severity" },
      aggregation_results: [
        { key: "Critical", value: 186 },
        { key: "High", value: 296 },
        { key: "Medium", value: 742 },
        { key: "Low", value: 722 },
      ],
    };
  }

  if (
    plan.aggregation?.type === "top_n" &&
    plan.aggregation.field === "ip"
  ) {
    return {
      ...baseResponse(1946, 80),
      mode: "aggregation",
      aggregation_type: "top_n",
      generated_dsl: { aggs: "mock top ip" },
      aggregation_results: [
        { key: "203.0.113.45", value: 874 },
        { key: "198.51.100.22", value: 612 },
        { key: "192.0.2.178", value: 433 },
        { key: "203.0.113.91", value: 287 },
        { key: "198.51.100.7", value: 154 },
      ],
    };
  }

  return {
    ...baseResponse(0, 10),
    mode: plan.mode,
    aggregation_type: plan.aggregation?.type ?? null,
    generated_dsl: {},
    aggregation_results: [],
  };
}

function waitForMock(signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("The request was aborted", "AbortError"));
      return;
    }

    const timeout = window.setTimeout(resolve, 300);
    signal?.addEventListener(
      "abort",
      () => {
        window.clearTimeout(timeout);
        reject(new DOMException("The request was aborted", "AbortError"));
      },
      { once: true },
    );
  });
}
