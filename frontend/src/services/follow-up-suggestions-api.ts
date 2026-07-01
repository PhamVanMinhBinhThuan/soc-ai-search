import {
  ApiError,
  isRecord,
  requestJson,
} from "@/services/api-client";
import { isMockMode } from "@/services/search-api";
import type {
  FollowUpSuggestionRequestDto,
  FollowUpSuggestionResponseDto,
} from "@/types/soc";

function isSuggestion(value: unknown) {
  return (
    isRecord(value) &&
    typeof value.title === "string" &&
    value.title.trim().length > 0 &&
    typeof value.question === "string" &&
    value.question.trim().length > 0
  );
}

function assertFollowUpSuggestionResponse(
  payload: unknown,
): asserts payload is FollowUpSuggestionResponseDto {
  if (
    !isRecord(payload) ||
    (payload.source !== "llm" && payload.source !== "none") ||
    !Array.isArray(payload.suggestions) ||
    !payload.suggestions.every(isSuggestion)
  ) {
    throw new ApiError({
      status: 502,
      message: "The backend returned an invalid follow-up suggestion response",
      errors: ["Follow-up suggestion response contract validation failed"],
    });
  }
}

export async function getFollowUpSuggestions(
  request: FollowUpSuggestionRequestDto,
  signal?: AbortSignal,
) {
  if (isMockMode) {
    return {
      source: "none",
      suggestions: [],
    } satisfies FollowUpSuggestionResponseDto;
  }

  const payload = await requestJson("/api/v1/suggestions/follow-up", {
    method: "POST",
    signal,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  assertFollowUpSuggestionResponse(payload);
  return payload;
}
