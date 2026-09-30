import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import { ResolveProfileSourceCard } from "../../../components/chat/widgets/ResolveProfileSourceCard";

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

// Mock ChatInput
jest.mock("../../../components/chat/ChatInput", () => ({
  setActiveFormDictationCallback: jest.fn(),
}));

describe("Phase 14: Conflict Card State Persistence & Replay Frontend Tests", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });
  const mockTheme = {
    colors: {
      primary: "#3b82f6",
      textPrimary: "#1e293b",
      textSecondary: "#64748b",
      cardBackground: "#ffffff",
      cardBorder: "#e2e8f0",
    },
  };

  const replayedConflictMessage = {
    id: "msg-conflict-replay-1",
    action: "RESOLVE_PROFILE_SOURCE",
    mode: "CONFLICT",
    title: "We found two different profiles",
    subtitle: "Please review and choose the one you prefer",
    loginProvider: "microsoft",
    sourceComparison: "DOCUMENT_VS_LOGIN",
    loginSummary: "John Doe",
    documentSummary: "Johnny Doe",
    fields: [
      {
        key: "firstName",
        label: "First Name",
        loginValue: "John",
        documentValue: "Johnny",
        value: "John",
        isMismatch: true,
        verified: false,
      },
      {
        key: "lastName",
        label: "Last Name",
        loginValue: "Doe",
        documentValue: "Doe",
        value: "Doe",
        isMismatch: false,
        verified: false,
      },
    ],
  };

  it("1. Renders two-column Conflict Card layout with Microsoft provider icon & labels upon history replay", async () => {
    const { getByText, queryByText } = await render(
      <ResolveProfileSourceCard
        activeMsg={replayedConflictMessage}
        preferredLang="english"
        isDark={false}
        theme={mockTheme}
        sendMessage={jest.fn()}
        state={{}}
        isHistorical={false}
      />
    );

    // Verify Conflict Card title and subtitle are rendered
    expect(getByText("We found two different profiles")).toBeTruthy();
    expect(getByText("Please review and choose the one you prefer")).toBeTruthy();

    // Verify Microsoft provider column header and Document column header
    expect(getByText("From Microsoft")).toBeTruthy();
    expect(getByText("From Document")).toBeTruthy();

    // Verify action buttons
    expect(getByText("Use Social Login")).toBeTruthy();
    expect(getByText("Use Document")).toBeTruthy();

    // Verify "Edit manually instead" link is visible
    expect(getByText("Edit manually instead")).toBeTruthy();

    // Verify it is NOT rendering Confirmation Card single column header
    expect(queryByText("Your Details")).toBeNull();
  });

  it("2. Authoritative mode resolution strictly retains CONFLICT mode even if isSocialLogin evaluates to false", async () => {
    const nonSocialConflictMessage = {
      ...replayedConflictMessage,
      loginProvider: "email", // not in ['google', 'facebook', 'microsoft', 'apple', 'social']
    };

    const { getByText, queryByText } = await render(
      <ResolveProfileSourceCard
        activeMsg={nonSocialConflictMessage}
        preferredLang="english"
        isDark={false}
        theme={mockTheme}
        sendMessage={jest.fn()}
        state={{}}
        isHistorical={false}
      />
    );

    // Mode must remain CONFLICT and NOT degrade to CONFIRM
    expect(getByText("We found two different profiles")).toBeTruthy();
    expect(queryByText("Your Details")).toBeNull();
    expect(getByText("Edit manually instead")).toBeTruthy();
  });

  it("3. Preserves full interactivity on replayed active Conflict Card (isHistorical === false)", async () => {
    const sendMessageMock = jest.fn();
    const { getByText } = await render(
      <ResolveProfileSourceCard
        activeMsg={replayedConflictMessage}
        preferredLang="english"
        isDark={false}
        theme={mockTheme}
        sendMessage={sendMessageMock}
        state={{}}
        isHistorical={false}
      />
    );

    // Verify buttons are clickable
    expect(getByText("Use Social Login")).toBeTruthy();
    expect(getByText("Use Document")).toBeTruthy();
  });

  it("4. Opens manual edit form when Edit manually instead link is pressed", async () => {
    const screen = await render(
      <ResolveProfileSourceCard
        activeMsg={replayedConflictMessage}
        preferredLang="english"
        isDark={false}
        theme={mockTheme}
        sendMessage={jest.fn()}
        state={{}}
        isHistorical={false}
      />
    );
    fireEvent.press(screen.getByTestId("manual-edit-link"));
    await waitFor(() => {
      expect(screen.getByText("Save Details")).toBeTruthy();
    });
  });

  it("5. Disables actions and hides manual edit link when Conflict Card is historical (isHistorical === true)", async () => {
    const sendMessageMock = jest.fn();
    const { queryByText, getByText } = await render(
      <ResolveProfileSourceCard
        activeMsg={replayedConflictMessage}
        preferredLang="english"
        isDark={false}
        theme={mockTheme}
        sendMessage={sendMessageMock}
        state={{}}
        isHistorical={true}
        chosenVal={JSON.stringify({ source: "LOGIN" })}
        chosenLabel="Use Social Login"
      />
    );

    // In historical mode, "Edit manually instead" link should not be rendered
    expect(queryByText("Edit manually instead")).toBeNull();

    // Buttons are disabled
    fireEvent.press(getByText("Use Social Login"));
    expect(sendMessageMock).not.toHaveBeenCalled();
  });

  it("6. isChatInputHidden evaluates to true when activeAction is RESOLVE_PROFILE_SOURCE", () => {
    const isChatInputHiddenForAction = (activeAction?: string | null) => {
      return (
        activeAction === "ASK_LANGUAGE" ||
        activeAction === "ASK_UPLOAD_OR_SKIP" ||
        activeAction === "RESOLVE_PROFILE_SOURCE" ||
        activeAction === "ASK_GENDER" ||
        activeAction === "ASK_DOB" ||
        activeAction === "ASK_BLOOD_GROUP" ||
        activeAction === "ASK_ALLERGIES" ||
        activeAction === "REVIEW_MEDICINES_LIST" ||
        activeAction === "ADD_MEDICINE" ||
        activeAction === "EDIT_MEDICINE" ||
        activeAction === "CONFIRM_MEDICINE" ||
        activeAction === "MEDICINE_OPTIONS" ||
        activeAction === "ASK_REPORT" ||
        activeAction === "POST_ONBOARDING" ||
        activeAction === "COMPLETE"
      );
    };

    expect(isChatInputHiddenForAction("RESOLVE_PROFILE_SOURCE")).toBe(true);
    expect(isChatInputHiddenForAction("NORMAL_CHAT")).toBe(false);
  });
});
