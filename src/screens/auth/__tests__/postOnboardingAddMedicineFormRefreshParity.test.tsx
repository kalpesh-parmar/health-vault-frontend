import React from "react";
import { View } from "react-native";
import { render, fireEvent } from "@testing-library/react-native";
import { ChatMessageItem } from "../../../components/chat/ChatMessageItem";
import { MessageBubble } from "../../../components/chat/MessageBubble";

// Mock @expo/vector-icons
jest.mock("@expo/vector-icons", () => ({
  Ionicons: "Ionicons",
}));

// Mock react-native-modal-datetime-picker
jest.mock("react-native-modal-datetime-picker", () => {
  return function MockDateTimePickerModal() {
    return null;
  };
});

// Mock DocumentUploadContext
jest.mock("../../../context/DocumentUploadContext", () => ({
  useDocumentUpload: () => ({
    uploadingDocs: [],
    isUploading: false,
    chatWizardState: { filesInfo: [], extractedMedicines: [], summaries: [] },
    setChatWizardState: jest.fn(),
  }),
}));

describe("Post-Onboarding Add Medicine Form Historical Refresh & Parity (Phase 25)", () => {
  const mockTheme = {
    colors: {
      primary: "#0f766e",
      surface: "#ffffff",
      border: "#e2e8f0",
      background: "#f8fafc",
      text: "#1e293b",
    },
  };

  const baseItemProps: any = {
    index: 0,
    isDark: false,
    theme: mockTheme,
    preferredLang: "english",
    speakingMessageId: null,
    speakMessage: jest.fn(),
    onboardingSessionId: "mock-session-25",
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
    mergedMessages: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Task 25.2: Historical Candidate Medicine Recovery in ChatMessageItem", () => {
    it("recovers candidate medicine from chosenVal (SAVE_AND_REVIEW) and renders AddMedicineCard as a populated read-only receipt", async () => {
      const handleGenericOptionPress = jest.fn();

      const candidateMed = {
        id: "client-med-101",
        name: "Metformin 500mg",
        medicationName: "Metformin 500mg",
        type: "TABLET",
        medicationType: "TABLET",
        dose: { count: 1, unit: "TABLET" },
        frequency: "Twice Daily",
        intakeFrequency: "Twice Daily",
      };

      const addMedPromptMsg: any = {
        id: "msg-assistant-add-med",
        role: "assistant",
        text: "Please enter the new medication details:",
        action: "ADD_MEDICINE",
      };

      const saveMedUserMsg: any = {
        id: "msg-user-save-med",
        role: "user",
        text: "Save Medicines",
        rawValue: {
          action: "SAVE_AND_REVIEW",
          saveAndReview: true,
          medicines: [candidateMed],
        },
      };

      // In AIChatScreen, mergedMessages is newest first (lower index = newer)
      const mergedMessages = [saveMedUserMsg, addMedPromptMsg];

      const { getByDisplayValue, getByText } = await render(
        <ChatMessageItem
          {...baseItemProps}
          item={addMedPromptMsg}
          mergedMessages={mergedMessages}
          handleGenericOptionPress={handleGenericOptionPress}
        />
      );

      // Verify prompt text renders
      expect(getByText("Please enter the new medication details:")).toBeTruthy();

      // Verify candidate medicine fields are populated in the form input
      expect(getByDisplayValue("Metformin 500mg")).toBeTruthy();

      // Verify Save button is visible in receipt mode
      const saveBtn = getByText("Save Medicines");
      expect(saveBtn).toBeTruthy();

      // Interactive actions must be disabled in readOnly mode
      fireEvent.press(saveBtn);
      expect(handleGenericOptionPress).not.toHaveBeenCalled();
    });

    it("recovers candidate medicine from adjacent REVIEW_MEDICINES_LIST message when chosenVal lacks medicine object", async () => {
      const adjacentMed = {
        id: "client-med-202",
        name: "Atorvastatin 20mg",
        type: "TABLET",
        dose: { count: 1 },
        frequency: "Once Daily",
      };

      const addMedPromptMsg: any = {
        id: "msg-add-prompt-2",
        role: "assistant",
        text: "Please enter the new medication details:",
        action: "ADD_MEDICINE",
      };

      const userSaveMsg: any = {
        id: "msg-user-save-2",
        role: "user",
        text: "Save Medicines",
        rawValue: "SAVE_AND_REVIEW", // String without embedded medicines array
      };

      const reviewCardMsg: any = {
        id: "msg-assistant-review-2",
        role: "assistant",
        text: "Please review your medicines:",
        action: "REVIEW_MEDICINES_LIST",
        medicines: [adjacentMed],
      };

      // Inverted list: reviewCardMsg (idx 0), userSaveMsg (idx 1), addMedPromptMsg (idx 2)
      const mergedMessages = [reviewCardMsg, userSaveMsg, addMedPromptMsg];

      const { getByDisplayValue, getByText } = await render(
        <ChatMessageItem
          {...baseItemProps}
          item={addMedPromptMsg}
          mergedMessages={mergedMessages}
        />
      );

      expect(getByText("Please enter the new medication details:")).toBeTruthy();
      expect(getByDisplayValue("Atorvastatin 20mg")).toBeTruthy();
    });
  });

  describe("Task 25.4: Full 6-Turn Sequence Replay & Defense Parity", () => {
    it("renders complete 6-turn sequence without missing cards or raw JSON leaks", async () => {
      const confirmedMed = {
        id: "med-555",
        name: "Pantoprazole 40mg",
        type: "TABLET",
        dose: { count: 1 },
        frequency: "Once Daily",
        selected: true,
      };

      const turn1User: any = {
        id: "turn-1",
        role: "user",
        text: "Add Medicines",
        action: "ADD_MEDICINE",
      };

      const turn2Assistant: any = {
        id: "turn-2",
        role: "assistant",
        text: "Please enter the new medication details:",
        action: "ADD_MEDICINE",
      };

      const turn3User: any = {
        id: "turn-3",
        role: "user",
        text: "Save Medicines",
        action: "SAVE_AND_REVIEW",
        rawValue: { action: "SAVE_AND_REVIEW", medicines: [confirmedMed] },
      };

      const turn4Assistant: any = {
        id: "turn-4",
        role: "assistant",
        text: "Please review your medicines:",
        action: "REVIEW_MEDICINES_LIST",
        medicines: [confirmedMed],
      };

      const turn5User: any = {
        id: "turn-5",
        role: "user",
        text: "Confirm Selection",
        action: "CONFIRM_MEDICINES",
        rawValue: { selected: ["med-555"] },
      };

      const turn6Assistant: any = {
        id: "turn-6",
        role: "assistant",
        text: "One medication has been successfully added.",
        action: "CONFIRM_MEDICINES",
        medicines: [confirmedMed],
      };

      // Inverted list in AIChatScreen (newest first):
      const mergedMessages = [
        turn6Assistant,
        turn5User,
        turn4Assistant,
        turn3User,
        turn2Assistant,
        turn1User,
      ];

      // Render all 6 turns through ChatMessageItem (simulating FlatList in AIChatScreen)
      const {
        getByText,
        queryByText,
        getAllByText,
        queryAllByText,
        queryAllByDisplayValue,
      } = await render(
        <View>
          {mergedMessages.map((msg, idx) => (
            <ChatMessageItem
              key={msg.id}
              {...baseItemProps}
              item={msg}
              index={idx}
              mergedMessages={mergedMessages}
            />
          ))}
        </View>
      );

      // Assert exactly ONE ADD_MEDICINE prompt bubble across all turns
      expect(queryAllByText("Please enter the new medication details:")).toHaveLength(1);

      // Assert exactly ONE AddMedicineCard form card (populated with Pantoprazole 40mg) across all turns
      expect(queryAllByDisplayValue("Pantoprazole 40mg")).toHaveLength(1);

      // Assert Turn 1 User bubble rendered without card attachment
      expect(queryAllByText("Add Medicines")).toHaveLength(1);

      // Assert Turn 3 User bubble ("Save Medicines") and Turn 2 AddMedicineCard Save button
      expect(queryAllByText("Save Medicines")).toHaveLength(2);

      // Assert Turn 4 Assistant Review Card
      expect(queryAllByText("Please review your medicines:")).toHaveLength(1);

      // Assert Turn 5 User confirmation bubble and Turn 4 Review Card confirmation button
      expect(queryAllByText("Confirm Selection")).toHaveLength(2);

      // Assert Turn 6 Assistant clean success bubble (isolated, no duplicate review card)
      expect(queryAllByText("One medication has been successfully added.")).toHaveLength(1);
    });

    it("renders complete sequence with two medicines asserting exactly ONE prompt bubble and ONE form card", async () => {
      const med1 = {
        id: "med-1",
        name: "Pantoprazole 40mg",
        type: "TABLET",
        dose: { count: 1 },
        frequency: "Once Daily",
        selected: true,
      };
      const med2 = {
        id: "med-2",
        name: "Metformin 500mg",
        type: "TABLET",
        dose: { count: 1 },
        frequency: "Twice Daily",
        selected: true,
      };

      const turn1User: any = {
        id: "turn-multi-1",
        role: "user",
        text: "Add Medicines",
        action: "ADD_MEDICINE",
      };

      const turn2Assistant: any = {
        id: "turn-multi-2",
        role: "assistant",
        text: "Please enter the new medication details:",
        action: "ADD_MEDICINE",
      };

      const turn3User: any = {
        id: "turn-multi-3",
        role: "user",
        text: "Save Medicines",
        action: "SAVE_AND_REVIEW",
        rawValue: { action: "SAVE_AND_REVIEW", medicines: [med1, med2] },
      };

      const turn4Assistant: any = {
        id: "turn-multi-4",
        role: "assistant",
        text: "Please review your medicines:",
        action: "REVIEW_MEDICINES_LIST",
        medicines: [med1, med2],
      };

      const turn5User: any = {
        id: "turn-multi-5",
        role: "user",
        text: "Confirm Selection",
        action: "CONFIRM_MEDICINES",
        rawValue: { selected: ["med-1", "med-2"] },
      };

      const turn6Assistant: any = {
        id: "turn-multi-6",
        role: "assistant",
        text: "Two medications have been successfully added.",
        action: "CONFIRM_MEDICINES",
        medicines: [med1, med2],
      };

      const mergedMessages = [
        turn6Assistant,
        turn5User,
        turn4Assistant,
        turn3User,
        turn2Assistant,
        turn1User,
      ];

      const { queryAllByText, queryAllByDisplayValue } = await render(
        <View>
          {mergedMessages.map((msg, idx) => (
            <ChatMessageItem
              key={msg.id}
              {...baseItemProps}
              item={msg}
              index={idx}
              mergedMessages={mergedMessages}
            />
          ))}
        </View>
      );

      // Exactly ONE prompt bubble and exactly ONE AddMedicineCard
      expect(queryAllByText("Please enter the new medication details:")).toHaveLength(1);
      expect(queryAllByDisplayValue("Pantoprazole 40mg")).toHaveLength(1);

      // Review card renders both medications
      expect(queryAllByText("Pantoprazole 40mg")).toHaveLength(1);
      expect(queryAllByText("Metformin 500mg")).toHaveLength(1);

      // Clean success bubble
      expect(queryAllByText("Two medications have been successfully added.")).toHaveLength(1);
    });

    it("MessageBubble defensively sanitizes stringified JSON payloads for SAVE_AND_REVIEW and ADD_MEDICINE", async () => {
      const taintedSaveMsg: any = {
        id: "msg-tainted-save",
        role: "user",
        text: JSON.stringify({ action: "SAVE_AND_REVIEW", medicines: [{ name: "Metformin" }] }),
        action: "SAVE_AND_REVIEW",
      };

      const { getByText: getSaveText, queryByText: querySaveText } = await render(
        <MessageBubble message={taintedSaveMsg} isDark={false} />
      );
      expect(getSaveText("Save Medicines")).toBeTruthy();
      expect(querySaveText(/action/)).toBeNull();

      const taintedAddMsg: any = {
        id: "msg-tainted-add",
        role: "user",
        text: JSON.stringify({ action: "ADD_MEDICINE" }),
        action: "ADD_MEDICINE",
      };

      const { getByText: getAddText, queryByText: queryAddText } = await render(
        <MessageBubble message={taintedAddMsg} isDark={false} />
      );
      expect(getAddText("Add Medicines")).toBeTruthy();
      expect(queryAddText(/ADD_MEDICINE/)).toBeNull();
    });
  });
});
