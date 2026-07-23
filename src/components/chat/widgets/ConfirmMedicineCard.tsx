import React, { useState } from "react";
import { View, Text, TouchableOpacity, LayoutAnimation, Platform, UIManager } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Path } from "react-native-svg";
import { widgetStyles as styles } from "./WidgetStyles";
import { I18N_ONBOARDING_UI } from "./OnboardingI18n";
import { parseChosenJson, MedicineIcon } from "./MedicineHelpers";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export interface ConfirmMedicineCardProps {
  summary: any;
  preferredLang: string;
  isDark: boolean;
  theme: any;
  onConfirm: () => void;
  onEdit: (med?: any) => void;
  readOnly?: boolean;
  chosenVal?: string | null;
  chosenLabel?: string | null;
}

interface ParsedMed {
  id: string;
  title: string;
  subtitle: string;
  type: string;
  dosage: string;
  frequency: string;
  schedule: string;
  prescribedBy: string;
  notes: string;
  original: any;
}

const getMedCategoryFallback = (name: string): string => {
  const n = name.toLowerCase();
  if (n.includes("amoxicillin") || n.includes("penicillin") || n.includes("azithromycin") || n.includes("clavulanate")) return "ANTIBIOTIC";
  if (n.includes("paracetamol") || n.includes("acetaminophen") || n.includes("crocin") || n.includes("dolo")) return "PAINKILLER / FEVER REDUCER";
  if (n.includes("cetirizine") || n.includes("loratadine") || n.includes("fexofenadine") || n.includes("allergy")) return "ANTIHISTAMINE";
  if (n.includes("ibuprofen") || n.includes("naproxen") || n.includes("aspirin")) return "PAINKILLER / NSAID";
  if (n.includes("metformin") || n.includes("insulin") || n.includes("glycomet")) return "ANTIDIABETIC";
  if (n.includes("atorvastatin") || n.includes("simvastatin") || n.includes("lipitor")) return "CHOLESTEROL LOWERING";
  if (n.includes("lisinopril") || n.includes("amlodipine") || n.includes("losartan")) return "ANTIHYPERTENSIVE";
  return "MEDICATION";
};

