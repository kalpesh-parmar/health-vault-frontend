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

describe("Phase 13: Confirmation Card Edit Details Pre-population & Editing Flow Frontend Tests", () => {
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

  const confirmationMessage = {
    id: "msg-confirm-1",
    action: "RESOLVE_PROFILE_SOURCE",
    mode: "CONFIRM",
    title: "Confirm your profile details",
    subtitle: "Please check and confirm all details below",
    loginProvider: "email",
    sourceComparison: "MANUAL_VS_LOGIN",
    fields: [
      {
        key: "firstName",
        label: "First Name",
        loginValue: "Jane",
        documentValue: "Jane",
        value: "Jane",
        isMismatch: false,
        verified: false,
        editable: true,
      },
      {
        key: "lastName",
        label: "Last Name",
        loginValue: "Doe",
        documentValue: "Doe",
        value: "Doe",
        isMismatch: false,
        verified: false,
        editable: true,
      },
      {
        key: "dateOfBirth",
        label: "Date of Birth",
        loginValue: null,
        documentValue: "1994-04-20",
        value: "1994-04-20",
        isMismatch: false,
        verified: false,
        editable: true,
      },
      {
        key: "gender",
        label: "Gender",
        loginValue: "Female",
        documentValue: "Female",
        value: "Female",
        isMismatch: false,
        verified: false,
        editable: true,
      },
      {
        key: "phoneNumber",
        label: "Phone Number",
        loginValue: null,
        documentValue: null,
        value: null,
        isMismatch: false,
        verified: false,
        editable: true,
      },
      {
        key: "email",
        label: "Email",
        loginValue: "jane.doe@example.com",
        documentValue: null,
        value: "jane.doe@example.com",
        isMismatch: false,
        verified: true,
        editable: false,
      },
    ],
  };

  it("1. Renders Confirmation Card with edit pencils for demographic fields", async () => {
    const screen = await render(
      <ResolveProfileSourceCard
        activeMsg={confirmationMessage}
        preferredLang="english"
        isDark={false}
        theme={mockTheme}
        sendMessage={jest.fn()}
        state={{}}
        isHistorical={false}
      />
    );

    // Verify fields are displayed
    expect(screen.getByText("Jane")).toBeTruthy();
    expect(screen.getByText("Doe")).toBeTruthy();
    expect(screen.getByText("1994-04-20")).toBeTruthy();

    // Verify pencil icons exist for demographic fields
    expect(screen.getByTestId("edit-pencil-firstName")).toBeTruthy();
    expect(screen.getByTestId("edit-pencil-lastName")).toBeTruthy();
    expect(screen.getByTestId("edit-pencil-dateOfBirth")).toBeTruthy();
    expect(screen.getByTestId("edit-pencil-gender")).toBeTruthy();

    // Verify Edit Details button exists
    expect(screen.getByTestId("edit-details-btn")).toBeTruthy();
  });

  it("2. Opens Edit Details form with pre-populated values when Edit Details button is pressed", async () => {
    const screen = await render(
      <ResolveProfileSourceCard
        activeMsg={confirmationMessage}
        preferredLang="english"
        isDark={false}
        theme={mockTheme}
        sendMessage={jest.fn()}
        state={{}}
        isHistorical={false}
      />
    );

    fireEvent.press(screen.getByTestId("edit-details-btn"));

    await waitFor(() => {
      expect(screen.getByText("Edit Profile Details")).toBeTruthy();
      expect(screen.getByText("Save Details")).toBeTruthy();
    });

    // Inputs should be pre-populated
    expect(screen.getByDisplayValue("Jane")).toBeTruthy();
    expect(screen.getByDisplayValue("Doe")).toBeTruthy();
  });

  it("3. Opens Edit Details form when individual field pencil is pressed", async () => {
    const screen = await render(
      <ResolveProfileSourceCard
        activeMsg={confirmationMessage}
        preferredLang="english"
        isDark={false}
        theme={mockTheme}
        sendMessage={jest.fn()}
        state={{}}
        isHistorical={false}
      />
    );

    fireEvent.press(screen.getByTestId("edit-pencil-firstName"));

    await waitFor(() => {
      expect(screen.getByText("Edit Profile Details")).toBeTruthy();
      expect(screen.getByDisplayValue("Jane")).toBeTruthy();
    });
  });

  it("4. Saves edited values, returns to Confirmation Card with updated value, and sends edited payload on Confirm & Continue", async () => {
    const sendMessageMock = jest.fn();

    const screen = await render(
      <ResolveProfileSourceCard
        activeMsg={confirmationMessage}
        preferredLang="english"
        isDark={false}
        theme={mockTheme}
        sendMessage={sendMessageMock}
        state={{}}
        isHistorical={false}
      />
    );

    // Click Edit Details
    fireEvent.press(screen.getByTestId("edit-details-btn"));

    await waitFor(() => {
      expect(screen.getByText("Edit Profile Details")).toBeTruthy();
    });

    // Change firstName
    const firstNameInput = screen.getByDisplayValue("Jane");
    fireEvent.changeText(firstNameInput, "Janet");
    await waitFor(() => {
      expect(screen.getByDisplayValue("Janet")).toBeTruthy();
    });

    // Click Save Details
    fireEvent.press(screen.getByText("Save Details"));

    // Confirmation Card should now show updated value "Janet"
    await waitFor(() => {
      expect(screen.getByText("Janet")).toBeTruthy();
      expect(screen.queryByText("Edit Profile Details")).toBeNull();
    });

    // Click Confirm & Continue
    fireEvent.press(screen.getByText("Confirm & Continue"));

    expect(sendMessageMock).toHaveBeenCalledTimes(1);
    const [payloadStr, updatedState, label] = sendMessageMock.mock.calls[0];
    const parsedPayload = JSON.parse(payloadStr);

    expect(parsedPayload.confirmed).toBe(true);
    expect(parsedPayload.edited).toBeDefined();
    expect(parsedPayload.edited.firstName).toBe("Janet");
    expect(label).toBe("Confirm & Continue");
  });
});
