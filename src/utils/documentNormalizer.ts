export interface DocumentSummaryItem {
  id: string;
  fileKey?: string;
  jobId?: string;
  name?: string;
  fileName?: string;
  originalName?: string;
  displayName?: string;
  status?: string;
  stage?: string;
  stageStatus?: string;
  currentStep?: string;
  reason?: string | null;
  error?: string | null;
  errorCode?: string | null;
  retryable?: boolean;
  medicineCount?: number;
  medicinesCount?: number;
  progress?: number;
  percentage?: number;
  batchId?: string;
  extractedStructuredData?: any;
}

export interface DocumentSummaryStats {
  failed?: number;
  rejected?: number;
  completed?: number;
  totalUploads?: number;
  [key: string]: any;
}

/**
 * Cleanly formats a document title or filename.
 */
export const cleanDocumentName = (rawName?: string, defaultFallback = "Document"): string => {
  if (!rawName || typeof rawName !== "string") return defaultFallback;
  try {
    return decodeURIComponent(rawName).replace(/%20/g, " ").trim() || defaultFallback;
  } catch {
    return rawName.replace(/%20/g, " ").trim() || defaultFallback;
  }
};

/**
 * Normalizes an arbitrary document object into a standard DocumentSummaryItem.
 */
export const normalizeSingleDocument = (doc: any, index = 0): DocumentSummaryItem => {
  if (!doc) {
    return {
      id: `doc-${index}`,
      fileName: `Document ${index + 1}`,
      name: `Document ${index + 1}`,
      status: "COMPLETED",
    };
  }

  if (typeof doc === "string") {
    const cleaned = cleanDocumentName(doc, `Document ${index + 1}`);
    return {
      id: doc,
      fileKey: doc,
      jobId: doc,
      fileName: cleaned,
      name: cleaned,
      status: "COMPLETED",
      retryable: true,
    };
  }

  const id = doc.id || doc.fileKey || doc.s3Key || doc.jobId || `doc-${index}`;
  const fileKey = doc.fileKey || doc.s3Key || doc.id || doc.jobId || `file-${index}`;
  const jobId = doc.jobId || doc.id || doc.fileKey;

  const rawFileName =
    doc.fileName ||
    doc.displayName ||
    doc.name ||
    doc.originalName ||
    (typeof doc.s3Key === "string" && !doc.s3Key.startsWith("doc_") ? doc.s3Key : null) ||
    `Document ${index + 1}`;

  const fileName = cleanDocumentName(rawFileName, `Document ${index + 1}`);

  const rawStatus = String(doc.status || doc.stage || doc.stageStatus || "").toUpperCase();
  let status = "COMPLETED";
  if (
    rawStatus.includes("REJECT") ||
    doc.errorCode === "NON_MEDICAL_DOCUMENT" ||
    (typeof doc.reason === "string" && doc.reason.toLowerCase().includes("reject"))
  ) {
    status = "REJECTED";
  } else if (rawStatus.includes("FAIL") || rawStatus.includes("ERROR") || doc.error) {
    status = "FAILED";
  } else if (rawStatus.includes("QUEUE") || rawStatus.includes("PENDING")) {
    status = "QUEUED";
  } else if (rawStatus.includes("PROGRESS") || rawStatus.includes("RUNNING") || rawStatus.includes("EXTRACT") || rawStatus.includes("ANALYZE")) {
    status = "RUNNING";
  } else if (rawStatus.includes("COMPLETE") || rawStatus.includes("SUCCESS") || rawStatus.includes("DONE")) {
    status = "COMPLETED";
  }

  const meds =
    doc.extractedStructuredData?.medications ||
    doc.extractedStructuredData?.medicines ||
    doc.medications ||
    doc.medicines;

  const medicineCount =
    typeof doc.medicineCount === "number"
      ? doc.medicineCount
      : typeof doc.medicinesCount === "number"
        ? doc.medicinesCount
        : Array.isArray(meds)
          ? meds.length
          : undefined;

  const isNonRetryable =
    doc.retryable === false ||
    doc.errorCode === "NON_MEDICAL_DOCUMENT" ||
    doc.errorCode === "NON_RETRYABLE" ||
    doc.errorCode === "INVALID_REQUEST" ||
    (typeof doc.reason === "string" &&
      (doc.reason.toLowerCase().includes("non-retryable") ||
        doc.reason.toLowerCase().includes("cannot be retried")));

  const retryable = (status === "FAILED" || status === "REJECTED") ? !isNonRetryable : (doc.retryable !== false);

  const reason =
    doc.reason ||
    doc.error ||
    doc.errorMessage ||
    (status === "REJECTED" ? "The uploaded file is not a medical document." : null);

  return {
    ...doc,
    id,
    fileKey,
    jobId,
    fileName,
    name: fileName,
    displayName: fileName,
    status,
    stage: doc.stage || status,
    stageStatus: doc.stageStatus || status,
    currentStep: doc.currentStep || (status === "RUNNING" ? "Processing..." : undefined),
    reason,
    error: doc.error || null,
    errorCode: doc.errorCode || null,
    retryable,
    medicineCount,
    medicinesCount: medicineCount,
    progress: typeof doc.progress === "number" ? doc.progress : (status === "COMPLETED" ? 100 : (status === "FAILED" ? -1 : undefined)),
    percentage: typeof doc.percentage === "number" ? doc.percentage : (status === "COMPLETED" ? 100 : (status === "FAILED" ? -1 : undefined)),
    batchId: doc.batchId,
    extractedStructuredData: doc.extractedStructuredData,
  };
};

