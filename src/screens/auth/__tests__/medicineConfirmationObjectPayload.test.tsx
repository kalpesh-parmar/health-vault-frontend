import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
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

describe("Unified Medicine Confirmation Object Payload Tests", () => {
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
    mergedMessages: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("ChatMessageItem confirmation dispatch", () => {
    it("dispatches plain JavaScript object (not stringified JSON) on Confirm Medicines press", async () => {
      const handleGenericOptionPress = jest.fn();
      const mockMedicines = [
        {
          id: "med-1",
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
        id: "msg-rev-1",
        role: "assistant",
        text: "Please review your medications",
        action: "REVIEW_MEDICINES_LIST",
        medicines: mockMedicines,
      };

      const { getByText } = await render(
        <ChatMessageItem
          {...baseItemProps}
          item={item}
          handleGenericOptionPress={handleGenericOptionPress}
          mergedMessages={[item]}
        />
      );

      const confirmBtn = getByText("Confirm Selection");
      expect(confirmBtn).toBeTruthy();
      fireEvent.press(confirmBtn);

      expect(handleGenericOptionPress).toHaveBeenCalledTimes(1);
      const callArgs = handleGenericOptionPress.mock.calls[0];
      const optionPayload = callArgs[0];

      expect(optionPayload.actionType).toBe("CONFIRM_MEDICINES");
      expect(optionPayload.key).toBe("CONFIRM_MEDICINES");

      // CRITICAL ASSERTION: optionPayload.value must be a plain JS object, NOT a JSON string
      expect(typeof optionPayload.value).toBe("object");
      expect(optionPayload.value).not.toBeNull();
      expect(typeof optionPayload.value.selected).toBe("object");
      expect(Array.isArray(optionPayload.value.selected)).toBe(true);
      expect(optionPayload.value.selected).toContain("med-1");
      expect(optionPayload.value.medicines[0].name).toBe("Metformin 500mg");
    });

    it("dispatches plain JavaScript object on Skip All press", async () => {
      const handleGenericOptionPress = jest.fn();
      const mockMedicines = [
        {
          id: "med-1",
          name: "Metformin 500mg",
          type: "TABLET",
          selected: true,
        },
      ];

      const item: any = {
        id: "msg-rev-2",
        role: "assistant",
        text: "Please review your medications",
        action: "REVIEW_MEDICINES_LIST",
        medicines: mockMedicines,
      };

      const { getByText } = await render(
        <ChatMessageItem
          {...baseItemProps}
          item={item}
          handleGenericOptionPress={handleGenericOptionPress}
          mergedMessages={[item]}
        />
      );

      const skipBtn = getByText("Skip All");
      expect(skipBtn).toBeTruthy();
      fireEvent.press(skipBtn);

      expect(handleGenericOptionPress).toHaveBeenCalledTimes(1);
      const optionPayload = handleGenericOptionPress.mock.calls[0][0];

      expect(optionPayload.actionType).toBe("SKIP_MEDICINES");
      expect(optionPayload.key).toBe("SKIP_MEDICINES");
      expect(typeof optionPayload.value).toBe("object");
      expect(optionPayload.value.skipAll).toBe(true);
    });

    it("dispatches plain JavaScript object on Save & Review from AddMedicineCard", async () => {
      const handleGenericOptionPress = jest.fn();
      const item: any = {
        id: "msg-add-1",
        role: "assistant",
        text: "Add a medication",
        action: "ADD_MEDICINE",
        medicine: { name: "Aspirin", type: "TABLET" },
        createdAt: new Date().toISOString(),
      };

      const { getByText } = await render(
        <ChatMessageItem
          {...baseItemProps}
          item={item}
          handleGenericOptionPress={handleGenericOptionPress}
          mergedMessages={[item]}
        />
      );

      const saveBtn = getByText("Save Medicines");
      expect(saveBtn).toBeTruthy();
      fireEvent.press(saveBtn);

      expect(handleGenericOptionPress).toHaveBeenCalledTimes(1);
      const optionPayload = handleGenericOptionPress.mock.calls[0][0];
      expect(optionPayload.actionType).toBe("SAVE_AND_REVIEW");
      expect(optionPayload.key).toBe("SAVE_AND_REVIEW");
      expect(typeof optionPayload.value).toBe("object");
      expect(optionPayload.value.action).toBe("SAVE_AND_REVIEW");
      expect(Array.isArray(optionPayload.value.medicines)).toBe(true);
      expect(optionPayload.value.medicines[0].name).toBe("Aspirin");
    });
  });
});
