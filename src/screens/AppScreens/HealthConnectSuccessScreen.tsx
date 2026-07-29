import React, { useEffect, useState } from "react";
import { ScrollView, View, Text, ActivityIndicator } from "react-native";
import styled from "styled-components/native";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

import { useAppTheme } from "../../context/ThemeContext";
import { syncWearables } from "../../services/wearable/wearableSyncService";
import { I18N_ONBOARDING_UI } from "../../components/chat/widgets/OnboardingI18n";
import {
  WizardStepHeader,
  WizardProgressDots,
  WizardChecklistItem,
  WizardPrimaryButton,
  WizardSecondaryLink,
} from "../../components/wearable/WizardPrimitives";

export function HealthConnectSuccessScreen() {
  const navigation = useNavigation<any>();
  const { isDark, theme } = useAppTheme();

  const [syncing, setSyncing] = useState(true);
  const [samplesWritten, setSamplesWritten] = useState(0);
  const [samplesReceived, setSamplesReceived] = useState(0);
  const [syncError, setSyncError] = useState<string | null>(null);

  const getText = (key: string): string => {
    return I18N_ONBOARDING_UI.english[key] || key;
  };

  useEffect(() => {
    let active = true;
    (async () => {
      setSyncing(true);
      try {
        const res = await syncWearables();
        if (active) {
          setSamplesWritten(res.samplesWritten ?? 0);
          setSamplesReceived(res.samplesReceived ?? 0);
          if (!res.ok) {
            setSyncError(res.reason || "Partial sync");
          }
        }
      } catch (e: any) {
        if (active) {
          setSyncError(e.message || "Failed to complete initial sync");
        }
      } finally {
        if (active) setSyncing(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  return (
    <Container colors={isDark ? ["#0b1220", "#0f172a"] : ["#f5f3ff", "#ffffff"]}>
      <WizardStepHeader
        title={getText("hcWizard.stepSummaryTitle")}
        subtitle={getText("hcWizard.stepSummarySub")}
        showBack={false}
      />
      <WizardProgressDots currentStep={6} totalSteps={7} />

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <CelebrationCard style={{ borderColor: theme.colors.success }}>
          <CheckIconWrapper style={{ backgroundColor: "#d1fae5" }}>
            <Ionicons name="checkmark-done-circle" size={48} color="#065f46" />
          </CheckIconWrapper>

          <CelebrationTitle>Health Connect Linked!</CelebrationTitle>

          {syncing ? (
            <SyncingBox>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <SyncingText>Performing initial data synchronization...</SyncingText>
            </SyncingBox>
          ) : (
            <StatRow>
              <StatCard>
                <StatNumber>{samplesWritten}</StatNumber>
                <StatLabel>New Records Imported</StatLabel>
              </StatCard>
              <StatCard>
                <StatNumber>{samplesReceived}</StatNumber>
                <StatLabel>Samples Received</StatLabel>
              </StatCard>
            </StatRow>
          )}

          {syncError ? (
            <ErrorNotice>
              <Ionicons name="alert-circle-outline" size={16} color={theme.colors.error} />
              <ErrorNoticeText>{syncError}</ErrorNoticeText>
            </ErrorNotice>
          ) : null}
        </CelebrationCard>

        <SectionTitle>Synced Health Categories</SectionTitle>

        <WizardChecklistItem
          icon="footsteps-outline"
          label="Steps & Activity"
          description="Daily total steps, active energy, and distance"
          status="pass"
          statusText="Connected"
        />

        <WizardChecklistItem
          icon="heart-outline"
          label="Heart & Vitals"
          description="Continuous heart rate, resting HR, and HRV"
          status="pass"
          statusText="Connected"
        />

        <WizardChecklistItem
          icon="moon-outline"
          label="Sleep Sessions"
          description="Sleep stage durations and night totals"
          status="pass"
          statusText="Connected"
        />

        <WizardChecklistItem
          icon="water-outline"
          label="Blood Oxygen & Body Metrics"
          description="SpO2 saturation, weight, and blood pressure"
          status="pass"
          statusText="Connected"
        />

        <ButtonContainer>
          <WizardPrimaryButton
            title={getText("hcWizard.btnFinish")}
            onPress={() => navigation.navigate("HealthDashboard")}
            icon="arrow-forward-outline"
          />

          <WizardSecondaryLink
            title="View Permission Details"
            onPress={() => navigation.navigate("HealthConnectPermissionDetails")}
          />
        </ButtonContainer>
      </ScrollView>
    </Container>
  );
}

export default HealthConnectSuccessScreen;

const Container = styled(LinearGradient)`
  flex: 1;
`;

const CelebrationCard = styled.View`
  background-color: ${({ theme }: any) => theme.colors.surface};
  border-width: 2px;
  border-radius: 18px;
  padding: 20px;
  align-items: center;
  margin-bottom: 16px;
`;

const CheckIconWrapper = styled.View`
  width: 72px;
  height: 72px;
  border-radius: 36px;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
`;

const CelebrationTitle = styled.Text`
  font-size: 20px;
  font-weight: 700;
  color: ${({ theme }: any) => theme.colors.textPrimary};
  margin-bottom: 8px;
`;

const SyncingBox = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 8px;
  margin-vertical: 12px;
`;

const SyncingText = styled.Text`
  font-size: 13px;
  color: ${({ theme }: any) => theme.colors.textMuted};
`;

const StatRow = styled.View`
  flex-direction: row;
  gap: 12px;
  margin-top: 12px;
  width: 100%;
`;

const StatCard = styled.View`
  flex: 1;
  background-color: ${({ theme }: any) => theme.colors.iconBox};
  border-radius: 12px;
  padding: 12px;
  align-items: center;
`;

const StatNumber = styled.Text`
  font-size: 24px;
  font-weight: 800;
  color: ${({ theme }: any) => theme.colors.primary};
`;

const StatLabel = styled.Text`
  font-size: 11px;
  font-weight: 600;
  margin-top: 2px;
  color: ${({ theme }: any) => theme.colors.textMuted};
  text-align: center;
`;

const ErrorNotice = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 6px;
  margin-top: 10px;
`;

const ErrorNoticeText = styled.Text`
  font-size: 12px;
  color: ${({ theme }: any) => theme.colors.error};
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
