import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { MessageBubble } from "../MessageBubble";

// Mock @expo/vector-icons
jest.mock("@expo/vector-icons", () => ({
  Ionicons: "Ionicons",
}));

// Mock expo-linear-gradient
jest.mock("expo-linear-gradient", () => ({
  LinearGradient: ({ children }: any) => children,
}));

describe("MessageBubble Component", () => {
  it("renders user message bubble with text", async () => {
    const message = {
      id: "msg-1",
      role: "user" as const,
      text: "Hello Doctor, what is my diagnosis?",
      createdAt: "2026-09-10T10:00:00.000Z",
    };

    const { getByText } = await render(
      <MessageBubble message={message} isDark={false} />
    );

    expect(getByText("Hello Doctor, what is my diagnosis?")).toBeTruthy();
  });

  it("renders AI message bubble with title, subtitle, and body text", async () => {
    const message = {
      id: "msg-2",
      role: "ai" as const,
      title: "Prescription Summary",
      subtitle: "Medications extracted from report",
      text: "Take Paracetamol twice daily.",
      createdAt: "2026-09-10T10:01:00.000Z",
    };

    const { getByText } = await render(
      <MessageBubble message={message} isDark={false} />
    );

    expect(getByText("Prescription Summary")).toBeTruthy();
    expect(getByText("Medications extracted from report")).toBeTruthy();
    expect(getByText("Take Paracetamol twice daily.")).toBeTruthy();
  });

  it("renders inline bold markdown formatting correctly in AI message", async () => {
    const message = {
      id: "msg-3",
      role: "ai" as const,
      text: "Please take **Aspirin** with food.",
    };

    const { getByText } = await render(
      <MessageBubble message={message} isDark={false} />
    );

    expect(getByText("Aspirin")).toBeTruthy();
  });

  it("invokes onSpeak callback when speech button is clicked", async () => {
    const handleSpeak = jest.fn();
    const message = {
      id: "msg-4",
      role: "ai" as const,
      text: "Your vitals look normal.",
    };

    const { getByLabelText } = await render(
      <MessageBubble
        message={message}
        isDark={false}
        onSpeak={handleSpeak}
        isSpeaking={false}
      />
    );

    const speakButton = getByLabelText("Read response aloud");
    fireEvent.press(speakButton);
    expect(handleSpeak).toHaveBeenCalledTimes(1);
  });
});
