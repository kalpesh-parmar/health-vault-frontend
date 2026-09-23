import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { I18N_ONBOARDING_UI } from "./OnboardingI18n";

export interface AskAllergiesCardProps {
  activeMsg?: any;
  preferredLang: string;
  isDark?: boolean;
  theme: any;
  sendMessage: (
    userText: string,
    updatedState?: any,
    displayLabel?: string,
  ) => Promise<void> | void;
  state: any;
  setState?: React.Dispatch<React.SetStateAction<any>>;
  isHistorical?: boolean;
  chosenVal?: string | null;
  chosenLabel?: string | null;
  loading?: boolean;
}

export const COMMON_ALLERGIES = [
  { key: "penicillin", defaultLabel: "Penicillin" },
  { key: "aspirin", defaultLabel: "Aspirin" },
  { key: "ibuprofen", defaultLabel: "Ibuprofen" },
  { key: "dust", defaultLabel: "Dust" },
  { key: "pollen", defaultLabel: "Pollen" },
  { key: "peanuts", defaultLabel: "Peanuts" },
  { key: "shellfish", defaultLabel: "Shellfish" },
  { key: "latex", defaultLabel: "Latex" },
];

export function AskAllergiesCard({
  activeMsg,
  preferredLang,
  isDark = false,
  theme,
  sendMessage,
  state,
  setState,
  isHistorical = false,
  chosenVal,
  chosenLabel,
  loading = false,
}: AskAllergiesCardProps) {
  const uiT = (key: string) => {
    const lang = preferredLang || "english";
    const dict = I18N_ONBOARDING_UI[lang] || I18N_ONBOARDING_UI.english;
    return dict[key] || I18N_ONBOARDING_UI.english[key] || key;
  };

  // Determine initial/historical state
  const rawStateAllergies =
    state?.existingUserData?.allergies ||
    activeMsg?.onboardingState?.existingUserData?.allergies ||
    [];
  const existingAllergies: string[] = Array.isArray(rawStateAllergies)
    ? rawStateAllergies
    : [];

  const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
  const sanitizedAllergies = existingAllergies.filter(
    (a) =>
      typeof a === "string" &&
      !bloodGroups.includes(a.trim().toUpperCase().replace(/\s+/g, "")),
  );

  const normChosenVal = chosenVal ? String(chosenVal).toUpperCase() : "";
  const normChosenLabel = chosenLabel ? String(chosenLabel).toLowerCase() : "";

  const isHistoricalNo =
    isHistorical &&
    (normChosenVal === "NO" ||
      normChosenVal === "NOT_SURE" ||
      normChosenLabel === "no" ||
      normChosenLabel === "ના" ||
      normChosenLabel === "नहीं" ||
      normChosenLabel === "नाही" ||
      normChosenLabel === "இல்லை" ||
      normChosenLabel.includes("not sure") ||
      (normChosenVal === "" && sanitizedAllergies.length === 0 && state?.allergiesSkipped));

  const isHistoricalYes =
    isHistorical &&
    !isHistoricalNo &&
    (normChosenVal === "YES" ||
      normChosenVal.includes("ALLERG") ||
      normChosenLabel.includes("yes") ||
      normChosenLabel.includes("હા") ||
      normChosenLabel.includes("हाँ") ||
      normChosenLabel.includes("होय") ||
      normChosenLabel.includes("ஆம்") ||
      normChosenLabel.includes("allerg") ||
      normChosenLabel.includes("એલર્જી") ||
      normChosenLabel.includes("एलर्जी") ||
      normChosenLabel.includes("ऍલर्जी") ||
      normChosenLabel.includes("ஒவ்வாமை") ||
      sanitizedAllergies.length > 0);

  // Local state for active editing
  const [selectedOption, setSelectedOption] = useState<"YES" | "NO" | null>(
    isHistorical ? (isHistoricalYes ? "YES" : isHistoricalNo ? "NO" : null) : null,
  );
  const [allergiesList, setAllergiesList] = useState<string[]>(sanitizedAllergies);
  const [inputValue, setInputValue] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);

  const handleSelectOption = (opt: "YES" | "NO") => {
    if (isHistorical || loading) return;
    setErrorMessage(null);

    if (opt === "NO") {
      // Clear temporary allergy entries, collapse allergy-entry card, and submit No response
      setAllergiesList([]);
      setInputValue("");
      setSelectedOption("NO");

      const updatedState = {
        ...state,
        allergiesSkipped: true,
        existingUserData: {
          ...state?.existingUserData,
          allergies: [],
        },
      };
      if (setState) setState(updatedState);
      sendMessage("NO", updatedState, uiT("allergyNo"));
    } else if (opt === "YES") {
      setSelectedOption("YES");
    }
  };

  const handleToggleCommonAllergy = (name: string) => {
    if (isHistorical || loading) return;
    setErrorMessage(null);
    const existingIndex = allergiesList.findIndex(
      (a) => a.toLowerCase() === name.toLowerCase(),
    );
    if (existingIndex >= 0) {
      setAllergiesList((prev) => prev.filter((_, idx) => idx !== existingIndex));
    } else {
      setAllergiesList((prev) => [...prev, name]);
    }
  };

  const handleAddCustomAllergy = () => {
    if (isHistorical || loading) return;
    const trimmed = inputValue.trim();
    if (!trimmed) return;

    const exists = allergiesList.some(
      (a) => a.toLowerCase() === trimmed.toLowerCase(),
    );
    if (exists) {
      setErrorMessage(uiT("allergyDuplicate"));
      return;
    }

    setErrorMessage(null);
    setAllergiesList((prev) => [...prev, trimmed]);
    setInputValue("");
  };

  const handleRemoveAllergy = (indexToRemove: number) => {
    if (isHistorical || loading) return;
    setAllergiesList((prev) => prev.filter((_, idx) => idx !== indexToRemove));
    setErrorMessage(null);
  };

  const handleCancel = () => {
    if (isHistorical || loading) return;
    setSelectedOption(null);
    setAllergiesList([]);
    setInputValue("");
    setErrorMessage(null);
  };

  const handleContinueYes = () => {
    if (isHistorical || loading) return;

    // If there is text in the input box, commit it first if not duplicate
    let currentAllergies = [...allergiesList];
    const trimmedInput = inputValue.trim();
    if (trimmedInput) {
      const exists = currentAllergies.some(
        (a) => a.toLowerCase() === trimmedInput.toLowerCase(),
      );
      if (!exists) {
        currentAllergies.push(trimmedInput);
        setAllergiesList(currentAllergies);
        setInputValue("");
      }
    }

    if (currentAllergies.length === 0) {
      setErrorMessage(uiT("allergyRequired"));
      return;
    }

    setErrorMessage(null);
    const updatedState = {
      ...state,
      allergiesSkipped: true,
      existingUserData: {
        ...state?.existingUserData,
        allergies: currentAllergies,
      },
    };
    if (setState) setState(updatedState);

    const displayLabel = currentAllergies.join(", ");
    const payload = JSON.stringify({
      action: "ASK_ALLERGIES",
      allergies: currentAllergies,
    });
    sendMessage(payload, updatedState, displayLabel);
  };

  const displayChips = isHistorical
    ? allergiesList.length > 0
      ? allergiesList
      : sanitizedAllergies
    : allergiesList;

  const primaryColor = theme?.colors?.primary || "#5B4BFF";
  const cardBg = isDark ? "#1E293B" : "#FFFFFF";
  const borderColor = isDark ? "#334155" : "#E2E8F0";
  const textColor = isDark ? "#F8FAFC" : "#0F172A";
  const subtextColor = isDark ? "#94A3B8" : "#64748B";

  const isYesSelected =
    (isHistorical && isHistoricalYes) || selectedOption === "YES";
  const isNoSelected =
    (isHistorical && isHistoricalNo) || selectedOption === "NO";

  return (
    <View
      style={styles.container}
      pointerEvents={isHistorical || loading ? "none" : "auto"}
    >
      {/* 
        Answer options appear directly below the chatbot bubble as Yes and No chips.
        No standalone wrapper card around the question or chips.
      */}
      <View style={styles.optionsRow}>
        {/* Yes Chip */}
        <TouchableOpacity
          testID="allergy-option-yes"
          disabled={isHistorical || loading}
          style={[
            styles.optionBtn,
            {
              backgroundColor: isYesSelected
                ? primaryColor
                : isDark
                  ? "#334155"
                  : "#F1F5F9",
              opacity:
                isHistorical && !isHistoricalYes
                  ? 0.45
                  : loading
                    ? 0.6
                    : 1,
            },
          ]}
          onPress={() => handleSelectOption("YES")}
        >
          {isYesSelected && (
            <Ionicons
              name="checkmark"
              size={14}
              color="#fff"
              style={styles.btnIcon}
            />
          )}
          <Text
            style={[
              styles.optionBtnText,
              {
                color: isYesSelected ? "#FFFFFF" : textColor,
              },
            ]}
          >
            {uiT("allergyYes")}
          </Text>
        </TouchableOpacity>

        {/* No Chip */}
        <TouchableOpacity
          testID="allergy-option-no"
          disabled={isHistorical || loading}
          style={[
            styles.optionBtn,
            {
              backgroundColor: isNoSelected
                ? primaryColor
                : isDark
                  ? "#334155"
                  : "#F1F5F9",
              opacity:
                isHistorical && !isHistoricalNo
                  ? 0.45
                  : loading
                    ? 0.6
                    : 1,
            },
          ]}
          onPress={() => handleSelectOption("NO")}
        >
          {isNoSelected && (
            <Ionicons
              name="checkmark"
              size={14}
              color="#fff"
              style={styles.btnIcon}
            />
          )}
          <Text
            style={[
              styles.optionBtnText,
              {
                color: isNoSelected ? "#FFFFFF" : textColor,
              },
            ]}
          >
            {uiT("allergyNo")}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 
        Add Allergies Input Card:
        Shown ONLY when user selects Yes.
        Feels like an inline interactive answer component, not a new question.
      */}
      {selectedOption === "YES" && !isHistorical && (
        <View
          testID="add-allergies-card"
          style={[
            styles.addAllergiesCard,
            {
              backgroundColor: cardBg,
              borderColor,
            },
          ]}
        >
          {/* Assistant / In-chat prompt: Please add your allergies */}
          <Text
            testID="add-allergies-prompt"
            style={[
              styles.cardPrompt,
              { color: isDark ? "#A5B4FC" : primaryColor },
            ]}
          >
            {uiT("pleaseAddYourAllergies")}
          </Text>

          {/* Title: Add Your Allergies */}
          <Text
            testID="add-allergies-title"
            style={[styles.cardTitle, { color: textColor }]}
          >
            {uiT("addYourAllergiesTitle")}
          </Text>

          {/* Quick Selectable Common Allergy Chips */}
          <View style={styles.commonChipsContainer}>
            {COMMON_ALLERGIES.map((item) => {
              const label = uiT(`allergy_${item.key}`) || item.defaultLabel;
              const isSelected = allergiesList.some(
                (a) =>
                  a.toLowerCase() === label.toLowerCase() ||
                  a.toLowerCase() === item.defaultLabel.toLowerCase(),
              );
              return (
                <TouchableOpacity
                  key={item.key}
                  testID={`common-allergy-chip-${item.key}`}
                  onPress={() => handleToggleCommonAllergy(label)}
                  style={[
                    styles.commonChip,
                    {
                      backgroundColor: isSelected
                        ? isDark
                          ? "rgba(91, 75, 255, 0.3)"
                          : "rgba(91, 75, 255, 0.14)"
                        : isDark
                          ? "#334155"
                          : "#F1F5F9",
                      borderColor: isSelected ? primaryColor : borderColor,
                    },
                  ]}
                >
                  {isSelected && (
                    <Ionicons
                      name="checkmark"
                      size={12}
                      color={primaryColor}
                      style={{ marginRight: 4 }}
                    />
                  )}
                  <Text
                    style={[
                      styles.commonChipText,
                      {
                        color: isSelected ? primaryColor : textColor,
                        fontWeight: isSelected ? "600" : "500",
                      },
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Custom Allergy Text Input + Add Button */}
          <View style={styles.inputRow}>
            <TextInput
              testID="allergy-input"
              ref={inputRef}
              value={inputValue}
              onChangeText={(t) => {
                setInputValue(t);
                if (errorMessage) setErrorMessage(null);
              }}
              placeholder={uiT("allergyInputPlaceholder")}
              placeholderTextColor={subtextColor}
              returnKeyType="done"
              onSubmitEditing={handleAddCustomAllergy}
              style={[
                styles.textInput,
                {
                  color: textColor,
                  backgroundColor: isDark ? "#0F172A" : "#F8FAFC",
                  borderColor: errorMessage ? "#EF4444" : borderColor,
                },
              ]}
            />
            <TouchableOpacity
              testID="allergy-add-btn"
              onPress={handleAddCustomAllergy}
              disabled={!inputValue.trim()}
              style={[
                styles.addBtn,
                {
                  backgroundColor: inputValue.trim()
                    ? primaryColor
                    : isDark
                      ? "#334155"
                      : "#E2E8F0",
                },
              ]}
            >
              <Ionicons
                name="add"
                size={18}
                color={inputValue.trim() ? "#FFFFFF" : subtextColor}
              />
              <Text
                style={[
                  styles.addBtnText,
                  {
                    color: inputValue.trim() ? "#FFFFFF" : subtextColor,
                  },
                ]}
              >
                {uiT("addAllergy")}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Error Message */}
          {errorMessage && (
            <View style={styles.errorRow}>
              <Ionicons name="alert-circle" size={14} color="#EF4444" />
              <Text testID="allergy-error-text" style={styles.errorText}>
                {errorMessage}
              </Text>
            </View>
          )}

          {/* Display all added allergies as removable chips */}
          {displayChips.length > 0 && (
            <View style={styles.addedSection}>
              <Text style={[styles.addedLabel, { color: subtextColor }]}>
                {uiT("addedAllergiesLabel")}
              </Text>
              <View style={styles.addedChipsRow}>
                {displayChips.map((allergy, idx) => (
                  <View
                    key={`${allergy}-${idx}`}
                    style={[
                      styles.addedChip,
                      {
                        backgroundColor: isDark
                          ? "rgba(91, 75, 255, 0.25)"
                          : "rgba(91, 75, 255, 0.12)",
                        borderColor: primaryColor,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.addedChipText,
                        { color: isDark ? "#E0E7FF" : primaryColor },
                      ]}
                    >
                      {String(allergy).toUpperCase()}
                    </Text>
                    <TouchableOpacity
                      testID={`allergy-remove-chip-${idx}`}
                      onPress={() => handleRemoveAllergy(idx)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      style={styles.removeChipBtn}
                    >
                      <Ionicons
                        name="close-circle"
                        size={16}
                        color={isDark ? "#A5B4FC" : primaryColor}
                      />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Action Buttons: Cancel and Continue */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              testID="allergy-cancel-btn"
              onPress={handleCancel}
              style={[
                styles.cancelBtn,
                {
                  borderColor,
                  backgroundColor: isDark ? "#334155" : "#F1F5F9",
                },
              ]}
            >
              <Text style={[styles.cancelBtnText, { color: textColor }]}>
                {uiT("cancel")}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              testID="allergy-continue-btn"
              onPress={handleContinueYes}
              disabled={loading || (displayChips.length === 0 && !inputValue.trim())}
              style={[
                styles.continueBtn,
                {
                  backgroundColor: primaryColor,
                  opacity:
                    loading || (displayChips.length === 0 && !inputValue.trim())
                      ? 0.5
                      : 1,
                },
              ]}
            >
              <Text style={styles.continueBtnText}>
                {uiT("continueButton")}
              </Text>
              <Ionicons
                name="arrow-forward"
                size={16}
                color="#FFFFFF"
                style={{ marginLeft: 6 }}
              />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Historical Read-Only View for Allergies */}
      {isHistorical && isHistoricalYes && displayChips.length > 0 && (
        <View
          testID="add-allergies-historical"
          style={[
            styles.addAllergiesCard,
            {
              backgroundColor: cardBg,
              borderColor,
              marginTop: 10,
            },
          ]}
        >
          <Text style={[styles.addedLabel, { color: subtextColor }]}>
            {uiT("addedAllergiesLabel")}
          </Text>
          <View style={styles.addedChipsRow}>
            {displayChips.map((allergy, idx) => (
              <View
                key={`${allergy}-${idx}`}
                style={[
                  styles.addedChip,
                  {
                    backgroundColor: isDark
                      ? "rgba(91, 75, 255, 0.25)"
                      : "rgba(91, 75, 255, 0.12)",
                    borderColor: primaryColor,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.addedChipText,
                    { color: isDark ? "#E0E7FF" : primaryColor },
                  ]}
                >
                  {allergy}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    marginTop: 4,
  },
  optionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  optionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    minHeight: 38,
  },
  btnIcon: {
    marginRight: 6,
  },
  optionBtnText: {
    fontSize: 13,
    fontWeight: "600",
  },
  addAllergiesCard: {
    width: "100%",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    marginTop: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardPrompt: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 10,
  },
  commonChipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 12,
  },
  commonChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  commonChipText: {
    fontSize: 12,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  textInput: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 13,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 10,
    gap: 4,
  },
  addBtnText: {
    fontSize: 13,
    fontWeight: "600",
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  errorText: {
    color: "#EF4444",
    fontSize: 12,
  },
  addedSection: {
    marginTop: 4,
    marginBottom: 12,
  },
  addedLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  addedChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  addedChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 5,
    paddingLeft: 10,
    paddingRight: 8,
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
  },
  addedChipText: {
    fontSize: 12,
    fontWeight: "600",
  },
  removeChipBtn: {
    justifyContent: "center",
    alignItems: "center",
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 6,
  },
  cancelBtn: {
    paddingVertical: 9,
    paddingHorizontal: 18,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: "600",
  },
  continueBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  continueBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
});
