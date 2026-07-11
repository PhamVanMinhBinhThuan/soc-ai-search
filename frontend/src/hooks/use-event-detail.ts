import { useEffect, useRef, useState } from "react";

import { toUiError } from "@/services/api-error-messages";
import { getEventDetail } from "@/services/search-api";
import type {
  DetailStatus,
  EventDetailResponseDto,
  UiError,
} from "@/types/soc";

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

type UseEventDetailOptions = {
  canViewEventDetail: boolean;
};

export function useEventDetail({
  canViewEventDetail,
}: UseEventDetailOptions) {
  const [open, setOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [eventDetail, setEventDetail] =
    useState<EventDetailResponseDto | null>(null);
  const [status, setStatus] = useState<DetailStatus>("idle");
  const [error, setError] = useState<UiError | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(
    () => () => {
      abortRef.current?.abort();
    },
    [],
  );

  const close = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setOpen(false);
    setSelectedEventId(null);
    setEventDetail(null);
    setError(null);
    setStatus("idle");
  };

  const load = async (eventId: string) => {
    if (!canViewEventDetail) {
      setEventDetail(null);
      setError({
        status: 403,
        message: "You do not have permission to view event details.",
        errors: [],
      });
      setStatus("error");
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setEventDetail(null);
    setError(null);
    setStatus("loading");

    try {
      const detail = await getEventDetail(eventId, controller.signal);
      if (controller.signal.aborted) {
        return;
      }
      setEventDetail(detail);
      setStatus("success");
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

  const openEventDetail = (eventId: string) => {
    setSelectedEventId(eventId);
    setOpen(true);
    void load(eventId);
  };

  const retry = () => {
    if (selectedEventId) {
      void load(selectedEventId);
    }
  };

  return {
    open,
    eventDetail,
    status,
    error,
    selectedEventId,
    close,
    openEventDetail,
    retry,
  };
}
