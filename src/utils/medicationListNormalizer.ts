export interface NormalizedMedicationItem {
  id?: string;
  name: string;
  medicationType: string;
  dosage: string;
  dosePerIntake?: number | string;
  frequency: string;
  foodFrequency: string;
  scheduleTimes: string[];
  startDate?: string;
  totalQuantity?: number;
  prescribedBy?: string;
  notes?: string;
  provenance?: string;
  verificationRequired?: boolean;
  confidence?: number;
  raw?: any;
}

export interface MedicationListPagination {
  pageNumber: number;
  pageLimit: number;
  totalPages: number;
  totalRecords: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface ParsedMedicationListResult {
  isMedicationList: boolean;
  items: NormalizedMedicationItem[];
  pagination?: MedicationListPagination;
  rawText?: string;
}

const normalizeScheduleTimes = (schedule: any): string[] => {
  if (!schedule) return [];
  if (Array.isArray(schedule)) {
    return schedule.map((s) => String(s));
  }
  if (typeof schedule === "object") {
    const times: string[] = [];
    Object.keys(schedule).forEach((key) => {
      const val = schedule[key];
      if (Array.isArray(val)) {
        times.push(...val.map(String));
      } else if (val) {
        times.push(String(val));
      }
    });
    return times;
  }
  return [];
};

export const normalizeMedicationItem = (item: any): NormalizedMedicationItem => {
  const name =
    item.medicationName ||
    item.name ||
    item.medicineName ||
    item.title ||
    "Unnamed Medication";

  const medicationType = (
    item.medicationType ||
    item.medicineType ||
    item.type ||
    "TABLET"
  ).toUpperCase();

  const dosage =
    item.dosage ||
    (item.dosePerIntake ? `${item.dosePerIntake} ${medicationType.toLowerCase()}` : "") ||
    "1 dose";

  let frequency = item.frequency || "Once Daily";
  if (frequency === "TWICE" || frequency === "Twice daily" || frequency === "2x Daily") {
    frequency = "Twice Daily";
  } else if (frequency === "THRICE" || frequency === "3x Daily") {
    frequency = "3x Daily";
  } else if (frequency === "ONCE" || frequency === "Once daily") {
    frequency = "Once Daily";
  }

  let foodFrequency = "AFTER_FOOD";
  const rawFood = (item.foodFrequency || item.timing || "AFTER_FOOD").toUpperCase();
  if (rawFood.includes("BEFORE") || rawFood.includes("PRE")) {
    foodFrequency = "BEFORE_FOOD";
  } else if (rawFood.includes("WITH") || rawFood.includes("DURING")) {
    foodFrequency = "WITH_FOOD";
  }

  const scheduleTimes = normalizeScheduleTimes(
    item.medicationSchedule || item.schedule || item.times
  );

  return {
    id: item.id || item._id || item.client_med_id,
    name: name.trim(),
    medicationType,
    dosage,
    dosePerIntake: item.dosePerIntake,
    frequency,
    foodFrequency,
    scheduleTimes,
    startDate: item.startDate && item.startDate !== "None" ? item.startDate : undefined,
    totalQuantity: item.totalQuantity || item.quantity,
    prescribedBy: item.prescribedBy || item.doctorName || undefined,
    notes: item.notes || item.instructions || undefined,
    provenance: item.provenance || item.medicationSchedule?.provenance || (item.source === "VLM_FALLBACK" ? "vlm_fallback" : undefined),
    verificationRequired: Boolean(item.verificationRequired || item.medicationSchedule?.verificationRequired || item.needsReview?.fallbackVerification || item.provenance === "vlm_fallback"),
    confidence: item.confidence !== undefined ? item.confidence : item.medicationSchedule?.confidence,
    raw: item,
  };
};

const isDocumentOrReport = (item: any): boolean => {
  if (!item || typeof item !== "object") return false;
  return Boolean(
    item.documentType ||
    item.ocrStatus ||
    (item.fileType && (item.fileName || item.name)) ||
    (item.reportDate && (item.fileName || item.name || item.documentType)) ||
    item.isLabReport ||
    item.isPrescription ||
    (item.fileName && !item.medicationName && !item.medicineName && !item.dosage && !item.frequency)
  );
};

export const parseMedicationListMessage = (
  content: any,
  metadata?: any
): ParsedMedicationListResult => {
  const metaTask = metadata?.task || metadata?.action || metadata?.actionType;
  const metaMode = metadata?.mode;

  const isExplicitDocTask =
    metaTask === "REPORT_LIST" ||
    metaTask === "DOCUMENT_LIST" ||
    metaTask === "LIST_REPORTS" ||
    metaTask === "LIST_DOCUMENTS" ||
    metadata?.task === "REPORT_LIST" ||
    metadata?.task === "DOCUMENT_LIST" ||
    metaMode === "REPORT_LIST" ||
    metaMode === "DOCUMENT_LIST";

  if (isExplicitDocTask) {
    return {
      isMedicationList: false,
      items: [],
    };
  }

  const isMetadataList =
    metaTask === "MEDICATION_LIST" ||
    metaTask === "LIST_MEDICINES" ||
    metaMode === "STRUCTURED_LIST" ||
    metadata?.task === "MEDICATION_LIST";

  let parsedBody: any = null;

  if (typeof content === "string") {
    const trimmed = content.trim();
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      try {
        parsedBody = JSON.parse(trimmed);
      } catch {
        parsedBody = null;
      }
    }
  } else if (content && typeof content === "object") {
    parsedBody = content;
  }

