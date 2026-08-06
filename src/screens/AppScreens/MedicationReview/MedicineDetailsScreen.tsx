import React, { useState } from "react";
import { ScrollView, View, TouchableOpacity, Alert, Text, KeyboardAvoidingView, Platform } from "react-native";
import styled from "styled-components/native";
import { useRoute, RouteProp } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppTheme } from "../../../context/ThemeContext";
import { useAppNavigation } from "../../../types/navigation";
import { useMedicationReview } from "../../../context/MedicationReviewContext";
import { ExtractedMedicine } from "../../../types/medicationReview";
import ReviewProgressHeader from "../../../components/MedicationReview/ReviewProgressHeader";
import {
  useMedicationFormState,
  MedicationFormFields,
} from "../../../components/shared/MedicationFormFields";
import { useBottomBarPadding } from "../../../hooks/useBottomBarPadding";
import { StatusBar } from "expo-status-bar";

type DetailsRouteProp = RouteProp<
  {
    MedicineDetails: {
      medicineId: string;
    };
  },
  "MedicineDetails"
>;

export const MedicineDetailsScreen: React.FC = () => {
  const route = useRoute<DetailsRouteProp>();
  const navigation = useAppNavigation();
  const { theme, isDark } = useAppTheme();

  const { medicineId } = route.params || {};
  const { medicines, updateMedicineDraft } = useMedicationReview();

  const originalMedicine = medicines.find((m) => m.id === medicineId);

  if (!originalMedicine) {
    return (
      <SafeContainer edges={["top"]} isDark={isDark}>
        <StatusBar style={isDark ? "light" : "dark"} />
        <ReviewProgressHeader title="Details Not Found" onBackPress={() => navigation.goBack()} />
        <ErrorText>Medicine details not found.</ErrorText>
      </SafeContainer>
    );
  }

  // Map original medicine data to unified format
  const initialMedData = {
    ...originalMedicine,
    medicationName: originalMedicine.name,
    medicationType: originalMedicine.medicineType || "TABLET",
    dose: originalMedicine.dosageDetails || {
      count: parseFloat(originalMedicine.dosage || "1") || 1,
      value: parseFloat(originalMedicine.dosage || "1") || 1,
      unit: originalMedicine.dosageUnit || "ml",
    },
    dosage: originalMedicine.dosage,
    dosageUnit: originalMedicine.dosageUnit,
    frequency: originalMedicine.frequency || "ONCE",
    notes: originalMedicine.notes || "",
    prescribed_by: originalMedicine.prescribedBy,
    refill_alert: originalMedicine.refillAlert !== undefined ? originalMedicine.refillAlert : originalMedicine.refillAlertEnabled,
    total_quantity: originalMedicine.totalQuantity,
    foodContext: originalMedicine.foodFrequency || originalMedicine.timing,
    startDate: originalMedicine.startDate,
    medicationSchedule: originalMedicine.medicationSchedule,
  };

  const formState = useMedicationFormState(initialMedData, "english");
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

  const handleBack = () => {
    navigation.goBack();
  };

  const handleSaveChanges = () => {
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

    const qty = parseInt(formQty.trim(), 10);
    if (!formQty.trim() || isNaN(qty) || qty <= 0) {
      errors.push("Total Quantity is required");
    }

    if (errors.length > 0) {
      setLocalErrors(errors);
      return;
    }

    setLocalErrors([]);

    const updatedMed: ExtractedMedicine = {
      ...originalMedicine,
      name: formName.trim(),
      medicineType: formType,
      dosage: formType === "TABLET" || formType === "CAPSULE" ? String(formCount) : String(formVal),
      dosageUnit: formType === "TABLET" || formType === "CAPSULE" ? (formType === "TABLET" ? "tablet" : "capsule") : formUnit,
      frequency: formFreq === "ONCE" ? "Once Daily" : formFreq === "TWICE" ? "Twice Daily" : "3x Daily",
      timing: formFoodFreq === "BEFORE_FOOD" ? "Before Food" : "After Food",
      foodFrequency: formFoodFreq,
      prescribedBy: formPrescribed.trim(),
      totalQuantity: qty,
      notes: formNotes.trim(),
      refillAlert: formRefill,
      refillAlertEnabled: formRefill,
      medicationSchedule: selectedSlots,
      dosageDetails: formType === "TABLET" || formType === "CAPSULE" 
        ? { count: formCount } 
        : { value: formVal, unit: formUnit },
    };

    updateMedicineDraft(updatedMed);
    navigation.goBack();
  };

  const bottomPadding = useBottomBarPadding(16, 8);

  return (
    <SafeContainer edges={["top"]} isDark={isDark}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <ReviewProgressHeader
        title={originalMedicine.name || "Edit Medicine"}
        subtitle={originalMedicine.documentName}
        onBackPress={handleBack}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 20 : 0}
      >
        <ScrollWrapper contentContainerStyle={{ padding: 20, paddingBottom: bottomPadding + 80 }}>
          <CardContainer isDark={isDark}>
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
          </CardContainer>
        </ScrollWrapper>

        <StickyFooter isDark={isDark} style={{ paddingBottom: bottomPadding }}>
          <CTAButton
            onPress={handleSaveChanges}
            themeColor={theme.colors.primary}
            activeOpacity={0.8}
          >
            <CTAButtonText>Save Changes</CTAButtonText>
          </CTAButton>
        </StickyFooter>
      </KeyboardAvoidingView>
    </SafeContainer>
  );
};

const SafeContainer = styled(SafeAreaView)<{ isDark: boolean }>`
  flex: 1;
  background-color: ${(props: any) => props.isDark ? "#0c0e17" : "#f7f8fc"};
`;

const ErrorText = styled.Text`
  font-size: 16px;
  text-align: center;
  color: #ef4444;
  margin-top: 40px;
`;

const ScrollWrapper = styled.ScrollView`
  flex: 1;
`;

const CardContainer = styled.View<{ isDark: boolean }>`
  background-color: ${(props: any) => props.isDark ? "#1e293b" : "#ffffff"};
  border-width: 1px;
  border-color: ${(props: any) => props.isDark ? "#334155" : "#e2e8f0"};
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 20px;
`;

const StickyFooter = styled.View<{ isDark: boolean }>`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding-horizontal: 20px;
  padding-top: 14px;
  padding-bottom: 24px;
  background-color: ${(props: any) => props.isDark ? "#121420" : "#ffffff"};
  border-top-width: 1px;
  border-top-color: ${(props: any) => props.isDark ? "#222538" : "#f1f5f9"};
`;

const CTAButton = styled.TouchableOpacity<{ themeColor: string }>`
  background-color: ${(props: any) => props.themeColor};
  height: 50px;
  border-radius: 12px;
  justify-content: center;
  align-items: center;
  elevation: 3;
  shadow-color: #000;
  shadow-offset: 0px 4px;
  shadow-opacity: 0.10;
  shadow-radius: 6px;
`;

const CTAButtonText = styled.Text`
  color: #ffffff;
  font-size: 15px;
  font-weight: 700;
`;

export default MedicineDetailsScreen;
