import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import { ChatMessageItem } from "../../../components/chat/ChatMessageItem";
import { MessageBubble } from "../../../components/chat/MessageBubble";

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

    it("renders clean confirmation text bubble without duplicate ReviewMedicinesListCard when action is CONFIRM_MEDICINES", async () => {
      const handleGenericOptionPress = jest.fn();
      const confirmMsg: any = {
        id: "msg-confirm-receipt",
        role: "assistant",
        text: "One medicine has been successfully added.",
        action: "CONFIRM_MEDICINES",
        actionType: "CONFIRM_MEDICINES",
        mode: "ACTION",
        isConfirmed: true,
        medicines: [
          {
            id: "med-1",
            name: "Paracetamol",
            type: "TABLET",
            frequency: "Once Daily",
            selected: true,
          },
        ],
      };

      const { getByText, queryByText } = await render(
        <ChatMessageItem
          {...baseItemProps}
          item={confirmMsg}
          mergedMessages={[confirmMsg]}
          handleGenericOptionPress={handleGenericOptionPress}
        />
      );

      // Confirmation text bubble is rendered cleanly
      expect(getByText("One medicine has been successfully added.")).toBeTruthy();

      // ReviewMedicinesListCard MUST NOT be mounted inside the confirmation receipt message
      expect(queryByText("Paracetamol")).toBeNull();
      expect(queryByText("Confirm Selection")).toBeNull();
    });

    it("preserves exact 3-message sequence: historical review card -> user message -> assistant success bubble", async () => {
      const handleGenericOptionPress = jest.fn();
      const reviewMsg: any = {
        id: "msg-review-1",
        role: "assistant",
        text: "Please review your medicines:",
        action: "REVIEW_MEDICINES_LIST",
        medicines: [
          {
            id: "med-1",
            name: "Paracetamol",
            type: "TABLET",
            frequency: "Once Daily",
            selected: true,
          },
        ],
      };

      const userMsg: any = {
        id: "msg-user-1",
        role: "user",
        text: "આગળ વધો",
        rawValue: JSON.stringify({ selected: ["med-1"] }),
      };

      const successMsg: any = {
        id: "msg-success-1",
        role: "assistant",
        text: "એક દવા સફળતાપૂર્વક ઉમેરવામાં આવી છે.",
        action: "CONFIRM_MEDICINES",
        medicines: [
          {
            id: "med-1",
            name: "Paracetamol",
          },
        ],
      };

      // In AIChatScreen, mergedMessages is inverted (newest message first at index 0)
      const mergedMessages = [successMsg, userMsg, reviewMsg];

      // 1. Render historical review card (Message 1 in sequence)
      const { getByText: getReviewText } = await render(
        <ChatMessageItem
          {...baseItemProps}
          item={reviewMsg}
          mergedMessages={mergedMessages}
          preferredLang="gujarati"
          handleGenericOptionPress={handleGenericOptionPress}
        />
      );

      // Review card remains visible with medicine name and localized action buttons
      expect(getReviewText("Paracetamol")).toBeTruthy();
      const confirmBtn = getReviewText("આગળ વધો");
      const addNewBtn = getReviewText("ઉમેરો");
      const skipAllBtn = getReviewText("બધું છોડી દો");
      expect(confirmBtn).toBeTruthy();
      expect(addNewBtn).toBeTruthy();
      expect(skipAllBtn).toBeTruthy();

      // Disabled actions must not fire
      fireEvent.press(confirmBtn);
      fireEvent.press(addNewBtn);
      fireEvent.press(skipAllBtn);
      expect(handleGenericOptionPress).not.toHaveBeenCalled();

      // 2. Render confirmation receipt (Message 3 in sequence)
      const { getByText: getSuccessText, queryByText: querySuccessText } = await render(
        <ChatMessageItem
          {...baseItemProps}
          item={successMsg}
          mergedMessages={mergedMessages}
          preferredLang="gujarati"
          handleGenericOptionPress={handleGenericOptionPress}
        />
      );

      // Success text renders cleanly without duplicate review card
      expect(getSuccessText("એક દવા સફળતાપૂર્વક ઉમેરવામાં આવી છે.")).toBeTruthy();
      expect(querySuccessText("Paracetamol")).toBeNull();
    });

    it("ReviewMedicinesListCard renders action buttons as visible but disabled when readOnly is true", async () => {
      const handleGenericOptionPress = jest.fn();
      const reviewMsg: any = {
        id: "msg-historical-review",
        role: "assistant",
        text: "Please review your medications",
        action: "REVIEW_MEDICINES_LIST",
        isConfirmed: true,
        medicines: [
          {
            id: "med-1",
            name: "Metformin 500mg",
            type: "TABLET",
            selected: true,
          },
        ],
      };

      // User already confirmed or item is historical
      const { getByText } = await render(
        <ChatMessageItem
          {...baseItemProps}
          item={reviewMsg}
          mergedMessages={[
            reviewMsg,
            {
              id: "msg-user-after",
              role: "user",
              text: "Confirm Selection",
              rawValue: JSON.stringify({ selected: ["med-1"] }),
            },
          ]}
          handleGenericOptionPress={handleGenericOptionPress}
        />
      );

      // In readOnly mode, action buttons must remain visible in DOM
      const confirmBtn = getByText("Confirm Selection");
      const addNewBtn = getByText("Add New");
      const skipAllBtn = getByText("Skip All");

      expect(confirmBtn).toBeTruthy();
      expect(addNewBtn).toBeTruthy();
      expect(skipAllBtn).toBeTruthy();

      // Pressing action buttons must NOT dispatch any option or API call
      fireEvent.press(confirmBtn);
      fireEvent.press(addNewBtn);
      fireEvent.press(skipAllBtn);
      expect(handleGenericOptionPress).not.toHaveBeenCalled();
    });

    it("allows accordion expand/collapse inspection in readOnly mode without mutating state", async () => {
      const reviewMsg: any = {
        id: "msg-historical-inspect",
        role: "assistant",
        text: "Please review your medications",
        action: "REVIEW_MEDICINES_LIST",
        isConfirmed: true,
        medicines: [
          {
            id: "med-inspect-1",
            name: "Amoxicillin 500mg",
            type: "CAPSULE",
            frequency: "Twice Daily",
            selected: true,
          },
        ],
      };

      const { getByText, getByTestId, findByText } = await render(
        <ChatMessageItem
          {...baseItemProps}
          item={reviewMsg}
          mergedMessages={[
            reviewMsg,
            {
              id: "msg-user-after",
              role: "user",
              text: "Confirm Selection",
            },
          ]}
        />
      );

      const medTitle = getByText("Amoxicillin 500mg");
      expect(medTitle).toBeTruthy();

      // Tap to expand via chevron testID
      const expandBtn = getByTestId("expand-med-med-inspect-1");
      fireEvent.press(expandBtn);
      expect(await findByText("Twice")).toBeTruthy();
      expect(await findByText("1 capsule")).toBeTruthy();
    });

    it("dispatches localized label 'આગળ વધો' when preferredLang is gujarati on Confirm Medicines press", async () => {
      const handleGenericOptionPress = jest.fn();
      const mockMedicines = [
        {
          id: "med-gu-1",
          name: "Metformin 500mg",
          dosage: "500mg",
          dose: { count: 1 },
          frequency: "Twice Daily",
          type: "TABLET",
          selected: true,
        },
      ];

      const item: any = {
        id: "msg-rev-gu",
        role: "assistant",
        text: "Please review your medications",
        action: "REVIEW_MEDICINES_LIST",
        medicines: mockMedicines,
      };

      const { getByText } = await render(
        <ChatMessageItem
          {...baseItemProps}
          preferredLang="gujarati"
          item={item}
          handleGenericOptionPress={handleGenericOptionPress}
          mergedMessages={[item]}
        />
      );

      // In Gujarati, confirmation button is "આગળ વધો"
      const confirmBtn = getByText("આગળ વધો");
      expect(confirmBtn).toBeTruthy();
      fireEvent.press(confirmBtn);

      expect(handleGenericOptionPress).toHaveBeenCalledTimes(1);
      const [optionPayload, labelParam] = handleGenericOptionPress.mock.calls[0];

      expect(optionPayload.actionType).toBe("CONFIRM_MEDICINES");
      expect(optionPayload.label).toBe("આગળ વધો");
      expect(labelParam).toBe("આગળ વધો");
      expect(typeof optionPayload.value).toBe("object");
    });

    it("MessageBubble defensively sanitizes legacy raw JSON payload in user bubble into clean text", async () => {
      const rawPayload = JSON.stringify({
        selected: ["med-1"],
        medicines: [{ id: "med-1", name: "Paracetamol" }],
      });

      const message: any = {
        id: "legacy-msg-1",
        role: "user",
        text: rawPayload,
      };

      const { getByText, queryByText } = await render(
        <MessageBubble message={message} isDark={false} />
      );

      // Raw JSON must never be rendered in bubble
      expect(queryByText(rawPayload)).toBeNull();
      // Sanitized human-readable text must be rendered
      expect(getByText("Confirm Selection")).toBeTruthy();
    });
  });
});

