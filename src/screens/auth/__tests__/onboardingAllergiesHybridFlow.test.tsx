import React from "react";
import { render, fireEvent, act } from "@testing-library/react-native";
import { AskAllergiesCard } from "../../../components/chat/widgets/AskAllergiesCard";

// Mock @expo/vector-icons
jest.mock("@expo/vector-icons", () => ({
  Ionicons: "Ionicons",
}));

describe("AskAllergiesCard Refined Natural Chatbot UX Tests", () => {
  const mockTheme = {
    colors: {
      primary: "#5B4BFF",
    },
  };

  const defaultState = {
    preferredLanguage: "english",
    existingUserData: {
      bloodGroup: "O+",
    },
    allergiesSkipped: false,
  };

  test("1. Renders Yes and No answer chips directly without a separate question card wrapper", async () => {
    const mockSendMessage = jest.fn();
    const { getByTestId, queryByTestId, getByText, queryByText } = await render(
      <AskAllergiesCard
        preferredLang="english"
        theme={mockTheme}
        sendMessage={mockSendMessage}
        state={defaultState}
      />,
    );

    // Exactly 2 options: Yes and No chips
    expect(getByTestId("allergy-option-yes")).toBeTruthy();
    expect(getByTestId("allergy-option-no")).toBeTruthy();
    expect(getByText("Yes")).toBeTruthy();
    expect(getByText("No")).toBeTruthy();

    // No separate/duplicate question card or "I'm not sure" option
    expect(queryByTestId("add-allergies-card")).toBeNull();
    expect(queryByTestId("allergy-option-not-sure")).toBeNull();
    expect(queryByText("I'm not sure")).toBeNull();
  });

  test("2. Displays Yes and No options in user's preferred language (Gujarati, Hindi, Marathi, Tamil)", async () => {
    const mockSendMessage = jest.fn();

    // Gujarati
    const gu = await render(
      <AskAllergiesCard
        preferredLang="gujarati"
        theme={mockTheme}
        sendMessage={mockSendMessage}
        state={{ ...defaultState, preferredLanguage: "gujarati" }}
      />,
    );
    expect(gu.getByText("હા")).toBeTruthy();
    expect(gu.getByText("ના")).toBeTruthy();

    // Hindi
    const hi = await render(
      <AskAllergiesCard
        preferredLang="hindi"
        theme={mockTheme}
        sendMessage={mockSendMessage}
        state={{ ...defaultState, preferredLanguage: "hindi" }}
      />,
    );
    expect(hi.getByText("हाँ")).toBeTruthy();
    expect(hi.getByText("नहीं")).toBeTruthy();

    // Marathi
    const mr = await render(
      <AskAllergiesCard
        preferredLang="marathi"
        theme={mockTheme}
        sendMessage={mockSendMessage}
        state={{ ...defaultState, preferredLanguage: "marathi" }}
      />,
    );
    expect(mr.getByText("होय")).toBeTruthy();
    expect(mr.getByText("नाही")).toBeTruthy();

    // Tamil
    const ta = await render(
      <AskAllergiesCard
        preferredLang="tamil"
        theme={mockTheme}
        sendMessage={mockSendMessage}
        state={{ ...defaultState, preferredLanguage: "tamil" }}
      />,
    );
    expect(ta.getByText("ஆம்")).toBeTruthy();
    expect(ta.getByText("இல்லை")).toBeTruthy();
  });

  test("3. When user selects 'No': immediately submits 'NO', empty allergies array, and never shows Add Allergies card", async () => {
    const mockSendMessage = jest.fn();
    const mockSetState = jest.fn();

    const { getByTestId, queryByTestId } = await render(
      <AskAllergiesCard
        preferredLang="english"
        theme={mockTheme}
        sendMessage={mockSendMessage}
        state={defaultState}
        setState={mockSetState}
      />,
    );

    await act(async () => {
      fireEvent.press(getByTestId("allergy-option-no"));
    });

    expect(mockSendMessage).toHaveBeenCalledWith(
      "NO",
      expect.objectContaining({
        allergiesSkipped: true,
        existingUserData: expect.objectContaining({
          allergies: [],
        }),
      }),
      "No",
    );

    // Add Allergies card is never shown
    expect(queryByTestId("add-allergies-card")).toBeNull();
  });

  test("4. When user selects 'Yes': displays inline 'Add Your Allergies' card with common allergy chips", async () => {
    const mockSendMessage = jest.fn();
    const mockSetState = jest.fn();

    const { getByText, getByTestId } = await render(
      <AskAllergiesCard
        preferredLang="english"
        theme={mockTheme}
        sendMessage={mockSendMessage}
        state={defaultState}
        setState={mockSetState}
      />,
    );

    // Tap "Yes"
    await act(async () => {
      fireEvent.press(getByTestId("allergy-option-yes"));
    });

    // Both option chips remain visible with Yes selected
    expect(getByTestId("allergy-option-yes")).toBeTruthy();
    expect(getByTestId("allergy-option-no")).toBeTruthy();

    // Add Allergies card appears
    expect(getByTestId("add-allergies-card")).toBeTruthy();
    expect(getByText("Add Your Allergies")).toBeTruthy();

    // Common allergy chips are rendered
    expect(getByTestId("common-allergy-chip-penicillin")).toBeTruthy();
    expect(getByTestId("common-allergy-chip-aspirin")).toBeTruthy();
    expect(getByTestId("common-allergy-chip-dust")).toBeTruthy();
    expect(getByTestId("common-allergy-chip-pollen")).toBeTruthy();
    expect(getByTestId("common-allergy-chip-peanuts")).toBeTruthy();
    expect(getByTestId("common-allergy-chip-shellfish")).toBeTruthy();
    expect(getByTestId("common-allergy-chip-latex")).toBeTruthy();
    expect(getByTestId("common-allergy-chip-ibuprofen")).toBeTruthy();

    // Custom input and action buttons
    expect(getByTestId("allergy-input")).toBeTruthy();
    expect(getByTestId("allergy-add-btn")).toBeTruthy();
    expect(getByTestId("allergy-cancel-btn")).toBeTruthy();
    expect(getByTestId("allergy-continue-btn")).toBeTruthy();
  });

  test("5. Quick entry via common allergy chips toggles and displays added removable chips", async () => {
    const mockSendMessage = jest.fn();
    const mockSetState = jest.fn();

    const { getByText, getByTestId, queryByText } = await render(
      <AskAllergiesCard
        preferredLang="english"
        theme={mockTheme}
        sendMessage={mockSendMessage}
        state={defaultState}
        setState={mockSetState}
      />,
    );

    // Tap "Yes"
    await act(async () => {
      fireEvent.press(getByTestId("allergy-option-yes"));
    });

    // Tap "Dust" common chip
    await act(async () => {
      fireEvent.press(getByTestId("common-allergy-chip-dust"));
    });
    expect(getByText("DUST")).toBeTruthy();

    // Tap "Pollen" common chip
    await act(async () => {
      fireEvent.press(getByTestId("common-allergy-chip-pollen"));
    });
    expect(getByText("POLLEN")).toBeTruthy();

    // Tapping Dust again toggles/removes it
    await act(async () => {
      fireEvent.press(getByTestId("common-allergy-chip-dust"));
    });
    expect(queryByText("DUST")).toBeNull();
    expect(getByText("POLLEN")).toBeTruthy();
  });

  test("6. Custom text input with Add button, duplicate detection, and remove chip action", async () => {
    const mockSendMessage = jest.fn();
    const mockSetState = jest.fn();

    const { getByText, getByTestId, queryByText } = await render(
      <AskAllergiesCard
        preferredLang="english"
        theme={mockTheme}
        sendMessage={mockSendMessage}
        state={defaultState}
        setState={mockSetState}
      />,
    );

    await act(async () => {
      fireEvent.press(getByTestId("allergy-option-yes"));
    });

    const input = getByTestId("allergy-input");

    // Add custom allergy: "Penicillin" via common chip
    await act(async () => {
      fireEvent.press(getByTestId("common-allergy-chip-penicillin"));
    });
    expect(getByText("PENICILLIN")).toBeTruthy();

    // Add custom allergy: "Cats" via text input
    await act(async () => {
      fireEvent.changeText(input, "Cats");
    });
    await act(async () => {
      fireEvent.press(getByTestId("allergy-add-btn"));
    });
    expect(getByText("CATS")).toBeTruthy();

    // Try adding duplicate "cats" (case-insensitive)
    await act(async () => {
      fireEvent.changeText(input, "cats");
    });
    await act(async () => {
      fireEvent.press(getByTestId("allergy-add-btn"));
    });
    expect(getByTestId("allergy-error-text")).toBeTruthy();
    expect(getByText("This allergy is already added")).toBeTruthy();

    // Remove "Penicillin" chip (index 0)
    await act(async () => {
      fireEvent.press(getByTestId("allergy-remove-chip-0"));
    });
    expect(queryByText("PENICILLIN")).toBeNull();
    expect(getByText("CATS")).toBeTruthy();
  });

  test("7. Cancel action reverts Yes selection, clears added allergies and input, and collapses the card", async () => {
    const mockSendMessage = jest.fn();
    const mockSetState = jest.fn();

    const { getByText, getByTestId, queryByText, queryByTestId } = await render(
      <AskAllergiesCard
        preferredLang="english"
        theme={mockTheme}
        sendMessage={mockSendMessage}
        state={defaultState}
        setState={mockSetState}
      />,
    );

    // 1. User taps "Yes"
    await act(async () => {
      fireEvent.press(getByTestId("allergy-option-yes"));
    });
    expect(getByTestId("add-allergies-card")).toBeTruthy();

    // 2. Add "Pollen"
    await act(async () => {
      fireEvent.press(getByTestId("common-allergy-chip-pollen"));
    });
    expect(getByText("POLLEN")).toBeTruthy();

    // 3. User taps "Cancel"
    await act(async () => {
      fireEvent.press(getByTestId("allergy-cancel-btn"));
    });

    // 4. Card collapses
    expect(queryByTestId("add-allergies-card")).toBeNull();
    expect(queryByText("POLLEN")).toBeNull();

    // 5. Did not call sendMessage
    expect(mockSendMessage).not.toHaveBeenCalled();
  });

  test("8. Continue action submits all selected allergies together with comma-separated display label", async () => {
    const mockSendMessage = jest.fn();
    const mockSetState = jest.fn();

    const { getByTestId } = await render(
      <AskAllergiesCard
        preferredLang="english"
        theme={mockTheme}
        sendMessage={mockSendMessage}
        state={defaultState}
        setState={mockSetState}
      />,
    );

    // User taps "Yes"
    await act(async () => {
      fireEvent.press(getByTestId("allergy-option-yes"));
    });

    // User selects "Dust" and "Pollen"
    await act(async () => {
      fireEvent.press(getByTestId("common-allergy-chip-dust"));
    });
    await act(async () => {
      fireEvent.press(getByTestId("common-allergy-chip-pollen"));
    });

    // User presses "Continue"
    await act(async () => {
      fireEvent.press(getByTestId("allergy-continue-btn"));
    });

    expect(mockSendMessage).toHaveBeenCalledWith(
      JSON.stringify({
        action: "ASK_ALLERGIES",
        allergies: ["Dust", "Pollen"],
      }),
      expect.objectContaining({
        allergiesSkipped: true,
        existingUserData: expect.objectContaining({
          allergies: ["Dust", "Pollen"],
        }),
      }),
      "Dust, Pollen",
    );
  });

  test("9. Read-only historical mode: renders recorded choices without interactive inputs or action buttons", async () => {
    const mockSendMessage = jest.fn();
    const historicalState = {
      ...defaultState,
      allergiesSkipped: true,
      existingUserData: {
        bloodGroup: "O+",
        allergies: ["Dust", "Pollen"],
      },
    };

    const { getByText, queryByTestId, queryByText } = await render(
      <AskAllergiesCard
        preferredLang="english"
        theme={mockTheme}
        sendMessage={mockSendMessage}
        state={historicalState}
        isHistorical={true}
        chosenVal="YES"
        chosenLabel="Dust, Pollen"
      />,
    );

    expect(getByText("Dust")).toBeTruthy();
    expect(getByText("Pollen")).toBeTruthy();

    // No interactive input, common chips, Add, Cancel, or Continue buttons
    expect(queryByTestId("allergy-input")).toBeNull();
    expect(queryByTestId("allergy-add-btn")).toBeNull();
    expect(queryByTestId("allergy-cancel-btn")).toBeNull();
    expect(queryByTestId("allergy-continue-btn")).toBeNull();
    expect(queryByText("Penicillin")).toBeNull();
  });
});
