import apiClient from "./apiClient";
import { DOCUMENT_ENDPOINTS } from "../constants/endpoints";
import type { MedicalDocument, PaginatedDocumentRequest } from "../types";

export const documentUpload = async (formData: FormData) => {
  const response = await apiClient.post(
    DOCUMENT_ENDPOINTS.ADD_DOCUMENT,
    formData,
    {
      headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
};

export const listDocument = async () => {
  const response = await apiClient.get(DOCUMENT_ENDPOINTS.LIST_DOCUMENT);
  return response.data;
};

export const documentListPaginated = async ({
  activeCategory,
  page,
  pageLimit,
}: PaginatedDocumentRequest) => {
  const response = await apiClient.post(
    DOCUMENT_ENDPOINTS.DOCUMENT_LIST_PAGINATED,
    {
      filter: {
        search: activeCategory,
      },
      page: {
        pageNumber: page,
        pageLimit: pageLimit,
      },
      sort: {
        sortBy: "documentType",
        orderBy: "desc",
      },
    },
  );
  return response.data;
};

export const updateDocument = async (document: Partial<MedicalDocument>) => {
  const endpoint = DOCUMENT_ENDPOINTS.UPDATE_DOCUMENT.replace(
    "{id}",
    document?.id || "",
  );

  await apiClient.put(endpoint, {
    title: document.fileName,
    notes: document.notes,
  });
};

export const deleteDocument = async (documentId: string) => {
  const endpoint = DOCUMENT_ENDPOINTS.DELETE_DOCUMENT.replace(
    "{id}",
    documentId,
  );

  const response = await apiClient.delete(endpoint);
  return response.data;
};

export const getDocument = async (documentId: string) => {
  const endpoint = DOCUMENT_ENDPOINTS.GET_DOCUMENT.replace(
    "{id}",
    documentId,
  );

  const response = await apiClient.get(endpoint);
  return response.data;
};

export const getSignedUrl = async (fileKey: string) => {
  const response = await apiClient.get(DOCUMENT_ENDPOINTS.GET_SIGNED_URL, {
    params: {
      fileKey: fileKey,
    },
  });
  return response.data;
};
