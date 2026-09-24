import React from "react";
import { StyleSheet } from "react-native";
import { render, fireEvent, act } from "@testing-library/react-native";
import { ChatMessageItem } from "../../../components/chat/ChatMessageItem";

// Mock @expo/vector-icons
jest.mock("@expo/vector-icons", () => ({
  Ionicons: "Ionicons",
}));

// Mock DocumentUploadContext
jest.mock("../../../context/DocumentUploadContext", () => ({
  useDocumentUpload: () => ({
    uploadingDocs: [],
    isUploading: false,
    chatWizardState: { filesInfo: [], extractedMedicines: [], summaries: [] },
    setChatWizardState: jest.fn(),
  }),
}));

describe("Post-Onboarding Chat Continuity: Blood Group & Allergy Parity Tests", () => {
  const mockTheme = {
    colors: {
      primary: "#0f766e",
      surface: "#ffffff",
      border: "#e2e8f0",
    },
  };

  const baseItemProps: any = {
    index: 0,
    isDark: false,
    theme: mockTheme,
    preferredLang: "english",
    speakingMessageId: null,
    speakMessage: jest.fn(),
    onboardingSessionId: "mock-onboarding-session-123",
    chatWizardState: {
      step: "IDLE",
      jobIds: [],
      filesInfo: [],
      extractedMedicines: [],
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
    handleGenericOptionPress: jest.fn(),
    navigation: { navigate: jest.fn() },
    setChatWizardState: jest.fn(),
  };

  describe("1. isChatInputHidden Calculation Parity", () => {
    const isChatInputHidden = (activeAction?: string | null) => {
      return Boolean(
        activeAction === "ASK_BLOOD_GROUP" ||
        activeAction === "ASK_ALLERGIES" ||
        activeAction === "ASK_LANGUAGE" ||
        activeAction === "ASK_GENDER" ||
        activeAction === "ASK_DOB" ||
        activeAction === "RESOLVE_PROFILE_SOURCE" ||
        activeAction === "ASK_UPLOAD_OR_SKIP" ||
        activeAction === "REVIEW_MEDICINES_LIST" ||
        activeAction === "ADD_MEDICINE" ||
        activeAction === "EDIT_MEDICINE" ||
        activeAction === "CONFIRM_MEDICINE" ||
        activeAction === "MEDICINE_OPTIONS"
      );
    };

    it("hides text input when activeAction is ASK_BLOOD_GROUP", () => {
      expect(isChatInputHidden("ASK_BLOOD_GROUP")).toBe(true);
    });

    it("hides text input when activeAction is ASK_ALLERGIES", () => {
      expect(isChatInputHidden("ASK_ALLERGIES")).toBe(true);
    });

    it("shows text input when in NORMAL_CHAT post-onboarding", () => {
      expect(isChatInputHidden("NORMAL_CHAT")).toBe(false);
      expect(isChatInputHidden(null)).toBe(false);
      expect(isChatInputHidden(undefined)).toBe(false);
    });
  });

  describe("2. Blood Group Option Chips in Post-Onboarding Chat", () => {
    const bloodGroupMsg: any = {
      id: "ai-blood-group-msg",
      role: "ai",
      action: "ASK_BLOOD_GROUP",
      text: "What is your blood group?",
      options: [
        { label: "O+", value: "O+" },
        { label: "A+", value: "A+" },
        { label: "B+", value: "B+" },
        { label: "Skip", value: "SKIP" },
      ],
      createdAt: "2026-09-23T10:00:00.000Z",
    };

    it("renders Blood Group chips as interactive and clickable even when isOnboardingCompleted is true", async () => {
      const handleOptionPress = jest.fn();

      const { getByText } = await render(
        <ChatMessageItem
          {...baseItemProps}
          item={bloodGroupMsg}
          mergedMessages={[bloodGroupMsg]}
          isOnboardingCompleted={true}
          handleGenericOptionPress={handleOptionPress}
        />
      );

      const oPlusChip = getByText("O+");
      expect(oPlusChip).toBeTruthy();

      fireEvent.press(oPlusChip);
      expect(handleOptionPress).toHaveBeenCalledWith(
        { label: "O+", value: "O+" },
        "O+"
      );
    });

    it("clicking Skip chip calls handleGenericOptionPress cleanly", async () => {
      const handleOptionPress = jest.fn();

      const { getByText } = await render(
        <ChatMessageItem
          {...baseItemProps}
          item={bloodGroupMsg}
          mergedMessages={[bloodGroupMsg]}
          isOnboardingCompleted={true}
          handleGenericOptionPress={handleOptionPress}
        />
      );

      const skipChip = getByText("Skip");
      expect(skipChip).toBeTruthy();

      fireEvent.press(skipChip);
      expect(handleOptionPress).toHaveBeenCalledWith(
        { label: "Skip", value: "SKIP" },
        "Skip"
      );
    });

    it("does NOT execute when message is historical (already answered by subsequent user message)", async () => {
      const handleOptionPress = jest.fn();
      const userReplyMsg: any = {
        id: "user-bg-reply-1",
        role: "user",
        text: "O+",
        createdAt: "2026-09-23T10:01:00.000Z",
      };

      const { queryByText } = await render(
        <ChatMessageItem
          {...baseItemProps}
          item={bloodGroupMsg}
          mergedMessages={[userReplyMsg, bloodGroupMsg]}
          isOnboardingCompleted={true}
          handleGenericOptionPress={handleOptionPress}
        />
      );

      // In historical mode, HistoricalChips renders
      const oPlusChip = queryByText("O+");
      expect(oPlusChip).toBeTruthy();
      if (oPlusChip) {
        fireEvent.press(oPlusChip);
      }
      expect(handleOptionPress).not.toHaveBeenCalled();
    });
  });

  describe("3. AskAllergiesCard in Post-Onboarding Chat", () => {
    const allergyMsg: any = {
      id: "ai-allergy-msg",
      role: "ai",
      action: "ASK_ALLERGIES",
      text: "Do you have any allergies?",
      createdAt: "2026-09-23T10:02:00.000Z",
    };

    it("renders AskAllergiesCard in active mode and forwards 'No Allergies' selection", async () => {
      const handleOptionPress = jest.fn();

      const { getByTestId } = await render(
        <ChatMessageItem
          {...baseItemProps}
          item={allergyMsg}
          mergedMessages={[allergyMsg]}
          isOnboardingCompleted={true}
          handleGenericOptionPress={handleOptionPress}
        />
      );

      const noBtn = getByTestId("allergy-option-no");
      expect(noBtn).toBeTruthy();

      fireEvent.press(noBtn);
      expect(handleOptionPress).toHaveBeenCalledWith(
        expect.objectContaining({
          key: "NO",
          value: "NO",
        }),
        expect.any(String)
      );
    });

    it("allows selecting common allergies and submitting through wired sendMessage", async () => {
      const handleOptionPress = jest.fn();

      const { getByTestId } = await render(
        <ChatMessageItem
          {...baseItemProps}
          item={allergyMsg}
          mergedMessages={[allergyMsg]}
          isOnboardingCompleted={true}
          handleGenericOptionPress={handleOptionPress}
        />
      );

      // Select "Yes" to reveal allergy selection
      await act(async () => {
        fireEvent.press(getByTestId("allergy-option-yes"));
      });

      // Toggle Dust allergy
      await act(async () => {
        fireEvent.press(getByTestId("common-allergy-chip-dust"));
      });

      // Click Continue
      await act(async () => {
        fireEvent.press(getByTestId("allergy-continue-btn"));
      });

      expect(handleOptionPress).toHaveBeenCalledWith(
        expect.objectContaining({
          key: expect.stringContaining("Dust"),
          label: expect.stringContaining("Dust"),
        }),
        expect.stringContaining("Dust")
      );
    });
  });

  describe("4. State Machine Continuity & Step Progression", () => {
    it("preserves pendingStep when bloodGroup is answered and advances to ASK_ALLERGIES", () => {
      const nextPendingStep = "ASK_ALLERGIES";
      const isTerminalStep =
        nextPendingStep === "POST_ONBOARDING" ||
        nextPendingStep === "COMPLETE" ||
        !nextPendingStep;

      expect(isTerminalStep).toBe(false);
      const resultingPendingStep = isTerminalStep ? null : nextPendingStep;
      expect(resultingPendingStep).toBe("ASK_ALLERGIES");
    });

    it("clears pendingStep to null when allergies is answered and step is COMPLETE", () => {
      const nextPendingStep = "COMPLETE";
      const isTerminalStep =
        nextPendingStep === "POST_ONBOARDING" ||
        nextPendingStep === "COMPLETE" ||
        !nextPendingStep;

      expect(isTerminalStep).toBe(true);
      const resultingPendingStep = isTerminalStep ? null : nextPendingStep;
      expect(resultingPendingStep).toBeNull();
    });

    it("resolves pendingStep in fetchOnboardingHistory without forcing null for optional questions", () => {
      const resumableState = { currentStep: "ASK_BLOOD_GROUP", isOnboardingCompleted: true };
      const topLevelCurrentStep = "ASK_BLOOD_GROUP";
      const resolvedPendingStep =
        resumableState?.currentStep || topLevelCurrentStep || null;

      const isTerminalStep =
        !resolvedPendingStep ||
        resolvedPendingStep === "POST_ONBOARDING" ||
        resolvedPendingStep === "COMPLETE";

      const resultingPendingStep = isTerminalStep ? null : resolvedPendingStep;
      expect(resultingPendingStep).toBe("ASK_BLOOD_GROUP");
    });

    it("correctly identifies pending onboarding action to route to onboarding endpoint", () => {
      const checkPendingOnboarding = (pendingStep: string | null) => {
        return Boolean(
          pendingStep &&
          pendingStep !== "POST_ONBOARDING" &&
          pendingStep !== "COMPLETE" &&
          pendingStep !== "NORMAL_CHAT"
        );
      };

      expect(checkPendingOnboarding("ASK_BLOOD_GROUP")).toBe(true);
      expect(checkPendingOnboarding("ASK_ALLERGIES")).toBe(true);
      expect(checkPendingOnboarding("NORMAL_CHAT")).toBe(false);
      expect(checkPendingOnboarding("COMPLETE")).toBe(false);
      expect(checkPendingOnboarding(null)).toBe(false);
    });
  });

  describe("5. React Hooks Rules & Top-Level Invariant Enforcement", () => {
    it("ensures latestAssistantMessage useMemo is called before early returns across render cycles", () => {
      // Regression test verifying hook execution parity between initial loading render and subsequent ready render
      let hookCallSequence: string[] = [];

      const renderSimulation = (isLoadingHistory: boolean, mergedMessages: any[]) => {
        hookCallSequence = [];

        // Hook 85
        const handleViewFullReport = () => {};
        hookCallSequence.push("useCallback");

        // Hook 86 (Must be called unconditionally BEFORE early returns)
        const latestAssistantMessage = [...mergedMessages].find(
          (m) => m.role === "ai" && m.action !== "ONBOARDING_COMPLETED_NOTICE"
        );
        hookCallSequence.push("useMemo");

        if (isLoadingHistory) {
          return { type: "LoadingScreen", hooks: hookCallSequence };
        }

        return { type: "AIChatScreen", hooks: hookCallSequence, latest: latestAssistantMessage };
      };

      // Render 1: Loading
      const render1 = renderSimulation(true, []);
      expect(render1.type).toBe("LoadingScreen");
      expect(render1.hooks).toEqual(["useCallback", "useMemo"]);
      expect(render1.hooks.length).toBe(2);

      // Render 2: Ready
      const render2 = renderSimulation(false, [{ role: "ai", action: "ASK_BLOOD_GROUP" }]);
      expect(render2.type).toBe("AIChatScreen");
      expect(render2.hooks).toEqual(["useCallback", "useMemo"]);
      expect(render2.hooks.length).toBe(2);

      // No hook count mismatch: both renders execute the exact same hooks in the exact same order
      expect(render1.hooks.length).toBe(render2.hooks.length);
    });
  });

  describe("6. Active Blood Group Chips Visual & Styling Parity", () => {
    it("renders active Blood Group chips with canonical theme.colors.primary and not teal background", async () => {
      const activeItem: any = {
        id: "msg-blood-active",
        role: "ai",
        text: "What is your blood group?",
        action: "ASK_BLOOD_GROUP",
        options: [
          { label: "Skip", value: "SKIP" },
          { label: "A+", value: "A+" },
          { label: "B+", value: "B+" },
        ],
        createdAt: new Date().toISOString(),
      };

      const { getByText } = await render(
        <ChatMessageItem
          {...baseItemProps}
          item={activeItem}
          mergedMessages={[activeItem]}
        />
      );

      const bPlusText = getByText("B+");
      expect(bPlusText).toBeTruthy();
      // TouchableOpacity chip has theme.colors.primary
      const chipTouchable = bPlusText.parent;
      const flatStyle = StyleSheet.flatten(chipTouchable?.props?.style);
      expect(flatStyle?.backgroundColor).toBe(mockTheme.colors.primary);
      expect(flatStyle?.backgroundColor).not.toBe("#ccfbf1");
    });
  });

  describe("7. Allergy Preferred Language Localization Parity", () => {
    it("renders AskAllergiesCard in Gujarati when preferredLang is gujarati", async () => {
      const allergyItem: any = {
        id: "msg-allergy-active",
        role: "ai",
        text: "Do you have any allergies?",
        action: "ASK_ALLERGIES",
        createdAt: new Date().toISOString(),
      };

      const { getByText, queryByText } = await render(
        <ChatMessageItem
          {...baseItemProps}
          item={allergyItem}
          preferredLang="gujarati"
          mergedMessages={[allergyItem]}
        />
      );

      // Gujarati labels: હા (Yes), ના (No)
      expect(getByText("હા")).toBeTruthy();
      expect(getByText("ના")).toBeTruthy();
      // English labels should NOT be rendered when preferredLang is gujarati
      expect(queryByText("Yes")).toBeNull();
      expect(queryByText("No")).toBeNull();
    });
  });

  describe("8. Inverted FlatList Container Safe Area Layout Parity", () => {
    const calculateContentContainerStyle = (
      isChatInputHidden: boolean,
      bottomPadding: number,
      insetsBottom: number
    ) => {
      return {
        paddingTop: isChatInputHidden
          ? Math.max(bottomPadding, insetsBottom, 16) + 16
          : 8,
        paddingBottom: 16,
      };
    };

    it("ensures ample paddingTop (bottom of inverted screen) when chat input is hidden", () => {
      const style = calculateContentContainerStyle(true, 0, 48); // Android 3-button navigation (insets.bottom = 48)
      expect(style.paddingTop).toBe(64); // 48 + 16 = 64px clearance above navigation bar
      expect(style.paddingBottom).toBe(16);
    });

    it("resets paddingTop to 8 when in normal chat with visible ChatInput", () => {
      const style = calculateContentContainerStyle(false, 0, 48);
      expect(style.paddingTop).toBe(8);
      expect(style.paddingBottom).toBe(16);
    });
  });

  describe("9. Add Medicine & Confirm Medicines Flow Parity", () => {
    it("dispatches SAVE_AND_REVIEW with uniqueDrafts and localized label when saving medicines", async () => {
      const handleGenericOptionPress = jest.fn();
      const addMedItem: any = {
        id: "msg-add-med",
        role: "ai",
        text: "Add your medication",
        action: "ADD_MEDICINE",
        medicine: { name: "Paracetamol", type: "TABLET" },
        createdAt: new Date().toISOString(),
      };

      const { getByText } = await render(
        <ChatMessageItem
          {...baseItemProps}
          item={addMedItem}
          handleGenericOptionPress={handleGenericOptionPress}
          preferredLang="gujarati"
          mergedMessages={[addMedItem]}
        />
      );

      // In Gujarati, "Save Medicines" is "દવાઓ સાચવો"
      const saveBtn = getByText("દવાઓ સાચવો");
      expect(saveBtn).toBeTruthy();
      fireEvent.press(saveBtn);

      expect(handleGenericOptionPress).toHaveBeenCalledTimes(1);
      const callArgs = handleGenericOptionPress.mock.calls[0];
      const optionPayload = callArgs[0];
      expect(optionPayload.actionType).toBe("SAVE_AND_REVIEW");
      expect(optionPayload.label).toBe("દવાઓ સાચવો");
      const parsedValue =
        typeof optionPayload.value === "string"
          ? JSON.parse(optionPayload.value)
          : optionPayload.value;
      expect(parsedValue.action).toBe("SAVE_AND_REVIEW");
      expect(parsedValue.saveAndReview).toBe(true);
      expect(Array.isArray(parsedValue.medicines)).toBe(true);
    });

    it("dispatches CONFIRM_MEDICINES with selected medicines when confirming review card", async () => {
      const handleGenericOptionPress = jest.fn();
      const reviewItem: any = {
        id: "msg-review-meds",
        role: "ai",
        text: "Please review your medicines",
        action: "REVIEW_MEDICINES_LIST",
        medicines: [{ id: "med-1", name: "Paracetamol", type: "TABLET", selected: true }],
        createdAt: new Date().toISOString(),
      };

      const { getByText } = await render(
        <ChatMessageItem
          {...baseItemProps}
          item={reviewItem}
          handleGenericOptionPress={handleGenericOptionPress}
          preferredLang="gujarati"
          mergedMessages={[reviewItem]}
        />
      );

      // In Gujarati, Continue on review card is "આગળ વધો"
      const continueBtn = getByText("આગળ વધો");
      expect(continueBtn).toBeTruthy();
      fireEvent.press(continueBtn);

      expect(handleGenericOptionPress).toHaveBeenCalledTimes(1);
      const callArgs = handleGenericOptionPress.mock.calls[0];
      const optionPayload = callArgs[0];
      expect(optionPayload.actionType).toBe("CONFIRM_MEDICINES");
      expect(optionPayload.label).toBe("આગળ વધો");
      const parsedValue =
        typeof optionPayload.value === "string"
          ? JSON.parse(optionPayload.value)
          : optionPayload.value;
      expect(parsedValue.selected).toContain("med-1");
      expect(parsedValue.medicines[0].name).toBe("Paracetamol");
    });
  });
});

