import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import { widgetStyles as styles } from "./WidgetStyles";
import { I18N_ONBOARDING_UI } from "./OnboardingI18n";
import { parseChosenJson } from "./MedicineHelpers";
import {
  useMedicationFormState,
  MedicationFormFields,
} from "../../shared/MedicationFormFields";

export interface AddMedicineCardProps {
  med: any;
  isEditingLocal: boolean;
  preferredLang?: string;
  isDark: boolean;
  theme: any;
  currentClientMedId?: string | null;
  setCurrentClientMedId: (id: string | null) => void;
  onSave: (med: any) => void;
  onCancel?: () => void;
  readOnly?: boolean;
  chosenVal?: string | null;
  chosenLabel?: string | null;
}

export function AddMedicineCard({
  med,
  isEditingLocal,
  preferredLang = "english",
  isDark,
  theme,
  currentClientMedId,
  setCurrentClientMedId,
  onSave,
  onCancel,
  readOnly = false,
  chosenVal,
  chosenLabel,
}: AddMedicineCardProps) {
  const formState = useMedicationFormState(med, preferredLang);
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
    if (!isEditingLocal && !currentClientMedId) {
      const newId =
        med.client_med_id ||
        med.id ||
        `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setCurrentClientMedId(newId);
    }
  }, [med]);

  React.useEffect(() => {
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

  const t = (key: string, replacements?: Record<string, string | number>) => {
    const lang = preferredLang || "english";
    const dict = I18N_ONBOARDING_UI[lang] || I18N_ONBOARDING_UI.english;
    let str = dict[key] || I18N_ONBOARDING_UI.english[key] || key;
    if (replacements) {
      Object.entries(replacements).forEach(([k, v]) => {
        str = str.split(`{${k}}`).join(String(v));
      });
    }
    return str;
  };

  const handleSave = () => {
    const errors: string[] = [];
    if (!formName.trim()) {
      errors.push(t("nameRequired"));
    }
    if (formType !== "TABLET" && formType !== "CAPSULE") {
      if (!formUnit) {
        errors.push(t("unitRequired"));
      }
    }
    
    const N = formFreq === "ONCE" ? 1 : formFreq === "TWICE" ? 2 : 3;
    if (selectedSlots.length !== N) {
      errors.push(t("saveGateError", { required: N }));
    }

    const parsedQty = parseInt(formQty.trim(), 10);
    if (!formQty.trim() || isNaN(parsedQty) || parsedQty <= 0) {
      errors.push(
        preferredLang === "gujarati"
          ? "કુલ જથ્થો જરૂરી છે"
          : "Total Quantity is required"
      );
    }

    if (errors.length > 0) {
      setLocalErrors(errors);
      return;
    }

    const dose =
      formType === "TABLET" || formType === "CAPSULE"
        ? { count: formCount }
        : { value: formVal, unit: formUnit };

    const sortedTimes = [...selectedSlots].sort((a, b) => {
      const [ha, ma] = a.split(":").map(Number);
      const [hb, mb] = b.split(":").map(Number);
      if (ha !== hb) return ha - hb;
      return ma - mb;
    });

    const updatedMed = {
      name: formName.trim(),
      medicationName: formName.trim(),
      type: formType,
      medicationType: formType,
      dose,
      dosePerIntake:
        formType === "TABLET" || formType === "CAPSULE"
          ? String(formCount)
          : `${formVal} ${formUnit}`,
      frequency: formFreq === "ONCE" ? "Once Daily" : formFreq === "TWICE" ? "Twice Daily" : "3x Daily",
      notes: formNotes.trim(),
      prescribed_by: formPrescribed.trim() || null,
      prescribedBy: formPrescribed.trim() || null,
      refill_alert: formRefill,
      refillAlert: formRefill,
      total_quantity: parsedQty,
      totalQuantity: parsedQty,
      startDate: startDate ? format(startDate, "yyyy-MM-dd") : null,
      client_med_id: isEditingLocal
        ? med.client_med_id || med.id
        : currentClientMedId,
      id: med.id,
      source: med.source || "MANUAL",
      medicationSchedule: sortedTimes,
      foodFrequency: formFoodFreq,
      ongoing: true, // defaults to true in onboarding card
    };

    onSave(updatedMed);
  };

  const N = formFreq === "ONCE" ? 1 : formFreq === "TWICE" ? 2 : 3;

  return (
    <View
      pointerEvents={readOnly ? "none" : "auto"}
      style={[
        styles.medEditCard,
        {
          backgroundColor: isDark ? "#1e293b" : "#ffffff",
          borderColor: isDark ? "#334155" : "#e2e8f0",
          opacity: readOnly ? 0.6 : 1,
        },
      ]}
    >
      <Text style={[styles.medCardTitle, { color: theme.colors.textPrimary }]}>
        {isEditingLocal ? t("editMedicine") : t("addMedicine")}
      </Text>

      <MedicationFormFields
        formState={formState}
        isDark={isDark}
        theme={theme}
        preferredLang={preferredLang}
        readOnly={readOnly}
      />

      {localErrors.length > 0 && (
        <View style={{ marginBottom: 12, marginTop: 8 }}>
          {localErrors.map((err, i) => (
            <Text key={i} style={{ color: "#ef4444", fontSize: 12 }}>
              • {err}
            </Text>
          ))}
        </View>
      )}

      {(() => {
        const parsed = parseChosenJson(chosenVal);
        const isSaved = readOnly && parsed?.medicine !== undefined;
        const isCancelled =
          readOnly &&
          (chosenVal === "cancel" ||
            (chosenLabel && String(chosenLabel).toLowerCase() === "cancel"));
        const saveOpacity = readOnly ? (isSaved ? 1 : 0.55) : 1;
        const cancelOpacity = readOnly ? (isCancelled ? 1 : 0.55) : 1;

        return (
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginTop: 16,
            }}
            pointerEvents={readOnly ? "none" : "auto"}
          >
            <TouchableOpacity
              disabled={readOnly}
              style={[
                styles.bigActionButtonSide,
                {
                  backgroundColor: readOnly
                    ? (isDark ? "#475569" : "#cbd5e1")
                    : theme.colors.primary,
                  flex: 1,
                  marginRight: 8,
                  opacity: saveOpacity,
                  borderWidth: isSaved ? 2 : 0,
                  borderColor: isSaved ? "#ffffff" : "transparent",
                },
              ]}
              onPress={handleSave}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {isSaved && (
                  <Ionicons
                    name="checkmark"
                    size={16}
                    color="#fff"
                    style={{ marginRight: 4 }}
                  />
                )}
                <Text
                  style={[
                    styles.bigActionButtonTextSide,
                    {
                      color: readOnly
                        ? (isDark ? "#94a3b8" : "#64748b")
                        : "#ffffff",
                    },
                  ]}
                >
                  {t("saveMedicine")}
                </Text>
              </View>
            </TouchableOpacity>
            {(isEditingLocal || readOnly) && (onCancel || readOnly) && (
              <TouchableOpacity
                disabled={readOnly}
                style={[
                  styles.bigActionButtonSide,
                  {
                    backgroundColor: isDark ? "#334155" : "#e2e8f0",
                    flex: 0.4,
                    opacity: cancelOpacity,
                    borderWidth: isCancelled ? 2 : 0,
                    borderColor: isCancelled
                      ? isDark
                        ? "#ffffff"
                        : "#475569"
                      : "transparent",
                  },
                ]}
                onPress={onCancel}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {isCancelled && (
                    <Ionicons
                      name="checkmark"
                      size={16}
                      color={theme.colors.textPrimary}
                      style={{ marginRight: 4 }}
                    />
                  )}
                  <Text
                    style={[
                      styles.bigActionButtonTextSide,
                      { color: theme.colors.textPrimary },
                    ]}
                  >
                    {t("cancel")}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          </View>
        );
      })()}
    </View>
  );
}

export default AddMedicineCard;
