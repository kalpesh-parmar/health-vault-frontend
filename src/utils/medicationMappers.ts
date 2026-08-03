import { ProcessedDocument, ExtractedMedicine } from "../types/medicationReview";

export const mapApiMedicineToExtractedMedicine = (
  apiMed: any,
  documentId: string,
  documentName: string,
  index: number
): ExtractedMedicine => {
  const rawName = apiMed.name || apiMed.medicationName || "Unknown Medicine";
  let cleanName = rawName;
  let medicineType = "Tablet";

  // Clean prefixes like Tab., Cap., Syr.
  if (/^tab(\.|\s)/i.test(rawName)) {
    medicineType = "Tablet";
    cleanName = rawName.replace(/^tab(\.|\s)\s*/i, "");
  } else if (/^cap(\.|\s)/i.test(rawName)) {
    medicineType = "Capsule";
    cleanName = rawName.replace(/^cap(\.|\s)\s*/i, "");
  } else if (/^syr(\.|\s)/i.test(rawName)) {
    medicineType = "Syrup";
    cleanName = rawName.replace(/^syr(\.|\s)\s*/i, "");
  } else if (/^drop(\.|\s)/i.test(rawName)) {
    medicineType = "Drop";
    cleanName = rawName.replace(/^drop(\.|\s)\s*/i, "");
  } else if (/^inj(\.|\s)/i.test(rawName)) {
    medicineType = "Injection";
    cleanName = rawName.replace(/^inj(\.|\s)\s*/i, "");
  }

  // Capitalize first letter of cleanName
  cleanName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);

  // Parse dosage
  let dosage = "";
  let dosageUnit = "mg";
  const rawDosage = apiMed.dosage || "";
  if (rawDosage) {
    const match = rawDosage.match(/^([\d.,]+)\s*([a-zA-Z%]+.*)$/);
    if (match) {
      dosage = match[1];
      dosageUnit = match[2];
    } else {
      dosage = rawDosage;
    }
  }

  // Parse frequency
  let frequency = "Once Daily";
  const rawFrequency = apiMed.frequency || "";
  if (rawFrequency) {
    if (rawFrequency.includes("1-1-1")) {
      frequency = "3x Daily";
    } else if (rawFrequency.includes("1-1-0") || rawFrequency.includes("1-0-1") || rawFrequency.includes("BD")) {
      frequency = "Twice Daily";
    } else if (rawFrequency.includes("1-0-0") || rawFrequency.includes("0-0-1") || rawFrequency.includes("OD")) {
      frequency = "Once Daily";
    } else {
      frequency = rawFrequency;
    }
  }

  // Parse timing
  let timing = "After Food";
  const rawTiming = apiMed.timing || "";
  if (rawTiming) {
    if (rawTiming.toLowerCase().includes("before")) {
      timing = "Before Food";
    } else {
      timing = "After Food";
    }
  }

  // Parse total duration / quantity
  let totalQuantity = 10;
  let quantityUnit = "Tablets";
  const duration = apiMed.duration || "";
  if (duration) {
    const match = duration.match(/^(\d+)\s*(.*)$/);
    if (match) {
      const val = parseInt(match[1], 10);
      if (!isNaN(val)) {
        totalQuantity = val;
      }
      quantityUnit = match[2] || "Tablets";
    }
  }

  const confidence = typeof apiMed.confidence === "number" ? apiMed.confidence : 0.95;

  // Set default schedule times based on frequency
  let scheduleTimes = ["08:00"];
  if (frequency === "3x Daily" || frequency === "THRICE" || frequency === "3x daily") {
    scheduleTimes = ["08:00", "14:00", "20:00"];
  } else if (frequency === "Twice Daily" || frequency === "TWICE" || frequency === "twice daily") {
    scheduleTimes = ["08:00", "20:00"];
  }

  return {
    id: `${documentId}-med-${index}-${cleanName.replace(/[^a-zA-Z0-9]/g, "")}`,
    documentId,
    documentName,
    name: cleanName,
    medicineType,
    dosage,
    dosageUnit,
    frequency,
    timing,
    prescribedBy: apiMed.prescribedBy || "",
    totalQuantity,
    quantityUnit,
    reminderEnabled: true,
    reminderTime: "08:00 AM",
    medicationSchedule: scheduleTimes,
    refillAlertEnabled: true,
    refillAlertDays: 2,
    notes: apiMed.instructions || apiMed.notes || "",
    confidence,
    selected: confidence >= 0.8,
  };
};

export const mapApiDocumentToProcessedDocument = (
  apiJobResult: any,
  jobInfo: { jobId: string; fileName: string }
): ProcessedDocument => {
  const jobId = jobInfo.jobId;
  let docName = jobInfo.fileName || "Medical Document";
  try {
    docName = decodeURIComponent(docName);
  } catch (e) {
    console.warn("Failed to decode document name:", e);
  }
  const status = apiJobResult.status || "COMPLETED";

  const medications: ExtractedMedicine[] = [];
  const rawMeds =
    apiJobResult.extractedStructuredData?.medications ||
    apiJobResult.extractedStructuredData?.medicines ||
    apiJobResult.medications ||
    [];

  if (Array.isArray(rawMeds)) {
    rawMeds.forEach((med: any, idx: number) => {
      medications.push(mapApiMedicineToExtractedMedicine(med, jobId, docName, idx));
    });
  }

  return {
    id: jobId,
    name: docName,
    type: "Document",
    status,
    medicines: medications,
  };
};
