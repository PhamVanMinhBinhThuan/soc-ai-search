import { useEffect, useRef, useState } from "react";

import { toUiError } from "@/shared/services/api/api-error-messages";
import { downloadCsvBlob, exportSearchCsv } from "@/features/search/services/csv-export-api";
import { downloadMockCsv } from "@/features/search/lib/mock-presentation";
import type {
  ExportStatus,
  NaturalLanguageSearchResponseDto,
} from "@/shared/types/soc";

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

type ExportSearchOptions = {
  queryId?: string;
  response?: NaturalLanguageSearchResponseDto | null;
  canExport: boolean;
  isMockMode: boolean;
};

export function useSearchExport() {
  const [status, setStatus] = useState<ExportStatus>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(
    () => () => {
      abortRef.current?.abort();
    },
    [],
  );

  const reset = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStatus("idle");
    setMessage(null);
  };

  const exportSearch = async ({
    queryId,
    response,
    canExport,
    isMockMode,
  }: ExportSearchOptions) => {
    const targetQueryId = queryId ?? response?.query_id;
    if (!targetQueryId || !canExport) {
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setStatus("loading");
    setMessage(null);

    try {
      if (isMockMode) {
        if (!queryId && response) {
          downloadMockCsv({
            mode: response.mode,
            events: response.events,
            aggregationResults: response.aggregation_results,
          });
          setMessage(null);
        } else {
          setMessage(
            "Exporting historical query is not fully supported in pure mock mode.",
          );
        }
      } else {
        const exported = await exportSearchCsv(targetQueryId, controller.signal);
        if (controller.signal.aborted) {
          return;
        }
        downloadCsvBlob(exported.blob, exported.filename);
        setMessage(null);
      }
      setStatus("success");
    } catch (caughtError) {
      if (isAbortError(caughtError)) {
        return;
      }
      const uiError = toUiError(caughtError);
      setStatus("error");
      setMessage(
        [uiError.message, ...uiError.errors].filter(Boolean).join(" "),
      );
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
      }
    }
  };

  return {
    status,
    message,
    reset,
    exportSearch,
  };
}
