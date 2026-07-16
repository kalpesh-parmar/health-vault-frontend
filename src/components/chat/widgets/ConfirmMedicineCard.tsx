import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { widgetStyles as styles } from "./WidgetStyles";
import { I18N_ONBOARDING_UI } from "./OnboardingI18n";
import { parseChosenJson } from "./MedicineHelpers";

export interface ConfirmMedicineCardProps {
  summary: any;
  preferredLang: string;
  isDark: boolean;
  theme: any;
  onConfirm: () => void;
  onEdit: () => void;
  readOnly?: boolean;
  chosenVal?: string | null;
  chosenLabel?: string | null;
}

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
  const title = summary?.title || "";
  const lines = summary?.lines || [];

  const t = (key: string) => {
    const lang = preferredLang || "english";
    const dict = I18N_ONBOARDING_UI[lang] || I18N_ONBOARDING_UI.english;
    return dict[key] || I18N_ONBOARDING_UI.english[key] || key;
  };

  const getLocalizedSummaryLabel = (lbl: string) => {
    const k = lbl.toLowerCase();
    if (k === "type") return t("medicineType");
    if (k === "dose") return t("dose");
    if (k === "frequency") return t("frequency");
    if (k === "times") return t("times") || "Times";
    if (k === "prescribed by") return t("prescribedBy");
    if (k === "notes") return t("notes");
    return lbl;
  };

  const getLineIcon = (key: string) => {
    const k = key.toLowerCase();
    if (k.includes("type")) return "grid-outline";
    if (k.includes("dose")) return "flask-outline";
    if (k.includes("frequency")) return "calendar-outline";
    if (k.includes("times")) return "time-outline";
    if (k.includes("prescribed")) return "person-outline";
    if (k.includes("refill")) return "notifications-outline";
    if (k.includes("quantity")) return "cube-outline";
    if (k.includes("notes")) return "document-text-outline";
    return "information-circle-outline";
  };

  const parsed = parseChosenJson(chosenVal);
  const isConfirmChosen = readOnly && (
    parsed?.confirmed === true ||
    (chosenLabel && String(chosenLabel).toLowerCase().includes("confirm"))
  );
  const isEditChosen = readOnly && (
    parsed?.edit === true ||
    (chosenLabel && String(chosenLabel).toLowerCase().includes("edit"))
  );

  const confirmOpacity = readOnly ? (isConfirmChosen ? 1 : 0.55) : 1;
  const editOpacity = readOnly ? (isEditChosen ? 1 : 0.55) : 1;

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
      <Text style={[styles.medCardTitle, { color: theme.colors.textPrimary }]}>
        {t("verifyTitle")}
      </Text>

      <View
        style={[
          styles.confirmSummaryBox,
          {
            backgroundColor: isDark ? "#0f172a" : "#f8fafc",
            borderColor: isDark ? "#334155" : "#e2e8f0",
          },
        ]}
      >
        <Text
          style={[styles.confirmSummaryTitle, { color: theme.colors.primary, fontWeight: "bold", fontSize: 16 }]}
        >
          {title}
        </Text>
        {lines.map((line: string, i: number) => {
          const colonIdx = line.indexOf(":");
          const label = colonIdx > -1 ? line.substring(0, colonIdx).trim() : "";
          const val =
            colonIdx > -1 ? line.substring(colonIdx + 1).trim() : line;
          const icon = getLineIcon(label || line);

          return (
            <View
              key={i}
              style={[
                styles.summaryLineRow,
                {
                  borderBottomWidth: 1,
                  borderBottomColor: isDark ? "#1e293b" : "#f1f5f9",
                  paddingVertical: 10,
                  alignItems: "center",
                },
              ]}
            >
              <Ionicons
                name={icon as any}
                size={18}
                color={theme.colors.primary}
                style={{ marginRight: 10 }}
              />
              <View style={{ flex: 1 }}>
                {label ? (
                  <Text
                    style={{
                      fontSize: 11,
                      color: theme.colors.textSecondary,
                      textTransform: "uppercase",
                      fontWeight: "600",
                    }}
                  >
                    {getLocalizedSummaryLabel(label)}
                  </Text>
                ) : null}
                <Text
                  style={[
                    styles.summaryLineText,
                    {
                      color: theme.colors.textPrimary,
                      marginTop: 2,
                      fontSize: 14,
                      fontWeight: "bold",
                    },
                  ]}
                >
                  {val}
                </Text>
              </View>
            </View>
          );
        })}
      </View>

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
                ? (isConfirmChosen ? "#10b981" : (isDark ? "#334155" : "#e2e8f0"))
                : "#10b981",
              flex: 1,
              marginRight: 8,
              opacity: confirmOpacity,
              borderWidth: isConfirmChosen ? 2 : 0,
              borderColor: isConfirmChosen ? "#ffffff" : "transparent",
            },
          ]}
          onPress={onConfirm}
        >
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
            {isConfirmChosen && <Ionicons name="checkmark" size={16} color="#fff" style={{ marginRight: 4 }} />}
            <Text
              style={[
                styles.bigActionButtonTextSide,
                { color: (readOnly && !isConfirmChosen) ? theme.colors.textPrimary : "#ffffff" },
              ]}
            >
              {t("confirmSave")}
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
              opacity: editOpacity,
              borderWidth: isEditChosen ? 2 : 0,
              borderColor: isEditChosen ? (isDark ? "#ffffff" : "#475569") : "transparent",
            },
          ]}
          onPress={onEdit}
        >
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
            {isEditChosen && <Ionicons name="checkmark" size={16} color={theme.colors.textPrimary} style={{ marginRight: 4 }} />}
            <Text
              style={[
                styles.bigActionButtonTextSide,
                { color: theme.colors.textPrimary },
              ]}
            >
              {t("edit")}
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

