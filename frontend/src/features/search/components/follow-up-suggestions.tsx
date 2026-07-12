import { Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { getFollowUpSuggestions } from "@/features/search/services/follow-up-suggestions-api";
import type {
  FollowUpSuggestionDto,
  FollowUpSuggestionRequestDto,
  NaturalLanguageSearchResponseDto,
} from "@/shared/types/soc";

type FollowUpSuggestionsProps = {
  response: NaturalLanguageSearchResponseDto;
  question: string;
  enabled: boolean;
  suggestionKey: string | null;
  onSelectSuggestion: (question: string) => void;
};

export function FollowUpSuggestions({
  response,
  question,
  enabled,
  suggestionKey,
  onSelectSuggestion,
}: FollowUpSuggestionsProps) {
  const [result, setResult] = useState<{
    key: string;
    suggestions: FollowUpSuggestionDto[];
  } | null>(null);
  const requestKey = suggestionKey ?? `${response.query_id}:${question}`;

  const request = useMemo(
    () => buildRequest(response, question),
    [response, question],
  );

  useEffect(() => {
    if (!enabled || response.total <= 0) {
      return;
    }

    if (result?.key === requestKey) {
      return;
    }

    const controller = new AbortController();
    const key = requestKey;

    getFollowUpSuggestions(request, controller.signal)
      .then((payload) => {
        if (controller.signal.aborted) {
          return;
        }
        setResult({
          key,
          suggestions: payload.source === "llm" ? payload.suggestions : [],
        });
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        setResult({ key, suggestions: [] });
      });

    return () => controller.abort();
  }, [enabled, request, requestKey, response.total, result?.key]);

  if (!enabled || response.total <= 0) {
    return null;
  }

  const suggestions = result?.key === requestKey ? result.suggestions : [];
  const isLoading = result?.key !== requestKey;

  if (isLoading) {
    return (
      <section className="rounded-2xl border border-cyan-400/20 bg-zinc-950/50 p-4 shadow-[0_0_32px_-24px_#22d3ee]">
        <div className="mb-3 flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-xl border border-violet-300/30 bg-violet-500/15 text-violet-200 ring-1 ring-violet-400/25">
            <Sparkles className="size-4" />
          </span>
          <h2 className="text-sm font-semibold text-foreground">
            Next Investigation Steps
          </h2>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className="h-24 animate-pulse rounded-xl border border-cyan-400/15 bg-cyan-400/5"
            />
          ))}
        </div>
      </section>
    );
  }

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <section className="relative overflow-hidden rounded-2xl border border-cyan-400/25 bg-zinc-950/55 p-4 shadow-[0_0_34px_-22px_#22d3ee]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(34,211,238,0.12),transparent_30%)]" />
      <div className="mb-3 flex items-center gap-2">
        <span className="relative flex size-8 items-center justify-center rounded-xl border border-violet-300/30 bg-violet-500/15 text-violet-200 ring-1 ring-violet-400/25">
          <Sparkles className="size-4" />
        </span>
        <h2 className="relative text-sm font-semibold text-slate-50">
          Next Investigation Steps
        </h2>
      </div>

      <div className="relative grid gap-3 md:grid-cols-3">
        {suggestions.map((suggestion) => (
          <button
            key={`${suggestion.title}-${suggestion.question}`}
            type="button"
            onClick={() => onSelectSuggestion(suggestion.question)}
            className="group rounded-xl border border-cyan-400/15 bg-[#07131c]/80 p-3 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition hover:-translate-y-0.5 hover:border-cyan-300/45 hover:bg-cyan-400/10 hover:shadow-[0_0_24px_-16px_#22d3ee]"
          >
            <span className="block text-sm font-semibold text-slate-50 group-hover:text-cyan-100">
              {suggestion.title}
            </span>
            <span className="mt-2 block text-xs leading-5 text-muted-foreground group-hover:text-slate-300">
              {suggestion.question}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

function buildRequest(
  response: NaturalLanguageSearchResponseDto,
  question: string,
): FollowUpSuggestionRequestDto {
  return {
    question,
    search_plan: response.search_plan,
    result_count: response.total,
    mode: response.mode,
    sample_events: response.events.slice(0, 5).map((event) => ({
      event_type: event.event_type,
      severity: event.severity,
      user: event.user,
      host: event.host,
      ip: event.ip,
      country_code: event.country_code,
    })),
    aggregation_buckets: response.aggregation_results
      .slice(0, 5)
      .map((bucket) => ({
        key: bucket.key,
        value: bucket.value,
      })),
  };
}
