import React, { useEffect } from "react";
import { BackHandler } from "react-native";
import styled from "styled-components/native";
import { Ionicons } from "@expo/vector-icons";
import { useRoute, RouteProp, useIsFocused } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { queryClient } from "../../../config/queryClient";
import { useAppTheme } from "../../../context/ThemeContext";
import { useAppNavigation } from "../../../types/navigation";
import { useMedicationReview } from "../../../context/MedicationReviewContext";
import { useDocumentUpload } from "../../../context/DocumentUploadContext";
import { StatusBar } from "expo-status-bar";

type SuccessRouteProp = RouteProp<
  {
    MedicinesSuccess: {
      count: number;
    };
  },
  "MedicinesSuccess"
>;

export const MedicinesSuccessScreen: React.FC = () => {
  const route = useRoute<SuccessRouteProp>();
  const navigation = useAppNavigation();
  const { theme, isDark } = useAppTheme();
  const isFocused = useIsFocused();
  
  const { count = 0 } = route.params || {};
  const { clearReviewState } = useMedicationReview();
  const { clearCompletedBatch } = useDocumentUpload();

  // Invalidate queries so that Medications list and home dashboard reload their data
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ["medications"] });
    queryClient.invalidateQueries({ queryKey: ["allMedications"] });
    queryClient.invalidateQueries({ queryKey: ["filteredMedications"] });
    queryClient.invalidateQueries({ queryKey: ["todayReminders"] });
    queryClient.invalidateQueries({ queryKey: ["allReminders"] });
    queryClient.invalidateQueries({ queryKey: ["allRemindersCounts"] });
  }, []);

  useEffect(() => {
    if (!isFocused) return;

    const onBackPress = () => {
      handleGoToHome();
      return true;
    };
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      onBackPress
    );
    return () => subscription.remove();
  }, [isFocused]);

  const handleGoToMedications = () => {
    clearReviewState();
    clearCompletedBatch();
    // Navigate to Medications screen
    navigation.navigate("MedicationStack" as any, {
      screen: "MedicationList",
    });
  };

  const handleGoToHome = () => {
    clearReviewState();
    clearCompletedBatch();
    // Reset back to Dashboard (Home)
    navigation.reset({
      index: 0,
      routes: [{ name: "Home" as any }],
    });
  };

  return (
    <SafeContainer edges={["top", "bottom"]} isDark={isDark}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <ContentArea>
        <SuccessIconCircle themeColor={theme.colors.success}>
          <Ionicons name="checkmark-sharp" size={48} color="#ffffff" />
        </SuccessIconCircle>

        <SuccessTitle isDark={isDark}>Medicines Added</SuccessTitle>
        <SuccessTitle isDark={isDark}>Successfully!</SuccessTitle>
        
        <SuccessSubtitle isDark={isDark}>
          {count} medicine{count === 1 ? "" : "s"} have been added to your Health Vault.
        </SuccessSubtitle>
      </ContentArea>

      <Footer>
        <CTAButton
          onPress={handleGoToMedications}
          themeColor={theme.colors.primary}
          activeOpacity={0.8}
        >
          <CTAButtonText>Go to Medications</CTAButtonText>
        </CTAButton>

        <SecondaryButton onPress={handleGoToHome} activeOpacity={0.7}>
          <SecondaryButtonText isDark={isDark}>Back to Home</SecondaryButtonText>
        </SecondaryButton>
      </Footer>
    </SafeContainer>
  );
};

const SafeContainer = styled(SafeAreaView)<{ isDark: boolean }>`
  flex: 1;
  background-color: ${(props: any) => props.isDark ? "#0c0e17" : "#f7f8fc"};
  justify-content: space-between;
  padding: 24px;
`;

const ContentArea = styled.View`
  flex: 1;
  justify-content: center;
  align-items: center;
  margin-top: 40px;
`;

const SuccessIconCircle = styled.View<{ themeColor: string }>`
  width: 96px;
  height: 96px;
  border-radius: 48px;
  background-color: ${(props: any) => props.themeColor};
  justify-content: center;
  align-items: center;
  margin-bottom: 32px;
  elevation: 4;
  shadow-color: ${(props: any) => props.themeColor};
  shadow-offset: 0px 4px;
  shadow-opacity: 0.3;
  shadow-radius: 8px;
`;

const SuccessTitle = styled.Text<{ isDark: boolean }>`
  font-size: 28px;
  font-weight: 800;
  color: ${(props: any) => props.isDark ? "#f8fafc" : "#1e293b"};
  text-align: center;
  line-height: 36px;
`;

const SuccessSubtitle = styled.Text<{ isDark: boolean }>`
  font-size: 15px;
  color: ${(props: any) => props.isDark ? "#94a3b8" : "#64748b"};
  text-align: center;
  margin-top: 16px;
  line-height: 22px;
  padding-horizontal: 20px;
`;

const Footer = styled.View`
  width: 100%;
  margin-bottom: 12px;
`;

const CTAButton = styled.TouchableOpacity<{ themeColor: string }>`
  background-color: ${(props: any) => props.themeColor};
  height: 52px;
  border-radius: 14px;
  justify-content: center;
  align-items: center;
  elevation: 3;
  shadow-color: #000;
  shadow-offset: 0px 4px;
  shadow-opacity: 0.12;
  shadow-radius: 6px;
`;

const CTAButtonText = styled.Text`
  color: #ffffff;
  font-size: 16px;
  font-weight: 700;
`;

const SecondaryButton = styled.TouchableOpacity`
  height: 50px;
  justify-content: center;
  align-items: center;
  margin-top: 12px;
`;

const SecondaryButtonText = styled.Text<{ isDark: boolean }>`
  font-size: 14px;
  font-weight: 700;
  color: ${(props: any) => props.isDark ? "#94a3b8" : "#64748b"};
`;

export default MedicinesSuccessScreen;
