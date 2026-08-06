import React, { useState } from "react";
import {
  Animated,
  View,
  Platform,
  Keyboard,
  ActivityIndicator,
  Text,
} from "react-native";
import { format } from "date-fns";
import styled from "styled-components/native";
import { AddOrEditMedication } from "../types";
import ModernLoader from "./shared/Loader";
import { useAppTheme } from "../context/ThemeContext";
import {
  useMedicationFormState,
  MedicationFormFields,
} from "./shared/MedicationFormFields";

interface MedicationFormProps {
  initialData?: AddOrEditMedication;
  onSubmit: (data: AddOrEditMedication) => void;
  isLoading: boolean;
  onScroll?: (...args: any[]) => void;
  operation?: string;
}

const MedicationForm = ({
  initialData,
  onSubmit,
  isLoading,
  onScroll,
  operation,
}: MedicationFormProps) => {
  const { theme, isDark } = useAppTheme();
  const formState = useMedicationFormState(initialData, "english");
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

  const handleSubmit = () => {
    const errors: string[] = [];
    if (!formName.trim()) {
      errors.push("Name is required");
    }
    if (formType !== "TABLET" && formType !== "CAPSULE") {
      if (!formUnit) {
        errors.push("Unit is required");
      }
    }
    const N = formFreq === "ONCE" ? 1 : formFreq === "TWICE" ? 2 : 3;
    if (selectedSlots.length !== N) {
      errors.push(`Please select exactly ${N} reminder times`);
    }

    const parsedQty = parseInt(formQty.trim(), 10);
    if (!formQty.trim() || isNaN(parsedQty) || parsedQty <= 0) {
      errors.push("Total Quantity is required");
    }

    if (errors.length > 0) {
      setLocalErrors(errors);
      return;
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

    sortedTimes.forEach((timeStr, index) => {
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

    onSubmit({
      medicationName: formName.trim(),
      medicationType: formType,
      prescribedBy: formPrescribed.trim(),
      dosePerIntake:
        formType === "TABLET" || formType === "CAPSULE"
          ? formCount
          : formVal,
      frequency: formFreq === "ONCE" ? "Once Daily" : formFreq === "TWICE" ? "Twice Daily" : "3x Daily",
      foodFrequency: formFoodFreq,
      startDate: startDate ? format(startDate, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
      ongoing: true, // medication is ongoing by default
      medicationSchedule: scheduleObj,
      totalQuantity: parsedQty,
      notes: formNotes.trim(),
      // reminderBeforeMinutes is completely removed!
    });
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollContent
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
        <ModernLoader visible={isLoading} title="This May Take A While." />
        <Card style={{ marginTop: 0 }}>
          <MedicationFormFields
            formState={formState}
            isDark={isDark}
            theme={theme}
            preferredLang="english"
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
          <SaveButton onPress={handleSubmit} disabled={isLoading}>
            {isLoading ? (
              <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                <ActivityIndicator color="#ffffff" />
                <SaveButtonText>Saving...</SaveButtonText>
              </View>
            ) : (
              <SaveButtonText>Save Medication</SaveButtonText>
            )}
          </SaveButton>
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

export const Footer = styled.View`
  padding: 10px 0px 55px;
`;

export const SaveButton = styled.TouchableOpacity`
  background-color: #6366f1;
  padding: 18px;
  border-radius: 18px;
  align-items: center;
  shadow-color: #6366f1;
  shadow-opacity: 0.3;
  elevation: 8;
`;

const SaveButtonText = styled.Text`
  color: white;
  font-size: 16px;
  font-weight: 800;
`;
