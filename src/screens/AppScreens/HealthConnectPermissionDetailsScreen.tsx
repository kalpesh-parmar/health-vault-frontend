import React from "react";
import { ScrollView, View, Text } from "react-native";
import styled from "styled-components/native";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
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
  WizardChecklistItem,
  WizardPrimaryButton,
  WizardSecondaryLink,
} from "../../components/wearable/WizardPrimitives";

interface RecordDetailConfig {
  recordType: string;
  label: string;
  permissionString: string;
  category: "Core" | "Advanced";
  icon: keyof typeof Ionicons.glyphMap;
}

const ALL_RECORD_DETAILS: RecordDetailConfig[] = [
  { recordType: "Steps", label: "Steps Count", permissionString: "android.permission.health.READ_STEPS", category: "Core", icon: "footsteps-outline" },
  { recordType: "Distance", label: "Distance", permissionString: "android.permission.health.READ_DISTANCE", category: "Core", icon: "navigate-outline" },
  { recordType: "ActiveCaloriesBurned", label: "Active Energy", permissionString: "android.permission.health.READ_ACTIVE_CALORIES_BURNED", category: "Core", icon: "flame-outline" },
  { recordType: "HeartRate", label: "Heart Rate", permissionString: "android.permission.health.READ_HEART_RATE", category: "Core", icon: "heart-outline" },
  { recordType: "RestingHeartRate", label: "Resting Heart Rate", permissionString: "android.permission.health.READ_RESTING_HEART_RATE", category: "Core", icon: "pulse-outline" },
  { recordType: "SleepSession", label: "Sleep Sessions", permissionString: "android.permission.health.READ_SLEEP", category: "Core", icon: "moon-outline" },
  { recordType: "OxygenSaturation", label: "Blood Oxygen (SpO2)", permissionString: "android.permission.health.READ_OXYGEN_SATURATION", category: "Advanced", icon: "water-outline" },
  { recordType: "HeartRateVariabilityRmssd", label: "HRV (RMSSD)", permissionString: "android.permission.health.READ_HEART_RATE_VARIABILITY", category: "Advanced", icon: "analytics-outline" },
  { recordType: "BodyTemperature", label: "Body Temperature", permissionString: "android.permission.health.READ_BODY_TEMPERATURE", category: "Advanced", icon: "thermometer-outline" },
  { recordType: "RespiratoryRate", label: "Respiratory Rate", permissionString: "android.permission.health.READ_RESPIRATORY_RATE", category: "Advanced", icon: "medical-outline" },
  { recordType: "Weight", label: "Weight", permissionString: "android.permission.health.READ_WEIGHT", category: "Advanced", icon: "scale-outline" },
  { recordType: "BloodPressure", label: "Blood Pressure", permissionString: "android.permission.health.READ_BLOOD_PRESSURE", category: "Advanced", icon: "heart-half-outline" },
  { recordType: "BloodGlucose", label: "Blood Glucose", permissionString: "android.permission.health.READ_BLOOD_GLUCOSE", category: "Advanced", icon: "eyedrop-outline" },
];

export function HealthConnectPermissionDetailsScreen() {
  const navigation = useNavigation<any>();
  const { isDark, theme } = useAppTheme();
  const { grantedPermissions, openSettings } = useWearablePermissions();

  const getText = (key: string): string => {
    return I18N_ONBOARDING_UI.english[key] || key;
  };

  const isGranted = (item: RecordDetailConfig): boolean => {
    return grantedPermissions.includes(item.permissionString);
  };

  const totalCount = ALL_RECORD_DETAILS.length;
  const grantedCount = ALL_RECORD_DETAILS.filter((item) => isGranted(item)).length;
  const percentage = Math.round((grantedCount / totalCount) * 100);

  return (
    <Container colors={isDark ? ["#0b1220", "#0f172a"] : ["#f5f3ff", "#ffffff"]}>
      <WizardStepHeader
        title={getText("hcWizard.stepPermissionDetailsTitle")}
        subtitle={getText("hcWizard.stepPermissionDetailsSub")}
        onBack={() => navigation.goBack()}
      />
      <WizardProgressDots currentStep={7} totalSteps={7} />

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <SummaryCard>
          <Row>
            <SummaryTitle>Permissions Access</SummaryTitle>
            <PercentageBadge style={{ backgroundColor: percentage >= 70 ? "#d1fae5" : "#fef3c7" }}>
              <PercentageText style={{ color: percentage >= 70 ? "#065f46" : "#92400e" }}>
                {percentage}% Granted
              </PercentageText>
            </PercentageBadge>
          </Row>

          <ProgressBarTrack>
            <ProgressBarFill
              style={{
                width: `${percentage}%`,
                backgroundColor: percentage >= 70 ? theme.colors.success : theme.colors.warning,
              }}
            />
          </ProgressBarTrack>

          <SummarySubtext>
            {grantedCount} of {totalCount} Health Connect permissions are active for Health Vault.
          </SummarySubtext>
        </SummaryCard>

        <SectionTitle>Itemized Permission Breakdown</SectionTitle>

        {ALL_RECORD_DETAILS.map((item) => {
          const granted = isGranted(item);
          return (
            <WizardChecklistItem
              key={item.recordType}
              icon={item.icon}
              label={item.label}
              description={`Category: ${item.category} · System Permission`}
              status={granted ? "pass" : "error"}
              statusText={granted ? getText("hcWizard.statusGranted") : getText("hcWizard.statusNotGranted")}
            />
          );
        })}

        <ButtonContainer>
          <WizardPrimaryButton
            title={getText("hcWizard.btnOpenSettings")}
            onPress={openSettings}
            icon="settings-outline"
          />

          <WizardSecondaryLink
            title={getText("hcWizard.btnFinish")}
            onPress={() => navigation.navigate("HealthDashboard")}
          />
        </ButtonContainer>
      </ScrollView>
    </Container>
  );
}

export default HealthConnectPermissionDetailsScreen;

const Container = styled(LinearGradient)`
  flex: 1;
`;

const SummaryCard = styled.View`
  background-color: ${({ theme }: any) => theme.colors.surface};
  border-width: 1px;
  border-color: ${({ theme }: any) => theme.colors.border};
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 16px;
`;

const Row = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
`;

const SummaryTitle = styled.Text`
  font-size: 16px;
  font-weight: 700;
  color: ${({ theme }: any) => theme.colors.textPrimary};
`;

const PercentageBadge = styled.View`
  padding-horizontal: 8px;
  padding-vertical: 4px;
  border-radius: 6px;
`;

const PercentageText = styled.Text`
  font-size: 12px;
  font-weight: 700;
`;

const ProgressBarTrack = styled.View`
  height: 8px;
  border-radius: 4px;
  background-color: ${({ theme }: any) => theme.colors.iconBox};
  margin-vertical: 12px;
  overflow: hidden;
`;

const ProgressBarFill = styled.View`
  height: 100%;
  border-radius: 4px;
`;

const SummarySubtext = styled.Text`
  font-size: 12px;
  color: ${({ theme }: any) => theme.colors.textMuted};
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
