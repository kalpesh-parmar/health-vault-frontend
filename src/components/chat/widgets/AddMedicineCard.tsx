import React, { useEffect, useState, useRef } from "react";
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

export const generateClientMedId = (existingDrafts?: any[]): string => {
  const existingSet = new Set(
    (existingDrafts || [])
      .map((m) => m?.client_med_id || m?.id)
      .filter(Boolean),
  );
  let id = `client_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  while (existingSet.has(id)) {
    id = `client_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
  return id;
};

export const deduplicateDrafts = (medList: any[]): any[] => {
  if (!Array.isArray(medList)) return [];
  const seenIds = new Set<string>();
  const result: any[] = [];
  for (const m of medList) {
    if (!m) continue;
    const key = m.client_med_id || m.id;
    if (key && seenIds.has(key)) {
      continue;
    }
    if (key) seenIds.add(key);
    result.push(m);
  }
  return result;
};

export interface AddMedicineCardProps {
  med?: any;
  initialMedicines?: any[];
  isEditingLocal?: boolean;
  preferredLang?: string;
  isDark: boolean;
  theme: any;
  currentClientMedId?: string | null;
  setCurrentClientMedId?: (id: string | null) => void;
  onSave: (med: any) => void;
  onAddAndContinue?: (med: any) => void;
  onDraftSync?: (updatedDrafts: any[]) => void;
  onSaveMedicines?: (allDrafts: any[]) => void;
  onExitToOptions?: () => void;
  totalBuffered?: number;
  onCancel?: () => void;
  readOnly?: boolean;
  chosenVal?: string | null;
  chosenLabel?: string | null;
  isInBottomSheet?: boolean;
}

interface MedicineFormFieldsWrapperProps {
  med: any;
  currentIndex: number;
  totalDraftsCount: number;
  canGoLeft: boolean;
  canGoRight: boolean;
  onPrev: (currentData: any) => void;
  onNext: (currentData: any) => void;
  onAddAndContinue: (currentData: any) => void;
  onSaveMedicines: (currentData?: any) => void;
  onCancel: () => void;
  isEditingLocal: boolean;
  preferredLang: string;
  isDark: boolean;
  theme: any;
  readOnly: boolean;
  isInBottomSheet: boolean;
  chosenVal?: string | null;
  chosenLabel?: string | null;
  t: (key: string, replacements?: Record<string, string | number>) => string;
}

