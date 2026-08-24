import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, LayoutAnimation, Platform, UIManager } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { widgetStyles as styles } from "./WidgetStyles";
import Toast from "react-native-toast-message";
import { I18N_ONBOARDING_UI } from "./OnboardingI18n";
import { parseChosenJson } from "./MedicineHelpers";

const formatFoodContext = (val: any): string => {
  if (!val) return "None";
  const str = String(val).replace(/_/g, " ").toLowerCase();
  return str.charAt(0).toUpperCase() + str.slice(1);
};

const formatStartDate = (val: any): string => {
  if (!val) return "None";
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return String(val);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const day = String(d.getDate()).padStart(2, "0");
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  } catch {
    return String(val);
  }
};

const isPastDate = (dateVal: any): boolean => {
  if (!dateVal || dateVal === "None") return false;
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const d = new Date(dateVal);
    d.setHours(0, 0, 0, 0);
    return d < today;
  } catch {
    return false;
  }
};

export interface ReviewMedicinesListCardProps {
  localMedicines: any[];
  setLocalMedicines: React.Dispatch<React.SetStateAction<any[]>>;
  preferredLang: string;
  isDark: boolean;
  theme: any;
  onConfirm: (checkedMeds: string[], formattedMeds?: any[]) => void;
  onAddNew: () => void;
  onSkipAll: () => void;
  onEdit: (med: any) => void;
  readOnly?: boolean;
  chosenVal?: string | null;
  chosenLabel?: string | null;
}

