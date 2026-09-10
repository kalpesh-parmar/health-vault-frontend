import {
  normalizeDocumentIds,
  buildChatHistory,
  parseToLocalDate,
  getLocalDayKey,
  formatChatDateLabel,
  SUGGESTED_QUESTIONS_I18N,
  I18N_CHAT_UI,
} from "../src/components/chat/ChatDateUtils";

describe("ChatDateUtils Unit Tests", () => {
  describe("normalizeDocumentIds", () => {
    it("returns undefined for empty or null sources", () => {
      expect(normalizeDocumentIds()).toBeUndefined();
      expect(normalizeDocumentIds(null, undefined)).toBeUndefined();
      expect(normalizeDocumentIds([])).toBeUndefined();
    });

    it("extracts and deduplicates string IDs", () => {
      const result = normalizeDocumentIds("doc-1", ["doc-2", "doc-1"]);
      expect(result).toEqual(["doc-1", "doc-2"]);
    });

    it("extracts IDs from document objects", () => {
      const sources = [
        { documentId: "doc-100" },
        { id: "doc-200" },
        { fileKey: "file-key-300" },
        { s3Key: "s3-key-400" },
        { documentIds: ["doc-500", "doc-600"] },
      ];
      const result = normalizeDocumentIds(sources);
      expect(result).toEqual([
        "doc-100",
        "doc-200",
        "file-key-300",
        "s3-key-400",
        "doc-500",
        "doc-600",
      ]);
    });
  });

  describe("buildChatHistory", () => {
    it("transforms chat messages into LLM role/content pairs", () => {
      const messages = [
        { role: "user" as const, text: "Hello doctor" },
        { role: "ai" as const, text: "How can I help you today?" },
      ];
      const history = buildChatHistory(messages);
      expect(history).toEqual([
        { role: "user", content: "Hello doctor" },
        { role: "assistant", content: "How can I help you today?" },
      ]);
    });
  });

  describe("parseToLocalDate", () => {
    it("handles strings, Date objects, and invalid inputs", () => {
      const validIso = "2026-09-10T12:00:00.000Z";
      const parsed = parseToLocalDate(validIso);
      expect(parsed).toBeInstanceOf(Date);
      expect(parsed?.toISOString()).toBe(validIso);

      const d = new Date();
      expect(parseToLocalDate(d)).toBe(d);

      expect(parseToLocalDate("invalid-date-string")).toBeNull();
      expect(parseToLocalDate(undefined)).toBeNull();
    });
  });

  describe("getLocalDayKey", () => {
    it("formats year-month-day consistently", () => {
      const date = new Date(2026, 8, 10); // Month is 0-indexed: 8 is September
      expect(getLocalDayKey(date)).toBe("2026-9-10");
    });
  });

  describe("formatChatDateLabel", () => {
    it("formats today label correctly in English and Gujarati", () => {
      const now = new Date();
      expect(formatChatDateLabel(now, "english")).toBe("Today");
      expect(formatChatDateLabel(now, "gujarati")).toBe("આજે");
      expect(formatChatDateLabel(now, "hindi")).toBe("आज");
    });

    it("formats yesterday label correctly in English and Gujarati", () => {
      const now = new Date();
      const yesterday = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - 1
      );
      expect(formatChatDateLabel(yesterday, "english")).toBe("Yesterday");
      expect(formatChatDateLabel(yesterday, "gujarati")).toBe("ગઈકાલે");
      expect(formatChatDateLabel(yesterday, "hindi")).toBe("कल");
    });

    it("formats older date with localized month/day string", () => {
      const olderDate = new Date(2025, 0, 15);
      const label = formatChatDateLabel(olderDate, "english");
      expect(label).toContain("2025");
      expect(label).toContain("15");
    });
  });

  describe("SUGGESTED_QUESTIONS_I18N & I18N_CHAT_UI", () => {
    it("has questions defined for supported languages", () => {
      const languages = ["english", "gujarati", "hindi", "marathi", "tamil"];
      for (const lang of languages) {
        expect(SUGGESTED_QUESTIONS_I18N[lang]).toBeDefined();
        expect(SUGGESTED_QUESTIONS_I18N[lang].general.length).toBeGreaterThan(0);
        expect(SUGGESTED_QUESTIONS_I18N[lang].document.length).toBeGreaterThan(0);
        expect(I18N_CHAT_UI[lang]).toBeDefined();
        expect(I18N_CHAT_UI[lang].emergencyWarning).toBeDefined();
      }
    });
  });
});