function MedicineFormFieldsWrapper({
  med,
  currentIndex,
  totalDraftsCount,
  canGoLeft,
  canGoRight,
  onPrev,
  onNext,
  onAddAndContinue,
  onSaveMedicines,
  onCancel,
  isEditingLocal,
  preferredLang,
  isDark,
  theme,
  readOnly,
  isInBottomSheet,
  chosenVal,
  chosenLabel,
  t,
}: MedicineFormFieldsWrapperProps) {
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

  const validateAndBuildMed = () => {
    const errors: Record<string, string> = {};
    if (!formName.trim()) {
      errors.name = t("nameRequired");
    }
    if (formType !== "TABLET" && formType !== "CAPSULE") {
      if (!formUnit) {
        errors.unit = t("unitRequired");
      }
    }

    const N = formFreq === "ONCE" ? 1 : formFreq === "TWICE" ? 2 : 3;
    if (selectedSlots.length !== N) {
      errors.slots = t("saveGateError", { required: N });
    }

    const parsedQty = parseInt(formQty.trim(), 10);
    if (!formQty.trim() || isNaN(parsedQty) || parsedQty <= 0) {
      errors.qty =
        preferredLang === "gujarati"
          ? "કુલ જથ્થો જરૂરી છે"
          : "Total Quantity is required";
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
      return null;
    }

    const dose =
      formType === "TABLET" || formType === "CAPSULE"
        ? { count: parseFloat(String(formCount)) || 0 }
        : { value: parseFloat(String(formVal)) || 0, unit: formUnit };

    const sortedTimes = [...selectedSlots].sort((a, b) => {
      const [ha, ma] = a.split(":").map(Number);
      const [hb, mb] = b.split(":").map(Number);
      if (ha !== hb) return ha - hb;
      return ma - mb;
    });

    const clientMedId =
      med?.client_med_id ||
      med?.id ||
      generateClientMedId();

    return {
      name: formName.trim(),
      medicationName: formName.trim(),
      type: formType,
      medicationType: formType,
      dose,
      dosePerIntake:
        formType === "TABLET" || formType === "CAPSULE"
          ? String(formCount)
          : `${formVal} ${formUnit}`,
      frequency:
        formFreq === "ONCE"
          ? "Once Daily"
          : formFreq === "TWICE"
            ? "Twice Daily"
            : "3x Daily",
      notes: formNotes.trim(),
      prescribed_by: formPrescribed.trim() || null,
      prescribedBy: formPrescribed.trim() || null,
      refill_alert: formRefill,
      refillAlert: formRefill,
      total_quantity: parsedQty,
      totalQuantity: parsedQty,
      startDate: startDate ? format(startDate, "yyyy-MM-dd") : null,
      client_med_id: clientMedId,
      id: med?.id || clientMedId,
      source: med?.source || "MANUAL",
      medicationSchedule: sortedTimes,
      foodFrequency: formFoodFreq,
      ongoing: true,
      selected: true,
      isSaved: false,
      dbId: null,
    };
  };

  const handleAddAndContinuePress = () => {
    const valid = validateAndBuildMed();
    if (!valid) return;
    onAddAndContinue(valid);
  };

  const handleSaveMedicinesPress = () => {
    if (isEditingLocal) {
      const valid = validateAndBuildMed();
      if (!valid) return;
      onSaveMedicines(valid);
      return;
    }

    const currentName = formName.trim();
    if (currentName) {
      const valid = validateAndBuildMed();
      if (!valid) return;
      onSaveMedicines(valid);
    } else {
      onSaveMedicines(null);
    }
  };

  const handlePrevPress = () => {
    const currentName = formName.trim();
    if (currentName && currentIndex < totalDraftsCount) {
      const valid = validateAndBuildMed();
      if (valid) {
        onPrev(valid);
        return;
      }
    }
    onPrev(null);
  };

  const handleNextPress = () => {
    const currentName = formName.trim();
    if (currentName && currentIndex < totalDraftsCount) {
      const valid = validateAndBuildMed();
      if (valid) {
        onNext(valid);
        return;
      }
    }
    onNext(null);
  };

  return (
    <View>
      {/* Top Navigation Bar: Left Arrow | Medicine #N Indicator | Right Arrow */}
      {!isEditingLocal && (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <TouchableOpacity
            disabled={!canGoLeft || readOnly}
            onPress={handlePrevPress}
            style={{
              paddingVertical: 6,
              paddingHorizontal: 10,
              borderRadius: 8,
              backgroundColor: isDark ? "#334155" : "#f1f5f9",
              opacity: canGoLeft && !readOnly ? 1 : 0.25,
            }}
          >
            <Ionicons
              name="chevron-back"
              size={20}
              color={
                canGoLeft && !readOnly
                  ? theme.colors.textPrimary
                  : isDark
                    ? "#64748b"
                    : "#94a3b8"
              }
            />
          </TouchableOpacity>

          <Text
            style={[
              styles.medCardTitle,
              {
                color: theme.colors.textPrimary,
                marginBottom: 0,
                fontSize: 16,
                fontWeight: "700",
              },
            ]}
          >
            {t("medicineNumber", { n: currentIndex + 1 })}
          </Text>

          <TouchableOpacity
            disabled={!canGoRight || readOnly}
            onPress={handleNextPress}
            style={{
              paddingVertical: 6,
              paddingHorizontal: 10,
              borderRadius: 8,
              backgroundColor: isDark ? "#334155" : "#f1f5f9",
              opacity: canGoRight && !readOnly ? 1 : 0.25,
            }}
          >
            <Ionicons
              name="chevron-forward"
              size={20}
              color={
                canGoRight && !readOnly
                  ? theme.colors.textPrimary
                  : isDark
                    ? "#64748b"
                    : "#94a3b8"
              }
            />
          </TouchableOpacity>
        </View>
      )}

      {isEditingLocal && (
        <Text style={[styles.medCardTitle, { color: theme.colors.textPrimary }]}>
          {t("editMedicine")}
        </Text>
      )}

      {totalDraftsCount > 0 && !isEditingLocal && (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: isDark ? "rgba(59, 130, 246, 0.15)" : "#eff6ff",
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 8,
            marginTop: 4,
            marginBottom: 8,
            borderWidth: 1,
            borderColor: isDark ? "rgba(59, 130, 246, 0.3)" : "#bfdbfe",
          }}
        >
          <Ionicons
            name="file-tray-full-outline"
            size={16}
            color={theme.colors.primary}
            style={{ marginRight: 8 }}
          />
          <Text
            style={{
              fontSize: 12,
              fontWeight: "600",
              color: isDark ? "#93c5fd" : "#1d4ed8",
              flex: 1,
            }}
          >
            {t("medicinesReadyToReview", { count: totalDraftsCount })}
          </Text>
        </View>
      )}

      <MedicationFormFields
        formState={formState}
        isDark={isDark}
        theme={theme}
        preferredLang={preferredLang}
        readOnly={readOnly}
        isInBottomSheet={isInBottomSheet}
        errors={localErrors}
      />

      {(() => {
        const parsed = parseChosenJson(chosenVal);
        const isSaved =
          readOnly &&
          (parsed?.medicine !== undefined ||
            parsed?.action === "SAVE_AND_REVIEW");
        const isAddContinued =
          readOnly &&
          (parsed?.action === "ADD_AND_CONTINUE" ||
            String(chosenVal).includes("ADD_AND_CONTINUE"));
        const isCancelled =
          readOnly &&
          (chosenVal === "cancel" ||
            chosenVal === "CANCEL" ||
            (chosenLabel && String(chosenLabel).toLowerCase() === "cancel"));
        const saveOpacity = readOnly ? (isSaved ? 1 : 0.55) : 1;
        const addContinueOpacity = readOnly ? (isAddContinued ? 1 : 0.55) : 1;
        const cancelOpacity = readOnly ? (isCancelled ? 1 : 0.55) : 1;

        if (!isEditingLocal) {
          return (
            <View
              style={{
                marginTop: 16,
              }}
              pointerEvents={readOnly ? "none" : "auto"}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  marginBottom: 8,
                }}
              >
                <TouchableOpacity
                  disabled={readOnly}
                  style={[
                    styles.bigActionButtonSide,
                    {
                      backgroundColor: isDark ? "#334155" : "#f1f5f9",
                      borderWidth: isAddContinued ? 2 : 1,
                      borderColor: isAddContinued
                        ? isDark
                          ? "#ffffff"
                          : theme.colors.primary
                        : isDark
                          ? "#475569"
                          : "#cbd5e1",
                      flex: 1,
                      marginRight: 8,
                      opacity: addContinueOpacity,
                    },
                  ]}
                  onPress={handleAddAndContinuePress}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {isAddContinued ? (
                      <Ionicons
                        name="checkmark"
                        size={16}
                        color={isDark ? "#93c5fd" : theme.colors.primary}
                        style={{ marginRight: 4 }}
                      />
                    ) : (
                      <Ionicons
                        name="add"
                        size={16}
                        color={isDark ? "#93c5fd" : theme.colors.primary}
                        style={{ marginRight: 4 }}
                      />
                    )}
                    <Text
                      style={[
                        styles.bigActionButtonTextSide,
                        {
                          color: isDark ? "#93c5fd" : theme.colors.primary,
                        },
                      ]}
                    >
                      {t("addAndContinue")}
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  disabled={readOnly}
                  style={[
                    styles.bigActionButtonSide,
                    {
                      backgroundColor: readOnly
                        ? isDark
                          ? "#475569"
                          : "#cbd5e1"
                        : theme.colors.primary,
                      flex: 1,
                      opacity: saveOpacity,
                      borderWidth: isSaved ? 2 : 0,
                      borderColor: isSaved ? "#ffffff" : "transparent",
                    },
                  ]}
                  onPress={handleSaveMedicinesPress}
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
                            ? isDark
                              ? "#94a3b8"
                              : "#64748b"
                            : "#ffffff",
                        },
                      ]}
                    >
                      {t("saveMedicines")}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                disabled={readOnly}
                style={[
                  styles.bigActionButtonSide,
                  {
                    backgroundColor: isDark ? "#1e293b" : "#f8fafc",
                    borderWidth: 1,
                    borderColor: isDark ? "#334155" : "#e2e8f0",
                    opacity: cancelOpacity,
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
                      { color: isDark ? "#94a3b8" : "#64748b" },
                    ]}
                  >
                    {t("cancel")}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          );
        }

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
                    ? isDark
                      ? "#475569"
                      : "#cbd5e1"
                    : theme.colors.primary,
                  flex: 1,
                  marginRight: 8,
                  opacity: saveOpacity,
                  borderWidth: isSaved ? 2 : 0,
                  borderColor: isSaved ? "#ffffff" : "transparent",
                },
              ]}
              onPress={handleSaveMedicinesPress}
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
                        ? isDark
                          ? "#94a3b8"
                          : "#64748b"
                        : "#ffffff",
                    },
                  ]}
                >
                  {t("saveMedicine")}
                </Text>
              </View>
            </TouchableOpacity>
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
          </View>
        );
      })()}
    </View>
  );
}

