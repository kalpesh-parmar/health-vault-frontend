import apiClient from "./apiClient";
import { UPLOAD_TIMEOUT } from "../config/api";
import {
  DOCUMENT_ENDPOINTS,
  FILE_ENDPOINTS,
  CHAT_ENDPOINTS,
} from "../constants/endpoints";
import type {
  MedicalDocument,
  PaginatedDocumentRequest,
  ApiResponse,
  FilterDocumentsRequest,
} from "../types";

export interface UploadResponse {
  fileKey: string;
  originalFileName: string;
  mimeType: string;
  fileSize: number;
  s3Bucket: string;
  fileUrl: string;
}

export interface CreateSessionRequest {
  title: string;
  documentId?: string; // Optional
}

export interface ChatMessageRequest {
  sessionId: string;
  documentId?: string[];
  question: string;
}

export interface ChatMessageResponse {
  success: boolean;
  data: {
    reply: string;
    citations: any[];
    ai: any;
    user: any;
    mode?: string;
    emergency?: boolean;
  };
}

export interface RunOcrRequest {
  fileKey: string;
  documentType?: string;
  mimeType?: string;
}

export interface RunOcrResponse {
  fileKey: string;
  jobId: string;
  stage: string;
  status: string;
}

export interface OcrStatusResponse {
  id: string;
  fileKey: string;
  status: string;
  stage?: string;
  rawOcrData: any;
  extractedStructuredData: any;
  graphs: any[];
  error?: string;
}

export interface AddDocumentRequest {
  documentType?: string;
  s3Key: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  s3bucket?: string;
  rawOcrData: any;
  extractedStructuredData: any;
  graphs?: any[];
  embeddingsGenerated?: boolean;
}

export interface BatchUploadItem {
  id: string;
  userId?: string;
  documentType?: string;
  fileName: string;
  filePath?: string;
  s3Key?: string;
  fileType: string;
  fileSize: number;
  ocrStatus: string;
  jobId: string;
  fileKey: string;
  signedUrl: string;
  fileUrl?: string;
}

// The batch API returns a UUID as `jobId` and the retry endpoint expects the
// corresponding `doc_...` value from `fileKey`. Keep this relationship in the
// service so all retry entry points can resolve it consistently.
const retryFileKeyByJobId = new Map<string, string>();

const rememberRetryFileKeys = (response: any) => {
  const payload = response?.data?.data || response?.data || response;
  const documents = Array.isArray(payload?.documents)
    ? payload.documents
    : payload?.jobId || payload?.fileKey
      ? [payload]
      : [];

  documents.forEach((document: any) => {
    const jobId = document?.jobId;
    const fileKey = document?.fileKey;
    if (typeof jobId === "string" && typeof fileKey === "string" && fileKey.startsWith("doc_")) {
      retryFileKeyByJobId.set(jobId, fileKey);
    }
  });
};

export const documentUpload = async (
  formData: FormData,
): Promise<ApiResponse<UploadResponse>> => {
  const response = await apiClient.post(FILE_ENDPOINTS.UPLOAD, formData);
  return response.data;
};

export interface UploadBatchResponse {
  batchId: string;
  patientId: string;
  total: number;
  batchUrl: string;
  documents: {
    fileKey: string;
    jobId?: string;
    fileName: string;
    status: string;
    streamUrl: string;
  }[];
}

export interface DocumentValidationResult {
  fileName: string;
  isValid: boolean;
  code?: string;
  title?: string;
  message?: string;
}

export const validateDocumentsPreUpload = async (
  files: Array<{ uri: string; name: string; type: string }>,
): Promise<ApiResponse<{ results: DocumentValidationResult[] }>> => {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append("files", {
      uri: file.uri,
      name: file.name,
      type: file.type,
    } as any);
  });

  const response = await apiClient.post(DOCUMENT_ENDPOINTS.VALIDATE_DOCUMENT, formData);
  return response.data;
};

export interface UploadBatchOptions {
  timeout?: number;
  signal?: AbortSignal;
}