export function ConfirmMedicineCard({
  summary,
  preferredLang,
  isDark,
  theme,
  onConfirm,
  onEdit,
  readOnly,
  chosenVal,
  chosenLabel,
}: ConfirmMedicineCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const t = (key: string) => {
    const lang = preferredLang || "english";
    const dict = I18N_ONBOARDING_UI[lang] || I18N_ONBOARDING_UI.english;
    return dict[key] || I18N_ONBOARDING_UI.english[key] || key;
  };

  // Safe parse list of medicines
  const rawMeds = Array.isArray(summary?.medicines)
    ? summary.medicines
    : Array.isArray(summary?.medications)
    ? summary.medications
    : Array.isArray(summary)
    ? summary
    : [summary];

  const medicines: ParsedMed[] = rawMeds.filter(Boolean).map((med: any, index: number) => {
    const title = med.title || med.name || med.medicationName || "";
    let subtitle = med.subtitle || med.category || med.medicationType || "";
    let type = med.type || med.medicationType || "";
    let dosage = med.dosage || med.dose || med.dosePerIntake || "";
    let frequency = med.frequency || "";
    let schedule = med.schedule || med.medicationSchedule || med.times || "";
    let prescribedBy = med.prescribedBy || med.prescribed_by || "";
    let notes = med.notes || med.instructions || med.foodFrequency || "";
    const id = med.id || `med-${index}`;

    if (Array.isArray(med.lines)) {
      med.lines.forEach((line: string) => {
        const colonIdx = line.indexOf(":");
        const label = colonIdx > -1 ? line.substring(0, colonIdx).trim().toLowerCase() : "";
        const val = colonIdx > -1 ? line.substring(colonIdx + 1).trim() : line.trim();

        if (label === "type" || label === "medicine type") type = val;
        else if (label === "dose" || label === "dosage" || label === "doseperintake") dosage = val;
        else if (label === "frequency") frequency = val;
        else if (label === "schedule" || label === "times" || label === "medicationschedule") schedule = val;
        else if (label === "prescribed by" || label === "prescribedby") prescribedBy = val;
        else if (label === "notes" || label === "instructions" || label === "foodfrequency") notes = val;
        else if (label === "category") subtitle = val;
      });
    }

    if (typeof schedule === "object" && schedule !== null) {
      schedule = Object.entries(schedule)
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ");
    }

    if (!subtitle) {
      subtitle = getMedCategoryFallback(title);
    }

    return {
      id,
      title,
      subtitle: subtitle ? String(subtitle).toUpperCase() : "",
      type: String(type),
      dosage: String(dosage),
      frequency: String(frequency),
      schedule: String(schedule),
      prescribedBy: String(prescribedBy),
      notes: String(notes),
      original: med,
    };
  });

  const parsed = parseChosenJson(chosenVal);
  const isConfirmChosen = readOnly && (
    parsed?.confirmed === true ||
    (chosenLabel && String(chosenLabel).toLowerCase().includes("confirm"))
  );

  const confirmOpacity = readOnly ? (isConfirmChosen ? 1 : 0.55) : 1;

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded(!isExpanded);
  };

  const visibleMeds = isExpanded ? medicines : medicines.slice(0, 3);
  const remainingCount = medicines.length - 3;

  const getMedTheme = (name: string, type: string) => {
    const normName = (name || "").toLowerCase();
    const normType = (type || "").toLowerCase();

    if (normName.includes("amoxicillin") || normName.includes("antibiotic") || normType.includes("antibiotic")) {
      return {
        bgColor: isDark ? "#2a2845" : "#f5f3ff",
        iconColor: "#6366f1",
        iconType: "TABLET"
      };
    }
    if (normName.includes("paracetamol") || normName.includes("pain") || normType.includes("pain")) {
      return {
        bgColor: isDark ? "#1b3629" : "#ecfdf5",
        iconColor: "#10b981",
        iconType: "DROPS"
      };
    }
    if (normName.includes("cetirizine") || normName.includes("histamine") || normType.includes("histamine") || normType.includes("allergy")) {
      return {
        bgColor: isDark ? "#3a2f1b" : "#fffbeb",
        iconColor: "#f59e0b",
        iconType: "CAPSULE"
      };
    }
    if (normType.includes("capsule")) {
      return {
        bgColor: isDark ? "#3a2f1b" : "#fffbeb",
        iconColor: "#f59e0b",
        iconType: "CAPSULE"
      };
    }
    if (normType.includes("drops") || normType.includes("syrup") || normType.includes("liquid")) {
      return {
        bgColor: isDark ? "#1b3629" : "#ecfdf5",
        iconColor: "#10b981",
        iconType: "DROPS"
      };
    }
    return {
      bgColor: isDark ? "#1c2e42" : "#eff6ff",
      iconColor: "#3b82f6",
      iconType: "TABLET"
    };
  };

  return (
    <View
      pointerEvents={readOnly ? "none" : "auto"}
      style={[
        styles.medConfirmCard,
        {
          backgroundColor: isDark ? "#1e293b" : "#ffffff",
          borderColor: isDark ? "#334155" : "#e2e8f0",
          opacity: readOnly ? 1 : 1,
        },
      ]}
    >
      <Text style={[styles.medCardTitle, { color: theme.colors.textPrimary, fontSize: 16 }]}>
        {t("verifyTitle")}
      </Text>

      {visibleMeds.map((med) => {
        const medTheme = getMedTheme(med.title, med.type || med.subtitle);

        return (
          <View
            key={med.id}
            style={{
              backgroundColor: isDark ? "#151f32" : "#ffffff",
              borderColor: isDark ? "#2d3748" : "#f1f5f9",
              borderWidth: 1,
              borderRadius: 16,
              padding: 16,
              marginBottom: 12,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 2,
              elevation: 1,
            }}
          >
            {/* Header Row */}
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: medTheme.bgColor,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <MedicineIcon type={medTheme.iconType} size={20} color={medTheme.iconColor} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={{ fontSize: 15, fontWeight: "bold", color: "#6366f1" }}>
                  {med.title}
                </Text>
                {med.subtitle ? (
                  <Text style={{ fontSize: 10, color: theme.colors.textSecondary, marginTop: 1, fontWeight: "600" }}>
                    {med.subtitle}
                  </Text>
                ) : null}
              </View>
              {!readOnly && (
                <TouchableOpacity
                  onPress={() => onEdit(med.original)}
                  style={{
                    padding: 8,
                    borderRadius: 20,
                    backgroundColor: isDark ? "#2d3748" : "#f1f5f9",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="pencil" size={16} color={theme.colors.primary} />
                </TouchableOpacity>
              )}
            </View>

            {/* Grid details */}
            <View style={{ flexDirection: "row", marginTop: 4 }}>
              {/* Column 1 */}
              <View style={{ flex: 1, marginRight: 8 }}>
                {/* Type */}
                <View style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: 10 }}>
                  <Ionicons name="grid-outline" size={15} color="#8a94a6" style={{ marginTop: 2, marginRight: 8 }} />
                  <View>
                    <Text style={{ fontSize: 10, color: theme.colors.textSecondary, textTransform: "uppercase" }}>
                      {t("medicineType")}
                    </Text>
                    <Text style={{ fontSize: 13, fontWeight: "600", color: theme.colors.textPrimary, marginTop: 1 }}>
                      {med.type || "Tablet"}
                    </Text>
                  </View>
                </View>
                {/* Frequency */}
                <View style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: med.prescribedBy ? 10 : 0 }}>
                  <Ionicons name="alarm-outline" size={15} color="#8a94a6" style={{ marginTop: 2, marginRight: 8 }} />
                  <View>
                    <Text style={{ fontSize: 10, color: theme.colors.textSecondary, textTransform: "uppercase" }}>
                      {t("frequency")}
                    </Text>
                    <Text style={{ fontSize: 13, fontWeight: "600", color: theme.colors.textPrimary, marginTop: 1 }}>
                      {med.frequency || "Once"}
                    </Text>
                  </View>
                </View>
                {/* Prescribed by */}
                {med.prescribedBy ? (
                  <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                    <Ionicons name="person-outline" size={15} color="#8a94a6" style={{ marginTop: 2, marginRight: 8 }} />
                    <View>
                      <Text style={{ fontSize: 10, color: theme.colors.textSecondary, textTransform: "uppercase" }}>
                        {t("prescribedBy")}
                      </Text>
                      <Text style={{ fontSize: 13, fontWeight: "600", color: theme.colors.textPrimary, marginTop: 1 }}>
                        {med.prescribedBy}
                      </Text>
                    </View>
                  </View>
                ) : null}
              </View>

              {/* Column 2 */}
              <View style={{ flex: 1, marginLeft: 8 }}>
                {/* Dosage */}
                <View style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: 10 }}>
                  <Ionicons name="disc-outline" size={15} color="#8a94a6" style={{ marginTop: 2, marginRight: 8 }} />
                  <View>
                    <Text style={{ fontSize: 10, color: theme.colors.textSecondary, textTransform: "uppercase" }}>
                      {t("dose")}
                    </Text>
                    <Text style={{ fontSize: 13, fontWeight: "600", color: theme.colors.textPrimary, marginTop: 1 }}>
                      {med.dosage || "1 tablet"}
                    </Text>
                  </View>
                </View>
                {/* Schedule */}
                <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                  <Ionicons name="time-outline" size={15} color="#8a94a6" style={{ marginTop: 2, marginRight: 8 }} />
                  <View>
                    <Text style={{ fontSize: 10, color: theme.colors.textSecondary, textTransform: "uppercase" }}>
                      {t("schedule")}
                    </Text>
                    <Text style={{ fontSize: 13, fontWeight: "600", color: theme.colors.textPrimary, marginTop: 1 }}>
                      {med.schedule || "None"}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Special Instructions (Notes) */}
            {med.notes ? (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: isDark ? "#1c2431" : "#f5f3ff",
                  borderLeftWidth: 4,
                  borderLeftColor: "#10b981",
                  borderRadius: 8,
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  marginTop: 12,
                }}
              >
                <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" style={{ marginRight: 8 }}>
                  <Path
                    d="M18 2H6L8 22H16L18 2Z"
                    stroke="#10b981"
                    strokeWidth="2"
                    strokeLinejoin="round"
                  />
                  <Path
                    d="M7 10H17"
                    stroke="#10b981"
                    strokeWidth="1.5"
                  />
                </Svg>
                <Text style={{ flex: 1, fontSize: 12, color: theme.colors.textPrimary }}>
                  {med.notes}
                </Text>
              </View>
            ) : null}
          </View>
        );
      })}

      {/* Expand / Collapse Button */}
      {medicines.length > 3 && (
        <TouchableOpacity
          onPress={toggleExpand}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            paddingVertical: 8,
            marginTop: 4,
          }}
        >
          <Text
            style={{
              color: "#6366f1",
              fontWeight: "bold",
              fontSize: 13,
              marginRight: 4,
            }}
          >
            {isExpanded
              ? t("showLess") || "Show less"
              : `+ ${remainingCount} more medicines`}
          </Text>
          <Ionicons
            name={isExpanded ? "chevron-up" : "chevron-down"}
            size={16}
            color="#6366f1"
          />
        </TouchableOpacity>
      )}

      {/* Action Buttons: Confirm & Save only */}
      <View
        style={{
          marginTop: 16,
          width: "100%",
        }}
        pointerEvents={readOnly ? "none" : "auto"}
      >
        <TouchableOpacity
          disabled={readOnly}
          style={[
            styles.bigActionButtonSide,
            {
              backgroundColor: readOnly
                ? (isConfirmChosen ? "#10b981" : (isDark ? "#334155" : "#e2e8f0"))
                : "#10b981",
              width: "100%",
              opacity: confirmOpacity,
              borderWidth: isConfirmChosen ? 2 : 0,
              borderColor: isConfirmChosen ? "#ffffff" : "transparent",
              borderRadius: 14,
              paddingVertical: 12,
            },
          ]}
          onPress={onConfirm}
        >
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
            {isConfirmChosen && (
              <Ionicons
                name="checkmark"
                size={16}
                color="#ffffff"
                style={{ marginRight: 6 }}
              />
            )}
            <Text
              style={[
                styles.bigActionButtonTextSide,
                {
                  color: (readOnly && !isConfirmChosen) ? theme.colors.textPrimary : "#ffffff",
                  fontSize: 14,
                  fontWeight: "bold",
                },
              ]}
            >
              {t("confirmSave") || "Confirm & Save"}
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}
