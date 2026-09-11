import apiClient from "../apiClient";
import {
  addMedication,
  deleteMedication,
  listMedications,
  filterMedications,
  getMedicationsPaginated,
  updateMedication,
  refillMedicationService,
  checkMedicationDuplicate,
} from "../medicationservice";
import { updateReminderOccurrenceStatus } from "../reminderService";
import { MEDICATION_ENDPOINTS, MEDICATION_REMINDER_ENDPOINTS } from "../../constants/endpoints";

jest.mock("../apiClient");

describe("Medication & Reminder Services Unit Tests", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("medicationservice CRUD & Duplicate Check", () => {
    it("adds a new medication", async () => {
      const payload: any = {
        medicationName: "Paracetamol",
        dosage: "500mg",
        frequency: "DAILY",
      };
      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        data: { success: true, data: { ...payload, id: "med-1" } },
      });

      const res = await addMedication(payload);
      expect(apiClient.post).toHaveBeenCalledWith(
        MEDICATION_ENDPOINTS.ADD_MEDICATION,
        payload
      );
      expect(res.data).toHaveProperty("id", "med-1");
    });

    it("deletes a medication by replacing {id} in endpoint", async () => {
      (apiClient.delete as jest.Mock).mockResolvedValueOnce({
        data: { success: true },
      });

      await deleteMedication("med-123");
      const expectedEndpoint = MEDICATION_ENDPOINTS.DELETE_MEDICATION.replace("{id}", "med-123");
      expect(apiClient.delete).toHaveBeenCalledWith(expectedEndpoint);
    });

    it("lists all medications", async () => {
      const mockList = [{ id: "m1", medicationName: "Aspirin" }];
      (apiClient.get as jest.Mock).mockResolvedValueOnce({
        data: { success: true, data: mockList },
      });

      const res = await listMedications();
      expect(apiClient.get).toHaveBeenCalledWith(MEDICATION_ENDPOINTS.GET_MEDICATION);
      expect(res.data).toEqual(mockList);
    });

    it("filters and sorts medications", async () => {
      const filterPayload: any = { filter: { medicationType: "TABLET" } };
      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        data: { success: true, data: [] },
      });

      await filterMedications(filterPayload);
      expect(apiClient.post).toHaveBeenCalledWith(
        MEDICATION_ENDPOINTS.FILTER_AND_SORT,
        filterPayload
      );
    });

    it("requests paginated medications with correct parameters", async () => {
      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        data: { success: true, data: [] },
      });

      await getMedicationsPaginated({
        MedicationType: "Tablet",
        pageNumber: 2,
        pageLimit: 15,
      });

      expect(apiClient.post).toHaveBeenCalledWith(
        MEDICATION_ENDPOINTS.LIST_MEDICATION_PAGINATED,
        {
          filter: { medicationType: "TABLET" },
          sort: { sortBy: "medicationType", sortOrder: "desc" },
          page: { pageNumber: 2, pageLimit: 15 },
        }
      );
    });

    it("updates medication details", async () => {
      const updateData: any = { medicationName: "Ibuprofen 400mg" };
      (apiClient.put as jest.Mock).mockResolvedValueOnce({
        data: { success: true, data: updateData },
      });

      await updateMedication({ medicationId: "med-999", data: updateData });
      const expectedEndpoint = MEDICATION_ENDPOINTS.UPDATE_MEDICATION.replace("{id}", "med-999");
      expect(apiClient.put).toHaveBeenCalledWith(expectedEndpoint, updateData);
    });

    it("submits refill request for medication", async () => {
      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        data: { success: true, message: "Refill requested" },
      });

      await refillMedicationService({ medicationId: "med-555", quantity: 30 });
      const expectedEndpoint = MEDICATION_ENDPOINTS.REFILL_MEDICATION.replace("{id}", "med-555");
      expect(apiClient.post).toHaveBeenCalledWith(expectedEndpoint, { quantity: 30 });
    });

    it("checks for medication duplicates", async () => {
      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        data: { success: true, isDuplicate: true, matches: [{ name: "Paracetamol" }] },
      });

      const res = await checkMedicationDuplicate({
        medicationName: "Paracetamol",
        medicationType: "TABLET",
      });

      expect(apiClient.post).toHaveBeenCalledWith(MEDICATION_ENDPOINTS.CHECK_DUPLICATE, {
        medicationName: "Paracetamol",
        medicationType: "TABLET",
      });
      expect((res as any).isDuplicate).toBe(true);
    });
  });

  describe("reminderService Status Updates", () => {
    it("updates occurrence status to TAKEN", async () => {
      (apiClient.patch as jest.Mock).mockResolvedValueOnce({
        data: { success: true, message: "Marked as TAKEN" },
      });

      await updateReminderOccurrenceStatus({
        occurrenceId: "occ-101",
        status: "TAKEN",
      });

      const expectedEndpoint = MEDICATION_REMINDER_ENDPOINTS.UPDATE_REMINDER_OCCURRENCE_STATUS.replace(
        "{id}",
        "occ-101"
      );
      expect(apiClient.patch).toHaveBeenCalledWith(expectedEndpoint, { status: "TAKEN" });
    });

    it("updates occurrence status to SKIPPED", async () => {
      (apiClient.patch as jest.Mock).mockResolvedValueOnce({
        data: { success: true, message: "Marked as SKIPPED" },
      });

      await updateReminderOccurrenceStatus({
        occurrenceId: "occ-102",
        status: "SKIPPED",
      });

      const expectedEndpoint = MEDICATION_REMINDER_ENDPOINTS.UPDATE_REMINDER_OCCURRENCE_STATUS.replace(
        "{id}",
        "occ-102"
      );
      expect(apiClient.patch).toHaveBeenCalledWith(expectedEndpoint, { status: "SKIPPED" });
    });
  });
});
