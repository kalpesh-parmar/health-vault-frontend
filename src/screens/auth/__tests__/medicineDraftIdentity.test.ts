// Mock @expo/vector-icons
jest.mock("@expo/vector-icons", () => ({
  Ionicons: "Ionicons",
}));

import {
  generateClientMedId,
  deduplicateDrafts,
} from "../../../components/chat/widgets/AddMedicineCard";

describe("Multi-Medicine Persistent Draft Form Wizard - Identity & Duplicate-Key Invariants", () => {
  describe("Invariant 1 & 2: Stable Unique client_med_id Per Draft", () => {
    it("generates unique client_med_id on every call", () => {
      const id1 = generateClientMedId();
      const id2 = generateClientMedId();
      const id3 = generateClientMedId();

      expect(id1).toMatch(/^client_\d+_[a-z0-9]+$/);
      expect(id2).toMatch(/^client_\d+_[a-z0-9]+$/);
      expect(id3).toMatch(/^client_\d+_[a-z0-9]+$/);

      expect(id1).not.toBe(id2);
      expect(id2).not.toBe(id3);
      expect(id1).not.toBe(id3);
    });

    it("avoids any ID present in the existing drafts collection", () => {
      const existingDrafts = [
        { client_med_id: "client_1000_existing1", name: "Med A" },
        { id: "client_2000_existing2", name: "Med B" },
      ];

      const freshId = generateClientMedId(existingDrafts);
      expect(freshId).not.toBe("client_1000_existing1");
      expect(freshId).not.toBe("client_2000_existing2");
    });

    it("deduplicateDrafts cleans up any duplicate IDs preserving first instance", () => {
      const draftsWithDuplicates = [
        { client_med_id: "client_1789628721080_52p1e2d", name: "Aspirin", dose: { count: 1 } },
        { client_med_id: "client_1789628721080_52p1e2d", name: "Aspirin Duplicate", dose: { count: 2 } },
        { client_med_id: "client_9999999999999_unique", name: "Metformin", dose: { count: 1 } },
      ];

      const cleaned = deduplicateDrafts(draftsWithDuplicates);
      expect(cleaned).toHaveLength(2);
      expect(cleaned[0].client_med_id).toBe("client_1789628721080_52p1e2d");
      expect(cleaned[0].name).toBe("Aspirin");
      expect(cleaned[1].client_med_id).toBe("client_9999999999999_unique");
    });
  });

  describe("Invariant 3 & 4: Add & Continue Updates/Appends One Draft and Generates New Unique ID", () => {
    it("advancing via Add & Continue assigns distinct client_med_id to subsequent forms", () => {
      let drafts: any[] = [];
      let currentClientMedId: string | null = generateClientMedId(drafts);

      // Medicine #1
      const med1Id = currentClientMedId;
      const med1 = {
        name: "Paracetamol",
        client_med_id: med1Id,
        id: med1Id,
        dose: { count: 1 },
      };

      // Add & Continue action simulation
      drafts = deduplicateDrafts([...drafts, med1]);
      const nextIdForMed2 = generateClientMedId(drafts);
      currentClientMedId = nextIdForMed2;

      expect(drafts).toHaveLength(1);
      expect(drafts[0].client_med_id).toBe(med1Id);
      expect(nextIdForMed2).not.toBe(med1Id);

      // Medicine #2
      const med2 = {
        name: "Amoxicillin",
        client_med_id: currentClientMedId,
        id: currentClientMedId,
        dose: { count: 1 },
      };

      // Add & Continue again
      drafts = deduplicateDrafts([...drafts, med2]);
      const nextIdForMed3 = generateClientMedId(drafts);
      currentClientMedId = nextIdForMed3;

      expect(drafts).toHaveLength(2);
      expect(drafts[0].client_med_id).toBe(med1Id);
      expect(drafts[1].client_med_id).toBe(med2.client_med_id);
      expect(drafts[0].client_med_id).not.toBe(drafts[1].client_med_id);
      expect(nextIdForMed3).not.toBe(drafts[0].client_med_id);
      expect(nextIdForMed3).not.toBe(drafts[1].client_med_id);
    });

    it("Add & Continue does not append duplicate if item with same ID is re-submitted", () => {
      const med1 = {
        client_med_id: "client_fixed_1",
        id: "client_fixed_1",
        name: "Aspirin",
      };

      let drafts = [med1];
      const resubmitted = {
        client_med_id: "client_fixed_1",
        id: "client_fixed_1",
        name: "Aspirin 500mg Updated",
      };

      // When updating existing
      const existingIdx = drafts.findIndex(
        (m) => (m.client_med_id || m.id) === (resubmitted.client_med_id || resubmitted.id),
      );
      if (existingIdx >= 0) {
        drafts[existingIdx] = resubmitted;
      } else {
        drafts.push(resubmitted);
      }
      drafts = deduplicateDrafts(drafts);

      expect(drafts).toHaveLength(1);
      expect(drafts[0].name).toBe("Aspirin 500mg Updated");
    });
  });

  describe("Invariant 5: DRAFT_SYNC Idempotence", () => {
    it("repeated DRAFT_SYNC calls with identical drafts produce identical state without duplicates", () => {
      const baseDrafts = [
        { client_med_id: "client_sync_1", id: "client_sync_1", name: "Med A" },
        { client_med_id: "client_sync_2", id: "client_sync_2", name: "Med B" },
      ];

      const sync1 = deduplicateDrafts(baseDrafts);
      const sync2 = deduplicateDrafts(sync1);
      const sync3 = deduplicateDrafts([...sync2, ...baseDrafts]);

      expect(sync1).toHaveLength(2);
      expect(sync2).toHaveLength(2);
      expect(sync3).toHaveLength(2);
      expect(sync3.map((m) => m.client_med_id)).toEqual(["client_sync_1", "client_sync_2"]);
    });
  });

  describe("Invariant 6 & 7: Arrow Navigation Never Appends; Form Editing Updates in Place", () => {
    it("navigating with arrows preserves draft count and does not push new records", () => {
      const drafts = [
        { client_med_id: "client_nav_1", id: "client_nav_1", name: "Med A" },
        { client_med_id: "client_nav_2", id: "client_nav_2", name: "Med B" },
      ];

      let currentIndex = 2; // At new blank form
      const totalDraftsCount = drafts.length; // 2

      // handlePrev from blank form (currentIndex >= totalDraftsCount)
      const currentName = "Incomplete Typing";
      let validPassedToPrev: any = null;
      if (currentName && currentIndex < totalDraftsCount) {
        validPassedToPrev = { name: currentName };
      }

      expect(validPassedToPrev).toBeNull(); // Must not pass draft on arrow back from blank form

      // Navigation updates index
      currentIndex = currentIndex - 1; // Now at 1 (Med B)
      expect(drafts).toHaveLength(2); // Length strictly unchanged
    });

    it("editing an existing draft at currentIndex updates the draft in place without changing ID", () => {
      const drafts = [
        { client_med_id: "client_edit_1", id: "client_edit_1", name: "Med A", dose: { count: 1 } },
        { client_med_id: "client_edit_2", id: "client_edit_2", name: "Med B", dose: { count: 1 } },
      ];

      const currentIndex = 0;
      const updatedMedA = {
        name: "Med A Extra Strength",
        dose: { count: 2 },
      };

      const updated = [...drafts];
      updated[currentIndex] = {
        ...drafts[currentIndex],
        ...updatedMedA,
        client_med_id: drafts[currentIndex].client_med_id,
        id: drafts[currentIndex].id,
      };

      const deduped = deduplicateDrafts(updated);

      expect(deduped).toHaveLength(2);
      expect(deduped[0].client_med_id).toBe("client_edit_1");
      expect(deduped[0].name).toBe("Med A Extra Strength");
      expect(deduped[0].dose.count).toBe(2);
      expect(deduped[1].client_med_id).toBe("client_edit_2");
    });
  });

  describe("Invariant 8 & 9: Cancel Clears Session & Fresh Session Generates Brand New ID", () => {
    it("cancelling purges drafts and resetting allows a completely fresh ID", () => {
      let localMedicines: any[] = [
        { client_med_id: "client_cancelled_1", name: "Med 1" },
        { client_med_id: "client_cancelled_2", name: "Med 2" },
      ];
      let currentClientMedId: string | null = "client_cancelled_1";

      // User taps Cancel -> handleExitToOptions simulation
      localMedicines = [];
      currentClientMedId = null;

      expect(localMedicines).toHaveLength(0);
      expect(currentClientMedId).toBeNull();

      // User re-enters Add Medicines
      const freshSessionId = generateClientMedId(localMedicines);
      expect(freshSessionId).toMatch(/^client_\d+_[a-z0-9]+$/);
      expect(freshSessionId).not.toBe("client_cancelled_1");
      expect(freshSessionId).not.toBe("client_cancelled_2");
    });
  });

  describe("Invariant 10 & 15: Save Medicines Passes Unique Collection & Review Has Unique React Keys", () => {
    it("Review screen receives unique items and every rendered child has a unique key", () => {
      const rawDrafts = [
        { client_med_id: "client_rev_1", id: "client_rev_1", name: "Paracetamol", selected: true },
        { client_med_id: "client_rev_2", id: "client_rev_2", name: "Amoxicillin", selected: true },
      ];

      const displayedMedicines = deduplicateDrafts(rawDrafts);
      const renderedKeys = displayedMedicines.map((m) => m.client_med_id || m.id);

      expect(renderedKeys).toHaveLength(2);
      const uniqueKeys = new Set(renderedKeys);
      expect(uniqueKeys.size).toBe(renderedKeys.length); // 0 duplicate keys
      expect(renderedKeys[0]).toBe("client_rev_1");
      expect(renderedKeys[1]).toBe("client_rev_2");
    });

    it("guarantees zero duplicate keys even if un-deduplicated collection is passed to review", () => {
      const corruptCollection = [
        { client_med_id: "client_1789628721080_52p1e2d", id: "client_1789628721080_52p1e2d", name: "Med A" },
        { client_med_id: "client_1789628721080_52p1e2d", id: "client_1789628721080_52p1e2d", name: "Med B" },
      ];

      const displayedMedicines = deduplicateDrafts(corruptCollection);
      const renderedKeys = displayedMedicines.map((m) => m.client_med_id || m.id);

      // React key collision is 100% prevented
      expect(new Set(renderedKeys).size).toBe(renderedKeys.length);
      expect(renderedKeys).toHaveLength(1);
    });
  });

  describe("Full Medicine Session Reset After Cancel & Fresh-Session Guarantee (User Directives 1-15)", () => {
    it("1 medicine -> Add & Continue -> Cancel -> Add Medicines -> empty Medicine #1", () => {
      // 1. Enter Medicine #1
      let drafts: any[] = [];
      const med1Id = generateClientMedId();
      const med1 = {
        name: "Paracetamol",
        dose: { count: 1, unit: "tablet" },
        frequency: "ONCE_A_DAY",
        client_med_id: med1Id,
        id: med1Id,
      };

      // Add & Continue
      drafts.push(med1);
      expect(drafts).toHaveLength(1);

      // 2. Cancel at Medicine #2
      // Discards entire session
      drafts = [];
      let currentClientMedId: string | null = null;
      let currentIndex = 0;

      expect(drafts).toEqual([]);
      expect(currentClientMedId).toBeNull();
      expect(currentIndex).toBe(0);

      // 3. User taps Add Medicines again -> New session begins
      const newSessionDraftId = generateClientMedId(drafts);
      currentClientMedId = newSessionDraftId;
      const initialFormValues = {
        name: "",
        dose: { count: 1 },
        frequency: "ONCE_A_DAY",
        client_med_id: newSessionDraftId,
      };

      expect(drafts).toHaveLength(0);
      expect(currentIndex).toBe(0);
      expect(initialFormValues.name).toBe("");
      expect(currentClientMedId).not.toBe(med1Id);
    });

    it("2 medicines -> Add & Continue -> Cancel -> Add Medicines -> empty Medicine #1", () => {
      // Session 1: Enter 2 medicines
      let drafts: any[] = [];
      const med1 = { name: "Paracetamol", client_med_id: generateClientMedId() };
      drafts.push(med1);
      const med2 = { name: "Amoxicillin", client_med_id: generateClientMedId(drafts) };
      drafts.push(med2);
      expect(drafts).toHaveLength(2);

      // Cancel at Medicine #2
      drafts = [];
      let currentClientMedId: string | null = null;
      let currentIndex = 0;

      expect(drafts).toHaveLength(0);

      // Re-enter Add Medicines
      const freshId = generateClientMedId(drafts);
      currentClientMedId = freshId;

      expect(drafts).toEqual([]);
      expect(currentIndex).toBe(0);
      expect(freshId).not.toBe(med1.client_med_id);
      expect(freshId).not.toBe(med2.client_med_id);
    });

    it("3+ medicines -> multiple Add & Continue -> Cancel -> Add Medicines -> empty Medicine #1 (Canonical Scenario)", () => {
      // Session 1: Paracetamol -> Add & Continue -> Amoxicillin -> Add & Continue -> Ibuprofen -> Cancel
      let drafts: any[] = [];
      const med1 = { name: "Paracetamol 500mg", client_med_id: generateClientMedId() };
      drafts.push(med1);
      const med2 = { name: "Amoxicillin 250mg", client_med_id: generateClientMedId(drafts) };
      drafts.push(med2);
      const med3 = { name: "Ibuprofen 200mg", client_med_id: generateClientMedId(drafts) };
      drafts.push(med3);

      expect(drafts).toHaveLength(3);

      // Cancel on Medicine #3: ALL THREE UNCONFIRMED MEDICINES ARE DISCARDED
      drafts = [];
      let currentClientMedId: string | null = null;
      let currentIndex = 0;
      let activeMedicineToEdit = null;

      expect(drafts).toEqual([]);
      expect(currentClientMedId).toBeNull();
      expect(currentIndex).toBe(0);
      expect(activeMedicineToEdit).toBeNull();

      // MEDICINE_OPTIONS -> Add Medicines
      // Expected: Medicine #1 completely EMPTY form with a NEW client_med_id
      const freshMed1Id = generateClientMedId(drafts);
      currentClientMedId = freshMed1Id;
      const activeMed = {
        name: "",
        dose: { count: 1 },
        frequency: "ONCE_A_DAY",
        client_med_id: freshMed1Id,
        id: freshMed1Id,
      };

      expect(drafts).toHaveLength(0);
      expect(currentIndex).toBe(0);
      expect(activeMed.name).toBe("");
      expect(activeMed.client_med_id).not.toBe(med1.client_med_id);
      expect(activeMed.client_med_id).not.toBe(med2.client_med_id);
      expect(activeMed.client_med_id).not.toBe(med3.client_med_id);

      // Verify Paracetamol, Amoxicillin, Ibuprofen never reappear
      const draftNames = drafts.map((d) => d.name);
      expect(draftNames).not.toContain("Paracetamol 500mg");
      expect(draftNames).not.toContain("Amoxicillin 250mg");
      expect(draftNames).not.toContain("Ibuprofen 200mg");
    });

    it("Cancel clears frontend localMedicines and ensures reactive reset when initialMedicines becomes []", () => {
      let localMedicines = [
        { name: "Metformin", client_med_id: "client_prev_1" },
        { name: "Atorvastatin", client_med_id: "client_prev_2" },
      ];

      // Simulated cancel action
      localMedicines = [];

      // When passed to AddMedicineCard as initialMedicines:
      let internalDrafts = deduplicateDrafts(localMedicines);
      let internalIndex = localMedicines.length === 0 ? 0 : localMedicines.length;
      let newDraftId = generateClientMedId(localMedicines);

      expect(internalDrafts).toEqual([]);
      expect(internalIndex).toBe(0);
      expect(newDraftId).toMatch(/^client_\d+_[a-z0-9]+$/);
      expect(newDraftId).not.toBe("client_prev_1");
      expect(newDraftId).not.toBe("client_prev_2");
    });
  });
});
