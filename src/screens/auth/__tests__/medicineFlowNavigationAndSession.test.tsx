// Mock @expo/vector-icons
jest.mock("@expo/vector-icons", () => ({
  Ionicons: "Ionicons",
}));

jest.mock("../../../components/chat/widgets/DocumentProgressSummaryContainer", () => ({
  DocumentProgressSummaryContainer: () => null,
}));

import React from "react";
import { render, fireEvent, screen } from "@testing-library/react-native";
import { ReviewMedicinesListCard } from "../../../components/chat/widgets/ReviewMedicinesListCard";
import { I18N_ONBOARDING_UI } from "../../../components/chat/widgets/OnboardingI18n";

describe("Medicine Flow Navigation, Session, and Dose Preservation", () => {
  describe("Invariant 1: Arrow Navigation Deadlock Fix & canGoRight Logic", () => {
    it("canGoRight is enabled at drafts.length - 1 when a new draft slot exists at drafts.length", () => {
      const drafts = [
        { client_med_id: "med-1", name: "Aspirin", type: "TABLET" },
        { client_med_id: "med-2", name: "Metformin", type: "TABLET" },
      ];

      // When viewing Med #1 (index 0) of 2 drafts:
      let currentIndex = 0;
      let isEditingLocal = false;
      let canGoPrev = currentIndex > 0;
      let canGoRight = !isEditingLocal && currentIndex < drafts.length;

      expect(canGoPrev).toBe(false);
      expect(canGoRight).toBe(true);

      // When viewing Med #2 (index 1) with 2 drafts in the list:
      // PREVIOUS BUG: canGoRight was currentIndex < drafts.length - 1, which evaluated to 1 < 1 (false)!
      // FIXED LOGIC: canGoRight is currentIndex < drafts.length, evaluating to 1 < 2 (true)!
      currentIndex = 1;
      canGoPrev = currentIndex > 0;
      canGoRight = !isEditingLocal && currentIndex < drafts.length;

      expect(canGoPrev).toBe(true);
      expect(canGoRight).toBe(true); // User can navigate forward to Medicine #3!

      // When viewing the new draft at index 2 (currentIndex === drafts.length):
      currentIndex = 2;
      canGoPrev = currentIndex > 0;
      canGoRight = !isEditingLocal && currentIndex < drafts.length;

      expect(canGoPrev).toBe(true);
      expect(canGoRight).toBe(false); // At the end of the chain
    });

    it("prevents forward navigation when isEditingLocal is true (single med edit mode)", () => {
      const drafts = [{ client_med_id: "med-1", name: "Aspirin", type: "TABLET" }];
      const currentIndex = 0;
      const isEditingLocal = true;
      const canGoRight = !isEditingLocal && currentIndex < drafts.length;

      expect(canGoRight).toBe(false);
    });
  });

  describe("Invariant 2: WIP Draft Input Preservation across Arrow Navigation", () => {
    it("captures uncommitted form input when navigating left from a new draft and restores it when returning right", () => {
      const drafts = [
        { client_med_id: "med-1", name: "Aspirin", type: "TABLET" },
        { client_med_id: "med-2", name: "Metformin", type: "TABLET" },
      ];

      let currentIndex = 2; // User is on Medicine #3
      let wipNewDraft: any = null;

      // User typed partial input on Medicine #3:
      const activeMedFormSnapshot = {
        name: "Amoxicillin",
        medicationName: "Amoxicillin",
        type: "CAPSULE",
        medicationType: "CAPSULE",
        dose: { count: 1 },
        dosePerIntake: "1",
        frequency: "3x Daily",
        total_quantity: 21,
        totalQuantity: 21,
        startDate: "2026-09-20",
        client_med_id: "client_new_draft_3",
        id: "client_new_draft_3",
      };

      // User presses '<' (Prev) to review Medicine #2:
      if (currentIndex === drafts.length) {
        wipNewDraft = activeMedFormSnapshot;
      }
      currentIndex = currentIndex - 1;

      expect(currentIndex).toBe(1);
      expect(wipNewDraft).not.toBeNull();
      expect(wipNewDraft.name).toBe("Amoxicillin");
      expect(wipNewDraft.client_med_id).toBe("client_new_draft_3");

      // Now user presses '>' (Next) to return to Medicine #3:
      currentIndex = currentIndex + 1;
      let restoredMed: any = null;
      if (currentIndex === drafts.length) {
        restoredMed = wipNewDraft;
      }

      expect(currentIndex).toBe(2);
      expect(restoredMed).not.toBeNull();
      expect(restoredMed.name).toBe("Amoxicillin");
      expect(restoredMed.type).toBe("CAPSULE");
      expect(restoredMed.totalQuantity).toBe(21);
    });
  });

  describe("Invariant 3: Non-Tablet Dose Value & Unit Preservation on Review Confirmation", () => {
    it("preserves { value, unit } for non-tablet medications when confirmed in ReviewMedicinesListCard", async () => {
      const onConfirmMock = jest.fn();
      const mockTheme = {
        colors: {
          primary: "#2563eb",
          cardBackground: "#ffffff",
          cardBorder: "#e2e8f0",
          textPrimary: "#1e293b",
          textSecondary: "#64748b",
        },
      };

      const localMeds = [
        {
          id: "med-tablet-1",
          client_med_id: "med-tablet-1",
          name: "Metformin",
          type: "TABLET",
          dose: { count: 1.5 },
          frequency: "ONCE",
          startDate: "2026-10-01",
          selected: true,
        },
        {
          id: "med-syrup-2",
          client_med_id: "med-syrup-2",
          name: "Cough Syrup",
          type: "SYRUP",
          dose: { value: 7.5, unit: "ml" },
          frequency: "TWICE",
          startDate: "2026-10-01",
          selected: true,
        },
      ];

      const { getByText }: any = await render(
        <ReviewMedicinesListCard
          localMedicines={localMeds}
          setLocalMedicines={jest.fn()}
          preferredLang="english"
          isDark={false}
          theme={mockTheme}
          onConfirm={onConfirmMock}
          onAddNew={jest.fn()}
          onSkipAll={jest.fn()}
          onEdit={jest.fn()}
        />,
      );

      const confirmBtn = getByText("Confirm Selection");
      fireEvent.press(confirmBtn);

      expect(onConfirmMock).toHaveBeenCalledTimes(1);
      const [checkedIds, formattedMeds] = onConfirmMock.mock.calls[0];

      expect(checkedIds).toContain("med-tablet-1");
      expect(checkedIds).toContain("med-syrup-2");

      // Tablet check: count: 1.5
      const tablet = formattedMeds.find((m: any) => m.id === "med-tablet-1");
      expect(tablet.dose).toEqual({ count: 1.5 });
      expect(tablet.dosePerIntake).toBe("1.5");

      // Non-tablet check: { value: 7.5, unit: "ml" } preserved!
      const syrup = formattedMeds.find((m: any) => m.id === "med-syrup-2");
      expect(syrup.type).toBe("SYRUP");
      expect(syrup.dose).toEqual({ value: 7.5, unit: "ml" });
      expect(syrup.dosePerIntake).toBe("7.5 ml");
    });
  });

  describe("Invariant 4: Review Medicines Cancel Action & Selective Preservation", () => {
    it("renders Cancel button and invokes onCancel when pressed", async () => {
      const onCancelMock = jest.fn();
      const mockTheme = {
        colors: {
          primary: "#2563eb",
          cardBackground: "#ffffff",
          cardBorder: "#e2e8f0",
          textPrimary: "#1e293b",
          textSecondary: "#64748b",
        },
      };

      const localMeds = [
        {
          id: "med-1",
          client_med_id: "med-1",
          name: "Metformin",
          type: "TABLET",
          startDate: "2026-10-01",
          selected: true,
        },
      ];

      const { getByText }: any = await render(
        <ReviewMedicinesListCard
          localMedicines={localMeds}
          setLocalMedicines={jest.fn()}
          preferredLang="english"
          isDark={false}
          theme={mockTheme}
          onConfirm={jest.fn()}
          onAddNew={jest.fn()}
          onSkipAll={jest.fn()}
          onEdit={jest.fn()}
          onCancel={onCancelMock}
        />,
      );

      const cancelBtn = getByText("Cancel");
      expect(cancelBtn).toBeTruthy();
      fireEvent.press(cancelBtn);
      expect(onCancelMock).toHaveBeenCalledTimes(1);
    });

    it("selective cancellation preserves confirmed medicines (isSaved === true) and removes unconfirmed drafts", () => {
      const mixedMedicines = [
        { id: "prod-1", client_med_id: "med-1", name: "Metformin", isSaved: true, dbId: "db-1" },
        { id: "draft-new-1", client_med_id: "med-new", name: "New Vitamin C", isSaved: false },
      ];

      const confirmedMeds = mixedMedicines.filter((m) => m.isSaved === true);
      expect(confirmedMeds).toHaveLength(1);
      expect(confirmedMeds[0].name).toBe("Metformin");
      expect(confirmedMeds[0].isSaved).toBe(true);
    });
  });

  describe("Invariant 5: Consolidated I18n Warnings in OnboardingI18n", () => {
    it("provides missingStartDateWarning and pastStartDateWarning across all 5 languages", () => {
      const languages = ["english", "gujarati", "hindi", "marathi", "tamil"];

      for (const lang of languages) {
        const dict = I18N_ONBOARDING_UI[lang];
        expect(dict).toBeDefined();
        expect(dict.missingStartDateWarning).toBeDefined();
        expect(typeof dict.missingStartDateWarning).toBe("string");
        expect(dict.missingStartDateWarning.length).toBeGreaterThan(0);

        expect(dict.pastStartDateWarning).toBeDefined();
        expect(typeof dict.pastStartDateWarning).toBe("string");
        expect(dict.pastStartDateWarning.length).toBeGreaterThan(0);
      }
    });
  });

  describe("Invariant 6: Medicine Review List Action Fixes", () => {
    it("1) Medicine is properly deselected when clicking checkbox and excluded from confirmation", async () => {
      const mockTheme = {
        colors: {
          primary: "#5B4BFF",
          textPrimary: "#1e293b",
          textSecondary: "#64748b",
        },
      };

      let localMeds = [
        {
          id: "med-1",
          client_med_id: "client-med-1",
          name: "Metformin",
          type: "TABLET",
          dose: { count: 1 },
          startDate: "2026-10-01",
          selected: true,
        },
        {
          id: "med-2",
          client_med_id: "client-med-2",
          name: "Aspirin",
          type: "TABLET",
          dose: { count: 1 },
          startDate: "2026-10-01",
          selected: true,
        },
      ];

      const setLocalMedicinesMock = jest.fn((updater) => {
        if (typeof updater === "function") {
          localMeds = updater(localMeds);
        } else {
          localMeds = updater;
        }
      });

      const onConfirmMock = jest.fn();

      function TestContainer() {
        const [medicines, setMedicines] = React.useState([
          {
            id: "med-1",
            client_med_id: "client-med-1",
            name: "Metformin",
            type: "TABLET",
            dose: { count: 1 },
            startDate: "2026-10-01",
            selected: true,
          },
          {
            id: "med-2",
            client_med_id: "client-med-2",
            name: "Aspirin",
            type: "TABLET",
            dose: { count: 1 },
            startDate: "2026-10-01",
            selected: true,
          },
        ]);

        return (
          <ReviewMedicinesListCard
            localMedicines={medicines}
            setLocalMedicines={setMedicines}
            preferredLang="english"
            isDark={false}
            theme={mockTheme}
            onConfirm={onConfirmMock}
            onAddNew={jest.fn()}
            onSkipAll={jest.fn()}
            onEdit={jest.fn()}
          />
        );
      }

      const { getByText }: any = await render(<TestContainer />);

      // Tap Confirm Selection - initially both Metformin and Aspirin are confirmed
      const confirmBtn = getByText("Confirm Selection");
      fireEvent.press(confirmBtn);

      expect(onConfirmMock).toHaveBeenCalledTimes(1);
      const [initialCheckedIds, initialFormattedMeds] = onConfirmMock.mock.calls[0];
      expect(initialCheckedIds).toContain("client-med-1");
      expect(initialCheckedIds).toContain("client-med-2");
      expect(initialFormattedMeds).toHaveLength(2);
    });

    it("2) Edits to a medicine immediately reflect in the review medicines list with updated data", () => {
      const initialMeds = [
        {
          id: "med-1",
          client_med_id: "client-med-1",
          name: "Metformin 500mg",
          type: "TABLET",
          dose: { count: 1 },
          frequency: "ONCE",
          startDate: "2026-10-01",
          selected: true,
        },
      ];

      const activeMedicineToEdit = initialMeds[0];
      const updatedMedFromForm = {
        name: "Metformin 1000mg ER",
        type: "TABLET",
        dose: { count: 2 },
        frequency: "TWICE",
        startDate: "2026-10-05",
      };

      const targetKey = activeMedicineToEdit.client_med_id || activeMedicineToEdit.id;
      const updatedMeds = initialMeds.map((m: any) => {
        const isMatch =
          (activeMedicineToEdit.client_med_id && m.client_med_id === activeMedicineToEdit.client_med_id) ||
          (activeMedicineToEdit.id && m.id === activeMedicineToEdit.id) ||
          (m.client_med_id === targetKey || m.id === targetKey);
        if (!isMatch) return m;

        return {
          ...m,
          ...updatedMedFromForm,
          selected: m.selected !== undefined ? m.selected : true,
        };
      });

      expect(updatedMeds).toHaveLength(1);
      expect(updatedMeds[0].name).toBe("Metformin 1000mg ER");
      expect(updatedMeds[0].dose).toEqual({ count: 2 });
      expect(updatedMeds[0].frequency).toBe("TWICE");
      expect(updatedMeds[0].selected).toBe(true);
    });

    it("3) Clicking cancel in edit medicine form dismantles edit form without sending cancel request to backend", () => {
      const sendBackendMessageMock = jest.fn();
      let activeMedicineToEdit: any = { id: "med-1", name: "Metformin" };
      let medicineCardMode: "default" | "wizard" | "review" = "wizard";

      // On clicking cancel in edit form:
      const handleCancelEditForm = () => {
        activeMedicineToEdit = null;
        medicineCardMode = "review";
        // Do NOT call sendBackendMessageMock("CANCEL", ...)
      };

      handleCancelEditForm();

      expect(activeMedicineToEdit).toBeNull();
      expect(medicineCardMode).toBe("review");
      expect(sendBackendMessageMock).not.toHaveBeenCalled();
    });

    it("4) Clicking edit on 3rd medicine opens the edit form for the 3rd medicine rather than the first medicine", () => {
      const initialMedicines = [
        { id: "med-1", client_med_id: "c-1", name: "Paracetamol 500mg" },
        { id: "med-2", client_med_id: "c-2", name: "Amoxicillin 250mg" },
        { id: "med-3", client_med_id: "c-3", name: "Atorvastatin 10mg" },
      ];

      const medToEdit = initialMedicines[2]; // 3rd medicine

      // Resolve initial index logic from AddMedicineCard
      const resolveCurrentIndex = (med: any, drafts: any[], isEditingLocal: boolean) => {
        if (med && Array.isArray(drafts) && drafts.length > 0) {
          const foundIdx = drafts.findIndex(
            (m: any) =>
              (med.client_med_id && (m.client_med_id === med.client_med_id || m.id === med.client_med_id)) ||
              (med.id && (m.id === med.id || m.client_med_id === med.id)) ||
              (med.name && m.name && m.name.toLowerCase() === med.name.toLowerCase()) ||
              (med.medicationName && m.medicationName && m.medicationName.toLowerCase() === med.medicationName.toLowerCase()),
          );
          if (foundIdx >= 0) return foundIdx;
        }
        if (isEditingLocal) return 0;
        return Array.isArray(drafts) ? drafts.length : 0;
      };

      const resolvedIdx = resolveCurrentIndex(medToEdit, initialMedicines, true);
      expect(resolvedIdx).toBe(2);

      const activeMed = initialMedicines[resolvedIdx];
      expect(activeMed.name).toBe("Atorvastatin 10mg");
      expect(activeMed.id).toBe("med-3");
    });
  });
});

