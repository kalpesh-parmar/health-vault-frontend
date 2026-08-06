import React, { useEffect } from "react";
import { ScrollView, View, BackHandler } from "react-native";
import styled from "styled-components/native";
import { useRoute, RouteProp, useIsFocused } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppTheme } from "../../../context/ThemeContext";
import { useAppNavigation } from "../../../types/navigation";
import { useMedicationReview } from "../../../context/MedicationReviewContext";
import ReviewProgressHeader from "../../../components/MedicationReview/ReviewProgressHeader";
import DocumentMedicineCard from "../../../components/MedicationReview/DocumentMedicineCard";
import ExtractedMedicineCard from "../../../components/MedicationReview/ExtractedMedicineCard";
import ReviewLoadingState from "../../../components/MedicationReview/ReviewLoadingState";
import EmptyMedicineState from "../../../components/MedicationReview/EmptyMedicineState";
import { useBottomBarPadding } from "../../../hooks/useBottomBarPadding";
import { StatusBar } from "expo-status-bar";

type ReviewMedicinesRouteProp = RouteProp<
  {
    ReviewMedicines: {
      jobIds: string[];
      filesInfo?: { jobId: string; fileName: string; fileKey: string }[];
      fromScreen?: string;
    };
  },
  "ReviewMedicines"
>;

export const ReviewMedicinesScreen: React.FC = () => {
  const route = useRoute<ReviewMedicinesRouteProp>();
  const navigation = useAppNavigation();
  const { theme, isDark } = useAppTheme();
  const isFocused = useIsFocused();

  const { jobIds = [], filesInfo = [], fromScreen } = route.params || {};

  const {
    documents,
    medicines,
    selectedMedicineIds,
    isLoading,
    initializeReview,
    toggleMedicineSelection,
    clearReviewState,
  } = useMedicationReview();

  // Load extracted medicines from OCR results or mock data
  useEffect(() => {
    if (jobIds.length > 0) {
      initializeReview(jobIds, filesInfo);
    }
    return () => {
      // Don't clear state on unmount, we want state preservation when moving between details and list
    };
  }, [jobIds]);

  useEffect(() => {
    const onBackPress = () => {
      handleBack();
      return true;
    };
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      onBackPress
    );
    return () => subscription.remove();
  }, [fromScreen, navigation]);

  const handleBack = () => {
    clearReviewState();
    if (fromScreen && fromScreen !== "MultiUpload") {
      navigation.navigate(fromScreen as any);
    } else {
      navigation.navigate("Home" as any);
    }
  };

  const handleContinue = () => {
    navigation.navigate("ReviewAllMedicines" as any, { fromScreen });
  };

  const selectedCount = selectedMedicineIds.length;
  const docsWithMeds = documents.filter((doc) => doc.medicines.length > 0).length;

  const bottomPadding = useBottomBarPadding(16, 8);

  if (isLoading) {
    return (
      <SafeContainer edges={["top", "bottom"]} isDark={isDark}>
        <StatusBar style={isDark ? "light" : "dark"} />
        <ReviewProgressHeader title="Review Medicines" onBackPress={handleBack} />
        <ReviewLoadingState message="Loading extracted medicines..." />
      </SafeContainer>
    );
  }

  const hasAnyMeds = medicines.length > 0;

  if (!hasAnyMeds && !isLoading) {
    return (
      <SafeContainer edges={["top", "bottom"]} isDark={isDark}>
        <StatusBar style={isDark ? "light" : "dark"} />
        <ReviewProgressHeader title="Review Medicines" onBackPress={handleBack} />
        <EmptyMedicineState onBackPress={handleBack} />
      </SafeContainer>
    );
  }

  return (
    <SafeContainer edges={["top"]} isDark={isDark}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <ReviewProgressHeader
        title="Review Medicines"
        subtitle={`We found medicines in ${docsWithMeds} document${docsWithMeds === 1 ? "" : "s"}`}
        onBackPress={handleBack}
      />

      <ScrollWrapper contentContainerStyle={{ padding: 20, paddingBottom: bottomPadding + 80 }}>
        {documents
          .filter((doc) => doc.medicines.length > 0)
          .map((doc) => (
            <DocumentMedicineCard key={doc.id} document={doc}>
              {doc.medicines.map((med) => (
                <ExtractedMedicineCard
                  key={med.id}
                  medicine={med}
                  onPress={() => navigation.navigate("MedicineDetails" as any, { medicineId: med.id })}
                  onToggle={() => toggleMedicineSelection(med.id)}
                />
              ))}
            </DocumentMedicineCard>
          ))}
      </ScrollWrapper>

      <StickyFooter isDark={isDark} style={{ paddingBottom: bottomPadding }}>
        <CTAButton
          onPress={handleContinue}
          disabled={selectedCount === 0}
          themeColor={theme.colors.primary}
          activeOpacity={0.8}
          selected={selectedCount > 0}
        >
          <CTAButtonText>Review Selected ({selectedCount})</CTAButtonText>
        </CTAButton>
      </StickyFooter>
    </SafeContainer>
  );
};

const SafeContainer = styled.SafeAreaView<{ isDark: boolean }>`
  flex: 1;
  background-color: ${(props: any) => props.isDark ? "#0c0e17" : "#f7f8fc"};
`;

const ScrollWrapper = styled.ScrollView`
  flex: 1;
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

const CTAButton = styled.TouchableOpacity<{ selected: boolean; themeColor: string }>`
  background-color: ${(props: any) => props.selected ? props.themeColor : "#cbd5e1"};
  height: 50px;
  border-radius: 12px;
  justify-content: center;
  align-items: center;
  elevation: ${(props: any) => props.selected ? 3 : 0};
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

export default ReviewMedicinesScreen;
