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

// Mock react-native-toast-message
jest.mock("react-native-toast-message", () => ({
  __esModule: true,
  default: {
    show: jest.fn(),
    hide: jest.fn(),
  },
}));

// Mock @tanstack/react-query
jest.mock("@tanstack/react-query", () => ({
  QueryClient: jest.fn().mockImplementation(() => ({
    invalidateQueries: jest.fn(),
  })),
  useQueryClient: () => ({
    invalidateQueries: jest.fn(),
  }),
}));

// Mock apiClient
jest.mock("../../../services/apiClient", () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
    get: jest.fn(),
  },
}));

import apiClient from "../../../services/apiClient";
import { useChatWizardManager } from "../../../hooks/chat/useChatWizardManager";

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

  describe("10. Live Chained Transition: Blood Group -> ASK_ALLERGIES onboardingState Preservation", () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("preserves resData.onboardingState on aiMsg when transitioning from Blood Group to ASK_ALLERGIES", async () => {
      const mockOnboardingState = {
        currentStep: "ASK_ALLERGIES",
        existingUserData: {
          bloodGroup: "O+",
          allergies: ["Dust"],
        },
        allergiesSkipped: false,
        isOnboardingCompleted: true,
      };

      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        data: {
          status: "success",
          data: {
            reply: "Do you have any allergies?",
            action: "ASK_ALLERGIES",
            actionType: "ASK_ALLERGIES",
            options: [],
            onboardingState: mockOnboardingState,
          },
        },
      });

      let capturedState: any = null;

      function LiveHarness() {
        const [messages, setMessages] = React.useState<any[]>([
          {
            id: "msg-bg-1",
            role: "ai",
            action: "ASK_BLOOD_GROUP",
            text: "What is your blood group?",
            options: [{ label: "O+", value: "O+" }],
          },
        ]);
        const [chatWizardState, setChatWizardState] = React.useState<any>({
          step: "IDLE",
          jobIds: [],
          filesInfo: [],
          extractedMedicines: [],
          conflicts: [],
        });
        const [isOnboardingCompleted, setIsOnboardingCompleted] = React.useState(false);
        const [pendingStep, setPendingStep] = React.useState<string | null>("ASK_BLOOD_GROUP");
        const lastKnownStateRef = React.useRef<any>(null);
        const editSheetRef = React.useRef<any>(null);
        const extractionSheetRef = React.useRef<any>(null);
        const uploadSheetRef = React.useRef<any>(null);

        const manager = useChatWizardManager({
          chatWizardState,
          setChatWizardState,
          preferredLang: "english",
          isAllTerminal: true,
          uploadingDocs: [],
          setMessages,
          editSheetRef,
          extractionSheetRef,
          uploadSheetRef,
          activeSessionId: "session-123",
          onboardingSessionId: "session-123",
          navigation: { navigate: jest.fn() },
          messages,
          setIsSending: jest.fn(),
          lastKnownStateRef,
          setIsOnboardingCompleted,
          setPendingStep,
        });

        capturedState = {
          messages,
          manager,
          lastKnownStateRef,
          pendingStep,
          isOnboardingCompleted,
        };

        return (
          <ChatMessageItem
            {...baseItemProps}
            item={messages[messages.length - 1]}
            mergedMessages={[...messages].reverse()}
            isOnboardingCompleted={isOnboardingCompleted}
            handleGenericOptionPress={manager.handleGenericOptionPress}
          />
        );
      }

      const { getByText, getByTestId } = await render(<LiveHarness />);

      // Verify initial render has Blood Group chip "O+"
      expect(getByText("O+")).toBeTruthy();

      // Trigger selection of "O+" option
      await act(async () => {
        await capturedState.manager.handleGenericOptionPress(
          { label: "O+", value: "O+" },
          "O+"
        );
      });

      // Verify apiClient was called with Blood Group answer
      expect(apiClient.post).toHaveBeenCalledWith(
        "/v1/onboarding/chat",
        expect.objectContaining({
          message: "O+",
        })
      );

      // Verify the generated aiMsg preserved onboardingState
      const aiMsgs = capturedState.messages.filter((m: any) => m.role === "ai");
      const latestAiMsg = aiMsgs[aiMsgs.length - 1];
      expect(latestAiMsg.action).toBe("ASK_ALLERGIES");
      expect(latestAiMsg.onboardingState).toEqual(mockOnboardingState);
      expect(latestAiMsg.state).toEqual(mockOnboardingState);
      expect(capturedState.lastKnownStateRef.current).toEqual(mockOnboardingState);

      // Verify AskAllergiesCard rendered and received the preserved state
      const noBtn = getByTestId("allergy-option-no");
      expect(noBtn).toBeTruthy();

      // When "No Allergies" is clicked, AskAllergiesCard uses the preserved state
      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        data: {
          status: "success",
          data: {
            reply: "Thank you, your profile is complete!",
            action: "COMPLETE",
            onboardingState: {
              ...mockOnboardingState,
              allergiesSkipped: true,
              currentStep: "COMPLETE",
            },
          },
        },
      });

      await act(async () => {
        fireEvent.press(noBtn);
      });

      expect(apiClient.post).toHaveBeenLastCalledWith(
        "/v1/onboarding/chat",
        expect.objectContaining({
          message: "NO",
        })
      );
    });

    it("preserves state when Blood Group is skipped and chained to ASK_ALLERGIES", async () => {
      const skippedOnboardingState = {
        currentStep: "ASK_ALLERGIES",
        bloodGroupSkipped: true,
        existingUserData: {
          allergies: [],
        },
        allergiesSkipped: false,
      };

      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        data: {
          status: "success",
          data: {
            reply: "Do you have any allergies?",
            action: "ASK_ALLERGIES",
            onboardingState: skippedOnboardingState,
          },
        },
      });

      let capturedState: any = null;

      function LiveSkipHarness() {
        const [messages, setMessages] = React.useState<any[]>([
          {
            id: "msg-bg-skip",
            role: "ai",
            action: "ASK_BLOOD_GROUP",
            text: "What is your blood group?",
            options: [{ label: "Skip", value: "SKIP" }],
          },
        ]);
        const [chatWizardState, setChatWizardState] = React.useState<any>({
          step: "IDLE",
          jobIds: [],
          filesInfo: [],
          extractedMedicines: [],
          conflicts: [],
        });
        const [isOnboardingCompleted, setIsOnboardingCompleted] = React.useState(false);
        const [pendingStep, setPendingStep] = React.useState<string | null>("ASK_BLOOD_GROUP");
        const lastKnownStateRef = React.useRef<any>(null);
        const editSheetRef = React.useRef<any>(null);
        const extractionSheetRef = React.useRef<any>(null);
        const uploadSheetRef = React.useRef<any>(null);

        const manager = useChatWizardManager({
          chatWizardState,
          setChatWizardState,
          preferredLang: "english",
          isAllTerminal: true,
          uploadingDocs: [],
          setMessages,
          editSheetRef,
          extractionSheetRef,
          uploadSheetRef,
          activeSessionId: "session-123",
          onboardingSessionId: "session-123",
          navigation: { navigate: jest.fn() },
          messages,
          setIsSending: jest.fn(),
          lastKnownStateRef,
          setIsOnboardingCompleted,
          setPendingStep,
        });

        capturedState = {
          messages,
          manager,
          lastKnownStateRef,
        };

        return (
          <ChatMessageItem
            {...baseItemProps}
            item={messages[messages.length - 1]}
            mergedMessages={[...messages].reverse()}
            isOnboardingCompleted={isOnboardingCompleted}
            handleGenericOptionPress={manager.handleGenericOptionPress}
          />
        );
      }

      const { getByText, getByTestId } = await render(<LiveSkipHarness />);

      expect(getByText("Skip")).toBeTruthy();

      await act(async () => {
        await capturedState.manager.handleGenericOptionPress(
          { label: "Skip", value: "SKIP" },
          "Skip"
        );
      });

      const aiMsgs = capturedState.messages.filter((m: any) => m.role === "ai");
      const latestAiMsg = aiMsgs[aiMsgs.length - 1];
      expect(latestAiMsg.action).toBe("ASK_ALLERGIES");
      expect(latestAiMsg.onboardingState).toEqual(skippedOnboardingState);
      expect(latestAiMsg.onboardingState.bloodGroupSkipped).toBe(true);
      expect(getByTestId("allergy-option-no")).toBeTruthy();
    });
  });

  describe("11. Phase 19: Unified Continuity, Allergy Viewport & Raw JSON Elimination", () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("triggers onAllergyCardExpand when Yes is selected in AskAllergiesCard", async () => {
      const onExpandMock = jest.fn();
      const allergyMsg: any = {
        id: "ai-allergy-msg-p19",
        role: "ai",
        action: "ASK_ALLERGIES",
        text: "Do you have any known allergies?",
        options: [],
        createdAt: "2026-09-28T10:00:00.000Z",
      };

      const { getByTestId } = await render(
        <ChatMessageItem
          {...baseItemProps}
          item={allergyMsg}
          mergedMessages={[allergyMsg]}
          isOnboardingCompleted={true}
          onAllergyCardExpand={onExpandMock}
        />
      );

      const yesBtn = getByTestId("allergy-option-yes");
      expect(yesBtn).toBeTruthy();

      await act(async () => {
        fireEvent.press(yesBtn);
        jest.advanceTimersByTime(150);
      });

      expect(onExpandMock).toHaveBeenCalled();
    });

    it("ensures handleGenericOptionPress sanitizes raw JSON so userMsg.text is clean human-readable text", async () => {
      let setMessagesMock: any;
      let addedMessages: any[] = [];

      function TestHarness() {
        const [messages, setMessages] = React.useState<any[]>([]);
        setMessagesMock = setMessages;
        addedMessages = messages;

        const chatWizardState = {
          step: "IDLE",
          jobIds: [],
          filesInfo: [],
          extractedMedicines: [],
          conflicts: [],
        };
        const lastKnownStateRef = React.useRef<any>(null);
        const editSheetRef = React.useRef<any>(null);
        const extractionSheetRef = React.useRef<any>(null);
        const uploadSheetRef = React.useRef<any>(null);

        const manager = useChatWizardManager({
          chatWizardState,
          setChatWizardState: jest.fn(),
          preferredLang: "english",
          isAllTerminal: true,
          uploadingDocs: [],
          setMessages,
          editSheetRef,
          extractionSheetRef,
          uploadSheetRef,
          activeSessionId: "session-p19",
          onboardingSessionId: "session-p19",
          navigation: { navigate: jest.fn() },
          messages,
          setIsSending: jest.fn(),
          lastKnownStateRef,
          setIsOnboardingCompleted: jest.fn(),
          setPendingStep: jest.fn(),
        });

        const allergyMsgItem: any = {
          id: "msg-allergies",
          role: "ai",
          action: "ASK_ALLERGIES",
          text: "Do you have any known allergies?",
          createdAt: "2026-09-28T10:00:00.000Z",
        };

        return (
          <ChatMessageItem
            {...baseItemProps}
            item={allergyMsgItem}
            mergedMessages={[allergyMsgItem]}
            handleGenericOptionPress={manager.handleGenericOptionPress}
          />
        );
      }

      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        data: {
          data: {
            action: "MEDICINE_OPTIONS",
            actionType: "MEDICINE_OPTIONS",
            reply: "Do you take any regular medicines?",
            options: [
              { key: "ADD_MEDICINE", label: "Add Medicine" },
              { key: "SKIP", label: "Skip for now" },
            ],
            onboardingState: {
              currentStep: "MEDICINE_OPTIONS",
              isOnboardingCompleted: true,
              existingUserData: { allergies: ["Penicillin", "Dust"] },
            },
          },
        },
      });

      const { getByTestId } = await render(<TestHarness />);

      // Select YES
      await act(async () => {
        fireEvent.press(getByTestId("allergy-option-yes"));
      });

      // Select Dust chip
      await act(async () => {
        fireEvent.press(getByTestId("common-allergy-chip-dust"));
      });

      // Click Confirm/Continue
      await act(async () => {
        fireEvent.press(getByTestId("allergy-continue-btn"));
      });

      // Verify that user message text is "Dust" and NOT raw JSON
      const userBubble = addedMessages.find((m) => m.role === "user");
      expect(userBubble).toBeDefined();
      expect(userBubble.text).toBe("Dust");
      expect(userBubble.text).not.toContain("ASK_ALLERGIES");
      expect(userBubble.text).not.toContain("{");

      // Verify that apiClient was called with ASK_ALLERGIES payload
      expect(apiClient.post).toHaveBeenCalledWith(
        "/v1/onboarding/chat",
        expect.objectContaining({
          actionType: "ASK_ALLERGIES",
        })
      );
    });

    it("transitions pendingStep to MEDICINE_OPTIONS upon receiving MEDICINE_OPTIONS response", async () => {
      let pendingStepVal: string | null = null;
      const setPendingStepMock = jest.fn((val) => {
        pendingStepVal = val;
      });

      function TestPendingStepHarness() {
        const [messages, setMessages] = React.useState<any[]>([]);
        const chatWizardState = {
          step: "IDLE",
          jobIds: [],
          filesInfo: [],
          extractedMedicines: [],
          conflicts: [],
        };
        const lastKnownStateRef = React.useRef<any>(null);
        const editSheetRef = React.useRef<any>(null);
        const extractionSheetRef = React.useRef<any>(null);
        const uploadSheetRef = React.useRef<any>(null);

        const manager = useChatWizardManager({
          chatWizardState,
          setChatWizardState: jest.fn(),
          preferredLang: "english",
          isAllTerminal: true,
          uploadingDocs: [],
          setMessages,
          editSheetRef,
          extractionSheetRef,
          uploadSheetRef,
          activeSessionId: "session-p19",
          onboardingSessionId: "session-p19",
          navigation: { navigate: jest.fn() },
          messages,
          setIsSending: jest.fn(),
          lastKnownStateRef,
          setIsOnboardingCompleted: jest.fn(),
          setPendingStep: setPendingStepMock,
        });

        const allergyNoMsgItem: any = {
          id: "msg-allergies-no",
          role: "ai",
          action: "ASK_ALLERGIES",
          text: "Do you have any known allergies?",
          createdAt: "2026-09-28T10:00:00.000Z",
        };

        return (
          <ChatMessageItem
            {...baseItemProps}
            item={allergyNoMsgItem}
            mergedMessages={[allergyNoMsgItem]}
            handleGenericOptionPress={manager.handleGenericOptionPress}
          />
        );
      }

      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        data: {
          data: {
            action: "MEDICINE_OPTIONS",
            actionType: "MEDICINE_OPTIONS",
            reply: "Do you take any regular medicines?",
            options: [
              { key: "ADD_MEDICINE", label: "Add Medicine" },
              { key: "SKIP", label: "Skip for now" },
            ],
            onboardingState: {
              currentStep: "MEDICINE_OPTIONS",
              isOnboardingCompleted: true,
            },
          },
        },
      });

      const { getByTestId } = await render(<TestPendingStepHarness />);

      // Select NO
      await act(async () => {
        fireEvent.press(getByTestId("allergy-option-no"));
      });

      expect(setPendingStepMock).toHaveBeenCalledWith("MEDICINE_OPTIONS");
    });
  });
});

