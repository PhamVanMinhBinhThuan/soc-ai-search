import { useEffect, useRef, useState } from "react";
import type { NavigateFunction } from "react-router-dom";

import type { ResultTab } from "@/components/soc/result-tabs";
import {
  buildAiCorrectedAuditQuestion,
  parseAiCorrectedQuestion,
} from "@/lib/audit-question-format";
import { initialScenario } from "@/lib/mock-data";
import { toUiError } from "@/services/api-error-messages";
import { togglePinHistory } from "@/services/history-api";
import { initialMockResponse } from "@/services/mock-search-api";
import { isMockMode, searchEvents } from "@/services/search-api";
import type {
  NaturalLanguageSearchRequestDto,
  NaturalLanguageSearchResponseDto,
  RequestStatus,
  SearchHistoryItemDto,
  SearchPlanDto,
  UiError,
} from "@/types/soc";

const DEFAULT_SEARCH_PAGE_SIZE = 10;

function stripAuditQuestionPrefix(value: string) {
  const aiCorrected = parseAiCorrectedQuestion(value);
  if (aiCorrected) {
    return aiCorrected.original;
  }

  const marker = "Original question:";
  const markerIndex = value.indexOf(marker);
  if (markerIndex === -1) {
    return value;
  }
  return value.slice(markerIndex + marker.length).trim();
}

const initialResponse = isMockMode ? initialMockResponse() : null;
const initialRequest: NaturalLanguageSearchRequestDto | null = initialResponse
  ? {
      question: initialResponse.original_question,
      page: initialResponse.page,
      size: initialResponse.size,
    }
  : null;

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

type UseSearchWorkflowOptions = {
  canUseHistory: boolean;
  closeEventDetail: () => void;
  resetExport: () => void;
  reloadHistoryIfOpen: () => void;
  navigate: NavigateFunction;
}