/**
 * Normalizes document collections from various backend/metadata formats.
 */
export const normalizeDocumentsList = (
  metaOrPayload: any,
  fallbackUploads: any[] = [],
  fallbackFilesInfo: any[] = [],
  documentsList: any[] = [],
): DocumentSummaryItem[] => {
  if (!metaOrPayload) {
    if (fallbackUploads && fallbackUploads.length > 0) {
      return fallbackUploads.map((d, i) => normalizeSingleDocument(d, i));
    }
    if (fallbackFilesInfo && fallbackFilesInfo.length > 0) {
      return fallbackFilesInfo.map((f, i) =>
        normalizeSingleDocument(
          {
            id: f.jobId || f.fileKey || `file-${i}`,
            fileName: f.fileName,
            name: f.fileName,
            fileKey: f.fileKey,
            jobId: f.jobId,
            status: "COMPLETED",
          },
          i,
        ),
      );
    }
    return [];
  }

  // 1. Direct array passed as metaOrPayload
  if (Array.isArray(metaOrPayload)) {
    const flat = metaOrPayload.flat(Infinity).filter(Boolean);
    if (flat.length > 0) {
      return flat.map((doc: any, idx: number) => normalizeSingleDocument(doc, idx));
    }
  }

  // 2. Check meta.documents
  if (metaOrPayload.documents) {
    if (Array.isArray(metaOrPayload.documents)) {
      const flat = metaOrPayload.documents.flat(Infinity).filter(Boolean);
      if (flat.length > 0) {
        return flat.map((doc: any, idx: number) => normalizeSingleDocument(doc, idx));
      }
    } else if (typeof metaOrPayload.documents === "object") {
      return [normalizeSingleDocument(metaOrPayload.documents, 0)];
    }
  }

  // 3. Check meta.document (Can be an Array or a single Object!)
  if (metaOrPayload.document) {
    if (Array.isArray(metaOrPayload.document)) {
      const flat = metaOrPayload.document.flat(Infinity).filter(Boolean);
      if (flat.length > 0) {
        return flat.map((doc: any, idx: number) => normalizeSingleDocument(doc, idx));
      }
    } else if (typeof metaOrPayload.document === "object" && Object.keys(metaOrPayload.document).length > 0) {
      return [normalizeSingleDocument(metaOrPayload.document, 0)];
    }
  }

  // 4. Check documentsName / documentsNames (Array of string filenames)
  const rawDocsName: string[] = Array.isArray(metaOrPayload.documentsName)
    ? metaOrPayload.documentsName
    : Array.isArray(metaOrPayload.documentsNames)
      ? metaOrPayload.documentsNames
      : [];

  if (rawDocsName.length > 0) {
    const docSummary = metaOrPayload.documentSummary;
    const failedCount = docSummary?.failed || 0;
    const rejectedCount = docSummary?.rejected || 0;

    return rawDocsName.map((nameOrKey: string, idx: number) => {
      const matched =
        documentsList.find(
          (d: any) =>
            d.id === nameOrKey ||
            d.s3Key === nameOrKey ||
            d.fileKey === nameOrKey ||
            d.fileName === nameOrKey ||
            d.name === nameOrKey,
        ) ||
        fallbackUploads.find(
          (u: any) =>
            u.jobId === nameOrKey ||
            u.fileKey === nameOrKey ||
            u.id === nameOrKey ||
            u.name === nameOrKey ||
            u.fileName === nameOrKey,
        ) ||
        fallbackFilesInfo.find(
          (f: any) =>
            f.jobId === nameOrKey ||
            f.fileKey === nameOrKey ||
            f.fileName === nameOrKey,
        );

      let docStatus = matched?.status || "COMPLETED";
      if (docSummary) {
        if (idx < rejectedCount) {
          docStatus = "REJECTED";
        } else if (idx < rejectedCount + failedCount) {
          docStatus = "FAILED";
        }
      }

      const docObj = matched
        ? {
            ...matched,
            status: docStatus,
          }
        : {
            id: nameOrKey,
            fileKey: nameOrKey,
            fileName: nameOrKey,
            name: nameOrKey,
            status: docStatus,
            retryable: docStatus === "FAILED" || docStatus === "REJECTED",
          };

      return normalizeSingleDocument(docObj, idx);
    });
  }

  // 5. Check documentIds / documentId
  const rawDocIds = Array.isArray(metaOrPayload.documentIds)
    ? metaOrPayload.documentIds
    : metaOrPayload.documentId
      ? (Array.isArray(metaOrPayload.documentId) ? metaOrPayload.documentId : [metaOrPayload.documentId])
      : [];

  if (rawDocIds.length > 0 && documentsList.length > 0) {
    const resolved = rawDocIds
      .map((id: string, idx: number) => {
        const found = documentsList.find((d: any) => d.id === id || d.s3Key === id || d.fileKey === id);
        return found ? normalizeSingleDocument(found, idx) : null;
      })
      .filter(Boolean) as DocumentSummaryItem[];

    if (resolved.length > 0) {
      return resolved;
    }
  }

  // 6. Fallbacks
  if (fallbackUploads && fallbackUploads.length > 0) {
    return fallbackUploads.map((d, i) => normalizeSingleDocument(d, i));
  }

  if (fallbackFilesInfo && fallbackFilesInfo.length > 0) {
    return fallbackFilesInfo.map((f, i) =>
      normalizeSingleDocument(
        {
          id: f.jobId || f.fileKey || `file-${i}`,
          fileName: f.fileName,
          name: f.fileName,
          fileKey: f.fileKey,
          jobId: f.jobId,
          status: "COMPLETED",
        },
        i,
      ),
    );
  }

  return [];
};

