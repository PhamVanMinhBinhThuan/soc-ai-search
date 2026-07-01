const AI_CORRECTED_PREFIX = "[AI Corrected]";
const ORIGINAL_MARKER = "Original question:";
const FEEDBACK_MARKER = "Feedback:";
const REWRITTEN_MARKER = "Rewritten question:";

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
  const corrected = parseAiCorrectedQuestion(question);
  if (!corrected) {
    return question;
  }
  return `${AI_CORRECTED_PREFIX} ${ORIGINAL_MARKER} ${corrected.original} | ${FEEDBACK_MARKER} ${corrected.feedback}`;
}
