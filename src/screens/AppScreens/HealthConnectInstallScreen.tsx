import React, { useMemo } from "react";
import { ScrollView, View, Text } from "react-native";
import styled from "styled-components/native";
import { LinearGradient } from "expo-linear-gradient";
import * as Device from "expo-device";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useCallback } from "react";
import { Ionicons } from "@expo/vector-icons";

import { useAppTheme } from "../../context/ThemeContext";
import { healthConnectSession } from "../../services/wearable/HealthConnectSession";
import { useWearablePermissions } from "../../hooks/useWearablePermissions";
import { I18N_ONBOARDING_UI } from "../../components/chat/widgets/OnboardingI18n";
import {
  WizardStepHeader,
  WizardProgressDots,
  WizardChecklistItem,
  WizardPrimaryButton,
  WizardSecondaryLink,
} from "../../components/wearable/WizardPrimitives";

export function HealthConnectInstallScreen() {
  const navigation = useNavigation<any>();
  const { isDark, theme } = useAppTheme();
  const { isAvailable, checkPermissions } = useWearablePermissions();

  useFocusEffect(
    useCallback(() => {
      checkPermissions();
    }, [checkPermissions])
  );

  const apiLevel = Device.platformApiLevel ?? 33;
  const isAndroid14Plus = apiLevel >= 34;

  const getText = (key: string): string => {
    return I18N_ONBOARDING_UI.english[key] || key;
  };

  const handleInstallOrOpen = async () => {
    if (isAndroid14Plus) {
      await healthConnectSession.openHealthConnectSettings();
    } else {
      await healthConnectSession.openHealthConnectInPlayStore();
    }
  };

  return (
    <Container colors={isDark ? ["#0b1220", "#0f172a"] : ["#f5f3ff", "#ffffff"]}>
      <WizardStepHeader
        title={getText("hcWizard.stepAvailabilityTitle")}
        subtitle={getText("hcWizard.stepAvailabilitySub")}
        onBack={() => navigation.goBack()}
      />
      <WizardProgressDots currentStep={2} totalSteps={7} />

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <HeroCard>
          <HeroIconWrapper>
            <Ionicons
              name={isAvailable ? "checkmark-circle" : "heart-dislike-outline"}
              size={36}
              color={isAvailable ? theme.colors.success : theme.colors.primary}
            />
          </HeroIconWrapper>
          <HeroTitle>
            {isAndroid14Plus
              ? "Built into Android Settings"
              : "Available via Google Play Store"}
          </HeroTitle>
          <HeroDescription>
            {isAndroid14Plus
              ? "Health Connect is built into your system settings on Android 14+. Open settings to configure app access."
              : "On Android 13 and below, Health Connect is downloaded as a companion app from the Google Play Store."}
          </HeroDescription>
        </HeroCard>

        <SectionTitle>Status & Action</SectionTitle>

        <WizardChecklistItem
          icon="apps-outline"
          label={isAndroid14Plus ? "System Setting" : "Play Store Application"}
          description={isAvailable ? "Health Connect is ready" : "Action required to install/enable"}
          status={isAvailable ? "pass" : "pending"}
          statusText={isAvailable ? getText("hcWizard.statusInstalled") : getText("hcWizard.statusNotInstalled")}
        />

        <ButtonContainer>
          <WizardPrimaryButton
            title={
              isAvailable
                ? getText("hcWizard.btnNext")
                : isAndroid14Plus
                ? getText("hcWizard.btnOpenSettings")
                : getText("hcWizard.btnInstall")
            }
            onPress={isAvailable ? () => navigation.navigate("HealthConnectPermissions") : handleInstallOrOpen}
            icon={isAvailable ? "arrow-forward-outline" : isAndroid14Plus ? "settings-outline" : "download-outline"}
          />

          {!isAvailable && (
            <WizardPrimaryButton
              title={getText("hcWizard.btnNext")}
              onPress={() => navigation.navigate("HealthConnectPermissions")}
              icon="arrow-forward-outline"
            />
          )}

          <WizardSecondaryLink
            title="I'll do it later"
            onPress={() => navigation.goBack()}
          />
        </ButtonContainer>
      </ScrollView>
    </Container>
  );
}

export default HealthConnectInstallScreen;

const Container = styled(LinearGradient)`
  flex: 1;
`;

const HeroCard = styled.View`
  background-color: ${({ theme }: any) => theme.colors.surface};
  border-width: 1px;
  border-color: ${({ theme }: any) => theme.colors.border};
  border-radius: 16px;
  padding: 20px;
  align-items: center;
  margin-bottom: 16px;
`;

const HeroIconWrapper = styled.View`
  width: 64px;
  height: 64px;
  border-radius: 32px;
  background-color: ${({ theme }: any) => theme.colors.iconBox};
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
`;

const HeroTitle = styled.Text`
  font-size: 17px;
  font-weight: 700;
  text-align: center;
  color: ${({ theme }: any) => theme.colors.textPrimary};
  margin-bottom: 6px;
`;

const HeroDescription = styled.Text`
  font-size: 13px;
  text-align: center;
  color: ${({ theme }: any) => theme.colors.textMuted};
  line-height: 18px;
`;

const SectionTitle = styled.Text`
  font-size: 14px;
  font-weight: 700;
  margin-top: 8px;
  margin-bottom: 12px;
  color: ${({ theme }: any) => theme.colors.textMuted};
  text-transform: uppercase;
`;

const ButtonContainer = styled.View`
  margin-top: 24px;
`;
