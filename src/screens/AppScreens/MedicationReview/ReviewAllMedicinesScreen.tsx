import React from "react";
import { ScrollView, View } from "react-native";
import styled from "styled-components/native";
import { useRoute, RouteProp } from "@react-navigation/native";
import { useAppTheme } from "../../../context/ThemeContext";
import { useAppNavigation } from "../../../types/navigation";
import { useMedicationReview } from "../../../context/MedicationReviewContext";
import ReviewProgressHeader from "../../../components/MedicationReview/ReviewProgressHeader";
import DocumentMedicineCard from "../../../components/MedicationReview/DocumentMedicineCard";
import ExtractedMedicineCard from "../../../components/MedicationReview/ExtractedMedicineCard";
import { SafeAreaView } from "react-native-safe-area-context";
import { useBottomBarPadding } from "../../../hooks/useBottomBarPadding";
import { StatusBar } from "expo-status-bar";

type ReviewAllMedicinesRouteProp = RouteProp<
  {
    ReviewAllMedicines: {
      fromScreen?: string;
    };
  },
  "ReviewAllMedicines"
>;

export const ReviewAllMedicinesScreen: React.FC = () => {
  const route = useRoute<ReviewAllMedicinesRouteProp>();
  const navigation = useAppNavigation();
  const { theme, isDark } = useAppTheme();

  const { fromScreen } = route.params || {};

  const {
    documents,
    medicines,
    selectedMedicineIds,
    toggleMedicineSelection,
  } = useMedicationReview();

  const totalCount = medicines.length;
  const selectedCount = selectedMedicineIds.length;

  const handleBack = () => {
    navigation.goBack();
  };

  const handleContinue = () => {
    navigation.navigate("ConfirmMedicines" as any, { fromScreen });
  };

  const bottomPadding = useBottomBarPadding(16, 8);

  return (
    <SafeContainer edges={["top"]} isDark={isDark}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <ReviewProgressHeader
        title="Review Medicines"
        rightText={`${selectedCount} of ${totalCount} selected`}
        onBackPress={handleBack}
      />

      <ScrollWrapper contentContainerStyle={{ padding: 20, paddingBottom: bottomPadding + 80 }}>
        {documents.map((doc) => (
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
          <CTAButtonText>Continue ({selectedCount} Selected)</CTAButtonText>
        </CTAButton>
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

export default ReviewAllMedicinesScreen;