  const candidatePayload =
    parsedBody?.reply ||
    parsedBody?.responseBody?.reply ||
    metadata?.reply ||
    parsedBody ||
    {};

  const rawItems =
    candidatePayload.items ||
    candidatePayload.medicines ||
    parsedBody?.items ||
    parsedBody?.medicines ||
    metadata?.medicines ||
    [];

  // If candidate items are actually documents/reports, reject as medication list
  if (Array.isArray(rawItems) && rawItems.length > 0 && rawItems.some(isDocumentOrReport)) {
    return {
      isMedicationList: false,
      items: [],
    };
  }

  if (
    parsedBody &&
    (Array.isArray(parsedBody.items) ||
      Array.isArray(parsedBody.medicines) ||
      isMetadataList)
  ) {
    const items = (Array.isArray(rawItems) ? rawItems : []).map(normalizeMedicationItem);
    const pagination = candidatePayload.pagination || parsedBody.pagination || undefined;

    return {
      isMedicationList: true,
      items,
      pagination,
      rawText: parsedBody.message || parsedBody.reply || parsedBody.text || undefined,
    };
  }

  if (isMetadataList) {
    return {
      isMedicationList: true,
      items: [],
      pagination: undefined,
      rawText: typeof content === "string" ? content : undefined,
    };
  }

  return {
    isMedicationList: false,
    items: [],
  };
};

/**
 * Normalize a medication name for draft-level comparisons.
 * Dosage forms and strengths are not part of the medication identity here.
 */
export const normalizeMedicationName = (name: string): string => {
  if (!name || typeof name !== "string") return "";

  let clean = name.toLowerCase().trim();
  clean = clean.replace(
    /\b(?:tab\.|tablet|tablets|tab|cap\.|capsule|capsules|caps|cap|syp\.|syrup|syp|inj\.|injection|inj|drops?|drop|spray|inhaler|inh\.|inh)\b/gi,
    "",
  );
  clean = clean.replace(/\b\d+(\.\d+)?\s*(mg|g|mcg|ml|iu|puffs?|%)?\b/gi, "");
  clean = clean.replace(/[^a-z0-9\s]/gi, "").replace(/\s+/g, " ").trim();
  return clean;
};

export const deduplicateDrafts = (medList: any[]): any[] => {
  if (!Array.isArray(medList)) return [];

  const seenIds = new Set<string>();
  const seenNames = new Map<string, number>();
  const result: any[] = [];

  for (const m of medList) {
    if (!m || typeof m !== "object") continue;

    const rawName = String(
      m.medicationName || m.name || m.medicineName || "",
    ).trim();
    const normName = normalizeMedicationName(rawName) || rawName.toLowerCase();
    const key = m.client_med_id || m.clientMedId || m.id;
    const isUnsavedDraft = !m.isSaved && !m.dbId;

    if (!normName && !key) continue;
    if (key && seenIds.has(key)) continue;

    if (normName && isUnsavedDraft && seenNames.has(normName)) {
      const existingIdx = seenNames.get(normName)!;
      const existing = result[existingIdx];

      if (!existing.isSaved && !existing.dbId) {
        result[existingIdx] = {
          ...existing,
          ...m,
          // Keep the first item's stable identity (usually the document ID).
          id: existing.id || m.id || key,
          client_med_id: existing.client_med_id || m.client_med_id || key,
          name: existing.name || m.name || rawName,
          documentId: existing.documentId || m.documentId,
          documentName: existing.documentName || m.documentName,
          dosage: existing.dosage || m.dosage,
          selected: existing.selected !== undefined ? existing.selected : m.selected,
        };

        if (key) seenIds.add(key);
        continue;
      }
    }

    if (key) seenIds.add(key);
    if (normName) seenNames.set(normName, result.length);
    result.push(m);
  }

  return result;
};