/**
 * Extracts all medication objects from a list of normalized documents or raw extractedStructuredData
 */
export const extractMedicationsFromDocuments = (docs: any[]): any[] => {
  if (!Array.isArray(docs)) return [];
  const meds: any[] = [];
  docs.forEach((doc, docIdx) => {
    const list =
      doc?.extractedStructuredData?.medications ||
      doc?.extractedStructuredData?.medicines ||
      doc?.medications ||
      doc?.medicines ||
      doc?.medicationFindings ||
      doc?.keyFindings;

    if (Array.isArray(list)) {
      list.forEach((m: any, mIdx: number) => {
        if (!m || typeof m !== "object") return;
        meds.push({
          id: m.id || m.client_med_id || `doc-${docIdx}-med-${mIdx}`,
          name: m.name || m.medicationName || m.medicineName || "Unknown",
          type: m.type || m.medicationType || "tablet",
          dosage: m.dosage || m.dose || m.dosagePerIntake || "1",
          duration: m.duration || "Ongoing",
          frequency: m.frequency || m.schedule || "",
          timing: m.timing || m.timeOfDay || "",
          instructions: m.instructions || m.foodContext || "",
          foodContext: m.foodContext || m.instructions || "",
          prescribedBy: m.prescribedBy || doc.doctorName || "",
          selected: m.selected !== undefined ? m.selected : true,
          ...m,
        });
      });
    }
  });
  return meds;
};
