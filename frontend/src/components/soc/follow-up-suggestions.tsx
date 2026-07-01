import { Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { getFollowUpSuggestions } from "@/services/follow-up-suggestions-api";
import type {
  FollowUpSuggestionDto,
  FollowUpSuggestionRequestDto,
  NaturalLanguageSearchResponseDto,
} from "@/types/soc";

type FollowUpSuggestionsProps = {
  response: NaturalLanguageSearchResponseDto;
  question: string;
  enabled: boolean;
  onSelectSuggestion: (question: string) => void;
};

export function FollowUpSuggestions({
  response,
  question,
  enabled,
  onSelectSuggestion,
}: FollowUpSuggestionsProps) {
  const [result, setResult] = useState<{
    key: string;
    suggestions: FollowUpSuggestionDto[];
  } | null>(null);
  const requestKey = `${response.query_id}:${question}`;

  const request = useMemo(
    () => buildRequest(response, question),
    [response, question],
  );

  useEffect(() => {
    if (!enabled || response.total <= 0) {
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
  }, [enabled, request, requestKey, response.total]);

  if (!enabled || response.total <= 0) {
    return null;
  }

  const suggestions = result?.key === requestKey ? result.suggestions : [];
  const isLoading = result?.key !== requestKey;

  if (isLoading) {
    return (
      <section className="rounded-2xl border border-border bg-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-violet-500/15 text-violet-200 ring-1 ring-violet-400/25">
            <Sparkles className="size-4" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              AI Follow-up Suggestions
            </h2>
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-200">
              AI
            </span>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className="h-24 animate-pulse rounded-xl border border-border bg-secondary/30"
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
    <section className="rounded-2xl border border-border bg-card p-4 shadow-[0_0_30px_-24px_#22d3ee]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-violet-500/15 text-violet-200 ring-1 ring-violet-400/25">
            <Sparkles className="size-4" />
          </span>
          <h2 className="text-sm font-semibold text-foreground">
            AI Follow-up Suggestions
          </h2>
        </div>
        <span className="rounded-full border border-violet-400/30 bg-violet-500/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-200">
          AI
        </span>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {suggestions.map((suggestion) => (
          <button
            key={`${suggestion.title}-${suggestion.question}`}
            type="button"
            onClick={() => onSelectSuggestion(suggestion.question)}
            className="group rounded-xl border border-border bg-zinc-950/45 p-3 text-left transition-colors hover:border-cyan-400/40 hover:bg-cyan-400/5"
          >
            <span className="block text-sm font-semibold text-foreground group-hover:text-cyan-100">
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
