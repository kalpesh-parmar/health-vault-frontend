import React from "react";
import { render, fireEvent, act } from "@testing-library/react-native";
import { StructuredMedicationListCard } from "../StructuredMedicationListCard";
import { NormalizedMedicationItem } from "../../../../utils/medicationListNormalizer";

// Mock vector icons
jest.mock("@expo/vector-icons", () => ({
  Ionicons: "Ionicons",
  MaterialCommunityIcons: "MaterialCommunityIcons",
}));

describe("StructuredMedicationListCard Component", () => {
  const defaultTheme = {
    colors: {
      primary: "#5B4BFF",
      text: "#1e293b",
      background: "#ffffff",
      surface: "#f8fafc",
      border: "#e2e8f0",
    },
  };

  it("renders empty state cleanly when no medications are present in vault", async () => {
    const onAddMedication = jest.fn();
    const onUploadPrescription = jest.fn();

    const { getByText } = await render(
      <StructuredMedicationListCard
        medicines={[]}
        pagination={{
          pageNumber: 1,
          pageLimit: 20,
          totalPages: 1,
          totalRecords: 0,
          hasNextPage: false,
          hasPrevPage: false,
        }}
        isDark={false}
        theme={defaultTheme}
        preferredLang="english"
        onAddMedication={onAddMedication}
        onUploadPrescription={onUploadPrescription}
      />
    );

    expect(getByText("Your Medications")).toBeTruthy();
    expect(getByText("No Medications Found")).toBeTruthy();
    expect(
      getByText(
        "There are currently no active medications registered in your health vault."
      )
    ).toBeTruthy();

    const addBtn = getByText("Add Medication");
    await act(async () => {
      fireEvent.press(addBtn);
    });
    expect(onAddMedication).toHaveBeenCalledTimes(1);

    const uploadBtn = getByText("Upload Prescription");
    await act(async () => {
      fireEvent.press(uploadBtn);
    });
    expect(onUploadPrescription).toHaveBeenCalledTimes(1);
  });

  it("renders populated medication items with name, dosage, type, frequency, and timing", async () => {
    const sampleMeds: NormalizedMedicationItem[] = [
      {
        id: "med-1",
        name: "Atorvastatin",
        medicationType: "TABLET",
        dosage: "10 mg",
        frequency: "Once Daily",
        foodFrequency: "AFTER_FOOD",
        scheduleTimes: ["20:00"],
        prescribedBy: "Dr. Robert",
        notes: "Take at bedtime",
      },
      {
        id: "med-2",
        name: "Amoxicillin",
        medicationType: "CAPSULE",
        dosage: "500 mg",
        frequency: "Twice Daily",
        foodFrequency: "BEFORE_FOOD",
        scheduleTimes: ["08:00", "20:00"],
      },
    ];

    const onViewAllMedications = jest.fn();

    const { getByText } = await render(
      <StructuredMedicationListCard
        medicines={sampleMeds}
        pagination={{
          pageNumber: 1,
          pageLimit: 20,
          totalPages: 1,
          totalRecords: 2,
          hasNextPage: false,
          hasPrevPage: false,
        }}
        isDark={false}
        theme={defaultTheme}
        preferredLang="english"
        onViewAllMedications={onViewAllMedications}
      />
    );

    expect(getByText("Atorvastatin")).toBeTruthy();
    expect(getByText("10 mg")).toBeTruthy();
    expect(getByText("TABLET")).toBeTruthy();
    expect(getByText("Once Daily")).toBeTruthy();
    expect(getByText("After Food")).toBeTruthy();
    expect(getByText("Dr. Robert")).toBeTruthy();

    expect(getByText("Amoxicillin")).toBeTruthy();
    expect(getByText("500 mg")).toBeTruthy();
    expect(getByText("CAPSULE")).toBeTruthy();
    expect(getByText("Twice Daily")).toBeTruthy();
    expect(getByText("Before Food")).toBeTruthy();

    const manageBtn = getByText("Manage in Health Vault");
    await act(async () => {
      fireEvent.press(manageBtn);
    });
    expect(onViewAllMedications).toHaveBeenCalledTimes(1);
  });

  it("supports localization (e.g. Hindi)", async () => {
    const { getByText } = await render(
      <StructuredMedicationListCard
        medicines={[]}
        pagination={{
          pageNumber: 1,
          pageLimit: 20,
          totalPages: 1,
          totalRecords: 0,
          hasNextPage: false,
          hasPrevPage: false,
        }}
        isDark={true}
        theme={defaultTheme}
        preferredLang="hindi"
      />
    );

    expect(getByText("आपकी दवाइयाँ")).toBeTruthy();
    expect(getByText("कोई दवाई नहीं मिली")).toBeTruthy();
  });
});
