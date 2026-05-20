import apiClient from "./apiClient";
import { DOCUMENT_ENDPOINTS } from "../constants/endpoints";
import type {
  MedicalDocument,
  PaginatedDocumentRequest,
  ApiResponse,
  FilterDocumentsRequest,
} from "../types";

export const documentUpload = async (formData: FormData): Promise<ApiResponse<MedicalDocument>> => {
  const response = await apiClient.post(
    DOCUMENT_ENDPOINTS.ADD_DOCUMENT,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );
  return response.data;
};

export const filterDocuments = async (payload: FilterDocumentsRequest) => {
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
      sortBy: "documentType",
      orderBy: "desc",
    },
  }
  console.log(payload);
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
