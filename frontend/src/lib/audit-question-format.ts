const AI_CORRECTED_PREFIX = "[AI Corrected]";
const EDITED_PREFIX = "[Edited SearchPlan]";
const FILTERED_PREFIX = "[Filtered Result]";
const ORIGINAL_MARKER = "Original question:";
const FEEDBACK_MARKER = "Feedback:";
const REWRITTEN_MARKER = "Rewritten question:";

export type AuditQuestionListParts = {
  prefix: "AI Corrected" | "Edited SearchPlan" | "Filtered Result" | null;
  question: string;
  feedback?: string;
};

export type AiCorrectedQuestionParts = {
  original: string;
  feedback: string;
  rewritten: string;
};

export function buildAiCorrectedAuditQuestion({
  original,
  feedback,
  rewritten,
}: AiCorrectedQuestionParts) {
  return `${AI_CORRECTED_PREFIX} ${ORIGINAL_MARKER} ${original.trim()} | ${FEEDBACK_MARKER} ${feedback.trim()} | ${REWRITTEN_MARKER} ${rewritten.trim()}`;
}

export function parseAiCorrectedQuestion(
  question: string,
): AiCorrectedQuestionParts | null {
  if (!question.startsWith(AI_CORRECTED_PREFIX)) {
    return null;
  }

  const originalStart = question.indexOf(ORIGINAL_MARKER);
  const feedbackStart = question.indexOf(`| ${FEEDBACK_MARKER}`);
  const rewrittenStart = question.indexOf(`| ${REWRITTEN_MARKER}`);

  if (originalStart === -1 || feedbackStart === -1 || rewrittenStart === -1) {
    return null;
  }

  const original = question
    .slice(originalStart + ORIGINAL_MARKER.length, feedbackStart)
    .trim();
  const feedback = question
    .slice(feedbackStart + FEEDBACK_MARKER.length + 2, rewrittenStart)
    .trim();
  const rewritten = question
    .slice(rewrittenStart + REWRITTEN_MARKER.length + 2)
    .trim();

  if (!original || !feedback || !rewritten) {
    return null;
  }

  return { original, feedback, rewritten };
}

export function formatQuestionForList(question: string) {
  const parts = parseQuestionForList(question);
  if (parts.prefix) {
    return parts.feedback
      ? `[${parts.prefix}] ${ORIGINAL_MARKER} ${parts.question} | ${FEEDBACK_MARKER} ${parts.feedback}`
      : `[${parts.prefix}] ${parts.question}`;
  }
  return parts.question;
}

export function parseQuestionForList(question: string): AuditQuestionListParts {
  const corrected = parseAiCorrectedQuestion(question);
  if (corrected) {
    return {
      prefix: "AI Corrected",
      question: corrected.original,
      feedback: corrected.feedback,
    };
  }

  const edited = parseOriginalQuestionPrefix(question, EDITED_PREFIX);
  if (edited) {
    return { prefix: "Edited SearchPlan", question: edited };
  }

  const filtered = parseOriginalQuestionPrefix(question, FILTERED_PREFIX);
  if (filtered) {
    return { prefix: "Filtered Result", question: filtered };
  }

  return { prefix: null, question };
}

function parseOriginalQuestionPrefix(question: string, prefix: string) {
  if (!question.startsWith(prefix)) {
    return null;
  }

  const originalStart = question.indexOf(ORIGINAL_MARKER);
  if (originalStart === -1) {
    return question.slice(prefix.length).trim() || null;
  }

  const value = question.slice(originalStart + ORIGINAL_MARKER.length).trim();
  return value || null;
}
