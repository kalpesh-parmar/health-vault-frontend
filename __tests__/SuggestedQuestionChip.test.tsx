import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { SuggestedQuestionChip } from "../src/components/chat/SuggestedQuestionChip";

describe("SuggestedQuestionChip Component", () => {
  it("renders null when questions array is empty", async () => {
    const onPressMock = jest.fn();
    await render(
      <SuggestedQuestionChip
        questions={[]}
        onPressQuestion={onPressMock}
        isDark={false}
      />
    );

    expect(screen.toJSON()).toBeNull();
  });

  it("renders question chips and triggers onPressQuestion when tapped", async () => {
    const onPressMock = jest.fn();
    const questions = [
      "What medications are prescribed?",
      "Are there any abnormal values?",
    ];

    await render(
      <SuggestedQuestionChip
        questions={questions}
        onPressQuestion={onPressMock}
        isDark={false}
      />
    );

    expect(screen.getByText("What medications are prescribed?")).toBeTruthy();
    expect(screen.getByText("Are there any abnormal values?")).toBeTruthy();

    fireEvent.press(screen.getByText("What medications are prescribed?"));
    expect(onPressMock).toHaveBeenCalledWith("What medications are prescribed?");
  });
});
