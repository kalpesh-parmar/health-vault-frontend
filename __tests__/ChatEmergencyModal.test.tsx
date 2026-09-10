import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import {
  ChatEmergencyBanner,
  ChatEmergencyModal,
} from "../src/components/chat/modals/ChatEmergencyModal";

describe("ChatEmergencyModal & Banner Component", () => {
  describe("ChatEmergencyBanner", () => {
    it("renders nothing when visible is false", async () => {
      await render(
        <ChatEmergencyBanner visible={false} />
      );
      expect(screen.queryByTestId("chat-emergency-banner")).toBeNull();
    });

    it("renders emergency banner with English text by default", async () => {
      await render(
        <ChatEmergencyBanner visible={true} preferredLang="english" />
      );
      expect(screen.getByTestId("chat-emergency-banner")).toBeTruthy();
      expect(screen.getByText("Seek immediate medical attention")).toBeTruthy();
    });

    it("renders emergency banner with Gujarati text when preferredLang is gujarati", async () => {
      await render(
        <ChatEmergencyBanner visible={true} preferredLang="gujarati" />
      );
      expect(screen.getByText("તાત્કાલિક તબીબી સારવાર મેળવો")).toBeTruthy();
    });

    it("renders custom title and warning message when provided", async () => {
      await render(
        <ChatEmergencyBanner
          visible={true}
          title="Custom Warning"
          warningMessage="Please call your physician."
        />
      );
      expect(screen.getByText("Custom Warning")).toBeTruthy();
      expect(screen.getByText("Please call your physician.")).toBeTruthy();
    });
  });

  describe("ChatEmergencyModal", () => {
    it("renders modal when visible is true and calls onClose when button is pressed", async () => {
      const onCloseMock = jest.fn();
      await render(
        <ChatEmergencyModal
          visible={true}
          onClose={onCloseMock}
          preferredLang="english"
        />
      );

      expect(screen.getByTestId("chat-emergency-modal")).toBeTruthy();
      expect(screen.getByText("Seek immediate medical attention")).toBeTruthy();

      const button = screen.getByText("Acknowledge");
      fireEvent.press(button);
      expect(onCloseMock).toHaveBeenCalledTimes(1);
    });
  });
});
