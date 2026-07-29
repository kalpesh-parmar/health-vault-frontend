import React, { useEffect, useState } from "react";
import { ScrollView, View, Text, ActivityIndicator } from "react-native";
import styled from "styled-components/native";
import { LinearGradient } from "expo-linear-gradient";
import * as Device from "expo-device";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useCallback } from "react";
import { useAppTheme } from "../../context/ThemeContext";
import { useWearablePermissions } from "../../hooks/useWearablePermissions";
import { I18N_ONBOARDING_UI } from "../../components/chat/widgets/OnboardingI18n";
import {
  WizardStepHeader,
  WizardProgressDots,
  WizardChecklistItem,
  WizardPrimaryButton,
  WizardSecondaryLink,
  ChecklistItemStatus,
} from "../../components/wearable/WizardPrimitives";

export function HealthConnectCompatibilityScreen() {
  const navigation = useNavigation<any>();
  const { isDark, theme } = useAppTheme();
  const { isAvailable, loading, hasCorePermissions, checkPermissions } = useWearablePermissions();

  const [osVersionStr, setOsVersionStr] = useState<string>("Detecting...");
  const [isAndroidSupported, setIsAndroidSupported] = useState<boolean>(true);

  useFocusEffect(
    useCallback(() => {
      checkPermissions();
    }, [checkPermissions])
  );

  useEffect(() => {
    // Android 8.0+ (API 26+) minimum requirement
    const apiLevel = Device.platformApiLevel ?? 26;
    const version = Device.osVersion ?? "8.0";
    setOsVersionStr(`Android ${version} (API ${apiLevel})`);
    setIsAndroidSupported(apiLevel >= 26);
  }, []);

  const getText = (key: string): string => {
    return I18N_ONBOARDING_UI.english[key] || key;
  };

  const isFullyCompatible = isAndroidSupported && isAvailable;

  const getOsStatus = (): { status: ChecklistItemStatus; text: string } => {
    if (!isAndroidSupported) {
      return { status: "error", text: getText("hcWizard.statusNotAllowed") };
    }
    return { status: "pass", text: getText("hcWizard.statusAllowed") };
  };

  const getHcInstalledStatus = (): { status: ChecklistItemStatus; text: string } => {
    if (loading) return { status: "pending", text: getText("hcWizard.statusPending") };
    if (isAvailable) return { status: "pass", text: getText("hcWizard.statusInstalled") };
    return { status: "error", text: getText("hcWizard.statusNotInstalled") };
  };

  const getHcAvailableStatus = (): { status: ChecklistItemStatus; text: string } => {
    if (loading) return { status: "pending", text: getText("hcWizard.statusPending") };
    if (isAvailable) return { status: "pass", text: getText("hcWizard.statusAvailable") };
    return { status: "error", text: getText("hcWizard.statusUnavailable") };
  };

  const getPermissionsStatus = (): { status: ChecklistItemStatus; text: string } => {
    if (loading) return { status: "pending", text: getText("hcWizard.statusPending") };
    if (hasCorePermissions) return { status: "pass", text: getText("hcWizard.statusGranted") };
    return { status: "info", text: getText("hcWizard.statusNotGranted") };
  };

  const osInfo = getOsStatus();
  const installedInfo = getHcInstalledStatus();
  const availableInfo = getHcAvailableStatus();
  const permInfo = getPermissionsStatus();

  return (
    <Container colors={isDark ? ["#0b1220", "#0f172a"] : ["#f5f3ff", "#ffffff"]}>
      <WizardStepHeader
        title={getText("hcWizard.stepCompatibilityTitle")}
        subtitle={getText("hcWizard.stepCompatibilitySub")}
        onBack={() => navigation.goBack()}
      />
      <WizardProgressDots currentStep={1} totalSteps={7} />

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <SectionTitle>{getText("hcWizard.stepCompatibilityTitle")}</SectionTitle>

        <WizardChecklistItem
          icon="hardware-chip-outline"
          label="Android OS Compatibility"
          description={osVersionStr}
          status={osInfo.status}
          statusText={osInfo.text}
        />

        <WizardChecklistItem
          icon="cube-outline"
          label="Health Connect Installation"
          description="Google Health Connect app / system component"
          status={installedInfo.status}
          statusText={installedInfo.text}
        />

        <WizardChecklistItem
          icon="checkmark-circle-outline"
          label="SDK Availability"
          description="System API availability check"
          status={availableInfo.status}
          statusText={availableInfo.text}
        />

        <WizardChecklistItem
          icon="shield-checkmark-outline"
          label="Core Permissions Status"
          description="Steps, Heart Rate, Sleep & Energy"
          status={permInfo.status}
          statusText={permInfo.text}
        />

        {loading ? (
          <LoadingWrapper>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <LoadingText>Verifying device capabilities...</LoadingText>
          </LoadingWrapper>
        ) : null}

        <ButtonContainer>
          <WizardPrimaryButton
            title={getText("hcWizard.btnNext")}
            onPress={() => navigation.navigate("HealthConnectInstall")}
            disabled={!isFullyCompatible && !loading}
            icon="arrow-forward-outline"
          />
          <WizardSecondaryLink
            title={getText("hcWizard.btnSkip")}
            onPress={() => navigation.goBack()}
          />
        </ButtonContainer>
      </ScrollView>
    </Container>
  );
}

export default HealthConnectCompatibilityScreen;

const Container = styled(LinearGradient)`
  flex: 1;
`;

const SectionTitle = styled.Text`
  font-size: 14px;
  font-weight: 700;
  margin-top: 8px;
  margin-bottom: 12px;
  color: ${({ theme }: any) => theme.colors.textMuted};
  text-transform: uppercase;
`;

const LoadingWrapper = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: center;
  margin-vertical: 16px;
  gap: 8px;
`;

const LoadingText = styled.Text`
  font-size: 13px;
  color: ${({ theme }: any) => theme.colors.textMuted};
`;

const ButtonContainer = styled.View`
  margin-top: 24px;
`;
