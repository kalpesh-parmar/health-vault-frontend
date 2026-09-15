import React from "react";
import { render, fireEvent, act } from "@testing-library/react-native";
import {
  StructuredReportSummaryCard,
  StructuredReportDocument,
} from "../widgets/StructuredReportSummaryCard";

// Mock vector icons
jest.mock("@expo/vector-icons", () => ({
  Ionicons: "Ionicons",
  MaterialCommunityIcons: "MaterialCommunityIcons",
}));

describe("StructuredReportSummaryCard Component", () => {
  const mockDoc: StructuredReportDocument = {
    id: "doc-valjibhai-123",
    fileName: "Trimurti_Lab_Report.pdf",
    documentType: "LAB_REPORT",
    reportDate: "2024-08-30",
    patientDetails: {
      name: "Valjibhai Ranoliya",
      age: 70,
      gender: "male",
      uhid: "5069200904",
      doctorName: "Dr. Sachin P. Vagadia",
      hospitalName: "Trimurti Medical Store",
      reportDate: "2024-08-30",
    },
    abnormalResults: [
      {
        name: "Random Blood Sugar",
        value: "271",
        unit: "mg/dL",
        status: "Abnormal (> 200: Provisional Diabetes)",
        referenceRange: "< 140 mg/dL",
        isAbnormal: true,
      },
      {
        name: "HbA1c",
        value: "9.0",
        unit: "%",
        status: "Abnormal (>= 6.5: Diabetes)",
        referenceRange: "< 5.7%",
        isAbnormal: true,
      },
    ],
    normalResults: [
      {
        name: "Hemoglobin",
        value: "11.20",
        unit: "gm%",
        status: "Normal",
        referenceRange: "11.0 - 16.0 gm%",
        isAbnormal: false,
      },
      {
        name: "Prothrombin Time (PT)",
        value: "18.5",
        unit: "seconds",
        status: "Normal",
        referenceRange: "13.87 - 18.27",
        isAbnormal: false,
      },
    ],
    keyFindings: "Imaging and lab report showing elevated Random Blood Sugar and elevated HbA1c.",
    whatThisMayMean: "High blood glucose levels indicate poorly controlled glycemic state.",
  };

  it("renders Document Header and Patient Details correctly", async () => {
    const { getByText } = await render(
      <StructuredReportSummaryCard document={mockDoc} isDark={false} />
    );

    expect(getByText("Trimurti_Lab_Report.pdf")).toBeTruthy();
    expect(getByText("Valjibhai Ranoliya")).toBeTruthy();
    expect(getByText("70 yrs • MALE")).toBeTruthy();
    expect(getByText("5069200904")).toBeTruthy();
  });

  it("renders Key Findings Banner and What This May Mean section", async () => {
    const { getByText } = await render(
      <StructuredReportSummaryCard document={mockDoc} isDark={false} />
    );

    expect(
      getByText("Imaging and lab report showing elevated Random Blood Sugar and elevated HbA1c.")
    ).toBeTruthy();
    expect(
      getByText("High blood glucose levels indicate poorly controlled glycemic state.")
    ).toBeTruthy();
  });

  it("renders Abnormal Results with warning badges and exact medical terms", async () => {
    const { getByText } = await render(
      <StructuredReportSummaryCard document={mockDoc} isDark={false} />
    );

    expect(getByText("Random Blood Sugar")).toBeTruthy();
    expect(getByText("271 mg/dL")).toBeTruthy();
    expect(getByText("HbA1c")).toBeTruthy();
    expect(getByText("9.0 %")).toBeTruthy();
    expect(getByText("Abnormal (> 200: Provisional Diabetes)")).toBeTruthy();
  });

  it("toggles Normal Results accordion when pressed", async () => {
    const { getByText, queryByText, getByTestId } = await render(
      <StructuredReportSummaryCard document={mockDoc} isDark={false} />
    );

    // Initially collapsed
    expect(queryByText("Hemoglobin")).toBeNull();

    // Tap to expand
    await act(async () => {
      fireEvent.press(getByTestId("normal-results-accordion-toggle"));
    });

    // Now expanded and visible
    expect(getByText("Hemoglobin")).toBeTruthy();
    expect(getByText("11.20 gm%")).toBeTruthy();
    expect(getByText("Prothrombin Time (PT)")).toBeTruthy();
  });

  it("calls onQuestionPress when a suggested prompt chip is tapped", async () => {
    const onQuestionPress = jest.fn();
    const questions = ["What does my report mean?", "Questions for doctor"];

    const { getByText } = await render(
      <StructuredReportSummaryCard
        document={mockDoc}
        suggestedQuestions={questions}
        onQuestionPress={onQuestionPress}
        isDark={false}
      />
    );

    fireEvent.press(getByText("What does my report mean?"));
    expect(onQuestionPress).toHaveBeenCalledWith("What does my report mean?");
  });
});
