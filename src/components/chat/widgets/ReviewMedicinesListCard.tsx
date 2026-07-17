import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, LayoutAnimation, Platform, UIManager } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { widgetStyles as styles } from "./WidgetStyles";
import { I18N_ONBOARDING_UI } from "./OnboardingI18n";
import { parseChosenJson } from "./MedicineHelpers";

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
  const [checkedMeds, setCheckedMeds] = useState<string[]>(
    (localMedicines || []).filter((m) => m.selected).map((m) => m.id),
  );
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  useEffect(() => {
    setCheckedMeds(
      (localMedicines || []).filter((m) => m.selected).map((m) => m.id),
    );
  }, [localMedicines]);

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

  const handleConfirm = () => {
    onConfirm(checkedMeds);
  };

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
      pointerEvents={readOnly ? "none" : "auto"}
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
        {(isExpanded ? safeLocalMedicines : safeLocalMedicines.slice(0, 3)).map((med) => {
          const isChecked = checkedMeds.includes(med.id);
          return (
            <View
              key={med.id}
              style={[
                styles.medListItemRow,
                { borderBottomColor: isDark ? "#334155" : "#f1f5f9" },
              ]}
            >
              <TouchableOpacity
                disabled={readOnly}
                style={{ flexDirection: "row", alignItems: "center", flex: 1 }}
                onPress={() => toggleCheck(med.id)}
              >
                <Ionicons
                  name={isChecked ? "checkbox" : "square-outline"}
                  size={20}
                  color={
                    isChecked
                      ? theme.colors.primary
                      : theme.colors.textSecondary
                  }
                  style={{ marginRight: 10 }}
                />
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.medListItemName,
                      {
                        color: theme.colors.textPrimary,
                        textDecorationLine: isChecked ? "none" : "line-through",
                      },
                    ]}
                  >
                    {med.name}
                  </Text>
                  <Text
                    style={[
                      styles.medListItemSubtitle,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    {med.subtitle}
                  </Text>
                  {med.needsReview &&
                    Object.values(med.needsReview).some((v) => v === true) && (
                      <Text
                        style={{
                          color: "#d97706",
                          fontSize: 11,
                          fontWeight: "600",
                          marginTop: 2,
                        }}
                      >
                        ⚠️ {t("review")}
                      </Text>
                    )}
                </View>
              </TouchableOpacity>
              {!readOnly && (
                <TouchableOpacity
                  style={styles.pencilIconButton}
                  onPress={() => onEdit(med)}
                >
                  <Ionicons
                    name="pencil"
                    size={16}
                    color={theme.colors.primary}
                  />
                </TouchableOpacity>
              )}
            </View>
          );
        })}
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