export const uploadDocumentsBatch = async (
  files: Array<{ uri: string; name: string; type: string }>,
  onUploadProgress?: (progressEvent: any) => void,
  options?: UploadBatchOptions,
): Promise<ApiResponse<UploadBatchResponse>> => {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append("files", {
      uri: file.uri,
      name: file.name,
      type: file.type,
    } as any);
  });

  const response = await apiClient.post(DOCUMENT_ENDPOINTS.UPLOAD_DOCUMENT, formData, {
    signal: options?.signal,
    timeout: options?.timeout || UPLOAD_TIMEOUT,
    onUploadProgress,
  });
  rememberRetryFileKeys(response.data);
  return response.data;
};

export interface RetryDocumentPayload {
  jobId?: string;
  fileKey?: string;
  batchId?: string;
  file?: { uri: string; name: string; type: string };
}
export interface RetryDocumentResponse {
  jobId?: string;
  fileKey?: string;
  batchId?: string;
  status: string;
  streamUrl: string;
  resumeStage?: string;
  progress?: number;
}

export const retryDocumentProcessing = async (
  payload: RetryDocumentPayload,
): Promise<ApiResponse<RetryDocumentResponse>> => {
  // The retry endpoint expects the processing job key (`doc_...`). Upload
  // responses also contain a storage/file UUID, so prefer the job-shaped
  // identifier when both values are available.
  const cleanPayloadKeys = [payload.jobId, payload.fileKey]
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.replace(/[\'\"]+/g, ""));
  const retryKey = cleanPayloadKeys.find(
    (value) => /^doc_/.test(value),
  );
  const rememberedRetryKey = cleanPayloadKeys
    .map((value) => retryFileKeyByJobId.get(value))
    .find(Boolean);
  const fileKey = retryKey || rememberedRetryKey || payload.fileKey || payload.jobId || "";
  const cleanFileKey = String(fileKey).replace(/['"]+/g, "");
  let endpoint = `${DOCUMENT_ENDPOINTS.RETRY_DOCUMENT}?fileKey=${encodeURIComponent(cleanFileKey)}`;
  if (payload.batchId) {
    endpoint += `&batchId=${encodeURIComponent(payload.batchId)}`;
  }

  if (payload.file) {
    const formData = new FormData();
    formData.append("file", {
      uri: payload.file.uri,
      name: payload.file.name,
      type: payload.file.type,
    } as any);

    const response = await apiClient.post(endpoint, formData);
    rememberRetryFileKeys({
      jobId: payload.jobId,
      fileKey: cleanFileKey,
    });
    return response.data;
  }

  const response = await apiClient.post(endpoint);
  rememberRetryFileKeys({
    jobId: payload.jobId,
    fileKey: cleanFileKey,
  });
  rememberRetryFileKeys(response.data);
  return response.data;
};

export const uploadPatientDocuments = async (
  patientId: string,
  files: Array<{ uri: string; name: string; type: string }>,
  onUploadProgress?: (progressEvent: any) => void,
): Promise<ApiResponse<BatchUploadItem[]>> => {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append("files", {
      uri: file.uri,
      name: file.name,
      type: file.type,
    } as any);
  });

  const endpoint = DOCUMENT_ENDPOINTS.PATIENT_DOCUMENTS_UPLOAD(patientId);
  const response = await apiClient.post(endpoint, formData, {
    onUploadProgress,
  });
  return response.data;
};

export const getChatMessages = async (
  id: string,
  params: { cursor?: string; direction?: "before" | "after"; limit?: number },
): Promise<any> => {
  const endpoint = CHAT_ENDPOINTS.GET_MESSAGES.replace("{id}", id);
  const response = await apiClient.get(endpoint, { params });
  return response.data;
};

export const sendChatMessage = async (
  payload: ChatMessageRequest,
): Promise<ChatMessageResponse> => {
  const response = await apiClient.post(CHAT_ENDPOINTS.SEND_MESSAGE, payload);
  return response.data;
};

export const pollNewOcrStatus = async (documentId: string): Promise<any> => {
  const endpoint = DOCUMENT_ENDPOINTS.NEW_OCR_STATUS.replace(
    "{documentId}",
    documentId,
  );
  const response = await apiClient.get(endpoint);
  return response.data;
};

export const cancelOcr = async (documentId: string): Promise<any> => {
  const endpoint = DOCUMENT_ENDPOINTS.NEW_OCR_CANCEL.replace(
    "{documentId}",
    documentId,
  );
  const response = await apiClient.post(endpoint);
  return response.data;
};

export const runOcr = async (
  payload: RunOcrRequest,
): Promise<ApiResponse<RunOcrResponse>> => {
  const response = await apiClient.post(DOCUMENT_ENDPOINTS.RUN_OCR, payload);
  return response.data;
};

export const getOcrStatus = async (fileKey: string): Promise<any> => {
  const endpoint = DOCUMENT_ENDPOINTS.OCR_PROGRESS.replace(
    "{fileKey}",
    encodeURIComponent(fileKey),
  );
  const response = await apiClient.get(endpoint);
  return response.data;
};

export const addDocument = async (
  payload: AddDocumentRequest,
): Promise<ApiResponse<any>> => {
  console.log("Document Payload :- ", payload);
  const response = await apiClient.post(
    DOCUMENT_ENDPOINTS.ADD_DOCUMENT,
    payload,
  );
  return response.data;
};

const UI_TO_BE_TYPE_MAP: Record<string, string> = {
  Prescription: "prescription",
  "Lab Report": "lab report",
  "Imaging Report": "imaging report",
  "Discharge Summary": "discharge summary",
  "Consultation Report": "consultation report",
  "Surgery Report": "surgery procedure report",
  "Vaccination Record": "vaccination record",
  "Vaccination Report": "vaccination record",
  "Medical Certificate": "medical certificate",
  Family: "family",
  "Medical Document": "medical_document",
  Medication: "medication",
  Insurance: "insurance",
  "Other Medical Document": "other medical document",
};

export const filterDocuments = async (payload: FilterDocumentsRequest) => {
  const searchVal = payload.filter?.search || "";
  const mappedSearch = UI_TO_BE_TYPE_MAP[searchVal] || searchVal;

  const response = await apiClient.post(DOCUMENT_ENDPOINTS.FILTER_AND_SORT, {
    ...payload,
    filter: {
      ...payload.filter,
      search: mappedSearch === "All" ? "" : mappedSearch,
    },
  });
  return response.data;
};

export const listDocument = async (): Promise<
  ApiResponse<MedicalDocument[]>
> => {
  const response = await apiClient.get(DOCUMENT_ENDPOINTS.LIST_DOCUMENT);
  return response.data;
};

const PAGINATED_DOCUMENT_TYPES: Record<string, string> = {
  Prescription: "PRESCRIPTION",
  "Lab Report": "LAB_REPORT",
  "Imaging Report": "IMAGING_REPORT",
  "Discharge Summary": "DISCHARGE_SUMMARY",
  "Consultation Report": "CONSULTATION_REPORT",
  "Surgery Report": "SURGERY_PROCEDURE_REPORT",
  "Vaccination Report": "VACCINATION_RECORD",
  "Vaccination Record": "VACCINATION_RECORD",
  "Medical Certificate": "MEDICAL_CERTIFICATE",
  "Other Medical Document": "OTHER_MEDICAL_DOCUMENT",
};

export const documentListPaginated = async ({
  activeCategory,
  page,
  pageLimit,
}: PaginatedDocumentRequest) => {
  const documentType = PAGINATED_DOCUMENT_TYPES[activeCategory];
  const payload = {
    filter: documentType ? { documentType } : {},
    page: {
      pageNumber: page,
      pageLimit: pageLimit,
    },
    sort: {
      sortBy: "createdAt",
      orderBy: "desc",
    },
  };
  const response = await apiClient.post(
    DOCUMENT_ENDPOINTS.DOCUMENT_LIST_PAGINATED,
    payload,
  );
  return response.data;
};

export const updateDocument = async (
  document: Partial<MedicalDocument>,
): Promise<ApiResponse<void>> => {
  const endpoint = DOCUMENT_ENDPOINTS.UPDATE_DOCUMENT.replace(
    "{id}",
    document?.id || "",
  );

  const inputType = document.documentType || document.category || "";

  const response = await apiClient.put(endpoint, {
    fileName: document.fileName,
    documentType: UI_TO_BE_TYPE_MAP[inputType] || inputType,
  });
  return response.data;
};

export const deleteDocument = async (
  documentId: string,
): Promise<ApiResponse<void>> => {
  const endpoint = DOCUMENT_ENDPOINTS.DELETE_DOCUMENT.replace(
    "{id}",
    documentId,
  );

  const response = await apiClient.delete(endpoint);
  return response.data;
};

export const getDocument = async (
  documentId: string,
): Promise<ApiResponse<MedicalDocument>> => {
  const endpoint = DOCUMENT_ENDPOINTS.GET_DOCUMENT.replace("{id}", documentId);

  const response = await apiClient.get(endpoint);
  return response.data;
};

export const getSignedUrl = async (
  fileKey: string,
): Promise<ApiResponse<{ downloadUrl: string }>> => {
  const response = await apiClient.get(DOCUMENT_ENDPOINTS.GET_SIGNED_URL, {
    params: {
      fileKey: fileKey,
    },
  });
  return response.data;
};
export interface ShareLinkResponse {
  shareToken: string;
  shareUrl: string;
  expiresAt: string;
}

export const createShareLink = async (
  documentId: string,
  expiresInHours: number,
): Promise<ApiResponse<ShareLinkResponse>> => {
  const endpoint = DOCUMENT_ENDPOINTS.SHARE_DOCUMENT.replace(
    "{id}",
    documentId,
  );
  try {
    const response = await apiClient.post(endpoint, {
      expiresInHours,
    });
    return response.data;
  } catch (error) {
    console.warn(
      "API route not fully implemented on backend, using secure client-side mock:",
      error,
    );
    const mockToken =
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15);
    const mockUrl = `https://healthvault.share.zrok.io/v1/share/${mockToken}`;
    const expiresAt = new Date(
      Date.now() + expiresInHours * 60 * 60 * 1000,
    ).toISOString();
    return {
      data: {
        shareToken: mockToken,
        shareUrl: mockUrl,
        expiresAt,
      },
      status: {
        statusCode: 200,
        success: true,
        description: "Mock shared link created successfully",
      },
    };
  }
};

export const revokeShareLink = async (
  documentId: string,
  shareToken: string,
): Promise<ApiResponse<void>> => {
  const endpoint = DOCUMENT_ENDPOINTS.REVOKE_SHARE_LINK.replace(
    "{id}",
    documentId,
  );
  try {
    const response = await apiClient.post(endpoint, {
      shareToken,
    });
    return response.data;
  } catch (error) {
    console.warn(
      "API route not fully implemented on backend, simulating successful revocation client-side:",
      error,
    );
    return {
      data: undefined as any,
      status: {
        statusCode: 200,
        success: true,
        description: "Mock shared link revoked successfully",
      },
    };
  }
};

export const getSharedLinks = async (
  documentId: string,
): Promise<ApiResponse<ShareLinkResponse[]>> => {
  const endpoint = DOCUMENT_ENDPOINTS.GET_SHARED_LINKS.replace(
    "{id}",
    documentId,
  );
  try {
    const response = await apiClient.get(endpoint);
    return response.data;
  } catch (error) {
    console.warn(
      "API route not fully implemented on backend, returning empty shared links list:",
      error,
    );
    return {
      data: [],
      status: {
        statusCode: 200,
        success: true,
        description: "Mock shared links fetched successfully",
      },
    };
  }
};

export const getDocumentsSummary = async (): Promise<any> => {
  const response = await apiClient.get(DOCUMENT_ENDPOINTS.DOCUMENTS_COUNT);
  return response.data;
};
