import apiClient from "./apiClient";
import { MEDICATION_ENDPOINTS } from "../constants/endpoints";
import { AddOrEditMedication, ApiResponse, FilterMedicationsRequest } from "../types";

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

export const listMedications = async (): Promise<ApiResponse<AddOrEditMedication[]>> => {
  const response = await apiClient.get(MEDICATION_ENDPOINTS.GET_MEDICATION);
  return response.data;
};

export const filterMedications = async (payload: FilterMedicationsRequest) => {
  const response = await apiClient.post(MEDICATION_ENDPOINTS.FILTER_AND_SORT, payload);
  return response.data;
}

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
        sortOrder: "desc",
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
  console.log("Medication Updation Payload :- ", data);
  const response = await apiClient.put(endpoint, data);
  return response.data;
};

export const refillMedicationService = async ({
  medicationId,
  quantity,
}: {
  medicationId: string;
  quantity: number;
}): Promise<ApiResponse<any>> => {
  const endpoint = MEDICATION_ENDPOINTS.REFILL_MEDICATION.replace(
    "{id}",
    medicationId,
  );
  const response = await apiClient.post(endpoint, { quantity });
  return response.data;
};

export const checkMedicationDuplicate = async (payload: {
  medicationName: string;
  medicationType: string;
}): Promise<ApiResponse<any>> => {
  const response = await apiClient.post(
    MEDICATION_ENDPOINTS.CHECK_DUPLICATE,
    payload
  );
  return response.data;
};
