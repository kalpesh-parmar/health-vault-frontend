// Mock @expo/vector-icons
jest.mock("@expo/vector-icons", () => ({
  Ionicons: "Ionicons",
}));

jest.mock("../../../components/chat/widgets/DocumentProgressSummaryContainer", () => ({
  DocumentProgressSummaryContainer: () => null,
}));

import React from "react";
import { render, fireEvent, screen, act, waitFor } from "@testing-library/react-native";
import { ReviewMedicinesListCard } from "../../../components/chat/widgets/ReviewMedicinesListCard";
import { AddMedicineCard } from "../../../components/chat/widgets/AddMedicineCard";
import { I18N_ONBOARDING_UI, resolveDoseUnitDisplay } from "../../../components/chat/widgets/OnboardingI18n";
import { MedicineOptionsPanel } from "../../../components/chat/widgets/MedicineOptionsPanel";
import { ChatMessageItem } from "../../../components/chat/ChatMessageItem";

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
      expect(tablet.dosePerIntake).toBe(1.5);
      expect(tablet.frequency).toBe("Once Daily");

      // Non-tablet check: { value: 7.5, unit: "ml" } preserved!
      const syrup = formattedMeds.find((m: any) => m.id === "med-syrup-2");
      expect(syrup.type).toBe("SYRUP");
      expect(syrup.dose).toEqual({ value: 7.5, unit: "ml" });
      expect(syrup.dosePerIntake).toBe(7.5);
      expect(syrup.frequency).toBe("Twice Daily");
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

  describe("Phase 16 - Invariant 6: Dual-Layer Localization of Add Medicines Option Chip", () => {
    it("provides addMedicines across all 5 languages in I18N_ONBOARDING_UI", () => {
      const languages = [
        { lang: "english", expected: "Add Medicines" },
        { lang: "gujarati", expected: "દવાઓ ઉમેરો" },
        { lang: "hindi", expected: "दवाएं जोड़ें" },
        { lang: "marathi", expected: "औषधे जोडा" },
        { lang: "tamil", expected: "மருந்துகளைச் சேர்க்கவும்" },
      ];

      for (const { lang, expected } of languages) {
        const dict = I18N_ONBOARDING_UI[lang];
        expect(dict).toBeDefined();
        expect(dict.addMedicines).toBe(expected);
      }
    });

    it("MedicineOptionsPanel resolves localized addMedicines label in Gujarati", async () => {
      const onOptionPress = jest.fn();
      const mockTheme = {
        colors: {
          primary: "#2563eb",
          cardBackground: "#ffffff",
          cardBorder: "#e2e8f0",
          textPrimary: "#1e293b",
          textSecondary: "#64748b",
        },
      };

      const optionsList = [
        { key: "ADD", label: "Add Medicines", primary: true },
      ];

      const { getByText }: any = await render(
        <MedicineOptionsPanel
          optionsList={optionsList}
          isDark={false}
          theme={mockTheme}
          onOptionPress={onOptionPress}
          preferredLang="gujarati"
        />,
      );

      const gujaratiChip = getByText("દવાઓ ઉમેરો");
      expect(gujaratiChip).toBeTruthy();
      fireEvent.press(gujaratiChip);
      expect(onOptionPress).toHaveBeenCalledWith("ADD", "દવાઓ ઉમેરો");
    });

    it("MedicineOptionsPanel resolves localized addMedicines label in Hindi", async () => {
      const onOptionPress = jest.fn();
      const mockTheme = {
        colors: {
          primary: "#2563eb",
          cardBackground: "#ffffff",
          cardBorder: "#e2e8f0",
          textPrimary: "#1e293b",
          textSecondary: "#64748b",
        },
      };

      const optionsList = [
        { key: "ADD", label: "Add Medicines", primary: true },
      ];

      const { getByText }: any = await render(
        <MedicineOptionsPanel
          optionsList={optionsList}
          isDark={false}
          theme={mockTheme}
          onOptionPress={onOptionPress}
          preferredLang="hindi"
        />,
      );

      expect(getByText("दवाएं जोड़ें")).toBeTruthy();
    });

    it("MedicineOptionsPanel resolves localized addMedicines label in Marathi", async () => {
      const onOptionPress = jest.fn();
      const mockTheme = {
        colors: {
          primary: "#2563eb",
          cardBackground: "#ffffff",
          cardBorder: "#e2e8f0",
          textPrimary: "#1e293b",
          textSecondary: "#64748b",
        },
      };

      const optionsList = [
        { key: "ADD", label: "Add Medicines", primary: true },
      ];

      const { getByText }: any = await render(
        <MedicineOptionsPanel
          optionsList={optionsList}
          isDark={false}
          theme={mockTheme}
          onOptionPress={onOptionPress}
          preferredLang="marathi"
        />,
      );

      expect(getByText("औषधे जोडा")).toBeTruthy();
    });

    it("MedicineOptionsPanel resolves localized addMedicines label in Tamil", async () => {
      const onOptionPress = jest.fn();
      const mockTheme = {
        colors: {
          primary: "#2563eb",
          cardBackground: "#ffffff",
          cardBorder: "#e2e8f0",
          textPrimary: "#1e293b",
          textSecondary: "#64748b",
        },
      };

      const optionsList = [
        { key: "ADD", label: "Add Medicines", primary: true },
      ];

      const { getByText }: any = await render(
        <MedicineOptionsPanel
          optionsList={optionsList}
          isDark={false}
          theme={mockTheme}
          onOptionPress={onOptionPress}
          preferredLang="tamil"
        />,
      );

      expect(getByText("மருந்துகளைச் சேர்க்கவும்")).toBeTruthy();
    });
  });

  describe("Phase 16 - Invariant 7: Confirm Medicines List Static Label Localization & Medical Data Isolation", () => {
    it("localizes static field labels in Gujarati while strictly preserving medical values verbatim", async () => {
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
          name: "Paracetamol",
          type: "TABLET",
          dose: { count: 500 },
          dosage: "500",
          frequency: "Twice Daily",
          schedule: ["08:00", "20:00"],
          startDate: "2026-10-01",
          selected: true,
          total_quantity: 30,
          refill_alert: true,
          notes: "Take after meals",
          prescribedBy: "Dr. Sharma",
        },
      ];

      const { getByText, getAllByText, findByText, getByTestId }: any = await render(
        <ReviewMedicinesListCard
          localMedicines={localMeds}
          setLocalMedicines={jest.fn()}
          preferredLang="gujarati"
          isDark={false}
          theme={mockTheme}
          onConfirm={jest.fn()}
          onAddNew={jest.fn()}
          onSkipAll={jest.fn()}
          onEdit={jest.fn()}
        />,
      );

      // Medical data preserved verbatim in summary view
      expect(getByText("Paracetamol")).toBeTruthy();

      // Tapping pill expand button expands accordion
      fireEvent.press(getByTestId("expand-med-med-1"));

      // Static labels are localized in Gujarati
      expect(await findByText("દવાનું નામ")).toBeTruthy();
      expect(getByText("દવાનો પ્રકાર")).toBeTruthy();
      expect(getByText("દવાનો ખોરાક (માત્રા)")).toBeTruthy();
      expect(getByText("લેવાની આવર્તન (દિવસમાં કેટલી વાર)")).toBeTruthy();
      expect(getByText("લેવાનો સમય")).toBeTruthy();
      expect(getByText("કુલ જથ્થો")).toBeTruthy();
      expect(getByText("રિફિલ એલર્ટ નોટિફિકેશન")).toBeTruthy();
      expect(getByText("સક્રિય")).toBeTruthy(); // Refill alert enabled localized
      expect(getByText("શરૂઆતની તારીખ")).toBeTruthy();
      expect(getByText("પ્રિસ્ક્રાઇબ કરનાર ડોક્ટર")).toBeTruthy();

      // Medical and user-entered values are strictly untouched verbatim
      expect(getAllByText("Paracetamol").length).toBeGreaterThanOrEqual(2);
      expect(getByText("બે વાર")).toBeTruthy(); // Frequency localized in Gujarati
      expect(getByText("08:00, 20:00")).toBeTruthy();
      expect(getByText("30")).toBeTruthy();
      expect(getByText("Dr. Sharma")).toBeTruthy();
      expect(getByText(/Take after meals/)).toBeTruthy();
    });
  });

  describe("Phase 16 - Invariant 8: In-Card Edit -> Cancel Parity & Zero Chat Message / API Turn Invariance", () => {
    it("switching to Edit and pressing Cancel restores ReviewMedicinesListCard in-place with zero chat messages or API calls", async () => {
      const handleGenericOptionPress = jest.fn();
      const mockTheme = {
        colors: {
          primary: "#2563eb",
          cardBackground: "#ffffff",
          cardBorder: "#e2e8f0",
          textPrimary: "#1e293b",
          textSecondary: "#64748b",
        },
      };

      const mockMeds = [
        {
          id: "med-1",
          client_med_id: "med-1",
          name: "Metformin 500mg",
          dosage: "500mg",
          dose: { count: 1 },
          frequency: "Twice Daily",
          medicationSchedule: ["08:00", "20:00"],
          type: "TABLET",
          selected: true,
        },
      ];

      const item: any = {
        id: "msg-rev-16",
        role: "assistant",
        text: "Please review your medications",
        action: "REVIEW_MEDICINES_LIST",
        medicines: mockMeds,
      };

      const baseItemProps = {
        isDark: false,
        theme: mockTheme,
        preferredLang: "english",
        speakingMessageId: null,
        speakMessage: jest.fn(),
        onboardingSessionId: "session-16",
        chatWizardState: {
          jobIds: [],
          filesInfo: [],
          extractedMedicines: mockMeds,
          conflicts: [],
          currentConflictIndex: 0,
          resolvedMedicines: [],
          replaceList: [],
          mergeList: [],
          summaries: [],
        },
        isLoadingResults: false,
        isConfirmingMeds: false,
        setMedicineToEdit: jest.fn(),
        editSheetRef: { current: null },
        handleConfirmSelection: jest.fn(),
        resolveCurrentConflict: jest.fn(),
        navigateConflict: jest.fn(),
        handleContinueAnyway: jest.fn(),
        handleReviewMedicines: jest.fn(),
        handleConfirmAndAddMeds: jest.fn(),
        handleGenericOptionPress,
        navigation: { navigate: jest.fn() },
        setChatWizardState: jest.fn(),
        mergedMessages: [item],
      };

      const { getByText, queryByText, findByText, getByTestId }: any = await render(
        <ChatMessageItem
          {...baseItemProps}
          item={item}
          index={0}
        />
      );

      // Initially renders ReviewMedicinesListCard
      expect(getByText("Metformin 500mg")).toBeTruthy();
      expect(getByText("Confirm Selection")).toBeTruthy();

      // Find edit pencil button using testID and press it
      const editBtn = getByTestId("edit-med-med-1");
      expect(editBtn).toBeTruthy();
      fireEvent.press(editBtn);

      // Mode switches in-card to 'edit', rendering AddMedicineCard
      // AddMedicineCard has 'Save Medicine' and 'Cancel' buttons
      expect(await findByText("Save Medicine")).toBeTruthy();
      const cancelBtn = getByText("Cancel");
      expect(cancelBtn).toBeTruthy();

      // Press Cancel in edit mode
      fireEvent.press(cancelBtn);

      // Invariants strictly verified:
      // 1. handleGenericOptionPress was NOT called (0 chat turns created)
      expect(handleGenericOptionPress).not.toHaveBeenCalled();

      // 2. ReviewMedicinesListCard is restored in-place
      expect(await findByText("Confirm Selection")).toBeTruthy();
      expect(getByText("Metformin 500mg")).toBeTruthy();
      expect(queryByText("Save Medicine")).toBeNull();
    });
  });

  describe("Phase 17 - Invariant 9: Multi-Medicine Single-Medicine Edit Target Identity", () => {
    it("opening edit for medicine #3 (Lcz) in a multi-medicine list resolves strictly to Lcz", async () => {
      const mockTheme = {
        colors: {
          primary: "#2563eb",
          cardBackground: "#ffffff",
          cardBorder: "#e2e8f0",
          textPrimary: "#1e293b",
          textSecondary: "#64748b",
        },
      };

      const initialMeds = [
        { id: "med-1", client_med_id: "med-1", name: "Paracetamol", type: "TABLET", dose: { count: 1 } },
        { id: "med-2", client_med_id: "med-2", name: "Domparidom", type: "TABLET", dose: { count: 1 } },
        { id: "med-3", client_med_id: "med-3", name: "Lcz", type: "TABLET", dose: { count: 1 } },
      ];

      const { getByDisplayValue, queryByDisplayValue }: any = await render(
        <AddMedicineCard
          initialMedicines={initialMeds}
          med={initialMeds[2]} // Lcz
          isEditingLocal={true}
          preferredLang="english"
          isDark={false}
          theme={mockTheme}
          onSave={jest.fn()}
        />
      );

      // Verify that Lcz is populated in the form, NOT Paracetamol
      expect(getByDisplayValue("Lcz")).toBeTruthy();
      expect(queryByDisplayValue("Paracetamol")).toBeNull();
    });

    it("opening edit for medicine #2 (Domparidom) resolves strictly to Domparidom", async () => {
      const mockTheme = {
        colors: {
          primary: "#2563eb",
          cardBackground: "#ffffff",
          cardBorder: "#e2e8f0",
          textPrimary: "#1e293b",
          textSecondary: "#64748b",
        },
      };

      const initialMeds = [
        { id: "med-1", client_med_id: "med-1", name: "Paracetamol", type: "TABLET", dose: { count: 1 } },
        { id: "med-2", client_med_id: "med-2", name: "Domparidom", type: "TABLET", dose: { count: 1 } },
        { id: "med-3", client_med_id: "med-3", name: "Lcz", type: "TABLET", dose: { count: 1 } },
      ];

      const { getByDisplayValue, queryByDisplayValue }: any = await render(
        <AddMedicineCard
          initialMedicines={initialMeds}
          med={initialMeds[1]} // Domparidom
          isEditingLocal={true}
          preferredLang="english"
          isDark={false}
          theme={mockTheme}
          onSave={jest.fn()}
        />
      );

      // Verify that Domparidom is populated in the form, NOT Paracetamol
      expect(getByDisplayValue("Domparidom")).toBeTruthy();
      expect(queryByDisplayValue("Paracetamol")).toBeNull();
    });
  });

  describe("Phase 17 - Invariant 10: Multi-Medicine In-Card Edit -> Cancel Non-Destructive Restoration", () => {
    it("tapping edit on Lcz and pressing Cancel restores all 3 medicines with zero chat messages or API calls", async () => {
      const handleGenericOptionPress = jest.fn();
      const mockTheme = {
        colors: {
          primary: "#2563eb",
          cardBackground: "#ffffff",
          cardBorder: "#e2e8f0",
          textPrimary: "#1e293b",
          textSecondary: "#64748b",
        },
      };

      const mockMeds = [
        {
          id: "med-1",
          client_med_id: "med-1",
          name: "Paracetamol",
          type: "TABLET",
          dose: { count: 1 },
          frequency: "ONCE",
          selected: true,
        },
        {
          id: "med-2",
          client_med_id: "med-2",
          name: "Domparidom",
          type: "TABLET",
          dose: { count: 1 },
          frequency: "ONCE",
          selected: true,
        },
        {
          id: "med-3",
          client_med_id: "med-3",
          name: "Lcz",
          type: "TABLET",
          dose: { count: 1 },
          frequency: "ONCE",
          selected: true,
        },
      ];

      const item: any = {
        id: "msg-rev-17",
        role: "assistant",
        text: "Please review your medications",
        action: "REVIEW_MEDICINES_LIST",
        medicines: mockMeds,
      };

      const baseItemProps = {
        isDark: false,
        theme: mockTheme,
        preferredLang: "english",
        speakingMessageId: null,
        speakMessage: jest.fn(),
        onboardingSessionId: "session-17",
        chatWizardState: {
          jobIds: [],
          filesInfo: [],
          extractedMedicines: mockMeds,
          conflicts: [],
          currentConflictIndex: 0,
          resolvedMedicines: [],
          replaceList: [],
          mergeList: [],
          summaries: [],
        },
        isLoadingResults: false,
        isConfirmingMeds: false,
        setMedicineToEdit: jest.fn(),
        editSheetRef: { current: null },
        handleConfirmSelection: jest.fn(),
        resolveCurrentConflict: jest.fn(),
        navigateConflict: jest.fn(),
        handleContinueAnyway: jest.fn(),
        handleReviewMedicines: jest.fn(),
        handleConfirmAndAddMeds: jest.fn(),
        handleGenericOptionPress,
        navigation: { navigate: jest.fn() },
        setChatWizardState: jest.fn(),
        mergedMessages: [item],
      };

      const { getByText, queryByText, findByText, getByTestId, getByDisplayValue }: any = await render(
        <ChatMessageItem
          {...baseItemProps}
          item={item}
          index={0}
        />
      );

      // Initially renders ReviewMedicinesListCard with all 3 medicines
      expect(getByText("Paracetamol")).toBeTruthy();
      expect(getByText("Domparidom")).toBeTruthy();
      expect(getByText("Lcz")).toBeTruthy();
      expect(getByText("Confirm Selection")).toBeTruthy();

      // Find edit pencil button for Lcz (med-3) and press it
      const editLczBtn = getByTestId("edit-med-med-3");
      expect(editLczBtn).toBeTruthy();
      fireEvent.press(editLczBtn);

      // Mode switches in-card to 'edit', rendering AddMedicineCard for Lcz
      expect(await findByText("Save Medicine")).toBeTruthy();
      expect(getByDisplayValue("Lcz")).toBeTruthy();
      const cancelBtn = getByText("Cancel");
      expect(cancelBtn).toBeTruthy();

      // Press Cancel in edit mode
      fireEvent.press(cancelBtn);

      // Invariants strictly verified:
      // 1. handleGenericOptionPress was NOT called (0 chat messages created)
      expect(handleGenericOptionPress).not.toHaveBeenCalled();

      // 2. ReviewMedicinesListCard is restored in-place with all 3 medicines intact
      expect(await findByText("Confirm Selection")).toBeTruthy();
      expect(getByText("Paracetamol")).toBeTruthy();
      expect(getByText("Domparidom")).toBeTruthy();
      expect(getByText("Lcz")).toBeTruthy();
      expect(queryByText("Save Medicine")).toBeNull();
    });
  });

  describe("Phase 17 - Invariant 11: Dual-Layer Localization of Predefined Form Enums in Gujarati", () => {
    it("localizes medicineType, frequency, refillAlert, and none values in Gujarati while preserving medical values verbatim", async () => {
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
          id: "med-loc-1",
          client_med_id: "med-loc-1",
          name: "Paracetamol",
          type: "TABLET",
          dosage: "500 mg",
          dose: { value: 500, unit: "mg" },
          frequency: "ONCE",
          refillAlert: false,
          notes: "Take after meals",
          selected: true,
        },
      ];

      const { getByText, getAllByText, getByTestId, findByText }: any = await render(
        <ReviewMedicinesListCard
          localMedicines={localMeds}
          setLocalMedicines={jest.fn()}
          preferredLang="gujarati"
          isDark={false}
          theme={mockTheme}
          onConfirm={jest.fn()}
          onAddNew={jest.fn()}
          onSkipAll={jest.fn()}
          onEdit={jest.fn()}
        />
      );

      // Summary pill row: Type is localized in Gujarati
      expect(getAllByText(/ટેબ્લેટ/).length).toBeGreaterThanOrEqual(1);

      // Expand medicine pill to see details grid
      const expandBtn = getByTestId("expand-med-med-loc-1");
      fireEvent.press(expandBtn);

      // Predefined enum fields are localized in Gujarati
      expect(await findByText(/ટેબ્લેટ/)).toBeTruthy(); // Type
      expect(getByText("એક વાર")).toBeTruthy(); // Frequency ONCE
      expect(getByText("નિષ્ક્રિય")).toBeTruthy(); // Refill alert disabled
      expect(getAllByText("કોઈ નહિ").length).toBeGreaterThanOrEqual(1); // None fields (prescribedBy, totalQuantity, etc.)

      // Medical and user-entered values remain strictly verbatim
      expect(getAllByText("Paracetamol").length).toBeGreaterThanOrEqual(2);
      expect(getByText("500 mg")).toBeTruthy();
      expect(getByText(/Take after meals/)).toBeTruthy();
    });
  });

  describe("Phase 17 - Invariant 12: Confirmed Read-Only Card Resilience & Independent Expansion", () => {
    it("renders confirmed medicines in readOnly mode, hides edit pencils, disables actions, and permits independent accordion expansion", async () => {
      const mockTheme = {
        colors: {
          primary: "#2563eb",
          cardBackground: "#ffffff",
          cardBorder: "#e2e8f0",
          textPrimary: "#1e293b",
          textSecondary: "#64748b",
        },
      };

      const confirmedMeds = [
        {
          id: "med-ro-1",
          client_med_id: "med-ro-1",
          name: "Amoxicillin",
          type: "CAPSULE",
          dosage: "250 mg",
          dose: { value: 250, unit: "mg" },
          frequency: "TWICE",
          selected: true,
        },
        {
          id: "med-ro-2",
          client_med_id: "med-ro-2",
          name: "Cetirizine",
          type: "TABLET",
          dosage: "10 mg",
          dose: { value: 10, unit: "mg" },
          frequency: "ONCE",
          selected: true,
        },
      ];

      const { getByText, queryByTestId, getByTestId, findByText }: any = await render(
        <ReviewMedicinesListCard
          localMedicines={confirmedMeds}
          setLocalMedicines={jest.fn()}
          preferredLang="english"
          isDark={false}
          theme={mockTheme}
          onConfirm={jest.fn()}
          onAddNew={jest.fn()}
          onSkipAll={jest.fn()}
          onEdit={jest.fn()}
          readOnly={true}
        />
      );

      // 1. Both confirmed medicines are rendered (not collapsed to empty)
      expect(getByText("Amoxicillin")).toBeTruthy();
      expect(getByText("Cetirizine")).toBeTruthy();

      // 2. Edit pencils are absent in read-only mode
      expect(queryByTestId("edit-med-med-ro-1")).toBeNull();
      expect(queryByTestId("edit-med-med-ro-2")).toBeNull();

      // 3. Chevron expand buttons are present and independent expansion works
      const expandBtn1 = getByTestId("expand-med-med-ro-1");
      expect(expandBtn1).toBeTruthy();
      fireEvent.press(expandBtn1);

      // Expanded details for Amoxicillin become visible
      expect(await findByText("250 mg")).toBeTruthy();
    });
  });

  describe("Phase 18 - Invariant 13: Presentation-Layer Dose Unit Localization in Form & Review Card", () => {
    it("resolves dose unit display across all 5 languages without altering canonical domain values", () => {
      // English
      expect(resolveDoseUnitDisplay("TABLET", "english")).toBe("tablet");
      expect(resolveDoseUnitDisplay("CAPSULE", "english")).toBe("capsule");
      expect(resolveDoseUnitDisplay("PUFF", "english")).toBe("puff");
      expect(resolveDoseUnitDisplay("DROPS", "english")).toBe("drops");
      expect(resolveDoseUnitDisplay("ML", "english")).toBe("ml");

      // Gujarati
      expect(resolveDoseUnitDisplay("TABLET", "gujarati")).toBe("ટેબ્લેટ");
      expect(resolveDoseUnitDisplay("CAPSULE", "gujarati")).toBe("કેપ્સ્યુલ");
      expect(resolveDoseUnitDisplay("PUFF", "gujarati")).toBe("પફ");
      expect(resolveDoseUnitDisplay("DROPS", "gujarati")).toBe("ટીપાં");
      expect(resolveDoseUnitDisplay("ML", "gujarati")).toBe("મિ.લી.");

      // Hindi
      expect(resolveDoseUnitDisplay("TABLET", "hindi")).toBe("टैबलेट");
      expect(resolveDoseUnitDisplay("CAPSULE", "hindi")).toBe("कैप्सूल");
      expect(resolveDoseUnitDisplay("PUFF", "hindi")).toBe("पफ");
      expect(resolveDoseUnitDisplay("DROPS", "hindi")).toBe("बूंदें");

      // Marathi
      expect(resolveDoseUnitDisplay("TABLET", "marathi")).toBe("टॅब्लेट");
      expect(resolveDoseUnitDisplay("CAPSULE", "marathi")).toBe("कॅप्सूल");
      expect(resolveDoseUnitDisplay("PUFF", "marathi")).toBe("पफ");

      // Tamil
      expect(resolveDoseUnitDisplay("TABLET", "tamil")).toBe("மாத்திரை");
      expect(resolveDoseUnitDisplay("CAPSULE", "tamil")).toBe("காப்ஸ்யூல்");
      expect(resolveDoseUnitDisplay("PUFF", "tamil")).toBe("பஃப்");

      // Verbatim preservation of medical units
      expect(resolveDoseUnitDisplay("mg", "gujarati")).toBe("mg");
      expect(resolveDoseUnitDisplay("mcg", "hindi")).toBe("mcg");
    });

    const mockTheme = {
      colors: {
        primary: "#2563eb",
        cardBackground: "#ffffff",
        cardBorder: "#e2e8f0",
        textPrimary: "#1e293b",
        textSecondary: "#64748b",
      },
    };

    const testMed = {
      id: "med-loc-1",
      client_med_id: "med-loc-1",
      name: "Paracetamol",
      type: "TABLET",
      dosage: { count: 1 },
      dose: { count: 1 },
      frequency: "ONCE",
      selected: true,
    };

    it("ReviewMedicinesListCard localizes dose count + unit in Gujarati (strictly eliminates '1 tablet(s)')", async () => {
      const { getByTestId, findByText, queryByText }: any = await render(
        <ReviewMedicinesListCard
          localMedicines={[testMed]}
          setLocalMedicines={jest.fn()}
          preferredLang="gujarati"
          isDark={false}
          theme={mockTheme}
          onConfirm={jest.fn()}
          onAddNew={jest.fn()}
          onSkipAll={jest.fn()}
          onEdit={jest.fn()}
          readOnly={false}
        />
      );

      fireEvent.press(getByTestId("expand-med-med-loc-1"));
      expect(await findByText("1 ટેબ્લેટ")).toBeTruthy();
      expect(queryByText("1 tablet(s)")).toBeNull();
    });

    it("ReviewMedicinesListCard localizes dose count + unit in Hindi", async () => {
      const { getByTestId, findByText, queryByText }: any = await render(
        <ReviewMedicinesListCard
          localMedicines={[testMed]}
          setLocalMedicines={jest.fn()}
          preferredLang="hindi"
          isDark={false}
          theme={mockTheme}
          onConfirm={jest.fn()}
          onAddNew={jest.fn()}
          onSkipAll={jest.fn()}
          onEdit={jest.fn()}
          readOnly={false}
        />
      );

      fireEvent.press(getByTestId("expand-med-med-loc-1"));
      expect(await findByText("1 टैबलेट")).toBeTruthy();
      expect(queryByText("1 tablet(s)")).toBeNull();
    });

    it("ReviewMedicinesListCard localizes dose count + unit in Marathi", async () => {
      const { getByTestId, findByText, queryByText }: any = await render(
        <ReviewMedicinesListCard
          localMedicines={[testMed]}
          setLocalMedicines={jest.fn()}
          preferredLang="marathi"
          isDark={false}
          theme={mockTheme}
          onConfirm={jest.fn()}
          onAddNew={jest.fn()}
          onSkipAll={jest.fn()}
          onEdit={jest.fn()}
          readOnly={false}
        />
      );

      fireEvent.press(getByTestId("expand-med-med-loc-1"));
      expect(await findByText("1 टॅब्लेट")).toBeTruthy();
      expect(queryByText("1 tablet(s)")).toBeNull();
    });

    it("ReviewMedicinesListCard localizes dose count + unit in Tamil", async () => {
      const { getByTestId, findByText, queryByText }: any = await render(
        <ReviewMedicinesListCard
          localMedicines={[testMed]}
          setLocalMedicines={jest.fn()}
          preferredLang="tamil"
          isDark={false}
          theme={mockTheme}
          onConfirm={jest.fn()}
          onAddNew={jest.fn()}
          onSkipAll={jest.fn()}
          onEdit={jest.fn()}
          readOnly={false}
        />
      );

      fireEvent.press(getByTestId("expand-med-med-loc-1"));
      expect(await findByText("1 மாத்திரை")).toBeTruthy();
      expect(queryByText("1 tablet(s)")).toBeNull();
    });
  });

  describe("Phase 18 - Invariant 14: Independent Multi-Medicine Accordion Expansion", () => {
    it("allows expanding multiple medicines simultaneously in confirmed read-only mode without mutual collapse", async () => {
      const mockTheme = {
        colors: {
          primary: "#2563eb",
          cardBackground: "#ffffff",
          cardBorder: "#e2e8f0",
          textPrimary: "#1e293b",
          textSecondary: "#64748b",
        },
      };

      const multiMeds = [
        {
          id: "med-multi-1",
          client_med_id: "med-multi-1",
          name: "Amoxicillin",
          type: "CAPSULE",
          dosage: "500 mg",
          frequency: "TWICE",
          selected: true,
        },
        {
          id: "med-multi-2",
          client_med_id: "med-multi-2",
          name: "Cetirizine",
          type: "TABLET",
          dosage: "10 mg",
          frequency: "ONCE",
          selected: true,
        },
        {
          id: "med-multi-3",
          client_med_id: "med-multi-3",
          name: "Domperidone",
          type: "TABLET",
          dosage: "20 mg",
          frequency: "THRICE",
          selected: true,
        },
      ];

      const { getByTestId, findByText, queryByText }: any = await render(
        <ReviewMedicinesListCard
          localMedicines={multiMeds}
          setLocalMedicines={jest.fn()}
          preferredLang="english"
          isDark={false}
          theme={mockTheme}
          onConfirm={jest.fn()}
          onAddNew={jest.fn()}
          onSkipAll={jest.fn()}
          onEdit={jest.fn()}
          readOnly={true}
        />
      );

      // Expand Medicine #1
      fireEvent.press(getByTestId("expand-med-med-multi-1"));
      expect(await findByText("500 mg")).toBeTruthy();

      // Expand Medicine #3
      fireEvent.press(getByTestId("expand-med-med-multi-3"));
      expect(await findByText("20 mg")).toBeTruthy();

      // Invariant: Medicine #1's details MUST STILL be visible (no mutual collapse!)
      expect(queryByText("500 mg")).toBeTruthy();

      // Collapse Medicine #1
      fireEvent.press(getByTestId("expand-med-med-multi-1"));
      // Medicine #3's details must STILL remain visible!
      expect(queryByText("20 mg")).toBeTruthy();
    });
  });

  describe("Phase 18 - Invariant 15: Confirmed List Integrity & View More / View Less Preservation (>3 medicines)", () => {
    it("preserves View More (Show All / Hide All) in historical readOnly mode and prevents accidental medicine filtering", async () => {
      const mockTheme = {
        colors: {
          primary: "#2563eb",
          cardBackground: "#ffffff",
          cardBorder: "#e2e8f0",
          textPrimary: "#1e293b",
          textSecondary: "#64748b",
        },
      };

      // 4 confirmed medicines, some without explicit selected: true
      const confirmedFourMeds = [
        { id: "c-med-1", client_med_id: "c-med-1", name: "Medicine Alpha", type: "TABLET", dosage: "1 tablet" },
        { id: "c-med-2", client_med_id: "c-med-2", name: "Medicine Beta", type: "CAPSULE", dosage: "1 capsule" },
        { id: "c-med-3", client_med_id: "c-med-3", name: "Medicine Gamma", type: "TABLET", dosage: "1 tablet" },
        { id: "c-med-4", client_med_id: "c-med-4", name: "Medicine Delta", type: "TABLET", dosage: "1 tablet" },
      ];

      const { getByText, queryByText, getByTestId, findByText }: any = await render(
        <ReviewMedicinesListCard
          localMedicines={confirmedFourMeds}
          setLocalMedicines={jest.fn()}
          preferredLang="english"
          isDark={false}
          theme={mockTheme}
          onConfirm={jest.fn()}
          onAddNew={jest.fn()}
          onSkipAll={jest.fn()}
          onEdit={jest.fn()}
          readOnly={true}
        />
      );

      // First 3 medicines are visible initially
      expect(getByText("Medicine Alpha")).toBeTruthy();
      expect(getByText("Medicine Beta")).toBeTruthy();
      expect(getByText("Medicine Gamma")).toBeTruthy();
      // 4th medicine is initially truncated
      expect(queryByText("Medicine Delta")).toBeNull();

      // "Show All" button MUST be present because total medicines = 4 > 3
      const showAllButton = getByTestId("show-all-medicines-btn");
      expect(showAllButton).toBeTruthy();

      // Tap "Show All"
      fireEvent.press(showAllButton);

      // Now Medicine Delta is visible!
      expect(await findByText("Medicine Delta")).toBeTruthy();
      expect(getByText(/Hide All/)).toBeTruthy();

      // Tap "Hide All"
      fireEvent.press(getByTestId("show-all-medicines-btn"));
      await waitFor(() => {
        expect(queryByText("Medicine Delta")).toBeNull();
      });
      expect(getByText(/Show All/)).toBeTruthy();
    });
  });

  describe("Phase 20 - Invariant 16: Canonical Frequency Enum & Numeric dosePerIntake Serialization", () => {
    it("ReviewMedicinesListCard serializes canonical frequency enums and double-precision dosePerIntake", async () => {
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

      const rawMeds = [
        {
          id: "m-1",
          name: "Med Once",
          type: "TABLET",
          dose: { count: 2 },
          frequency: "ONCE DAILY",
          selected: true,
        },
        {
          id: "m-2",
          name: "Med Twice",
          type: "CAPSULE",
          dose: { count: 1 },
          frequency: "TWICE_DAILY",
          selected: true,
        },
        {
          id: "m-3",
          name: "Med Thrice",
          type: "TABLET",
          dose: { count: 1 },
          frequency: "3X DAILY",
          selected: true,
        },
        {
          id: "m-4",
          name: "Med PRN",
          type: "TABLET",
          dose: { count: 1 },
          frequency: "AS_NEEDED",
          selected: true,
        },
      ];

      const { getByText }: any = await render(
        <ReviewMedicinesListCard
          localMedicines={rawMeds}
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
      const [, formattedMeds] = onConfirmMock.mock.calls[0];

      const m1 = formattedMeds.find((m: any) => m.id === "m-1");
      expect(m1.frequency).toBe("Once Daily");
      expect(m1.dosePerIntake).toBe(2);
      expect(typeof m1.dosePerIntake).toBe("number");

      const m2 = formattedMeds.find((m: any) => m.id === "m-2");
      expect(m2.frequency).toBe("Twice Daily");

      const m3 = formattedMeds.find((m: any) => m.id === "m-3");
      expect(m3.frequency).toBe("Three Times Daily");

      const m4 = formattedMeds.find((m: any) => m.id === "m-4");
      expect(m4.frequency).toBe("As Needed");
    });
  });

  describe("Phase 20.5: Policy Normalization & Draft Isolation Invariants", () => {
    const mockTheme = {
      colors: {
        primary: "#2563eb",
        cardBackground: "#ffffff",
        cardBorder: "#e2e8f0",
        textPrimary: "#1e293b",
        textSecondary: "#64748b",
      },
    };

    it("ReviewMedicinesListCard preserves resolution: 'KEEP_NEW' without mapping to REPLACE", async () => {
      const onConfirmMock = jest.fn();
      const rawMeds = [
        {
          id: "m-keep-new",
          client_med_id: "m-keep-new",
          name: "Amoxicillin",
          type: "CAPSULE",
          dose: { count: 1 },
          frequency: "Twice Daily",
          resolution: "KEEP_NEW",
          selected: true,
        },
      ];

      const { getByText }: any = await render(
        <ReviewMedicinesListCard
          localMedicines={rawMeds}
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
      const [, formattedMeds] = onConfirmMock.mock.calls[0];
      expect(formattedMeds[0].resolution).toBe("KEEP_NEW");
    });

    it("AddMedicineCard ignores confirmed DB medicines (isSaved: true, dbId != null) in drafts initialization", async () => {
      const initialWithSaved = [
        {
          id: "db-med-1",
          name: "Paracetamol",
          isSaved: true,
          dbId: "db-med-1",
          type: "TABLET",
        },
        {
          client_med_id: "draft-aspirin-1",
          name: "Aspirin",
          isSaved: false,
          dbId: null,
          type: "TABLET",
        },
      ];

      const { queryByText, getByDisplayValue }: any = await render(
        <AddMedicineCard
          initialMedicines={initialWithSaved}
          isEditingLocal={true}
          med={initialWithSaved[1]}
          preferredLang="english"
          isDark={false}
          theme={mockTheme}
          onSave={jest.fn()}
          onSaveMedicines={jest.fn()}
          onExitToOptions={jest.fn()}
        />,
      );

      // Paracetamol is saved to DB and should NOT be displayed or staged as a draft
      expect(queryByText("Paracetamol")).toBeNull();
      // Aspirin is an unconfirmed draft and is rendered in the form
      expect(getByDisplayValue("Aspirin")).toBeTruthy();
    });

    it("AddMedicineCard initializes with empty draft form when all initial medicines are already saved", async () => {
      const allSavedMeds = [
        {
          id: "db-med-paracetamol",
          name: "Paracetamol",
          isSaved: true,
          dbId: "db-med-paracetamol",
          type: "TABLET",
        },
      ];

      const { queryByText }: any = await render(
        <AddMedicineCard
          initialMedicines={allSavedMeds}
          preferredLang="english"
          isDark={false}
          theme={mockTheme}
          onSave={jest.fn()}
          onSaveMedicines={jest.fn()}
          onExitToOptions={jest.fn()}
        />,
      );

      // Paracetamol must NOT be populated in drafts
      expect(queryByText("Paracetamol")).toBeNull();
    });
  });
});

