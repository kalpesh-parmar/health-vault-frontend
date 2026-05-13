import apiClient from "./apiClient";
import { MEDICATION_ENDPOINTS } from "../constants/endpoints";
import { AddOrEditMedication } from "../types";

export const addMedication = async (data: AddOrEditMedication) => {
  try {
    const response = await apiClient.post(
      MEDICATION_ENDPOINTS.ADD_MEDICATION,
      data,
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const deleteMedication = async (id: string) => {
  const endpoint = MEDICATION_ENDPOINTS.DELETE_MEDICATION.replace("{id}", id);
  try {
    const response = await apiClient.delete(endpoint);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getAllMedications = async () => {
  try {
    const response = await apiClient.get(
      MEDICATION_ENDPOINTS.LIST_ALL_MEDICATIONS,
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getMedications = async (upperMedicationType: string) => {
  try {
    const response = await apiClient.post(
      MEDICATION_ENDPOINTS.LIST_MEDICATION_PAGINATED,
      {
        filter: {
          medicationType: upperMedicationType.toUpperCase(),
        },
        sort: {
          sortBy: "medicationType",
          orderBy: "desc",
        },
        page: {
          pageNumber: 1,
          pageLimit: 10,
        },
      },
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const updateMedication = async ({
  medicationId,
  data,
}: {
  medicationId: string;
  data: AddOrEditMedication;
}) => {
  const endpoint = MEDICATION_ENDPOINTS.UPDATE_MEDICATION.replace(
    "{id}",
    medicationId,
  );
  console.log(endpoint);
  try {
    const response = await apiClient.put(endpoint, data);
    return response.data;
  } catch (error) {
    throw error;
  }
};
