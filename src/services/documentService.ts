import apiClient from "./apiClient";
import { DOCUMENT_ENDPOINTS } from "../constants/endpoints";
import type {
  MedicalDocument,
  PaginatedDocumentRequest,
  ApiResponse,
  FilterDocumentsRequest,
  UploadDocumentResponse,
  RunOcrResponse,
  OcrProgressResponse,
  AddDocumentPayload,
  AddDocumentResponse,
} from "../types";

export const uploadDocument = async (
  uri: string,
): Promise<ApiResponse<UploadDocumentResponse>> => {
  const formData = new FormData();
  
  const file = uri.split("/").pop();
  const extension = file?.split(".").pop() || "jpg";

  formData.append("file", {
    uri,
    name: file || `upload.${extension}`,
    type: extension === "pdf" ? "application/pdf" : `image/${extension}`,
  } as any);

  const response = await apiClient.post(DOCUMENT_ENDPOINTS.UPLOAD_DOCUMENT, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  
  return response.data;
};

export const runOcr = async (fileKey: string, documentType: string): Promise<ApiResponse<RunOcrResponse>> => {
  const response = await apiClient.post(DOCUMENT_ENDPOINTS.RUN_OCR, {
    fileKey,
    documentType,
  });
  return response.data;
};

export const getOcrProgress = async (fileKey: string): Promise<ApiResponse<OcrProgressResponse>> => {
  const endpoint = DOCUMENT_ENDPOINTS.OCR_PROGRESS.replace("{fileKey}", encodeURIComponent(fileKey));
  const response = await apiClient.get(endpoint);
  return response.data;
};

export const documentUpload = async (payload: AddDocumentPayload): Promise<ApiResponse<AddDocumentResponse>> => {
  const response = await apiClient.post(
    DOCUMENT_ENDPOINTS.ADD_DOCUMENT,
    payload
  );
  return response.data;
};

// Payload :- {"filter": {"search": "family"}, "sort": {"orderBy": "asc", "sortBy": "createdAt"}}

export const filterDocuments = async (payload: FilterDocumentsRequest) => {
  console.log("Filtration payload :- ", payload);
  const response = await apiClient.post(DOCUMENT_ENDPOINTS.FILTER_AND_SORT, payload);
  console.log("Filtered Documents :- ", response.data);
  return response.data;
}

export const listDocument = async (): Promise<ApiResponse<MedicalDocument[]>> => {
  const response = await apiClient.get(DOCUMENT_ENDPOINTS.LIST_DOCUMENT);
  return response.data;
};

export const documentListPaginated = async ({
  activeCategory,
  page,
  pageLimit,
}: PaginatedDocumentRequest) => {
  console.log('activeCategory', activeCategory)
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
  }
  console.log("Type Filtration Payload :- ", payload);
  const response = await apiClient.post(
    DOCUMENT_ENDPOINTS.DOCUMENT_LIST_PAGINATED, payload);
  return response.data;
};

export const updateDocument = async (document: Partial<MedicalDocument>): Promise<ApiResponse<void>> => {
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

export const deleteDocument = async (documentId: string): Promise<ApiResponse<void>> => {
  const endpoint = DOCUMENT_ENDPOINTS.DELETE_DOCUMENT.replace(
    "{id}",
    documentId,
  );

  const response = await apiClient.delete(endpoint);
  return response.data;
};

export const getDocument = async (documentId: string): Promise<ApiResponse<MedicalDocument>> => {
  const endpoint = DOCUMENT_ENDPOINTS.GET_DOCUMENT.replace(
    "{id}",
    documentId,
  );

  const response = await apiClient.get(endpoint);
  return response.data;
};

export const getSignedUrl = async (fileKey: string): Promise<ApiResponse<{ downloadUrl: string }>> => {
  const response = await apiClient.get(DOCUMENT_ENDPOINTS.GET_SIGNED_URL, {
    params: {
      fileKey: fileKey,
    },
  });
  return response.data;
};
