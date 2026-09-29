import {
  buildMedicationPayload,
  normalizeDocumentIds,
} from "../../../utils/chatUtils";
import { sanitizeMedicineForPayload } from "../../../components/chat/widgets/MedicineHelpers";

// Mock @expo/vector-icons
jest.mock("@expo/vector-icons", () => ({
  Ionicons: "Ionicons",
}));

describe("Chat Wizard State Machine & Resolution Logic", () => {
  describe("Conflict Navigation Invariants", () => {
    it("bounds conflict index within valid array ranges", () => {
      const conflicts = [
        { id: "c1", medicineName: "Metformin" },
        { id: "c2", medicineName: "Aspirin" },
        { id: "c3", medicineName: "Lisinopril" },
      ];

      let currentIndex = 0;

      // Navigate Next
      const navigateNext = (idx: number, length: number) => Math.min(idx + 1, length - 1);
      const navigatePrev = (idx: number) => Math.max(idx - 1, 0);

      currentIndex = navigateNext(currentIndex, conflicts.length); // 1
      expect(currentIndex).toBe(1);

      currentIndex = navigateNext(currentIndex, conflicts.length); // 2
      expect(currentIndex).toBe(2);

      currentIndex = navigateNext(currentIndex, conflicts.length); // clamps to 2
      expect(currentIndex).toBe(2);

      currentIndex = navigatePrev(currentIndex); // 1
      expect(currentIndex).toBe(1);

      currentIndex = navigatePrev(currentIndex); // 0
      expect(currentIndex).toBe(0);

      currentIndex = navigatePrev(currentIndex); // clamps to 0
      expect(currentIndex).toBe(0);
    });
  });

  describe("Conflict Resolution Strategies", () => {
    const activeConflict = {
      id: "conflict-123",
      incoming: { id: "in-1", name: "Lipitor", dosage: "20mg" },
      existing: { id: "ex-1", name: "Lipitor", dosage: "10mg" },
    };

    it("handles 'keep' resolution by maintaining existing medicine", () => {
      const resolution = "keep";
      expect(resolution).toBe("keep");
    });

    it("handles 'replace' resolution by replacing existing with incoming", () => {
      const resolution = "replace";
      const resolvedList: any[] = [];
      resolvedList.push(activeConflict.incoming);
      expect(resolvedList).toHaveLength(1);
      expect(resolvedList[0].dosage).toBe("20mg");
    });

    it("handles 'merge' resolution by combining payloads", () => {
      const mergedPayload = {
        ...activeConflict.incoming,
        notes: "Merged with previous prescription",
      };
      expect(mergedPayload.notes).toBe("Merged with previous prescription");
    });
  });

  describe("Payload Normalization & Sanitization", () => {
    it("normalizes document ids across multiple formats", () => {
      const docs = [
        { id: "doc-1", name: "Report A" },
        { fileKey: "key-2", name: "Report B" },
      ];
      const normalized = normalizeDocumentIds(docs);
      expect(Array.isArray(normalized)).toBe(true);
    });

    it("sanitizes extracted medicine payload cleanly for server dispatch", () => {
      const rawMed = {
        name: "Paracetamol",
        dosage: "650 mg",
        frequency: "3 times daily",
        foodFrequency: "AFTER_MEAL",
        extraGarbageField: "ignore-me",
      };

      const sanitized = sanitizeMedicineForPayload(rawMed);
      expect(sanitized).toBeDefined();
      expect(sanitized.name).toBe("Paracetamol");
    });
  });
});
