import React, { useState } from "react";
import {
  Animated,
  View,
  Platform,
  Keyboard,
  ActivityIndicator,
  Text,
  TouchableOpacity,
} from "react-native";
import { format } from "date-fns";
import styled from "styled-components/native";
import { Ionicons } from "@expo/vector-icons";
import { AddOrEditMedication } from "../types";
import ModernLoader from "./shared/Loader";
import { useAppTheme } from "../context/ThemeContext";
import {
  useMedicationFormState,
  MedicationFormFields,
} from "./shared/MedicationFormFields";
import { useAppConstants } from "../utils/translationUtils";
import { usePreferredLanguage } from "../hooks/usePreferredLanguage";

interface MedicationFormProps {
  initialData?: AddOrEditMedication;
  onSubmit: (data: AddOrEditMedication) => void;
  isLoading: boolean;
  onScroll?: (...args: any[]) => void;
  operation?: string;
  drafts?: AddOrEditMedication[];
  currentIndex?: number;
  onAddAndContinue?: (data: AddOrEditMedication) => void;
  onReview?: (data?: AddOrEditMedication | null) => void;
  onNavigateDraft?: (index: number, currentData?: AddOrEditMedication | null) => void;
  onCancel?: () => void;
}

const MedicationForm = ({
  initialData,
  onSubmit,
  isLoading,
  onScroll,
  operation = "add",
  drafts = [],
  currentIndex = 0,
  onAddAndContinue,
  onReview,
  onNavigateDraft,
  onCancel,
}: MedicationFormProps) => {
  const { theme, isDark } = useAppTheme();
  const constants = useAppConstants();
  const preferredLang = usePreferredLanguage();
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
  const [keyboardPadding, setKeyboardPadding] = useState(0);

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

  React.useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      () => {
        setKeyboardPadding(Platform.OS === "ios" ? 150 : 200);
      }
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => {
        setKeyboardPadding(0);
      }
    );

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const scrollRef = React.useRef<any>(null);

  React.useEffect(() => {
    scrollRef.current?.scrollTo?.({ y: 0, animated: false });
  }, [currentIndex]);

  const buildMedicationPayload = (): AddOrEditMedication | null => {
    const errors: string[] = [];
    if (!formName.trim()) {
      errors.push(constants?.nameIsRequired || "Name is required");
    }
    if (formType !== "TABLET" && formType !== "CAPSULE") {
      if (!formUnit) {
        errors.push(constants?.unitIsRequired || "Unit is required");
      }
    }
    const N = formFreq === "ONCE" ? 1 : formFreq === "TWICE" ? 2 : 3;
    if (selectedSlots.length !== N) {
      errors.push(
        constants?.selectExactReminderTimes
          ? `${constants.selectExactReminderTimes} (${N})`
          : `Please select exactly ${N} reminder times`
      );
    }

    const parsedQty = parseInt(formQty.trim(), 10);
    if (!formQty.trim() || isNaN(parsedQty) || parsedQty <= 0) {
      errors.push(constants?.totalQuantityRequired || "Total Quantity is required");
    }

    if (errors.length > 0) {
      setLocalErrors(errors);
      return null;
    }

    setLocalErrors([]);

    // Transform times array to record for backward compatibility
    const scheduleObj: Record<string, any> = {};
    const sortedTimes = [...selectedSlots].sort((a, b) => {
      const [ha, ma] = a.split(":").map(Number);
      const [hb, mb] = b.split(":").map(Number);
      if (ha !== hb) return ha - hb;
      return ma - mb;
    });

    sortedTimes.forEach((timeStr) => {
      let key = "CUSTOM";
      if (timeStr === "08:00") key = "MORNING";
      else if (timeStr === "14:00") key = "NOON";
      else if (timeStr === "20:00") key = "NIGHT";

      const timeWithSec = `${timeStr}:00`;
      if (scheduleObj[key]) {
        if (Array.isArray(scheduleObj[key])) {
          scheduleObj[key].push(timeWithSec);
        } else {
          scheduleObj[key] = [scheduleObj[key], timeWithSec];
        }
      } else {
        scheduleObj[key] = key === "CUSTOM" ? [timeWithSec] : timeWithSec;
      }
    });

    return {
      client_med_id: initialData?.client_med_id || `draft_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      id: initialData?.id,
      medicationName: formName.trim(),
      medicationType: formType,
      prescribedBy: formPrescribed.trim(),
      dosePerIntake:
        formType === "TABLET" || formType === "CAPSULE"
          ? parseFloat(String(formCount)) || 1
          : parseFloat(String(formVal)) || 1,
      frequency: formFreq === "ONCE" ? "Once Daily" : formFreq === "TWICE" ? "Twice Daily" : "3x Daily",
      foodFrequency: formFoodFreq,
      startDate: startDate ? format(startDate, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
      ongoing: true,
      medicationSchedule: scheduleObj,
      totalQuantity: parsedQty,
      notes: formNotes.trim(),
    };
  };

  const handleSubmit = () => {
    const data = buildMedicationPayload();
    if (!data) return;
    onSubmit(data);
  };

  const handleAddAndContinue = () => {
    const data = buildMedicationPayload();
    if (!data) return;
    if (onAddAndContinue) {
      onAddAndContinue(data);
    }
  };

  const handleReview = () => {
    if (formName.trim()) {
      const data = buildMedicationPayload();
      if (!data) return;
      onReview?.(data);
    } else {
      onReview?.(null);
    }
  };

  const isAddMode = operation === "add";
  const canGoLeft = isAddMode && currentIndex > 0;
  const canGoRight = isAddMode && currentIndex < drafts.length;

  return (
    <View style={{ flex: 1 }}>
      <ScrollContent
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        bounces={false}
        overScrollMode="never"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingTop: 220,
          paddingBottom: keyboardPadding + 40,
        }}
      >
        <ModernLoader visible={isLoading} title={constants?.thisMayTakeAWhile || "This May Take A While."} />

        {/* Stepper Navigation for Batch Adding */}
        {isAddMode && (drafts.length > 0 || currentIndex > 0) && (
          <StepperCard isDark={isDark}>
            <TouchableOpacity
              disabled={!canGoLeft || isLoading}
              activeOpacity={0.7}
              onPress={() => onNavigateDraft?.(currentIndex - 1, formName.trim() ? buildMedicationPayload() : null)}
              style={{
                paddingVertical: 6,
                paddingHorizontal: 10,
                borderRadius: 8,
                backgroundColor: isDark ? "#334155" : "#f1f5f9",
                opacity: canGoLeft ? 1 : 0.3,
              }}
            >
              <Ionicons
                name="chevron-back"
                size={20}
                color={canGoLeft ? (isDark ? "#f8fafc" : "#1e293b") : isDark ? "#64748b" : "#94a3b8"}
              />
            </TouchableOpacity>

            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "700",
                  color: isDark ? "#f8fafc" : "#1e293b",
                }}
              >
                {constants?.medicine || "Medicine"} #{currentIndex + 1}
              </Text>
              {currentIndex < drafts.length && (
                <View
                  style={{
                    marginLeft: 8,
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderRadius: 4,
                    backgroundColor: isDark ? "#064e3b" : "#d1fae5",
                  }}
                >
                  <Text style={{ fontSize: 10, fontWeight: "700", color: isDark ? "#6ee7b7" : "#047857" }}>
                    {constants?.added || "Added"}
                  </Text>
                </View>
              )}
            </View>

            <TouchableOpacity
              disabled={!canGoRight || isLoading}
              activeOpacity={0.7}
              onPress={() => onNavigateDraft?.(currentIndex + 1, formName.trim() ? buildMedicationPayload() : null)}
              style={{
                paddingVertical: 6,
                paddingHorizontal: 10,
                borderRadius: 8,
                backgroundColor: isDark ? "#334155" : "#f1f5f9",
                opacity: canGoRight ? 1 : 0.3,
              }}
            >
              <Ionicons
                name="chevron-forward"
                size={20}
                color={canGoRight ? (isDark ? "#f8fafc" : "#1e293b") : isDark ? "#64748b" : "#94a3b8"}
              />
            </TouchableOpacity>
          </StepperCard>
        )}

        {/* Ready to review banner */}
        {isAddMode && drafts.length > 0 && (
          <ReviewBanner
            onPress={handleReview}
            activeOpacity={0.8}
            isDark={isDark}
          >
            <Ionicons
              name="file-tray-full-outline"
              size={18}
              color={isDark ? "#818cf8" : "#4f46e5"}
              style={{ marginRight: 8 }}
            />
            <Text
              style={{
                fontSize: 13,
                fontWeight: "600",
                color: isDark ? "#c7d2fe" : "#3730a3",
                flex: 1,
              }}
            >
              {drafts.length} {drafts.length > 1 ? (constants?.medicines || "medicines") : (constants?.medicine || "medicine")} {constants?.added || "added"} ·{" "}
              <Text style={{ textDecorationLine: "underline", fontWeight: "700" }}>
                {constants?.reviewAll || "Review All"}
              </Text>
            </Text>
            <Ionicons
              name="arrow-forward"
              size={16}
              color={isDark ? "#818cf8" : "#4f46e5"}
            />
          </ReviewBanner>
        )}

        <Card style={{ marginTop: 0 }}>
          <MedicationFormFields
            formState={formState}
            isDark={isDark}
            theme={theme}
            preferredLang={preferredLang}
          />

          {localErrors.length > 0 && (
            <View style={{ marginTop: 12 }}>
              {localErrors.map((err, i) => (
                <Text key={i} style={{ color: "#ef4444", fontSize: 12, marginVertical: 2 }}>
                  • {err}
                </Text>
              ))}
            </View>
          )}
        </Card>

        <Footer>
          {isAddMode ? (
            <View style={{ gap: 10 }}>
              <View style={{ flexDirection: "row", gap: 10 }}>
                {/* Add & Continue Button */}
                <AddAndContinueButton
                  onPress={handleAddAndContinue}
                  disabled={isLoading}
                  isDark={isDark}
                >
                  <Ionicons
                    name="add"
                    size={18}
                    color={isDark ? "#a5b4fc" : "#4f46e5"}
                    style={{ marginRight: 4 }}
                  />
                  <AddAndContinueButtonText isDark={isDark}>
                    {constants?.addAndContinue || "Add & Continue"}
                  </AddAndContinueButtonText>
                </AddAndContinueButton>

                {/* Review & Save or Save Button */}
                {drafts.length > 0 ? (
                  <SaveButton
                    style={{ flex: 1 }}
                    onPress={handleReview}
                    disabled={isLoading}
                  >
                    <View style={{ flexDirection: "row", gap: 6, alignItems: "center", justifyContent: "center" }}>
                      <Ionicons name="list" size={18} color="#ffffff" />
                      <SaveButtonText numberOfLines={1}>
                        {constants?.review || "Review"} ({drafts.length + (formName.trim() ? 1 : 0)})
                      </SaveButtonText>
                    </View>
                  </SaveButton>
                ) : (
                  <SaveButton
                    style={{ flex: 1 }}
                    onPress={handleSubmit}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                        <ActivityIndicator color="#ffffff" />
                        <SaveButtonText>{constants?.saving || "Saving..."}</SaveButtonText>
                      </View>
                    ) : (
                      <SaveButtonText>{constants?.saveMedication || "Save Medication"}</SaveButtonText>
                    )}
                  </SaveButton>
                )}
              </View>

              {onCancel && (
                <CancelButton onPress={onCancel} disabled={isLoading} isDark={isDark}>
                  <CancelButtonText isDark={isDark}>{constants?.cancel || "Cancel"}</CancelButtonText>
                </CancelButton>
              )}
            </View>
          ) : (
            <SaveButton onPress={handleSubmit} disabled={isLoading}>
              {isLoading ? (
                <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                  <ActivityIndicator color="#ffffff" />
                  <SaveButtonText>{constants?.saving || "Saving..."}</SaveButtonText>
                </View>
              ) : (
                <SaveButtonText>{constants?.saveMedication || "Save Medication"}</SaveButtonText>
              )}
            </SaveButton>
          )}
        </Footer>
      </ScrollContent>
    </View>
  );
};

export default MedicationForm;

const ScrollContent = styled(Animated.ScrollView)`
  flex: 1;
  padding-horizontal: 20px;
`;

export const Card = styled.View`
  background-color: white;
  border-radius: 24px;
  padding: 22px;
  margin-bottom: 20px;
  elevation: 5;
  shadow-opacity: 0.05;
  shadow-radius: 15px;
  shadow-color: #000;
`;

const StepperCard = styled.View<{ isDark: boolean }>`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  background-color: ${(props: any) => (props.isDark ? "#1e293b" : "#ffffff")};
  border-radius: 16px;
  padding: 12px 16px;
  margin-bottom: 12px;
  border-width: 1px;
  border-color: ${(props: any) => (props.isDark ? "#334155" : "#e2e8f0")};
`;

const ReviewBanner = styled.TouchableOpacity<{ isDark: boolean }>`
  flex-direction: row;
  align-items: center;
  background-color: ${(props: any) =>
    props.isDark ? "rgba(99, 102, 241, 0.15)" : "#eef2ff"};
  padding: 12px 16px;
  border-radius: 14px;
  margin-bottom: 14px;
  border-width: 1px;
  border-color: ${(props: any) =>
    props.isDark ? "rgba(99, 102, 241, 0.3)" : "#c7d2fe"};
`;

export const Footer = styled.View`
  padding: 10px 0px 55px;
`;

export const AddAndContinueButton = styled.TouchableOpacity<{ isDark: boolean }>`
  flex: 1;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  padding: 18px 12px;
  border-radius: 18px;
  background-color: ${(props: any) =>
    props.isDark ? "rgba(99, 102, 241, 0.15)" : "#eef2ff"};
  border-width: 1.5px;
  border-color: ${(props: any) =>
    props.isDark ? "rgba(99, 102, 241, 0.4)" : "#818cf8"};
`;

export const AddAndContinueButtonText = styled.Text<{ isDark: boolean }>`
  font-size: 15px;
  font-weight: 700;
  color: ${(props: any) => (props.isDark ? "#a5b4fc" : "#4f46e5")};
`;

export const SaveButton = styled.TouchableOpacity`
  background-color: #6366f1;
  padding: 18px;
  border-radius: 18px;
  align-items: center;
  justify-content: center;
  shadow-color: #6366f1;
  shadow-opacity: 0.3;
  elevation: 8;
`;

const SaveButtonText = styled.Text`
  color: white;
  font-size: 15px;
  font-weight: 800;
`;

const CancelButton = styled.TouchableOpacity<{ isDark: boolean }>`
  padding: 14px;
  border-radius: 16px;
  align-items: center;
  justify-content: center;
  background-color: ${(props: any) => (props.isDark ? "#1e293b" : "#f1f5f9")};
  border-width: 1px;
  border-color: ${(props: any) => (props.isDark ? "#334155" : "#cbd5e1")};
`;

const CancelButtonText = styled.Text<{ isDark: boolean }>`
  font-size: 14px;
  font-weight: 600;
  color: ${(props: any) => (props.isDark ? "#94a3b8" : "#64748b")};
`;
