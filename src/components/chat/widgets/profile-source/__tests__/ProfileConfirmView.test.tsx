import React from "react";
import { render } from "@testing-library/react-native";
import { ProfileConfirmView } from "../ProfileConfirmView";
import { ProfileField } from "../useProfileSourceState";

// Mock @expo/vector-icons
jest.mock("@expo/vector-icons", () => ({
  Ionicons: "Ionicons",
}));

describe("ProfileConfirmView Component", () => {
  const defaultTheme = {
    colors: {
      primary: "#5B4BFF",
      text: "#1e293b",
      background: "#ffffff",
      surface: "#f8fafc",
      border: "#e2e8f0",
    },
  };

  const sampleFields: ProfileField[] = [
    { key: "firstName", label: "First Name", value: "John" },
    { key: "lastName", label: "Last Name", value: "Doe" },
    { key: "dateOfBirth", label: "Date of Birth", value: "1990-01-01" },
    { key: "gender", label: "Gender", value: "Male" },
  ];

  it("renders profile fields cleanly in confirm mode", async () => {
    const onConfirm = jest.fn();
    const onEditManually = jest.fn();

    const { getByText } = await render(
      <ProfileConfirmView
        fields={sampleFields}
        localEditedData={{}}
        parsed={{}}
        isDark={false}
        theme={defaultTheme}
        uiT={(k) => k}
        getFieldIcon={() => "person-outline"}
        onConfirm={onConfirm}
        onEditManually={onEditManually}
      />
    );

    expect(getByText("John")).toBeTruthy();
    expect(getByText("Doe")).toBeTruthy();
    expect(getByText("First Name")).toBeTruthy();
    expect(getByText("Last Name")).toBeTruthy();
  });
});
