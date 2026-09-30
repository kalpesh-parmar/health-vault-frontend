import React from "react";
import { render } from "@testing-library/react-native";
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

describe("Phase 15: Conflict Card Initial Live Flow Frontend Tests", () => {
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

  const liveConflictDocumentMessage = {
    id: "ai-live-conflict-1",
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

  const liveConflictManualMessage = {
    id: "ai-live-conflict-2",
    action: "RESOLVE_PROFILE_SOURCE",
    mode: "CONFLICT",
    title: "We found two different profiles",
    subtitle: "Please review and choose the one you prefer",
    loginProvider: "microsoft",
    sourceComparison: "MANUAL_VS_LOGIN",
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

  const liveConfirmMessage = {
    id: "ai-live-confirm-1",
    action: "RESOLVE_PROFILE_SOURCE",
    mode: "CONFIRM",
    title: "Confirm your profile details",
    subtitle: "Please check and confirm all details below",
    loginProvider: "microsoft",
    sourceComparison: "DOCUMENT_VS_LOGIN",
    fields: [
      {
        key: "firstName",
        label: "First Name",
        loginValue: "John",
        documentValue: "John",
        value: "John",
        isMismatch: false,
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

  it("1. Immediately renders two-column Conflict Card on initial live response with Document comparison", async () => {
    const screen = await render(
      <ResolveProfileSourceCard
        activeMsg={liveConflictDocumentMessage}
        preferredLang="english"
        isDark={false}
        theme={mockTheme}
        sendMessage={jest.fn()}
        state={{ flowMode: "UPLOAD" }}
        isHistorical={false}
      />,
    );

    // Verify Conflict Card title and subtitle are rendered immediately
    expect(screen.getByText("We found two different profiles")).toBeTruthy();
    expect(screen.getByText("Please review and choose the one you prefer")).toBeTruthy();

    // Verify source column headers
    expect(screen.getByText("From Microsoft")).toBeTruthy();
    expect(screen.getByText("From Document")).toBeTruthy();

    // Verify action buttons
    expect(screen.getByText("Use Social Login")).toBeTruthy();
    expect(screen.getByText("Use Document")).toBeTruthy();

    // Verify "Edit manually instead" link is visible
    expect(screen.getByText("Edit manually instead")).toBeTruthy();

    // Confirmation header must not exist
    expect(screen.queryByText("Your Details")).toBeNull();
  });

  it("2. Immediately renders two-column Conflict Card on initial live response with Manual Entry comparison", async () => {
    const screen = await render(
      <ResolveProfileSourceCard
        activeMsg={liveConflictManualMessage}
        preferredLang="english"
        isDark={false}
        theme={mockTheme}
        sendMessage={jest.fn()}
        state={{ flowMode: "MANUAL" }}
        isHistorical={false}
      />,
    );

    expect(screen.getByText("We found two different profiles")).toBeTruthy();
    expect(screen.getByText("From Microsoft")).toBeTruthy();
    expect(screen.getByText("Entered Details")).toBeTruthy();
    expect(screen.getByText("Use Social Login")).toBeTruthy();
    expect(screen.getByText("Use Entered Details")).toBeTruthy();
    expect(screen.queryByText("Your Details")).toBeNull();
  });

  it("3. Immediately renders single-column Confirmation Card on initial live response when details match", async () => {
    const screen = await render(
      <ResolveProfileSourceCard
        activeMsg={liveConfirmMessage}
        preferredLang="english"
        isDark={false}
        theme={mockTheme}
        sendMessage={jest.fn()}
        state={{ flowMode: "UPLOAD" }}
        isHistorical={false}
      />,
    );

    expect(screen.getByText("Confirm your profile details")).toBeTruthy();
    expect(screen.getByText("Your Details")).toBeTruthy();
    expect(screen.getByText("Confirm & Continue")).toBeTruthy();
    expect(screen.getByText("Edit Details")).toBeTruthy();
    expect(screen.queryByText("We found two different profiles")).toBeNull();
  });
});
