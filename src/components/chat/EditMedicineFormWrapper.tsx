import React, { useEffect, useState, useMemo } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import {
  MedicationFormFields,
  useMedicationFormState,
} from "../shared/MedicationFormFields";
import { ExtractedMedicine } from "../../types/medicationReview";

interface EditMedicineFormWrapperProps {
  medicine: ExtractedMedicine;
  preferredLang: string;
  isDark: boolean;
  theme: any;
  onClose: () => void;
  onSave: (updated: ExtractedMedicine) => void;
}

export const EditMedicineFormWrapper = ({
  medicine,
  preferredLang,
  isDark,
  theme,
  onClose,
  onSave,
}: EditMedicineFormWrapperProps) => {
  const initialData = useMemo(() => {
    return {
      id: medicine.id,
      medicationName: medicine.name,
      medicationType: medicine.medicineType || "TABLET",
      dose: {
        count: parseFloat(medicine.dosage || "1") || 1,
        value: parseFloat(medicine.dosage || "1") || 1,
        unit: medicine.dosageUnit || "tablet",
      },
      frequency: medicine.frequency || "ONCE",
      notes: medicine.notes || "",
      prescribed_by: medicine.prescribedBy || "",
      refill_alert: medicine.refillAlert || false,
      total_quantity: medicine.totalQuantity || 10,
      foodContext: medicine.foodFrequency || medicine.timing || "AFTER_FOOD",
      startDate: medicine.startDate || new Date().toISOString().split("T")[0],
      medicationSchedule: medicine.medicationSchedule || ["08:00"],
    };
  }, [medicine]);

  const formState = useMedicationFormState(initialData, preferredLang);
  const {
    formName,
    formType,
    formFreq,
    formNotes,
    formPrescribed,
    formRefill,
    formQty,
    formFoodFreq,
    startDate,
    formCount,
    formVal,
    formUnit,
    selectedSlots,
  } = formState;

  const [localErrors, setLocalErrors] = useState<string[]>([]);

  useEffect(() => {
    if (localErrors.length > 0) {
      setLocalErrors([]);
    }
  }, [
    formName,
    formType,
    formFreq,
    formNotes,
    formPrescribed,
    formRefill,
    formQty,
    formFoodFreq,
    startDate,
    formCount,
    formVal,
    formUnit,
    selectedSlots,
  ]);

  const handleSave = () => {
    const errors: string[] = [];
    if (!formName.trim()) {
      errors.push("Name is required");
    }
    const N = formFreq === "ONCE" ? 1 : formFreq === "TWICE" ? 2 : 3;
    if (selectedSlots.length !== N) {
      errors.push(`Please select exactly ${N} reminder times`);
    }
    const parsedQty = parseInt(formQty.trim(), 10);
    if (!formQty.trim() || isNaN(parsedQty) || parsedQty <= 0) {
      errors.push("Total Quantity is required");
    }

    if (errors.length > 0) {
      setLocalErrors(errors);
      return;
    }

    onSave({
      ...medicine,
      name: formName.trim(),
      medicineType: formType,
      dosage: formType === "TABLET" || formType === "CAPSULE" ? String(formCount) : String(formVal),
      dosageUnit: formType === "TABLET" || formType === "CAPSULE" ? (formType === "TABLET" ? "tablet" : "capsule") : formUnit,
      frequency: formFreq,
      foodFrequency: formFoodFreq,
      timing: formFoodFreq === "BEFORE_FOOD" ? "Before Food" : "After Food",
      prescribedBy: formPrescribed.trim(),
      totalQuantity: parsedQty,
      notes: formNotes.trim(),
      refillAlert: formRefill,
      refillAlertEnabled: formRefill,
      medicationSchedule: selectedSlots,
      startDate: startDate ? (startDate instanceof Date ? startDate.toISOString().split("T")[0] : startDate) : new Date().toISOString().split("T")[0],
    });
  };

  return (
    <View style={{ padding: 16 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Text style={{ fontSize: 18, fontWeight: '800', color: isDark ? '#f8fafc' : '#1e293b' }}>Edit Medicine</Text>
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="close" size={24} color={isDark ? "#cbd5e1" : "#475569"} />
        </TouchableOpacity>
      </View>
      <BottomSheetScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} style={{ maxHeight: 350 }}>
        <MedicationFormFields formState={formState} isDark={isDark} theme={theme} preferredLang={preferredLang} />
        {localErrors.length > 0 && (
          <View style={{ marginTop: 8, marginBottom: 12 }}>
            {localErrors.map((err, idx) => (
              <Text key={idx} style={{ color: "#ef4444", fontSize: 12 }}>
                • {err}
              </Text>
            ))}
          </View>
        )}
      </BottomSheetScrollView>
      <TouchableOpacity
        onPress={handleSave}
        style={{
          backgroundColor: '#0f766e',
          borderRadius: 14,
          padding: 14,
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: 16,
        }}
      >
        <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 15 }}>Save Changes</Text>
      </TouchableOpacity>
    </View>
  );
};
