import React, { useState } from "react";
import { ActivityIndicator } from "react-native";
import styled from "styled-components/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { useRoute, RouteProp } from "@react-navigation/native";
import { useAppTheme } from "../../../context/ThemeContext";
import { useAppNavigation } from "../../../types/navigation";
import { useMedicationReview } from "../../../context/MedicationReviewContext";
import ReviewProgressHeader from "../../../components/MedicationReview/ReviewProgressHeader";
import MedicineSummaryCard from "../../../components/MedicationReview/MedicineSummaryCard";
import { useBottomBarPadding } from "../../../hooks/useBottomBarPadding";
import { StatusBar } from "expo-status-bar";
import { useDocumentUpload } from "../../../context/DocumentUploadContext";

type ConfirmMedicinesRouteProp = RouteProp<
  {
    ConfirmMedicines: {
      fromScreen?: string;
    };
  },
  "ConfirmMedicines"
>;

export const ConfirmMedicinesScreen: React.FC = () => {
  const route = useRoute<ConfirmMedicinesRouteProp>();
  const navigation = useAppNavigation();
  const { theme, isDark } = useAppTheme();

  const { fromScreen } = route.params || {};

  const { medicines, saveReview, clearReviewState } = useMedicationReview();
  const { clearCompletedBatch } = useDocumentUpload();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedMeds = medicines.filter((m) => m.selected);
  const selectedCount = selectedMeds.length;

  const handleBack = () => {
    navigation.goBack();
  };

  const handleConfirmSave = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      await saveReview();
      
      Toast.show({
        type: "success",
        text1: "Success",
        text2: `${selectedCount} medicine${selectedCount === 1 ? "" : "s"} added successfully!`,
      });

      // Reset states
      clearReviewState();
      clearCompletedBatch();

      // Replace navigation stack directly to fromScreen to complete document flow successfully
      if (fromScreen) {
        if (fromScreen === "AIChat" || fromScreen === "AIChatScreen") {
          navigation.reset({
            index: 1,
            routes: [
              { name: "Home" as any },
              { name: "AIChat" as any }
            ]
          });
        } else if (fromScreen === "MedicationList" || fromScreen === "MedicationScreen" || fromScreen === "Medication") {
          navigation.reset({
            index: 1,
            routes: [
              { name: "Home" as any },
              { name: "MedicationStack" as any, params: { screen: "MedicationList" } }
            ]
          });
        } else {
          navigation.reset({
            index: 0,
            routes: [{ name: fromScreen as any }]
          });
        }
      } else {
        navigation.reset({
          index: 0,
          routes: [{ name: "Home" as any }]
        });
      }
    } catch (error: any) {
      console.error("[ConfirmMedicinesScreen] Save failed:", error);
      Toast.show({
        type: "error",
        text1: "Unable to add medicines",
        text2: error.message || "Something went wrong. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const bottomPadding = useBottomBarPadding(16, 8);

  return (
    <SafeContainer edges={["top"]} isDark={isDark}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <ReviewProgressHeader title="Review & Confirm" onBackPress={handleBack} />

      <ScrollWrapper contentContainerStyle={{ padding: 20, paddingBottom: bottomPadding + 130 }}>
        <HeaderIllustrationContainer>
          <IllustrationCircle themeColor={theme.colors.primary}>
            <MaterialCommunityIcons
              name="clipboard-check-outline"
              size={48}
              color={theme.colors.primary}
            />
          </IllustrationCircle>
          <IllustrationTitle isDark={isDark}>Review & Confirm</IllustrationTitle>
          <IllustrationSubtitle isDark={isDark}>
            You are about to add {selectedCount} medicine{selectedCount === 1 ? "" : "s"} to your Health Vault.
          </IllustrationSubtitle>
        </HeaderIllustrationContainer>

        <SectionLabel isDark={isDark}>{selectedCount} Selected Medicine{selectedCount === 1 ? "" : "s"}</SectionLabel>

        {selectedMeds.map((med) => (
          <MedicineSummaryCard key={med.id} medicine={med} />
        ))}
      </ScrollWrapper>

      <StickyFooter isDark={isDark} style={{ paddingBottom: bottomPadding }}>
        <CTAButton
          onPress={handleConfirmSave}
          disabled={isSubmitting}
          themeColor={theme.colors.primary}
          activeOpacity={0.8}
        >
          {isSubmitting ? (
            <LoadingRow>
              <ActivityIndicator size="small" color="#ffffff" style={{ marginRight: 8 }} />
              <CTAButtonText>Saving...</CTAButtonText>
            </LoadingRow>
          ) : (
            <CTAButtonText>Confirm & Save</CTAButtonText>
          )}
        </CTAButton>

        <SecondaryButton
          onPress={handleBack}
          disabled={isSubmitting}
          activeOpacity={0.7}
        >
          <SecondaryButtonText isDark={isDark}>Back to Edit</SecondaryButtonText>
        </SecondaryButton>
      </StickyFooter>
    </SafeContainer>
  );
};

const SafeContainer = styled(SafeAreaView)<{ isDark: boolean }>`
  flex: 1;
  background-color: ${(props: any) => props.isDark ? "#0c0e17" : "#f7f8fc"};
`;

const ScrollWrapper = styled.ScrollView`
  flex: 1;
`;

const HeaderIllustrationContainer = styled.View`
  align-items: center;
  margin-top: 10px;
  margin-bottom: 24px;
`;

const IllustrationCircle = styled.View<{ themeColor: string }>`
  width: 90px;
  height: 90px;
  border-radius: 45px;
  background-color: ${(props: any) => props.themeColor + "15"};
  justify-content: center;
  align-items: center;
  margin-bottom: 16px;
`;

const IllustrationTitle = styled.Text<{ isDark: boolean }>`
  font-size: 22px;
  font-weight: 800;
  color: ${(props: any) => props.isDark ? "#f8fafc" : "#1e293b"};
  margin-bottom: 8px;
`;

const IllustrationSubtitle = styled.Text<{ isDark: boolean }>`
  font-size: 14px;
  color: ${(props: any) => props.isDark ? "#94a3b8" : "#64748b"};
  text-align: center;
  line-height: 20px;
  padding-horizontal: 20px;
`;

const SectionLabel = styled.Text<{ isDark: boolean }>`
  font-size: 14px;
  font-weight: 800;
  color: ${(props: any) => props.isDark ? "#94a3b8" : "#64748b"};
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 16px;
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

const LoadingRow = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: center;
`;

const SecondaryButton = styled.TouchableOpacity`
  height: 48px;
  justify-content: center;
  align-items: center;
  margin-top: 8px;
`;

const SecondaryButtonText = styled.Text<{ isDark: boolean }>`
  font-size: 14px;
  font-weight: 700;
  color: ${(props: any) => props.isDark ? "#94a3b8" : "#64748b"};
`;

export default ConfirmMedicinesScreen;
