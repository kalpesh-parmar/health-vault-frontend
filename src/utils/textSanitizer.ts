/**
 * Text Sanitization Utilities for Health Vault.
 * Used strictly for NON-image-only legacy strings that contain markdown artifacts.
 */

/**
 * Strips markdown syntax (bold, italic, headers, bullets, dividers, asterisks)
 * leaving clean plain text.
 */
export function stripMarkdown(text: string | null | undefined): string {
  if (!text || typeof text !== "string") return "";

  let clean = text;

  // 1. Remove horizontal rules (***, * * *, ---, ___)
  clean = clean.replace(/^(?:\s*[*_-]){3,}\s*$/gm, "");

  // 2. Remove markdown headers (# Title, ## Subtitle, etc.)
  clean = clean.replace(/^#{1,6}\s+/gm, "");

  // 3. Remove bold and italic (***text***, **text**, *text*, __text__, _text_)
  clean = clean.replace(/\*\*\*(.*?)\*\*\*/g, "$1");
  clean = clean.replace(/\*\*(.*?)\*\*/g, "$1");
  clean = clean.replace(/\*(.*?)\*/g, "$1");
  clean = clean.replace(/___(.*?)___/g, "$1");
  clean = clean.replace(/__(.*?)__/g, "$1");
  clean = clean.replace(/_(.*?)_/g, "$1");

  // 4. Remove bullet markers (•, -, *)
  clean = clean.replace(/^\s*[•\-*]\s+/gm, "");

  // 5. Remove lingering inline code ticks and stray asterisks
  clean = clean.replace(/`([^`]+)`/g, "$1");
  clean = clean.replace(/[*_~`]/g, "");

  // 6. Collapse multiple blank lines/spaces
  clean = clean.replace(/\r\n/g, "\n");
  clean = clean.replace(/\n{3,}/g, "\n\n");
  clean = clean.replace(/[ \t]{2,}/g, " ");

  return clean.trim();
}

/**
 * Extracts the first coherent, clean sentence from a string.
 * Used strictly for legacy non-image-only summaries to prevent multi-paragraph spillover.
 */
export function extractFirstCleanSentence(text: string | null | undefined, maxLength = 140): string {
  const stripped = stripMarkdown(text);
  if (!stripped) return "";

  // Match first sentence ending in period, exclamation, question mark, or Indic danda (।)
  const sentenceMatch = stripped.match(/^(.+?[.!?।])(?:\s|$)/s);
  const firstSentence = sentenceMatch ? sentenceMatch[1].trim() : stripped.split("\n")[0].trim();

  if (firstSentence.length <= maxLength) {
    return firstSentence;
  }

  // Gracefully truncate at word boundary
  const truncated = firstSentence.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(" ");
  return `${(lastSpace > 40 ? truncated.slice(0, lastSpace) : truncated).trim()}...`;
}
