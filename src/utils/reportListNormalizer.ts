export interface NormalizedReportItem {
  id: string;
  fileName: string;
  documentType: string;
  fileType?: string;
  reportDate?: string;
  ocrStatus?: string;
  s3Key?: string;
  fileUrl?: string;
  imageUri?: string;
  summary?: string;
  raw?: any;
}

export interface ReportListPagination {
  pageNumber: number;
  pageLimit: number;
  totalPages: number;
  totalRecords: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface ParsedReportListResult {
  isReportList: boolean;
  items: NormalizedReportItem[];
  pagination?: ReportListPagination;
  rawText?: string;
}

/**
 * Checks if an item looks like a medical report/document.
 */
export const isDocumentOrReportItem = (item: any): boolean => {
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

/**
 * Checks if an item looks specifically like a medication item.
 */
export const isMedicationItem = (item: any): boolean => {
  if (!item || typeof item !== "object") return false;
  return Boolean(
    item.medicationName ||
    item.medicineName ||
    item.dosage ||
    item.dosePerIntake ||
    item.foodFrequency ||
    item.medicationSchedule ||
    (item.medicationType && !item.documentType) ||
    (item.name && (item.dosage || item.frequency || item.foodFrequency))
  );
};

export const normalizeReportItem = (item: any, index = 0): NormalizedReportItem => {
  if (!item || typeof item !== "object") {
    return {
      id: `doc-${index}`,
      fileName: `Document ${index + 1}`,
      documentType: "MEDICAL_DOCUMENT",
    };
  }

  const id = String(
    item.id || item._id || item.fileKey || item.s3Key || item.jobId || `report-${index}`
  );

  const rawFileName =
    item.fileName ||
    item.name ||
    item.displayName ||
    item.originalName ||
    (typeof item.s3Key === "string" && !item.s3Key.startsWith("doc_") ? item.s3Key : null) ||
    `Document ${index + 1}`;

  const fileName = String(rawFileName).trim();

  const rawDocType =
    item.documentType ||
    item.type ||
    item.category ||
    item.docType ||
    "MEDICAL_DOCUMENT";

  const documentType = String(rawDocType).toUpperCase().trim();

  const fileType = item.fileType || item.mimeType || undefined;
  const reportDate = item.reportDate || item.date || item.createdAt || undefined;
  const ocrStatus = item.ocrStatus || item.status || undefined;
  const s3Key = item.s3Key || item.fileKey || undefined;
  const fileUrl = item.fileUrl || item.url || item.imageUri || undefined;
  const imageUri = item.imageUri || item.fileUrl || item.url || undefined;
  const summary = item.summary || item.documentSummary || undefined;

  return {
    id,
    fileName,
    documentType,
    fileType,
    reportDate,
    ocrStatus,
    s3Key,
    fileUrl,
    imageUri,
    summary,
    raw: item,
  };
};

export const parseReportListMessage = (
  content: any,
  metadata?: any
): ParsedReportListResult => {
  const metaTask = metadata?.task || metadata?.action || metadata?.actionType;
  const metaMode = metadata?.mode;

  const isExplicitReportTask =
    metaTask === "REPORT_LIST" ||
    metaTask === "DOCUMENT_LIST" ||
    metaTask === "LIST_REPORTS" ||
    metaTask === "LIST_DOCUMENTS" ||
    metadata?.task === "REPORT_LIST" ||
    metadata?.task === "DOCUMENT_LIST" ||
    metaMode === "REPORT_LIST" ||
    metaMode === "DOCUMENT_LIST";

  const isExplicitMedTask =
    metaTask === "MEDICATION_LIST" ||
    metaTask === "LIST_MEDICINES" ||
    metadata?.task === "MEDICATION_LIST";

  if (isExplicitMedTask) {
    return {
      isReportList: false,
      items: [],
    };
  }

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

  // Also inspect metadata / response payload if content didn't contain reply
  const candidatePayload =
    parsedBody?.reply ||
    parsedBody?.responseBody?.reply ||
    metadata?.reply ||
    parsedBody ||
    {};

  const rawItems =
    candidatePayload.items ||
    candidatePayload.reports ||
    candidatePayload.documents ||
    parsedBody?.items ||
    parsedBody?.reports ||
    parsedBody?.documents ||
    metadata?.reports ||
    metadata?.documents ||
    [];

  if (Array.isArray(rawItems)) {
    const hasDocItems = rawItems.some(isDocumentOrReportItem);
    const hasMedItems = rawItems.some(isMedicationItem);

    const rawText =
      typeof candidatePayload.text === "string"
        ? candidatePayload.text
        : typeof candidatePayload.formattedText === "string"
        ? candidatePayload.formattedText
        : typeof candidatePayload.message === "string"
        ? candidatePayload.message
        : typeof parsedBody?.text === "string"
        ? parsedBody.text
        : undefined;

    const textMentionsDocuments =
      typeof rawText === "string" &&
      (rawText.toLowerCase().includes("document") ||
        rawText.toLowerCase().includes("report") ||
        rawText.toLowerCase().includes("discharge summary") ||
        rawText.toLowerCase().includes("lab report"));

    if (
      isExplicitReportTask ||
      (rawItems.length > 0 && hasDocItems && !hasMedItems) ||
      (rawItems.length > 0 && textMentionsDocuments && !hasMedItems)
    ) {
      const items = rawItems.map((item, idx) => normalizeReportItem(item, idx));
      const pagination =
        candidatePayload.pagination || parsedBody?.pagination || metadata?.pagination || undefined;

      return {
        isReportList: true,
        items,
        pagination,
        rawText,
      };
    }
  }

  return {
    isReportList: false,
    items: [],
  };
};
