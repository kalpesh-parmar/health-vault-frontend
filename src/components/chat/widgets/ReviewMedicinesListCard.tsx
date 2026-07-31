import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, LayoutAnimation, Platform, UIManager } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { widgetStyles as styles } from "./WidgetStyles";
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

export interface ReviewMedicinesListCardProps {
  localMedicines: any[];
  setLocalMedicines: React.Dispatch<React.SetStateAction<any[]>>;
  preferredLang: string;
  isDark: boolean;
  theme: any;
  onConfirm: (checkedMeds: string[]) => void;
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
    onConfirm(checkedMeds);
  };

  // Translation helper
  const t = (key: string) => {
    const lang = preferredLang || "english";
    const dict = I18N_ONBOARDING_UI[lang] || I18N_ONBOARDING_UI.english;
    return dict[key] || I18N_ONBOARDING_UI.english[key] || key;
  };

  const safeLocalMedicines = localMedicines || [];

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
        {/* Render medicine list - display first 3 items or all if isExpanded is active */}
        {(isExpanded ? safeLocalMedicines : safeLocalMedicines.slice(0, 3)).map((med) => {
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
                      <Text
                        numberOfLines={1}
                        ellipsizeMode="tail"
                        style={{
                          fontSize: 14,
                          fontWeight: "bold",
                          color: "#1e293b",
                          textDecorationLine: isChecked ? "none" : "line-through",
                        }}
                      >
                        {med.name}
                      </Text>
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
                        <Text style={{ fontSize: 9, color: "#64748b", textTransform: "uppercase", fontWeight: "600" }}>Food Context</Text>
                        <Text style={{ fontSize: 12, fontWeight: "700", color: "#1e293b", marginTop: 1 }}>
                          {formatFoodContext(med.foodContext || med.medicationSchedule?.foodContext || med.foodFrequency)}
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
        {safeLocalMedicines.length > 3 && (
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

      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginTop: 8,
        }}
        pointerEvents={readOnly ? "none" : "auto"}
      >
        <TouchableOpacity
          disabled={readOnly}
          style={[
            styles.bigActionButtonSide,
            {
              backgroundColor: readOnly
                ? isConfirmChosen
                  ? theme.colors.primary
                  : isDark
                    ? "#334155"
                    : "#e2e8f0"
                : theme.colors.primary,
              flex: 1,
              marginRight: 6,
              opacity: confirmOpacity,
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
          disabled={readOnly}
          style={[
            styles.bigActionButtonSide,
            {
              backgroundColor: isDark ? "#334155" : "#e2e8f0",
              flex: 0.5,
              opacity: addNewOpacity,
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
        disabled={readOnly}
        style={[
          styles.skipListButton,
          {
            opacity: skipAllOpacity,
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
