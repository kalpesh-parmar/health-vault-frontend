import apiClient from "./apiClient";
import { MEDICATION_ENDPOINTS } from "../constants/endpoints";
import { AddOrEditMedication, ApiResponse } from "../types";

export const addMedication = async (data: AddOrEditMedication): Promise<ApiResponse<AddOrEditMedication>> => {
  const response = await apiClient.post(
    MEDICATION_ENDPOINTS.ADD_MEDICATION,
    data,
  );
  return response.data;
};

export const deleteMedication = async (id: string): Promise<ApiResponse<void>> => {
  const endpoint = MEDICATION_ENDPOINTS.DELETE_MEDICATION.replace("{id}", id);
  const response = await apiClient.delete(endpoint);
  return response.data;
};

export const getMedicationsPaginated = async ({
  MedicationType,
  pageNumber = 1,
  pageLimit = 10,
}: {
  MedicationType: string;
  pageNumber?: number;
  pageLimit?: number;
}): Promise<ApiResponse<AddOrEditMedication[]>> => {
  const response = await apiClient.post(
    MEDICATION_ENDPOINTS.LIST_MEDICATION_PAGINATED,
    {
      filter: {
        medicationType: MedicationType === "All" ? "" : MedicationType.toUpperCase(),
      },
      sort: {
        sortBy: "medicationType",
        orderBy: "desc",
      },
      page: {
        pageNumber,
        pageLimit,
      },
    },
  );
  return response.data;
};

export const updateMedication = async ({
  medicationId,
  data,
}: {
  medicationId: string;
  data: AddOrEditMedication;
}): Promise<ApiResponse<AddOrEditMedication>> => {
  const endpoint = MEDICATION_ENDPOINTS.UPDATE_MEDICATION.replace(
    "{id}",
    medicationId,
  );
  const response = await apiClient.put(endpoint, data);
  return response.data;
};