export function ReviewMedicinesListCard({
  localMedicines,
  setLocalMedicines,
  preferredLang,
  isDark,
  theme,
  onConfirm,
  onAddNew,
  onSkipAll,
  onEdit,
  readOnly,
  chosenVal,
  chosenLabel,
}: ReviewMedicinesListCardProps) {
  // checkedMeds: holds the IDs of checked/selected medications
  const [checkedMeds, setCheckedMeds] = useState<string[]>(
    (localMedicines || []).filter((m) => m.selected).map((m) => m.id),
  );

  // expandedMedId: holds the ID of the single expanded medicine card (accordion design)
  const [expandedMedId, setExpandedMedId] = useState<string | null>(null);

  // isExpanded: Controls whether the list shows first 3 medicines or all medicines
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  // Sync checkedMeds if localMedicines changes from parent component
  useEffect(() => {
    setCheckedMeds(
      (localMedicines || []).filter((m) => m.selected).map((m) => m.id),
    );
  }, [localMedicines]);

  // resolutions: holds resolution choice for each medicine
  const [resolutions, setResolutions] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    (localMedicines || []).forEach((m) => {
      if (m.resolution) {
        initial[m.id] = m.resolution;
      } else if (!m.duplicateInfo?.hasDuplicate) {
        initial[m.id] = "KEEP_NEW";
      }
    });
    return initial;
  });

  // Sync resolutions if localMedicines changes
  useEffect(() => {
    setResolutions((prev) => {
      const next = { ...prev };
      (localMedicines || []).forEach((m) => {
        if (m.resolution && next[m.id] === undefined) {
          next[m.id] = m.resolution;
        } else if (!m.duplicateInfo?.hasDuplicate && next[m.id] === undefined) {
          next[m.id] = "KEEP_NEW";
        }
      });
      return next;
    });
  }, [localMedicines]);

  const safeLocalMedicines = localMedicines || [];

  // Ensure startDate defaults to today for any medicine lacking it
  useEffect(() => {
    const missingStart = (localMedicines || []).some(
      (m) => !m.startDate || m.startDate === "None",
    );
    if (missingStart) {
      const today = new Date().toISOString().split("T")[0];
      setLocalMedicines((prev) =>
        prev.map((m) => ({
          ...m,
          startDate:
            m.startDate && m.startDate !== "None" ? m.startDate : today,
        })),
      );
    }
  }, [localMedicines]);
  const conflictingMeds = readOnly
    ? []
    : safeLocalMedicines.filter((m) => m.duplicateInfo?.hasDuplicate && resolutions[m.id] === undefined);
  const [viewMode, setViewMode] = useState<"conflicts" | "list">("list");

  useEffect(() => {
    if (!readOnly && conflictingMeds.length > 0) {
      setViewMode("conflicts");
    } else {
      setViewMode("list");
    }
  }, [conflictingMeds.length, readOnly]);

  const [currentConflictIdx, setCurrentConflictIdx] = useState(0);

  const autoAdvance = () => {
    const remainingCount = readOnly
      ? 0
      : safeLocalMedicines.filter((m) => m.duplicateInfo?.hasDuplicate && resolutions[m.id] === undefined).length;
    if (remainingCount === 0) {
      setViewMode("list");
    } else if (currentConflictIdx >= remainingCount) {
      setCurrentConflictIdx(remainingCount - 1);
    }
  };

  const getExistingDosage = (exist: any) => {
    if (!exist) return "None";
    return `${exist.dosePerIntake || "1"} ${exist.medicationType?.toLowerCase() || "tablet"}(s)`;
  };

  const getExtractedDosage = (med: any) => {
    return `${med.dosage || "1"} ${med.dosageUnit || "tablet"}`;
  };

  // Toggle medicine checkbox state
  const toggleCheck = (id: string) => {
    if (checkedMeds.includes(id)) {
      setCheckedMeds((prev) => prev.filter((m) => m !== id));
      setLocalMedicines((prev) =>
        prev.map((m) => (m.id === id ? { ...m, selected: false } : m)),
      );
    } else {
      setCheckedMeds((prev) => [...prev, id]);
      setLocalMedicines((prev) =>
        prev.map((m) => (m.id === id ? { ...m, selected: true } : m)),
      );
    }
  };

  // Toggle single medicine expansion (accordion transition)
  const toggleExpandPill = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (expandedMedId === id) {
      setExpandedMedId(null);
    } else {
      setExpandedMedId(id);
    }
  };

  // Helper to format dosage info safely
  const getDosageString = (med: any) => {
    const rawDosage = med.dosage || med.dose || med.dosePerIntake || "";
    let dosage = "";
    if (rawDosage && typeof rawDosage === "object") {
      if (rawDosage.count !== undefined) {
        const typeStr = (med.type || "tablet").toLowerCase();
        dosage = `${rawDosage.count} ${typeStr}(s)`;
      } else if (rawDosage.value !== undefined) {
        dosage = `${rawDosage.value} ${rawDosage.unit || ""}`.trim();
      } else {
        dosage = JSON.stringify(rawDosage);
      }
    } else if (rawDosage) {
      dosage = String(rawDosage);
    } else {
      dosage = "1 tablet(s)";
    }
    return dosage;
  };

  // Helper to format scheduling info safely
  const getTimeString = (med: any) => {
    const time = med.schedule || med.medicationSchedule || med.times || "";
    if (!time) return "None";
    
    // If it's a string, return directly
    if (typeof time === "string") return time;
    
    // If it's an array, join it
    if (Array.isArray(time)) {
      return time.join(", ");
    }
    
    // If it's an object, check for times or reminderTimes inside it
    if (typeof time === "object" && time !== null) {
      const timesList = time.times || time.reminderTimes || [];
      if (Array.isArray(timesList) && timesList.length > 0) {
        return timesList.join(", ");
      }
      
      // Otherwise, format entries as key: value
      return Object.entries(time)
        .filter(([_, v]) => typeof v === "string" || typeof v === "number")
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ") || "None";
    }
    
    return "None";
  };

  const handleConfirm = () => {
    const formattedMedicines = (localMedicines || [])
      .filter((m) => checkedMeds.includes(m.id))
      .map((m) => {
        const resValue = resolutions[m.id] || "KEEP_NEW";
        const matchedMed = m.duplicateInfo?.matchedMedication || m.duplicateInfo?.matchedMedications?.[0];
        
        const doseCount = typeof m.dose === "object" && m.dose !== null && m.dose.count !== undefined
          ? parseFloat(String(m.dose.count)) || 1
          : parseFloat(String(m.dosePerIntake || "1")) || 1;

        const result: any = {
          client_med_id: m.id,
          name: m.name || m.medicationName || "Unknown",
          type: String(m.type || m.medicationType || "TABLET").toUpperCase(),
          frequency: String(m.frequency || "ONCE").toUpperCase(),
          dose: { count: doseCount },
          foodFrequency: String(m.foodFrequency || m.foodContext || "AFTER_FOOD").toUpperCase(),
          resolution: resValue,
          startDate: m.startDate || new Date().toISOString().split("T")[0],
          notes: m.notes || "",
          prescribedBy: m.prescribedBy || m.prescribed_by || "",
          totalQuantity: m.total_quantity !== undefined ? m.total_quantity : (m.totalQuantity || 10),
          refillAlert: m.refill_alert !== undefined ? m.refill_alert : (m.refillAlert || false),
          medicationSchedule: m.medicationSchedule || m.schedule || m.times || [],
        };

        if (resValue === "REPLACE" && matchedMed?.id) {
          result.replaceMedicationId = matchedMed.id;
        }

        return result;
      });

    onConfirm(checkedMeds, formattedMedicines);
  };

  // Translation helper
  const t = (key: string) => {
    const lang = preferredLang || "english";
    const dict = I18N_ONBOARDING_UI[lang] || I18N_ONBOARDING_UI.english;
    return dict[key] || I18N_ONBOARDING_UI.english[key] || key;
  };

  const getStartDateWarningText = () => {
    const lang = preferredLang || "english";
    if (isAnyCheckedMedMissingStartDate) {
      const dict: Record<string, string> = {
        english: "One or more selected medicines are missing a Start Date. Please edit them to add a Start Date.",
        gujarati: "એક અથવા વધુ પસંદ કરેલી દવાઓમાં શરૂઆતની તારીખ ખૂટે છે. શરૂઆતની તારીખ ઉમેરવા માટે કૃપા કરીને તેને સંપાદિત કરો.",
        hindi: "एक या अधिक चयनित दवाओं में आरंभ तिथि गायब है। कृपया आरंभ तिथि जोड़ने के लिए उन्हें संपादित करें।",
        marathi: "निवडलेल्या औषधांपैकी एक किंवा अधिक औषधांना सुरू होण्याची तारीख नाही. सुरू होण्याची तारीख जोडण्यासाठी कृपया त्यांना संपादित करा.",
        tamil: "தேர்ந்தெடுக்கப்பட்ட ஒன்று அல்லது அதற்கு மேற்பட்ட மருந்துகளுக்கு தொடக்க தேதி இல்லை. தொடக்க தேதியை சேர்க்க அவற்றை திருத்தவும்.",
      };
      return dict[lang] || dict.english;
    }
    if (isAnyCheckedMedPastStartDate) {
      const dict: Record<string, string> = {
        english: "One or more selected medicines have a past Start Date. Please edit them to set a current or future Start Date.",
        gujarati: "એક અથવા વધુ પસંદ કરેલી દવાઓમાં શરૂઆતની તારીખ ભૂતકાળની છે. કૃપા કરીને ચાલુ અથવા ભવિષ્યની શરૂઆતની તારીખ સેટ કરવા માટે તેને સંપાદિત કરો.",
        hindi: "एक या अधिक चयनित दवाओं की आरंभ तिथि बीत चुकी है। कृपया वर्तमान या भविष्य की आरंभ तिथि सेट करने के लिए उन्हें संपादित करें।",
        marathi: "निवडलेल्या औषधांपैकी एक किंवा अधिक औषधांना भूतकाळातील सुरू होण्याची तारीख आहे. कृपया चालू किंवा भविष्यातील सुरू होण्याची तारीख सेट करण्यासाठी त्यांना संपादित करा.",
        tamil: "தேர்ந்தெடுக்கப்பட்ட ஒன்று அல்லது அதற்கு மேற்பட்ட மருந்துகளுக்கு கடந்த கால தொடக்க தேதி உள்ளது. தற்போதைய அல்லது எதிர்கால தொடக்க தேதியை அமைக்க அவற்றை திருத்தவும்.",
      };
      return dict[lang] || dict.english;
    }
    return "";
  };

  const isAnyCheckedMedMissingStartDate = !readOnly && safeLocalMedicines
    .filter((m) => checkedMeds.includes(m.id))
    .some((m) => !m.startDate || m.startDate === "None");

  const isAnyCheckedMedPastStartDate = !readOnly && safeLocalMedicines
    .filter((m) => checkedMeds.includes(m.id))
    .some((m) => m.startDate && m.startDate !== "None" && isPastDate(m.startDate));

  const areActionsDisabled = readOnly || conflictingMeds.length > 0 || isAnyCheckedMedMissingStartDate || isAnyCheckedMedPastStartDate;



  const parsed = parseChosenJson(chosenVal);
  const isConfirmChosen =
    readOnly &&
    (parsed?.selected !== undefined ||
      (chosenLabel && String(chosenLabel).toLowerCase().includes("confirm")));
  const isAddNewChosen =
    readOnly &&
    (parsed?.addNew === true ||
      (chosenLabel && String(chosenLabel).toLowerCase().includes("add")));
  const isSkipAllChosen =
    readOnly &&
    (parsed?.skipAll === true ||
      (chosenLabel && String(chosenLabel).toLowerCase().includes("skip")));

  const confirmOpacity = readOnly ? (isConfirmChosen ? 1 : 0.55) : 1;
  const addNewOpacity = readOnly ? (isAddNewChosen ? 1 : 0.55) : 1;
  const skipAllOpacity = readOnly ? (isSkipAllChosen ? 1 : 0.55) : 1;

  if (viewMode === "conflicts" && conflictingMeds.length > 0) {
    const med = conflictingMeds[currentConflictIdx];
    const exist = med.duplicateInfo?.matchedMedication || med.duplicateInfo?.matchedMedications?.[0];

    return (
      <View
        style={[
          styles.medListCard,
          {
            backgroundColor: isDark ? "#1e293b" : "#ffffff",
            borderColor: isDark ? "#334155" : "#e2e8f0",
            padding: 16,
          },
        ]}
      >
        {/* Toggle Header */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <Text style={{ fontSize: 16, fontWeight: "bold", color: isDark ? "#f8fafc" : "#1e293b" }}>
            Resolve Conflicts
          </Text>
          <TouchableOpacity onPress={() => setViewMode("list")}>
            <Text style={{ color: "#2563eb", fontWeight: "bold", fontSize: 13 }}>
              Show List
            </Text>
          </TouchableOpacity>
        </View>

        {/* Header Info */}
        <View style={{ marginBottom: 12 }}>
          <Text style={{ fontSize: 13, fontWeight: "bold", color: "#b91c1c" }}>
            Conflict {currentConflictIdx + 1} of {conflictingMeds.length}
          </Text>
          <Text style={{ fontSize: 16, fontWeight: "bold", color: isDark ? "#cbd5e1" : "#1e293b", marginTop: 4 }}>
            {med.name}
          </Text>
        </View>

        {/* Comparison Grid */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 16 }}>
          {/* Left: Existing */}
          {exist ? (
            <View style={{ flex: 1, marginRight: 8, padding: 12, backgroundColor: isDark ? "#0f172a" : "#f8fafc", borderRadius: 12 }}>
              <Text style={{ fontSize: 11, color: "#64748b", marginBottom: 6, fontWeight: "600" }}>
                Existing in your profile
              </Text>
              <Text numberOfLines={2} style={{ fontSize: 13, fontWeight: "bold", color: isDark ? "#e2e8f0" : "#334155", marginBottom: 4 }}>
                {exist.medicationName}
              </Text>
              <Text style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>
                {getExistingDosage(exist)}
              </Text>
              <Text style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>
                {exist.frequency || "Once Daily"}
              </Text>
              <Text style={{ fontSize: 12, color: "#64748b" }}>
                {exist.duration || (exist.totalQuantity ? `${exist.totalQuantity} Days` : "Ongoing")}
              </Text>
            </View>
          ) : (
            <View style={{ flex: 1, marginRight: 8, padding: 12, backgroundColor: isDark ? "#0f172a" : "#f8fafc", borderRadius: 12, justifyContent: "center", alignItems: "center" }}>
              <Text style={{ fontSize: 12, color: "#64748b" }}>No details found</Text>
            </View>
          )}

          {/* Right: New Extracted */}
          <View style={{ flex: 1, padding: 12, backgroundColor: isDark ? "#0f172a" : "#f8fafc", borderRadius: 12 }}>
            <Text style={{ fontSize: 11, color: "#64748b", marginBottom: 6, fontWeight: "600" }}>
              Newly extracted
            </Text>
            <Text numberOfLines={2} style={{ fontSize: 13, fontWeight: "bold", color: isDark ? "#e2e8f0" : "#334155", marginBottom: 4 }}>
              {med.name}
            </Text>
            <Text style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>
              {getExtractedDosage(med)}
            </Text>
            <Text style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>
              {(() => {
                const freq = med.frequency || "ONCE";
                if (freq === "ONCE") return "Once Daily";
                if (freq === "TWICE") return "Twice Daily";
                if (freq === "THRICE") return "3x Daily";
                return freq;
              })()}
            </Text>
            <Text style={{ fontSize: 12, color: "#64748b" }}>
              {med.duration || "30 Days"}
            </Text>
          </View>
        </View>

        {/* Reason */}
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 12, fontWeight: "bold", color: isDark ? "#cbd5e1" : "#1e293b", marginBottom: 4 }}>
            Reason
          </Text>
          <Text style={{ fontSize: 12, color: isDark ? "#94a3b8" : "#475569", fontStyle: "italic" }}>
            Duplicate medicine with same strength and frequency
          </Text>
        </View>

        {/* Resolution Buttons Grid */}
        <View style={{ marginBottom: 16 }}>
          {/* Row 1 */}
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
            <TouchableOpacity
              disabled={readOnly}
              onPress={() => {
                setResolutions((prev) => ({ ...prev, [med.id]: "REMOVE_NEW" }));
                const nextMeds = safeLocalMedicines.map((m) =>
                  m.id === med.id ? { ...m, selected: false, resolution: "REMOVE_NEW" } : m
                );
                setLocalMedicines(nextMeds);
                setCheckedMeds((prev) => prev.filter((id) => id !== med.id));
                
                Toast.show({
                  type: "info",
                  text1: `${med.name || med.medicationName || "Medicine"} already exists in your profile.`,
                  text2: "Incoming duplicate removed.",
                });

                // Compute next remaining conflicts
                const nextResolutions: Record<string, string> = { ...resolutions, [med.id]: "REMOVE_NEW" };
                const nextConflicting = nextMeds.filter((m) => m.duplicateInfo?.hasDuplicate && nextResolutions[m.id] === undefined);
                if (nextConflicting.length === 0) {
                  setViewMode("list");
                } else if (currentConflictIdx >= nextConflicting.length) {
                  setCurrentConflictIdx(nextConflicting.length - 1);
                }
              }}
              style={{ flex: 1, backgroundColor: "#2563eb", paddingVertical: 12, borderRadius: 10, alignItems: "center", justifyContent: "center", opacity: readOnly ? 0.55 : 1 }}
            >
              <Text style={{ color: "#ffffff", fontWeight: "bold", fontSize: 13 }}>
                Keep Existing
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              disabled={readOnly}
              onPress={() => {
                setResolutions((prev) => ({ ...prev, [med.id]: "REPLACE" }));
                
                const matchedMed = med.duplicateInfo?.matchedMedication || med.duplicateInfo?.matchedMedications?.[0];
                setLocalMedicines((prev) =>
                  prev.map((m) =>
                    m.id === med.id
                      ? {
                          ...m,
                          resolution: "REPLACE",
                          replaceMedicationId: matchedMed?.id,
                        }
                      : m
                  )
                );
                
                autoAdvance();
              }}
              style={{ flex: 1, backgroundColor: "#2563eb", paddingVertical: 12, borderRadius: 10, alignItems: "center", justifyContent: "center", opacity: readOnly ? 0.55 : 1 }}
            >
              <Text style={{ color: "#ffffff", fontWeight: "bold", fontSize: 13 }}>
                Replace
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer Pager */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12 }}>
          <TouchableOpacity
            disabled={currentConflictIdx === 0}
            onPress={() => setCurrentConflictIdx((prev) => Math.max(0, prev - 1))}
            style={{ opacity: currentConflictIdx === 0 ? 0.3 : 1, padding: 8 }}
          >
            <Ionicons name="chevron-back" size={20} color={isDark ? "#cbd5e1" : "#475569"} />
          </TouchableOpacity>

          <Text style={{ fontSize: 13, fontWeight: "bold", color: isDark ? "#cbd5e1" : "#475569" }}>
            {currentConflictIdx + 1} of {conflictingMeds.length}
          </Text>

          <TouchableOpacity
            disabled={currentConflictIdx === conflictingMeds.length - 1}
            onPress={() => setCurrentConflictIdx((prev) => Math.min(conflictingMeds.length - 1, prev + 1))}
            style={{ opacity: currentConflictIdx === conflictingMeds.length - 1 ? 0.3 : 1, padding: 8 }}
          >
            <Ionicons name="chevron-forward" size={20} color={isDark ? "#cbd5e1" : "#475569"} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }  const displayedMedicines = readOnly
    ? safeLocalMedicines.filter((m) => checkedMeds.includes(m.id))
    : safeLocalMedicines;

  return (
    <View
      style={[
        styles.medListCard,
        {
          backgroundColor: isDark ? "#1e293b" : "#ffffff",
          borderColor: isDark ? "#334155" : "#e2e8f0",
          opacity: readOnly ? 1 : 1,
        },
      ]}
    >
      {conflictingMeds.length > 0 && (
        <TouchableOpacity
          onPress={() => setViewMode("conflicts")}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: "#ffedd5",
            borderColor: "#f97316",
            borderWidth: 1,
            borderRadius: 12,
            padding: 10,
            marginBottom: 14,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", flex: 1, marginRight: 8 }}>
            <Ionicons name="warning" size={18} color="#ea580c" style={{ marginRight: 8 }} />
            <Text style={{ fontSize: 12, color: "#c2410c", fontWeight: "600", flex: 1 }}>
              {conflictingMeds.length} duplicate conflicts detected. Tap to resolve them one by one.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#ea580c" />
        </TouchableOpacity>
      )}

      <Text style={[styles.medCardTitle, { color: theme.colors.textPrimary }]}>
        {t("extractedMedicationsList")}
      </Text>
      <Text
        style={[
          styles.medCardSubtitleText,
          { color: theme.colors.textSecondary },
        ]}
      >
        {t("pleaseCheckWhichMedicines")}
      </Text>

      <View style={{ marginVertical: 12 }}>
        {(isExpanded ? displayedMedicines : displayedMedicines.slice(0, 3)).map((rawMed) => {
          const med = {
            ...rawMed,
            name: rawMed.name || rawMed.medicationName || "Unknown",
            type: rawMed.type || rawMed.medicationType || "Tablet",
            frequency: rawMed.frequency || rawMed.medicationFrequency || rawMed.doseFrequency || rawMed.timeOfIntake || "None",
            notes: rawMed.notes || rawMed.instructions || "None",
          };
          const isChecked = checkedMeds.includes(med.id);
          const isPillExpanded = expandedMedId === med.id;
          const dosageStr = getDosageString(med);
          const timeStr = getTimeString(med);

          return (
            <View
              key={med.id}
              style={{
                backgroundColor: "#f8fafc",
                borderColor: "#e2e8f0",
                borderWidth: 1,
                borderRadius: 16,
                padding: 12,
                marginBottom: 10,
                elevation: 1,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 2,
              }}
            >
              {/* Primary Header Row inside medicine pill */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => toggleExpandPill(med.id)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                {/* Left side: Checkbox + Middle Information */}
                <View style={{ flexDirection: "row", alignItems: "center", flex: 1, marginRight: 8 }}>
                  {/* Checkbox Selector */}
                  <TouchableOpacity
                    disabled={readOnly}
                    onPress={() => toggleCheck(med.id)}
                    style={{ padding: 4, marginRight: 8 }}
                  >
                    <Ionicons
                      name={isChecked ? "checkbox" : "square-outline"}
                      size={22}
                      color={isChecked ? theme.colors.primary : "#64748b"}
                    />
                  </TouchableOpacity>

                  {/* Middle Area: Name/Type and Collapsed Info */}
                  <View style={{ flex: 1, flexDirection: "row", alignItems: "center" }}>
                    {/* Primary Info: Name & Type */}
                    <View style={{ flex: 1.2, paddingRight: 8 }}>
                      <View style={{ flexDirection: "row", alignItems: "center" }}>
                        <Text
                          numberOfLines={1}
                          ellipsizeMode="tail"
                          style={{
                            fontSize: 14,
                            fontWeight: "bold",
                            color: "#1e293b",
                            textDecorationLine: isChecked ? "none" : "line-through",
                            flexShrink: 1,
                          }}
                        >
                          {med.name}
                        </Text>
                        {med.duplicateInfo?.hasDuplicate && (
                          (() => {
                            const isSolved = readOnly || resolutions[med.id] !== undefined || med.resolution !== undefined;
                            return (
                              <View
                                style={{
                                  marginLeft: 6,
                                  backgroundColor: isSolved ? "#d1fae5" : "#ffedd5",
                                  paddingHorizontal: 6,
                                  paddingVertical: 1.5,
                                  borderRadius: 6,
                                  borderWidth: 0.5,
                                  borderColor: isSolved ? "#10b981" : "#f97316",
                                }}
                              >
                                <Text style={{ fontSize: 9, color: isSolved ? "#047857" : "#ea580c", fontWeight: "bold" }}>
                                  {isSolved ? "Solved" : "Conflict"}
                                </Text>
                              </View>
                            );
                          })()
                        )}
                      </View>
                      <Text style={{ fontSize: 11, color: "#64748b", marginTop: 2, fontWeight: "500" }}>
                        {med.type || "Tablet"}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Right side: Action Buttons */}
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  {!readOnly && (
                    <TouchableOpacity
                      onPress={() => onEdit(med)}
                      style={{ padding: 8, marginRight: 2 }}
                    >
                      <Ionicons name="pencil" size={16} color={theme.colors.primary} />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    onPress={() => toggleExpandPill(med.id)}
                    style={{ padding: 8 }}
                  >
                    <Ionicons
                      name={isPillExpanded ? "chevron-up" : "chevron-down"}
                      size={18}
                      color="#64748b"
                    />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>

              {/* Detailed Grid Panel (Shown only when expanded) */}
              {isPillExpanded && (
                <View
                  style={{
                    marginTop: 12,
                    paddingTop: 12,
                    borderTopWidth: 1,
                    borderTopColor: "#e2e8f0",
                  }}
                >
                  <View style={{ flexDirection: "row", flexWrap: "wrap", rowGap: 12 }}>
                    {/* Medicine Name */}
                    <View style={{ width: "50%", flexDirection: "row", alignItems: "center" }}>
                      <Ionicons name="medical-outline" size={14} color="#8a94a6" style={{ marginRight: 6 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 9, color: "#64748b", textTransform: "uppercase", fontWeight: "600" }}>Medicine Name</Text>
                        <Text style={{ fontSize: 12, fontWeight: "700", color: "#1e293b", marginTop: 1 }} numberOfLines={2}>{med.name || "None"}</Text>
                      </View>
                    </View>

                    {/* Type */}
                    <View style={{ width: "50%", flexDirection: "row", alignItems: "center" }}>
                      <Ionicons name="layers-outline" size={14} color="#8a94a6" style={{ marginRight: 6 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 9, color: "#64748b", textTransform: "uppercase", fontWeight: "600" }}>Type</Text>
                        <Text style={{ fontSize: 12, fontWeight: "700", color: "#1e293b", marginTop: 1 }}>{med.type || "Tablet"}</Text>
                      </View>
                    </View>

                    {/* Dose */}
                    <View style={{ width: "50%", flexDirection: "row", alignItems: "center" }}>
                      <Ionicons name="disc-outline" size={14} color="#8a94a6" style={{ marginRight: 6 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 9, color: "#64748b", textTransform: "uppercase", fontWeight: "600" }}>Dose</Text>
                        <Text style={{ fontSize: 12, fontWeight: "700", color: "#1e293b", marginTop: 1 }}>{dosageStr}</Text>
                      </View>
                    </View>

                    {/* Frequency */}
                    <View style={{ width: "50%", flexDirection: "row", alignItems: "center" }}>
                      <Ionicons name="alarm-outline" size={14} color="#8a94a6" style={{ marginRight: 6 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 9, color: "#64748b", textTransform: "uppercase", fontWeight: "600" }}>Frequency</Text>
                        <Text style={{ fontSize: 12, fontWeight: "700", color: "#1e293b", marginTop: 1 }}>{med.frequency || "None"}</Text>
                      </View>
                    </View>

                    {/* Time / Schedule */}
                    <View style={{ width: "50%", flexDirection: "row", alignItems: "center" }}>
                      <Ionicons name="time-outline" size={14} color="#8a94a6" style={{ marginRight: 6 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 9, color: "#64748b", textTransform: "uppercase", fontWeight: "600" }}>Schedule</Text>
                        <Text style={{ fontSize: 12, fontWeight: "700", color: "#1e293b", marginTop: 1 }}>{timeStr}</Text>
                      </View>
                    </View>

                    {/* Total Quantity */}
                    <View style={{ width: "50%", flexDirection: "row", alignItems: "center" }}>
                      <Ionicons name="calculator-outline" size={14} color="#8a94a6" style={{ marginRight: 6 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 9, color: "#64748b", textTransform: "uppercase", fontWeight: "600" }}>Total Quantity</Text>
                        <Text style={{ fontSize: 12, fontWeight: "700", color: "#1e293b", marginTop: 1 }}>{med.total_quantity !== undefined ? med.total_quantity : (med.totalQuantity || "None")}</Text>
                      </View>
                    </View>

                    {/* Refill Alert */}
                    <View style={{ width: "50%", flexDirection: "row", alignItems: "center" }}>
                      <Ionicons name="notifications-outline" size={14} color="#8a94a6" style={{ marginRight: 6 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 9, color: "#64748b", textTransform: "uppercase", fontWeight: "600" }}>Refill Alert</Text>
                        <Text style={{ fontSize: 12, fontWeight: "700", color: "#1e293b", marginTop: 1 }}>
                          {(med.refill_alert || med.refillAlert) ? "Enabled" : "Disabled"}
                        </Text>
                      </View>
                    </View>

                    {/* Food Context */}
                    <View style={{ width: "50%", flexDirection: "row", alignItems: "center" }}>
                      <Ionicons name="restaurant-outline" size={14} color="#8a94a6" style={{ marginRight: 6 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 9, color: "#64748b", textTransform: "uppercase", fontWeight: "600" }}>{t("foodFrequency")}</Text>
                        <Text style={{ fontSize: 12, fontWeight: "700", color: "#1e293b", marginTop: 1 }}>
                          {(() => {
                            const raw = med.foodContext || med.medicationSchedule?.foodContext || med.foodFrequency;
                            if (!raw) return t("none");
                            const normalized = String(raw).toUpperCase().replace(/\s+/g, "_");
                            if (normalized === "BEFORE_FOOD" || normalized === "BEFORE") return t("beforeFood");
                            if (normalized === "AFTER_FOOD" || normalized === "AFTER") return t("afterFood");
                            return t(raw);
                          })()}
                        </Text>
                      </View>
                    </View>

                    {/* Start Date */}
                    <View style={{ width: "50%", flexDirection: "row", alignItems: "center" }}>
                      <Ionicons name="calendar-outline" size={14} color="#8a94a6" style={{ marginRight: 6 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 9, color: "#64748b", textTransform: "uppercase", fontWeight: "600" }}>Start Date</Text>
                        <Text style={{ fontSize: 12, fontWeight: "700", color: "#1e293b", marginTop: 1 }}>
                          {formatStartDate(med.startDate)}
                        </Text>
                      </View>
                    </View>

                    {/* Prescribed By */}
                    <View style={{ width: "50%", flexDirection: "row", alignItems: "center" }}>
                      <Ionicons name="person-outline" size={14} color="#8a94a6" style={{ marginRight: 6 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 9, color: "#64748b", textTransform: "uppercase", fontWeight: "600" }}>Prescribed By</Text>
                        <Text style={{ fontSize: 12, fontWeight: "700", color: "#1e293b", marginTop: 1 }} numberOfLines={1}>{med.prescribedBy || med.prescribed_by || "None"}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Notes / Special Instructions */}
                  <View
                    style={{
                      marginTop: 12,
                      padding: 10,
                      backgroundColor: "#f1f5f9",
                      borderRadius: 8,
                      borderLeftWidth: 3,
                      borderLeftColor: "#10b981",
                    }}
                  >
                    <Text style={{ fontSize: 11, color: "#334155", lineHeight: 15 }}>
                      <Text style={{ fontWeight: "bold", color: "#1e293b" }}>Notes: </Text>
                      {med.notes || "None"}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          );
        })}

        {/* Show All / Hide All Button for medication items > 3 */}
        {displayedMedicines.length > 3 && (
          <TouchableOpacity
            onPress={() => {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setIsExpanded(!isExpanded);
            }}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              paddingVertical: 6,
              paddingHorizontal: 12,
              marginTop: 10,
              backgroundColor: isDark ? "#334155" : "#f1f5f9",
              borderRadius: 20,
              alignSelf: "center",
            }}
          >
            <Text
              style={{
                color: theme.colors.primary,
                fontWeight: "bold",
                marginRight: 6,
                fontSize: 13,
              }}
            >
              {isExpanded ? t("hideAll") || "Hide All" : t("showAll") || "Show All"}
            </Text>
            <Ionicons
              name={isExpanded ? "chevron-up" : "chevron-down"}
              size={16}
              color={theme.colors.primary}
            />
          </TouchableOpacity>
        )}
      </View>

      {(isAnyCheckedMedMissingStartDate || isAnyCheckedMedPastStartDate) && (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: isDark ? "rgba(220, 38, 38, 0.2)" : "#fef2f2",
            borderColor: isDark ? "rgba(220, 38, 38, 0.4)" : "#fca5a5",
            borderWidth: 1,
            borderRadius: 12,
            padding: 12,
            marginBottom: 14,
            marginTop: 4,
          }}
        >
          <Ionicons
            name="calendar-outline"
            size={18}
            color={isDark ? "#fca5a5" : "#ef4444"}
            style={{ marginRight: 8 }}
          />
          <Text
            style={{
              fontSize: 12.5,
              color: isDark ? "#fca5a5" : "#b91c1c",
              fontWeight: "600",
              flex: 1,
              lineHeight: 17,
            }}
          >
            {getStartDateWarningText()}
          </Text>
        </View>
      )}

      {!readOnly && conflictingMeds.length > 0 && (
        <View style={{ marginBottom: 12, paddingHorizontal: 4 }}>
          <Text style={{ fontSize: 12, color: "#ef4444", fontWeight: "600", textAlign: "center" }}>
            ⚠️ Please solve all duplicate conflicts to enable these actions.
          </Text>
        </View>
      )}

      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginTop: 8,
        }}
        pointerEvents={readOnly ? "none" : "auto"}
      >
        <TouchableOpacity
          disabled={areActionsDisabled}
          style={[
            styles.bigActionButtonSide,
            {
              backgroundColor: readOnly
                ? isConfirmChosen
                  ? theme.colors.primary
                  : isDark
                    ? "#334155"
                    : "#e2e8f0"
                : (areActionsDisabled ? "#cbd5e1" : theme.colors.primary),
              flex: 1,
              marginRight: 6,
              opacity: areActionsDisabled ? 0.55 : confirmOpacity,
              borderWidth: isConfirmChosen ? 2 : 0,
              borderColor: isConfirmChosen ? "#ffffff" : "transparent",
            },
          ]}
          onPress={handleConfirm}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {isConfirmChosen && (
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
                  color:
                    readOnly && !isConfirmChosen
                      ? theme.colors.textPrimary
                      : "#ffffff",
                },
              ]}
            >
              {t("confirmSelection")}
            </Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          disabled={areActionsDisabled}
          style={[
            styles.bigActionButtonSide,
            {
              backgroundColor: isDark ? "#334155" : "#e2e8f0",
              flex: 0.5,
              opacity: areActionsDisabled ? 0.55 : addNewOpacity,
              borderWidth: isAddNewChosen ? 2 : 0,
              borderColor: isAddNewChosen
                ? isDark
                  ? "#ffffff"
                  : "#475569"
                : "transparent",
            },
          ]}
          onPress={onAddNew}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {isAddNewChosen && (
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
              {t("addNew")}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        disabled={areActionsDisabled}
        style={[
          styles.skipListButton,
          {
            opacity: areActionsDisabled ? 0.55 : skipAllOpacity,
            alignSelf: "center",
            marginTop: 10,
            borderWidth: isSkipAllChosen ? 1 : 0,
            borderColor: theme.colors.textSecondary,
            borderRadius: 8,
            paddingHorizontal: 8,
            paddingVertical: 4,
          },
        ]}
        onPress={onSkipAll}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {isSkipAllChosen && (
            <Ionicons
              name="checkmark"
              size={14}
              color={theme.colors.textSecondary}
              style={{ marginRight: 4 }}
            />
          )}
          <Text
            style={[styles.skipListText, { color: theme.colors.textSecondary }]}
          >
            {t("skipAll")}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}
