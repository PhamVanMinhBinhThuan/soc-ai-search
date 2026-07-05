import {
  AlertCircle,
  FileQuestion,
  LoaderCircle,
  RotateCcw,
  Search,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { SearchMode, UiError } from "@/types/soc";

export function SearchLoadingState() {
  return (
    <div className="space-y-4" aria-live="polite" aria-busy="true">
      <span className="sr-only">Searching SOC events</span>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }, (_, index) => (
          <Card
            key={index}
            className="flex-row items-center gap-3 border-cyan-400/15 bg-zinc-950/50 p-3 py-3 shadow-[0_0_24px_-20px_#22d3ee]"
          >
            <Skeleton className="size-9 shrink-0 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-2.5 w-20" />
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-2.5 w-28" />
            </div>
          </Card>
        ))}
      </div>
      <Card className="gap-3 border-cyan-400/20 bg-zinc-950/55 p-4 shadow-[0_0_35px_-24px_#22d3ee]">
        <div className="flex items-center gap-2 text-sm font-medium">
          <LoaderCircle className="size-4 animate-spin text-violet-300" />
          Generating SearchPlan and querying Elasticsearch
        </div>
        <Skeleton className="h-72 w-full rounded-xl" />
      </Card>
    </div>
  );
}

export function SearchIdleState() {
  return (
    <Card className="relative grid min-h-72 place-items-center overflow-hidden border-dashed border-cyan-400/25 bg-zinc-950/45 p-8 text-center shadow-[0_0_34px_-26px_#22d3ee]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(34,211,238,0.1),transparent_34%)]" />
      <div>
        <span className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl border border-violet-300/30 bg-violet-500/15 text-violet-200 shadow-[0_0_24px_-10px_#a78bfa]">
          <Search className="size-5" />
        </span>
        <h2 className="font-semibold text-slate-50">Start a SOC investigation</h2>
        <p className="mt-2 max-w-md text-xs leading-5 text-muted-foreground">
          Enter a natural-language question or choose a Suggested Query.
        </p>
      </div>
    </Card>
  );
}

export function SearchEmptyState({ mode }: { mode: SearchMode }) {
  return (
    <Card className="grid min-h-64 place-items-center border-dashed border-cyan-400/20 bg-zinc-950/45 p-8 text-center">
      <div>
        <span className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-200">
          <FileQuestion className="size-5" />
        </span>
        <h2 className="font-semibold">No matching results</h2>
        <p className="mt-2 max-w-md text-xs leading-5 text-muted-foreground">
          {mode === "search"
            ? "The query completed successfully, but no SOC events matched the filters."
            : "The query completed successfully, but Elasticsearch returned no aggregation buckets."}
        </p>
      </div>
    </Card>
  );
}

export function SearchErrorState({
  error,
  onRetry,
}: {
  error: UiError;
  onRetry: () => void;
}) {
  return (
    <Alert className="border-rose-400/35 bg-rose-500/10 shadow-[0_0_28px_-20px_#ff2d55]">
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 size-5 shrink-0 text-rose-300" />
        <div className="min-w-0 flex-1">
          <AlertTitle className="text-rose-200">
            Search request failed
          </AlertTitle>
          <AlertDescription>
            <p>{error.message}</p>
            {error.errors.length > 0 ? (
              <ul className="mt-2 list-disc space-y-1 pl-4">
                {error.errors.slice(0, 4).map((message) => (
                  <li key={message}>{message}</li>
                ))}
              </ul>
            ) : null}
            {error.status > 0 ? (
              <p className="mt-2 font-mono text-[11px]">
                HTTP status: {error.status}
              </p>
            ) : null}
          </AlertDescription>
        </div>
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RotateCcw />
          Retry
        </Button>
      </div>
    </Alert>
  );
}
