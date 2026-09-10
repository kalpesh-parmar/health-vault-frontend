import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { ChatHeader } from "../src/components/chat/ChatHeader";

// Mock SafeAreaInsets
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 40, bottom: 20, left: 0, right: 0 }),
}));

describe("ChatHeader Component", () => {
  const mockTheme = {
    colors: {
      primary: "#0f766e",
      textPrimary: "#0f172a",
      textSecondary: "#64748b",
      surface: "#ffffff",
      border: "#e2e8f0",
    },
  };

  it("renders header title and subtitle properly", async () => {
    const onBackMock = jest.fn();
    await render(
      <ChatHeader
        onBack={onBackMock}
        isDark={false}
        theme={mockTheme}
      />
    );

    expect(screen.getByText("Health Assistant")).toBeTruthy();
    expect(screen.getByText("Multilingual Profile")).toBeTruthy();
  });

  it("triggers onBack callback when back button is pressed", async () => {
    const onBackMock = jest.fn();
    await render(
      <ChatHeader
        onBack={onBackMock}
        isDark={false}
        theme={mockTheme}
      />
    );

    const backIcon = screen.getByText("chevron-back");
    fireEvent.press(backIcon);
    expect(onBackMock).toHaveBeenCalledTimes(1);
  });
});
