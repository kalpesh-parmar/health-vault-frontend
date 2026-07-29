import React, { useState, useCallback, useEffect } from "react";
import { ScrollView, View, Text, Switch } from "react-native";
import styled from "styled-components/native";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

import { useAppTheme } from "../../context/ThemeContext";
import {
  useWearablePermissions,
  PERMISSION_STRING_BY_RECORD_TYPE,
} from "../../hooks/useWearablePermissions";
import { I18N_ONBOARDING_UI } from "../../components/chat/widgets/OnboardingI18n";
import {
  WizardStepHeader,
  WizardProgressDots,
  WizardPrimaryButton,
  WizardSecondaryLink,
} from "../../components/wearable/WizardPrimitives";

interface PermissionConfig {
  recordType: string;
  name: string;
  category: "core" | "advanced";
  icon: keyof typeof Ionicons.glyphMap;
  description: string;
}

const PERMISSION_CONFIGS: PermissionConfig[] = [
  { recordType: "Steps", name: "Steps Count", category: "core", icon: "footsteps-outline", description: "Daily step count totals" },
  { recordType: "HeartRate", name: "Heart Rate", category: "core", icon: "heart-outline", description: "Pulse and continuous heart rate" },
  { recordType: "RestingHeartRate", name: "Resting Heart Rate", category: "core", icon: "pulse-outline", description: "Baseline resting heart rate" },
  { recordType: "SleepSession", name: "Sleep Sessions", category: "core", icon: "moon-outline", description: "Sleep duration and stages" },
  { recordType: "ActiveCaloriesBurned", name: "Active Energy", category: "core", icon: "flame-outline", description: "Active calories burned during workouts" },
  { recordType: "Distance", name: "Distance", category: "core", icon: "navigate-outline", description: "Walking and running distance" },
  { recordType: "HealthDataInBackground", name: "Background Sync", category: "core", icon: "sync-outline", description: "Allow periodic metric updates in background (Android 14+)" },
  { recordType: "OxygenSaturation", name: "Blood Oxygen (SpO2)", category: "advanced", icon: "water-outline", description: "Blood oxygen saturation percentage" },
  { recordType: "HeartRateVariabilityRmssd", name: "HRV", category: "advanced", icon: "analytics-outline", description: "Heart rate variability RMSSD" },
  { recordType: "BodyTemperature", name: "Body Temperature", category: "advanced", icon: "thermometer-outline", description: "Body and skin temperature" },
  { recordType: "RespiratoryRate", name: "Respiratory Rate", category: "advanced", icon: "medical-outline", description: "Breathing rate per minute" },
  { recordType: "Weight", name: "Weight", category: "advanced", icon: "scale-outline", description: "Body weight and mass tracking" },
  { recordType: "BloodPressure", name: "Blood Pressure", category: "advanced", icon: "heart-half-outline", description: "Systolic and diastolic blood pressure" },
  { recordType: "BloodGlucose", name: "Blood Glucose", category: "advanced", icon: "eyedrop-outline", description: "Blood sugar measurement" },
];

