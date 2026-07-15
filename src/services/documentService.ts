import apiClient from "./apiClient";
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
  documentId?: string;
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

export const documentUpload = async (
  formData: FormData,
): Promise<ApiResponse<UploadResponse>> => {
  const response = await apiClient.post(FILE_ENDPOINTS.UPLOAD, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
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

export const filterDocuments = async (payload: FilterDocumentsRequest) => {
  const response = await apiClient.post(
    DOCUMENT_ENDPOINTS.FILTER_AND_SORT,
    payload,
  );
  return response.data;
};

export const listDocument = async (): Promise<
  ApiResponse<MedicalDocument[]>
> => {
  const response = await apiClient.get(DOCUMENT_ENDPOINTS.LIST_DOCUMENT);
  return response.data;
};

export const documentListPaginated = async ({
  activeCategory,
  page,
  pageLimit,
}: PaginatedDocumentRequest) => {
  const payload = {
    filter: {
      search: activeCategory === "All" ? "" : activeCategory,
    },
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

  const response = await apiClient.put(endpoint, {
    title: document.fileName,
    notes: document.notes,
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