export function useSearchWorkflow({
  canUseHistory,
  closeEventDetail,
  resetExport,
  reloadHistoryIfOpen,
  navigate,
}: UseSearchWorkflowOptions) {
  const [question, setQuestion] = useState(
    isMockMode ? initialScenario.question : "",
  );
  const [submittedRequest, setSubmittedRequest] =
    useState<NaturalLanguageSearchRequestDto | null>(initialRequest);
  const [response, setResponse] =
    useState<NaturalLanguageSearchResponseDto | null>(initialResponse);
  const [summaryVisible, setSummaryVisible] = useState(
    Boolean(initialResponse),
  );
  const [followUpSuggestionKey, setFollowUpSuggestionKey] = useState<
    string | null
  >(
    initialResponse
      ? `${initialResponse.query_id}:${initialResponse.original_question}`
      : null,
  );
  const [searchFocusSignal, setSearchFocusSignal] = useState(0);
  const [originalAiSearchPlan, setOriginalAiSearchPlan] = useState(
    initialResponse?.search_plan,
  );
  const [isCurrentQueryPinned, setIsCurrentQueryPinned] = useState(false);
  const [requestStatus, setRequestStatus] = useState<RequestStatus>(
    initialResponse ? "success" : "idle",
  );
  const [searchError, setSearchError] = useState<UiError | null>(null);
  const [activeTab, setActiveTab] = useState<ResultTab>(
    initialResponse?.mode === "aggregation" ? "analytics" : "raw",
  );
  const searchAbortRef = useRef<AbortController | null>(null);

  useEffect(
    () => () => {
      searchAbortRef.current?.abort();
    },
    [],
  );

  const currentOriginalQuestion = () =>
    stripAuditQuestionPrefix(
      response?.original_question || submittedRequest?.question || question,
    );

  const currentRunnableQuestion = () => {
    const rawQuestion =
      response?.original_question || submittedRequest?.question || question;
    const aiCorrected = parseAiCorrectedQuestion(rawQuestion);
    return aiCorrected?.rewritten ?? stripAuditQuestionPrefix(rawQuestion);
  };

  const derivedAuditQuestion = (label: "Edited SearchPlan" | "Filtered Result") =>
    `[${label}] Original question: ${currentOriginalQuestion()}`;

  const markResponseStatus = (nextResponse: NaturalLanguageSearchResponseDto) => {
    const isEmpty =
      nextResponse.mode === "search"
        ? nextResponse.events.length === 0
        : nextResponse.aggregation_results.length === 0;
    setRequestStatus(isEmpty ? "empty" : "success");
  };

  const executeSearch = async (request: NaturalLanguageSearchRequestDto) => {
    const normalizedRequest = {
      ...request,
      question: request.question.trim(),
    };

    if (!normalizedRequest.question) {
      setResponse(null);
      setSummaryVisible(false);
      setFollowUpSuggestionKey(null);
      setSubmittedRequest(normalizedRequest);
      setSearchError({
        status: 400,
        message: "Question must not be blank",
        errors: [],
      });
      setRequestStatus("error");
      return;
    }

    searchAbortRef.current?.abort();
    resetExport();
    const controller = new AbortController();
    searchAbortRef.current = controller;
    closeEventDetail();
    setQuestion(normalizedRequest.question);
    setSubmittedRequest(normalizedRequest);
    setResponse(null);
    setSummaryVisible(false);
    setFollowUpSuggestionKey(null);
    setOriginalAiSearchPlan(undefined);
    setSearchError(null);
    setRequestStatus("loading");

    try {
      const nextResponse = await searchEvents(
        normalizedRequest,
        controller.signal,
      );
      if (controller.signal.aborted) {
        return;
      }

      setResponse(nextResponse);
      setSummaryVisible(true);
      setFollowUpSuggestionKey(
        `${nextResponse.query_id}:${stripAuditQuestionPrefix(nextResponse.original_question)}`,
      );
      setOriginalAiSearchPlan(nextResponse.search_plan);
      setIsCurrentQueryPinned(false);
      setActiveTab(nextResponse.mode === "aggregation" ? "analytics" : "raw");
      markResponseStatus(nextResponse);
    } catch (error) {
      if (isAbortError(error)) {
        return;
      }
      setResponse(null);
      setSummaryVisible(false);
      setFollowUpSuggestionKey(null);
      setOriginalAiSearchPlan(undefined);
      setSearchError(toUiError(error));
      setRequestStatus("error");
    } finally {
      if (searchAbortRef.current === controller) {
        searchAbortRef.current = null;
      }
      if (!controller.signal.aborted && canUseHistory) {
        reloadHistoryIfOpen();
      }
    }
  };

  const submitQuestion = (nextQuestion: string, auditQuestion?: string) => {
    void executeSearch({
      question: nextQuestion,
      audit_question: auditQuestion,
      page: 0,
      size:
        response?.size ?? submittedRequest?.size ?? DEFAULT_SEARCH_PAGE_SIZE,
    });
  };

  const changePage = async (page: number) => {
    if (!response || response.mode !== "search") {
      return;
    }

    searchAbortRef.current?.abort();
    resetExport();
    const controller = new AbortController();
    searchAbortRef.current = controller;

    closeEventDetail();
    setSearchError(null);
    setRequestStatus("loading");

    try {
      const { runSearchPlan } = await import("@/services/search-plan-api");
      const paginatedPlan = {
        ...response.search_plan,
        page,
        size: response.size,
      };
      const nextResponse = await runSearchPlan(
        paginatedPlan,
        controller.signal,
        currentOriginalQuestion(),
        false,
        false,
      );
      if (controller.signal.aborted) {
        return;
      }

      setResponse({
        ...nextResponse,
        query_id: response.query_id,
        original_question: response.original_question,
        summary: response.summary,
        summary_source: response.summary_source,
        summary_latency_ms: response.summary_latency_ms,
      });
      setIsCurrentQueryPinned(false);
      setActiveTab(nextResponse.mode === "aggregation" ? "analytics" : "raw");
      markResponseStatus(nextResponse);
    } catch (error) {
      if (isAbortError(error)) {
        return;
      }
      setSearchError(toUiError(error));
      setRequestStatus("error");
    } finally {
      if (searchAbortRef.current === controller) {
        searchAbortRef.current = null;
      }
    }
  };

  const runRefinedSearchPlan = async (plan: SearchPlanDto) => {
    if (!response) {
      return;
    }

    searchAbortRef.current?.abort();
    resetExport();
    const controller = new AbortController();
    searchAbortRef.current = controller;

    closeEventDetail();
    setSearchError(null);
    setRequestStatus("loading");

    try {
      const { runSearchPlan } = await import("@/services/search-plan-api");
      const nextResponse = await runSearchPlan(
        plan,
        controller.signal,
        derivedAuditQuestion("Filtered Result"),
        false,
        true,
      );
      if (controller.signal.aborted) {
        return;
      }

      setResponse(nextResponse);
      setSummaryVisible(false);
      setIsCurrentQueryPinned(false);
      setActiveTab(nextResponse.mode === "aggregation" ? "analytics" : "raw");
      markResponseStatus(nextResponse);
    } catch (error) {
      if (isAbortError(error)) {
        return;
      }
      setSearchError(toUiError(error));
      setRequestStatus("error");
    } finally {
      if (searchAbortRef.current === controller) {
        searchAbortRef.current = null;
      }
      if (!controller.signal.aborted && canUseHistory) {
        reloadHistoryIfOpen();
      }
    }
  };

  const runEditedSearchPlan = async (editedPlan: SearchPlanDto) => {
    searchAbortRef.current?.abort();
    resetExport();
    const controller = new AbortController();
    searchAbortRef.current = controller;
    closeEventDetail();

    try {
      const { runSearchPlan } = await import("@/services/search-plan-api");
      const nextResponse = await runSearchPlan(
        editedPlan,
        controller.signal,
        derivedAuditQuestion("Edited SearchPlan"),
        true,
        true,
      );
      if (controller.signal.aborted) {
        return;
      }

      setResponse(nextResponse);
      setSummaryVisible(true);
      setFollowUpSuggestionKey(
        `${nextResponse.query_id}:${stripAuditQuestionPrefix(nextResponse.original_question)}`,
      );
      setIsCurrentQueryPinned(false);
      setSearchError(null);
      setActiveTab(nextResponse.mode === "aggregation" ? "analytics" : "raw");
      markResponseStatus(nextResponse);
    } catch (error) {
      if (isAbortError(error)) {
        return;
      }
      throw error;
    } finally {
      if (searchAbortRef.current === controller) {
        searchAbortRef.current = null;
      }
      if (!controller.signal.aborted && canUseHistory) {
        reloadHistoryIfOpen();
      }
    }
  };

  const handleTogglePinCurrentQuery = async (pinned: boolean) => {
    if (!response?.query_id) return;
    setIsCurrentQueryPinned(pinned);
    try {
      await togglePinHistory(response.query_id, pinned);
      if (canUseHistory) {
        reloadHistoryIfOpen();
      }
    } catch (e) {
      setIsCurrentQueryPinned(!pinned);
      console.error(e);
    }
  };

  const retrySearch = () => {
    if (submittedRequest) {
      void executeSearch(submittedRequest);
    }
  };

  const selectFollowUpSuggestion = (nextQuestion: string) => {
    setQuestion(nextQuestion);
    setSearchFocusSignal((value) => value + 1);
    navigate("/search");
  };

  const selectDefaultSuggestion = (nextQuestion: string) => {
    setQuestion(nextQuestion);
    setSearchFocusSignal((value) => value + 1);
  };

  const runHistoryItem = (item: SearchHistoryItemDto) => {
    const aiCorrected = parseAiCorrectedQuestion(item.question);
    const runnableQuestion = aiCorrected?.rewritten ?? item.question;
    setQuestion(runnableQuestion);
    void executeSearch({
      question: runnableQuestion,
      page: 0,
      size:
        response?.size ?? submittedRequest?.size ?? DEFAULT_SEARCH_PAGE_SIZE,
    });
  };

  const fillHistoryItemQuestion = (item: SearchHistoryItemDto) => {
    const aiCorrected = parseAiCorrectedQuestion(item.question);
    const runnableQuestion = aiCorrected?.rewritten ?? item.question;
    setQuestion(runnableQuestion);
    setSearchFocusSignal((value) => value + 1);
    navigate("/search");
  };

  return {
    question,
    setQuestion,
    submittedRequest,
    response,
    summaryVisible,
    followUpSuggestionKey,
    searchFocusSignal,
    originalAiSearchPlan,
    isCurrentQueryPinned,
    requestStatus,
    searchError,
    activeTab,
    setActiveTab,
    submitQuestion,
    currentOriginalQuestion,
    currentRunnableQuestion,
    changePage,
    runRefinedSearchPlan,
    runEditedSearchPlan,
    handleTogglePinCurrentQuery,
    retrySearch,
    selectFollowUpSuggestion,
    selectDefaultSuggestion,
    runHistoryItem,
    fillHistoryItemQuestion,
    buildAiCorrectedAuditQuestion,
  };
}