const EMPTY_MEDICINES_ARRAY: any[] = [];
const EMPTY_MED_OBJECT: any = {};

export function AddMedicineCard({
  med = EMPTY_MED_OBJECT,
  initialMedicines = EMPTY_MEDICINES_ARRAY,
  isEditingLocal = false,
  preferredLang = "english",
  isDark,
  theme,
  currentClientMedId,
  setCurrentClientMedId,
  onSave,
  onAddAndContinue,
  onDraftSync,
  onSaveMedicines,
  onExitToOptions,
  totalBuffered = 0,
  onCancel,
  readOnly = false,
  chosenVal,
  chosenLabel,
  isInBottomSheet = false,
}: AddMedicineCardProps) {
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

  // Internal draft list initialized from initialMedicines or med
  const [drafts, setDrafts] = useState<any[]>(() => {
    if (Array.isArray(initialMedicines) && initialMedicines.length > 0) {
      return deduplicateDrafts(initialMedicines);
    }
    if (med && (med.name || med.medicationName)) {
      return [med];
    }
    return [];
  });

  // Current active index in the carousel
  const [currentIndex, setCurrentIndex] = useState<number>(() => {
    if (isEditingLocal) return 0;
    if (med?.client_med_id && Array.isArray(initialMedicines)) {
      const foundIdx = initialMedicines.findIndex(
        (m) => m.client_med_id === med.client_med_id || m.id === med.id,
      );
      if (foundIdx >= 0) return foundIdx;
    }
    // By default, start at blank form for new medicine if drafts exist, or 0
    return Array.isArray(initialMedicines) ? initialMedicines.length : 0;
  });

  // Stable unique ID for newly active blank draft
  const [newDraftId, setNewDraftId] = useState<string>(() => {
    const existingIds = new Set(
      (initialMedicines || []).map((m: any) => m.client_med_id || m.id).filter(Boolean),
    );
    if (currentClientMedId && !existingIds.has(currentClientMedId)) {
      return currentClientMedId;
    }
    return generateClientMedId(initialMedicines);
  });

  // Track incoming initialMedicines IDs key during render to adjust state if props change externally
  const [prevInitialIdsKey, setPrevInitialIdsKey] = useState<string>(() =>
    (initialMedicines || [])
      .map((m: any) => m?.client_med_id || m?.id)
      .filter(Boolean)
      .join("|"),
  );

  const currentInitialIdsKey = (initialMedicines || [])
    .map((m: any) => m?.client_med_id || m?.id)
    .filter(Boolean)
    .join("|");

  if (currentInitialIdsKey !== prevInitialIdsKey) {
    setPrevInitialIdsKey(currentInitialIdsKey);
    if (initialMedicines.length === 0) {
      // Cancel -> reset
      setDrafts([]);
      setCurrentIndex(0);
      setNewDraftId(generateClientMedId([]));
    } else {
      const incomingDeduped = deduplicateDrafts(initialMedicines);
      const currentDraftIds = new Set(
        drafts.map((m: any) => m?.client_med_id || m?.id).filter(Boolean),
      );
      const incomingIds = new Set(
        incomingDeduped.map((m: any) => m?.client_med_id || m?.id).filter(Boolean),
      );

      const hasOverlap = [...currentDraftIds].some((id) => incomingIds.has(id));

      if (drafts.length === 0) {
        // Initial population from incoming drafts
        setDrafts(incomingDeduped);
        let targetIdx = incomingDeduped.length;
        if (med?.client_med_id || med?.id) {
          const foundIdx = incomingDeduped.findIndex(
            (m: any) => (m.client_med_id || m.id) === (med.client_med_id || med.id),
          );
          if (foundIdx >= 0) targetIdx = foundIdx;
        }
        setCurrentIndex(targetIdx);
        if (incomingIds.has(newDraftId)) {
          setNewDraftId(generateClientMedId(incomingDeduped));
        }
      } else if (hasOverlap) {
        // "Add another" -> APPEND (no reset)
        const newItems = incomingDeduped.filter(
          (m: any) => !currentDraftIds.has(m?.client_med_id || m?.id),
        );
        if (newItems.length > 0) {
          const merged = deduplicateDrafts([...drafts, ...newItems]);
          setDrafts(merged);
          // If user was on the blank form, advance currentIndex to point to the new blank form
          if (currentIndex >= drafts.length) {
            setCurrentIndex(merged.length);
          }
          const allIds = new Set(
            merged.map((m: any) => m?.client_med_id || m?.id).filter(Boolean),
          );
          if (allIds.has(newDraftId)) {
            setNewDraftId(generateClientMedId(merged));
          }
        }
        // If newItems.length === 0, all incoming drafts are already present; do NOT reset drafts or index!
      } else {
        // External list replacement -> reset
        setDrafts(incomingDeduped);
        let targetIdx = incomingDeduped.length;
        if (med?.client_med_id || med?.id) {
          const foundIdx = incomingDeduped.findIndex(
            (m: any) => (m.client_med_id || m.id) === (med.client_med_id || med.id),
          );
          if (foundIdx >= 0) targetIdx = foundIdx;
        }
        setCurrentIndex(targetIdx);
        if (incomingIds.has(newDraftId)) {
          setNewDraftId(generateClientMedId(incomingDeduped));
        }
      }
    }
  }

  // Determine active medicine data for the current index
  const activeMed =
    currentIndex < drafts.length
      ? drafts[currentIndex]
      : {
        client_med_id: newDraftId,
        id: newDraftId,
      };

  const canGoLeft = !isEditingLocal && currentIndex > 0;
  const canGoRight = !isEditingLocal && currentIndex < drafts.length - 1;

  const handlePrev = (currentValidData: any) => {
    if (currentIndex <= 0) return;
    if (currentValidData && currentIndex < drafts.length) {
      const updated = [...drafts];
      updated[currentIndex] = {
        ...drafts[currentIndex],
        ...currentValidData,
        client_med_id: drafts[currentIndex].client_med_id || currentValidData.client_med_id,
        id: drafts[currentIndex].id || currentValidData.id,
      };
      const deduped = deduplicateDrafts(updated);
      setDrafts(deduped);
      onDraftSync?.(deduped);
    }
    const nextIdx = currentIndex - 1;
    setCurrentIndex(nextIdx);
    const targetMed = nextIdx < drafts.length ? drafts[nextIdx] : null;
    if (targetMed) {
      setCurrentClientMedId?.(targetMed.client_med_id || targetMed.id || null);
    }
  };

  const handleNext = (currentValidData: any) => {
    if (currentIndex >= drafts.length - 1) return;
    if (currentValidData && currentIndex < drafts.length) {
      const updated = [...drafts];
      updated[currentIndex] = {
        ...drafts[currentIndex],
        ...currentValidData,
        client_med_id: drafts[currentIndex].client_med_id || currentValidData.client_med_id,
        id: drafts[currentIndex].id || currentValidData.id,
      };
      const deduped = deduplicateDrafts(updated);
      setDrafts(deduped);
      onDraftSync?.(deduped);
    }
    const nextIdx = currentIndex + 1;
    setCurrentIndex(nextIdx);
    const targetMed = nextIdx < drafts.length ? drafts[nextIdx] : null;
    if (targetMed) {
      setCurrentClientMedId?.(targetMed.client_med_id || targetMed.id || null);
    }
  };

  const handleAddAndContinueAction = (validMed: any) => {
    let updated = [...drafts];
    if (currentIndex < updated.length) {
      updated[currentIndex] = validMed;
    } else {
      const existingIdx = updated.findIndex(
        (m) => (m.client_med_id || m.id) === (validMed.client_med_id || validMed.id),
      );
      if (existingIdx >= 0) {
        updated[existingIdx] = validMed;
      } else {
        updated.push(validMed);
      }
    }
    updated = deduplicateDrafts(updated);
    setDrafts(updated);
    onDraftSync?.(updated);

    if (onAddAndContinue) {
      onAddAndContinue(validMed);
    }

    // Generate a fresh unique client_med_id for the next blank form
    const freshNextId = generateClientMedId(updated);
    setNewDraftId(freshNextId);
    setCurrentClientMedId?.(freshNextId);

    // Open next blank form
    setCurrentIndex(updated.length);
  };

  const handleSaveMedicinesAction = (validMed?: any) => {
    if (isEditingLocal) {
      if (validMed) {
        onSave(validMed);
      }
      return;
    }

    let finalDrafts = [...drafts];
    if (validMed) {
      if (currentIndex < finalDrafts.length) {
        finalDrafts[currentIndex] = validMed;
      } else {
        const existingIdx = finalDrafts.findIndex(
          (m) => (m.client_med_id || m.id) === (validMed.client_med_id || validMed.id),
        );
        if (existingIdx >= 0) {
          finalDrafts[existingIdx] = validMed;
        } else {
          finalDrafts.push(validMed);
        }
      }
      finalDrafts = deduplicateDrafts(finalDrafts);
      setDrafts(finalDrafts);
      onDraftSync?.(finalDrafts);
    }

    finalDrafts = deduplicateDrafts(finalDrafts);
    if (finalDrafts.length === 0) return;

    if (onSaveMedicines) {
      onSaveMedicines(finalDrafts);
    } else {
      onSave(finalDrafts[finalDrafts.length - 1]);
    }
  };

  const handleCancelAction = () => {
    if (isEditingLocal) {
      onCancel?.();
      return;
    }

    // Cancel means CANCEL THE ENTIRE CURRENT MEDICINE-ENTRY SESSION.
    // Discard all unconfirmed drafts, reset internal state, never step backward.
    setDrafts([]);
    setCurrentIndex(0);
    const freshId = generateClientMedId([]);
    setNewDraftId(freshId);
    setCurrentClientMedId?.(freshId);

    if (onExitToOptions) {
      onExitToOptions();
    } else if (onCancel) {
      onCancel();
    }
  };

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
      <MedicineFormFieldsWrapper
        key={`${activeMed?.client_med_id || activeMed?.id || "med"}_${currentIndex}`}
        med={activeMed}
        currentIndex={currentIndex}
        totalDraftsCount={drafts.length}
        canGoLeft={canGoLeft}
        canGoRight={canGoRight}
        onPrev={handlePrev}
        onNext={handleNext}
        onAddAndContinue={handleAddAndContinueAction}
        onSaveMedicines={handleSaveMedicinesAction}
        onCancel={handleCancelAction}
        isEditingLocal={isEditingLocal}
        preferredLang={preferredLang}
        isDark={isDark}
        theme={theme}
        readOnly={readOnly}
        isInBottomSheet={isInBottomSheet}
        chosenVal={chosenVal}
        chosenLabel={chosenLabel}
        t={t}
      />
    </View>
  );
}

export default AddMedicineCard;
