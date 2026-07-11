import { useEffect, useRef, useState } from "react";

import { toUiError } from "@/services/api-error-messages";
import { getSearchHistory } from "@/services/history-api";
import type {
  HistoryStatus,
  SearchHistoryPageDto,
  UiError,
} from "@/types/soc";

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

type UseSearchHistoryModalOptions = {
  canViewHistory: boolean;
  pageSize: number;
};

export function useSearchHistoryModal({
  canViewHistory,
  pageSize,
}: UseSearchHistoryModalOptions) {
  const [open, setOpen] = useState(false);
  const [response, setResponse] = useState<SearchHistoryPageDto | null>(null);
  const [status, setStatus] = useState<HistoryStatus>("idle");
  const [error, setError] = useState<UiError | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const openRef = useRef(false);
  const pageRef = useRef(0);

  useEffect(
    () => () => {
      abortRef.current?.abort();
    },
    [],
  );

  const load = async (page: number) => {
    pageRef.current = page;

    if (!canViewHistory) {
      setStatus("idle");
      setError({
        status: 403,
        message: "You do not have permission to view search history.",
        errors: [],
      });
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setStatus("loading");
    setError(null);

    try {
      const nextHistory = await getSearchHistory(
        page,
        pageSize,
        {},
        controller.signal,
      );
      if (controller.signal.aborted) {
        return;
      }
      setResponse(nextHistory);
      setStatus(nextHistory.items.length === 0 ? "empty" : "success");
    } catch (caughtError) {
      if (isAbortError(caughtError)) {
        return;
      }
      setError(toUiError(caughtError));
      setStatus("error");
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
      }
    }
  };

  const setModalOpen = (nextOpen: boolean) => {
    const allowedOpen = nextOpen && canViewHistory;
    openRef.current = allowedOpen;
    setOpen(allowedOpen);

    if (!allowedOpen) {
      abortRef.current?.abort();
      abortRef.current = null;
      return;
    }

    void load(0);
  };

  const openRecentQueries = () => {
    setModalOpen(true);
  };

  const close = () => {
    setModalOpen(false);
  };

  return {
    open,
    response,
    status,
    error,
    openRef,
    pageRef,
    load,
    setModalOpen,
    openRecentQueries,
    close,
  };
}
