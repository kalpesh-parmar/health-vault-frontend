import {
  parseMedicationListMessage,
  normalizeMedicationItem,
} from "../medicationListNormalizer";

describe("Medication List Normalizer & Parser", () => {
  it("correctly parses empty medication history response from API payload", () => {
    const historyApiMsg = {
      id: "2838d376-c484-4dd8-8334-ec1b2eca727e",
      sessionId: "0e43dd11-2b20-4010-8d45-5edbb0f0fd6b",
      userId: "b89e3169-8e5f-4564-8432-baa8b613c98b",
      role: "assistant",
      content:
        '{"items":[],"pagination":{"pageNumber":1,"pageLimit":20,"totalPages":1,"totalRecords":0,"hasNextPage":false,"hasPrevPage":false}}',
      citations: [],
      metadata: {
        mode: "STRUCTURED_LIST",
        task: "MEDICATION_LIST",
        emergency: false,
        documentId: [],
      },
      createdAt: "2026-09-23T09:55:25.396Z",
      seq: 20,
    };

    const result = parseMedicationListMessage(
      historyApiMsg.content,
      historyApiMsg.metadata
    );

    expect(result.isMedicationList).toBe(true);
    expect(result.items).toHaveLength(0);
    expect(result.pagination).toEqual({
      pageNumber: 1,
      pageLimit: 20,
      totalPages: 1,
      totalRecords: 0,
      hasNextPage: false,
      hasPrevPage: false,
    });
  });

  it("correctly parses and normalizes populated medication list items", () => {
    const contentPayload = JSON.stringify({
      items: [
        {
          id: "med-1",
          medicationName: "Metformin",
          medicationType: "Tablet",
          dosePerIntake: 1,
          dosage: "500 mg",
          frequency: "Twice Daily",
          foodFrequency: "AFTER_FOOD",
          medicationSchedule: {
            MORNING: "08:00:00",
            NIGHT: "20:00:00",
          },
          startDate: "2026-06-01",
          prescribedBy: "Dr. Sharma",
          notes: "Take with full glass of water",
        },
        {
          id: "med-2",
          name: "Cough Syrup",
          medicineType: "Syrup",
          dosePerIntake: 10,
          frequency: "3x Daily",
          timing: "BEFORE_MEAL",
          scheduleTimes: ["08:00", "14:00", "20:00"],
        },
      ],
      pagination: {
        pageNumber: 1,
        pageLimit: 20,
        totalPages: 1,
        totalRecords: 2,
        hasNextPage: false,
        hasPrevPage: false,
      },
    });

    const result = parseMedicationListMessage(contentPayload, {
      task: "MEDICATION_LIST",
      mode: "STRUCTURED_LIST",
    });

    expect(result.isMedicationList).toBe(true);
    expect(result.items).toHaveLength(2);

    const firstMed = result.items[0];
    expect(firstMed.name).toBe("Metformin");
    expect(firstMed.medicationType).toBe("TABLET");
    expect(firstMed.dosage).toBe("500 mg");
    expect(firstMed.frequency).toBe("Twice Daily");
    expect(firstMed.foodFrequency).toBe("AFTER_FOOD");
    expect(firstMed.scheduleTimes).toEqual(["08:00:00", "20:00:00"]);
    expect(firstMed.prescribedBy).toBe("Dr. Sharma");
    expect(firstMed.notes).toBe("Take with full glass of water");

    const secondMed = result.items[1];
    expect(secondMed.name).toBe("Cough Syrup");
    expect(secondMed.medicationType).toBe("SYRUP");
    expect(secondMed.frequency).toBe("3x Daily");
    expect(secondMed.foodFrequency).toBe("BEFORE_FOOD");
  });

  it("handles non-medication content without crashing", () => {
    const regularChatMsg = "Hello Doctor, what is my diagnosis?";
    const result = parseMedicationListMessage(regularChatMsg, {
      task: "NORMAL_CHAT",
    });

    expect(result.isMedicationList).toBe(false);
    expect(result.items).toHaveLength(0);
  });
});
