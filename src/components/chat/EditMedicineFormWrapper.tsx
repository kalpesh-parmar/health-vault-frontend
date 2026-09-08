import React, { useEffect, useState, useMemo } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import {
  MedicationFormFields,
  useMedicationFormState,
} from "../shared/MedicationFormFields";
import { ExtractedMedicine } from "../../types/medicationReview";
import { sanitizeMedicineForPayload } from "./widgets/MedicineHelpers";

interface EditMedicineFormWrapperProps {
  medicine: ExtractedMedicine;
  preferredLang: string;
  isDark: boolean;
  theme: any;
  onClose: () => void;
  onSave: (updated: ExtractedMedicine) => void;
}

const getTodayDateString = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const formatLocalDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

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
      startDate: medicine.startDate && medicine.startDate !== "None" ? medicine.startDate : getTodayDateString(),
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

  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setLocalErrors((prev) => {
      const newErrors = { ...prev };
      let changed = false;

      if (formName.trim() && newErrors.name) {
        delete newErrors.name;
        changed = true;
      }
      if (formType !== "TABLET" && formType !== "CAPSULE") {
        if (formUnit && newErrors.unit) {
          delete newErrors.unit;
          changed = true;
        }
      }
      const N = formFreq === "ONCE" ? 1 : formFreq === "TWICE" ? 2 : 3;
      if (selectedSlots.length === N && newErrors.slots) {
        delete newErrors.slots;
        changed = true;
      }
      const parsedQty = parseInt(formQty.trim(), 10);
      if (formQty.trim() && !isNaN(parsedQty) && parsedQty > 0 && newErrors.qty) {
        delete newErrors.qty;
        changed = true;
      }
      if (startDate) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const sDate = new Date(startDate);
        sDate.setHours(0, 0, 0, 0);
        if (sDate >= today && newErrors.startDate) {
          delete newErrors.startDate;
          changed = true;
        }
      }
      
      return changed ? newErrors : prev;
    });
  }, [formName, formType, formUnit, formFreq, selectedSlots, formQty, startDate]);

  const handleSave = () => {
    const errors: Record<string, string> = {};
    if (!formName.trim()) {
      errors.name = "Name is required";
    }
    const N = formFreq === "ONCE" ? 1 : formFreq === "TWICE" ? 2 : 3;
    if (selectedSlots.length !== N) {
      errors.slots = `Please select exactly ${N} reminder times`;
    }
    const parsedQty = parseInt(formQty.trim(), 10);
    if (!formQty.trim() || isNaN(parsedQty) || parsedQty <= 0) {
      errors.qty = "Total Quantity is required";
    }

    if (startDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const sDate = new Date(startDate);
      sDate.setHours(0, 0, 0, 0);
      if (sDate < today) {
        errors.startDate =
          preferredLang === "gujarati"
            ? "શરૂઆતની તારીખ ભૂતકાળમાં હોઈ શકતી નથી"
            : preferredLang === "hindi"
              ? "आरंभ तिथि भूतकाल में नहीं हो सकती"
              : preferredLang === "marathi"
                ? "सुरू होण्याची तारीख भूतकाळात असू शकत नाही"
                : preferredLang === "tamil"
                  ? "தொடக்க தேதி கடந்த காலத்தில் இருக்க முடியாது"
                  : "Start Date cannot be in the past";
      }
    }

    if (Object.keys(errors).length > 0) {
      setLocalErrors(errors);
      return;
    }

    const isPill = formType === "TABLET" || formType === "CAPSULE";
    const rawMedObject = {
      ...medicine,
      name: formName.trim(),
      type: formType,
      medicineType: formType,
      dose: isPill ? { count: formCount } : { value: formVal, unit: formUnit },
      dosage: isPill ? String(formCount) : String(formVal),
      dosageUnit: isPill ? (formType === "TABLET" ? "tablet" : "capsule") : formUnit,
      frequency: formFreq,
      foodFrequency: formFoodFreq,
      timing: formFoodFreq === "BEFORE_FOOD" ? "Before Food" : "After Food",
      prescribedBy: formPrescribed.trim(),
      totalQuantity: parsedQty,
      notes: formNotes.trim(),
      refillAlert: formRefill,
      refillAlertEnabled: formRefill,
      medicationSchedule: selectedSlots,
      startDate: startDate ? (startDate instanceof Date ? formatLocalDate(startDate) : startDate) : getTodayDateString(),
    };

    onSave(sanitizeMedicineForPayload(rawMedObject));
  };

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Text style={{ fontSize: 18, fontWeight: '800', color: isDark ? '#f8fafc' : '#1e293b' }}>Edit Medicine</Text>
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="close" size={24} color={isDark ? "#cbd5e1" : "#475569"} />
        </TouchableOpacity>
      </View>
      <BottomSheetScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
        <MedicationFormFields formState={formState} isDark={isDark} theme={theme} preferredLang={preferredLang} isInBottomSheet={true} errors={localErrors} />
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
