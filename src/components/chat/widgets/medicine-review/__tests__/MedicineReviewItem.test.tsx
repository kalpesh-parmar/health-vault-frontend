import { render } from "@testing-library/react-native";
import { MedicineReviewItem } from "../MedicineReviewItem";

// Mock @expo/vector-icons
jest.mock("@expo/vector-icons", () => ({
  Ionicons: "Ionicons",
}));

describe("MedicineReviewItem Component", () => {
  const defaultTheme = {
    colors: {
      primary: "#5B4BFF",
      text: "#1e293b",
      background: "#ffffff",
      surface: "#f8fafc",
      border: "#e2e8f0",
    },
  };

  const sampleMed = {
    id: "med-1",
    client_med_id: "client_med_1",
    name: "Amoxicillin",
    dosage: "500 mg",
    frequency: "Twice daily",
    startDate: "2026-06-01",
    foodFrequency: "AFTER_MEAL",
  };

  it("renders medicine details cleanly without throwing", async () => {
    const onToggleCheck = jest.fn();
    const onToggleExpand = jest.fn();
    const onEdit = jest.fn();

    const { getByText } = await render(
      <MedicineReviewItem
        med={sampleMed}
        isChecked={true}
        isExpanded={false}
        isDark={false}
        theme={defaultTheme}
        resolutions={{}}
        onToggleCheck={onToggleCheck}
        onToggleExpand={onToggleExpand}
        onEdit={onEdit}
      />
    );

    expect(getByText("Amoxicillin")).toBeTruthy();
    expect(getByText(/500 mg/)).toBeTruthy();
  });

  it("handles dark mode styling cleanly", async () => {
    const { getByText } = await render(
      <MedicineReviewItem
        med={sampleMed}
        isChecked={false}
        isExpanded={true}
        isDark={true}
        theme={defaultTheme}
        resolutions={{ "med-1": "KEEP_NEW" }}
        onToggleCheck={jest.fn()}
        onToggleExpand={jest.fn()}
        onEdit={jest.fn()}
      />
    );

    expect(getByText("Amoxicillin")).toBeTruthy();
  });
});