export function HealthConnectPermissionsScreen() {
  const navigation = useNavigation<any>();
  const { isDark, theme } = useAppTheme();
  const { grantedPermissions, requestPermissions, openSettings, checkPermissions } = useWearablePermissions();

  const [requesting, setRequesting] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    PERMISSION_CONFIGS.forEach((p) => {
      initial[p.recordType] = true;
    });
    return initial;
  });

  useFocusEffect(
    useCallback(() => {
      checkPermissions();
    }, [checkPermissions])
  );

  const getText = (key: string): string => {
    return I18N_ONBOARDING_UI.english[key] || key;
  };

  const isGranted = (recordType: string): boolean => {
    if (recordType === "HealthDataInBackground") {
      return grantedPermissions.some((p) => String(p).includes("READ_HEALTH_DATA_IN_BACKGROUND"));
    }
    const permString = PERMISSION_STRING_BY_RECORD_TYPE[recordType];
    return permString ? grantedPermissions.includes(permString) : false;
  };

  const toggleSelection = (recordType: string) => {
    setSelectedTypes((prev) => ({
      ...prev,
      [recordType]: !prev[recordType],
    }));
  };

  const handleGrant = async () => {
    setRequesting(true);
    try {
      const activeTargets = PERMISSION_CONFIGS
        .filter((p) => selectedTypes[p.recordType])
        .map((p) => p.recordType);

      await requestPermissions(activeTargets.length > 0 ? activeTargets : "all");
    } catch (e) {
      console.warn("[PermissionsScreen] Grant error:", e);
    } finally {
      setRequesting(false);
    }
  };

  const grantedCount = PERMISSION_CONFIGS.filter((p) => isGranted(p.recordType)).length;

  return (
    <Container colors={isDark ? ["#0b1220", "#0f172a"] : ["#f5f3ff", "#ffffff"]}>
      <WizardStepHeader
        title={getText("hcWizard.stepCorePermissionsTitle")}
        subtitle={getText("hcWizard.stepCorePermissionsSub")}
        onBack={() => navigation.goBack()}
      />
      <WizardProgressDots currentStep={3} totalSteps={7} />

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <CounterCard>
          <CounterRow>
            <CounterLabel>Granted Permissions</CounterLabel>
            <BadgeGranted>
              <BadgeText>{grantedCount} / {PERMISSION_CONFIGS.length} Allowed</BadgeText>
            </BadgeGranted>
          </CounterRow>
          <CounterDescription>
            Grant access to allow Health Vault to aggregate your health metrics automatically.
          </CounterDescription>
        </CounterCard>

        <SectionTitle>{getText("hcWizard.stepCorePermissionsTitle")}</SectionTitle>

        {PERMISSION_CONFIGS.map((item) => {
          const granted = isGranted(item.recordType);
          const isSelected = selectedTypes[item.recordType] ?? true;

          return (
            <PermissionRow key={item.recordType}>
              <IconBox style={{ backgroundColor: granted ? "#d1fae5" : theme.colors.iconBox }}>
                <Ionicons
                  name={item.icon}
                  size={20}
                  color={granted ? theme.colors.success : theme.colors.primary}
                />
              </IconBox>
              <RowTextContent>
                <RowTitle>{item.name}</RowTitle>
                <RowSub>{item.description}</RowSub>
              </RowTextContent>
              <Switch
                value={granted || isSelected}
                disabled={granted}
                onValueChange={() => toggleSelection(item.recordType)}
                trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                thumbColor="#ffffff"
              />
            </PermissionRow>
          );
        })}

        <ButtonContainer>
          <WizardPrimaryButton
            title={getText("hcWizard.btnGrant")}
            onPress={handleGrant}
            loading={requesting}
            icon="shield-checkmark-outline"
          />

          <WizardPrimaryButton
            title={getText("hcWizard.btnOpenSettings")}
            onPress={openSettings}
            icon="settings-outline"
          />

          <WizardSecondaryLink
            title={getText("hcWizard.btnNext")}
            onPress={() => navigation.navigate("HealthDashboard")}
          />
        </ButtonContainer>
      </ScrollView>
    </Container>
  );
}

export default HealthConnectPermissionsScreen;

const Container = styled(LinearGradient)`
  flex: 1;
`;

const CounterCard = styled.View`
  background-color: ${({ theme }: any) => theme.colors.surface};
  border-width: 1px;
  border-color: ${({ theme }: any) => theme.colors.border};
  border-radius: 14px;
  padding: 14px;
  margin-bottom: 16px;
`;

const CounterRow = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
`;

const CounterLabel = styled.Text`
  font-size: 15px;
  font-weight: 700;
  color: ${({ theme }: any) => theme.colors.textPrimary};
`;

const CounterDescription = styled.Text`
  font-size: 12px;
  margin-top: 4px;
  color: ${({ theme }: any) => theme.colors.textMuted};
`;

const BadgeGranted = styled.View`
  background-color: #d1fae5;
  padding-horizontal: 8px;
  padding-vertical: 4px;
  border-radius: 6px;
`;

const BadgeText = styled.Text`
  font-size: 11px;
  font-weight: 700;
  color: #065f46;
`;

const SectionTitle = styled.Text`
  font-size: 14px;
  font-weight: 700;
  margin-top: 8px;
  margin-bottom: 12px;
  color: ${({ theme }: any) => theme.colors.textMuted};
  text-transform: uppercase;
`;

const PermissionRow = styled.View`
  flex-direction: row;
  align-items: center;
  background-color: ${({ theme }: any) => theme.colors.surface};
  border-width: 1px;
  border-color: ${({ theme }: any) => theme.colors.border};
  border-radius: 14px;
  padding: 12px;
  margin-bottom: 10px;
`;

const IconBox = styled.View`
  width: 36px;
  height: 36px;
  border-radius: 10px;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
`;

const RowTextContent = styled.View`
  flex: 1;
`;

const RowTitle = styled.Text`
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }: any) => theme.colors.textPrimary};
`;

const RowSub = styled.Text`
  font-size: 12px;
  margin-top: 2px;
  color: ${({ theme }: any) => theme.colors.textMuted};
`;

const ButtonContainer = styled.View`
  margin-top: 24px;
`;
