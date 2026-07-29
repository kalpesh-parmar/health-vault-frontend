import React, { useState } from "react";
import { ScrollView, View, Text, TouchableOpacity, Alert } from "react-native";
import styled from "styled-components/native";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

import { useAppTheme } from "../../context/ThemeContext";
import { syncWearables } from "../../services/wearable/wearableSyncService";
import { useWearablePermissions } from "../../hooks/useWearablePermissions";
import { I18N_ONBOARDING_UI } from "../../components/chat/widgets/OnboardingI18n";
import {
  WizardStepHeader,
  WizardProgressDots,
  WizardChecklistItem,
  WizardPrimaryButton,
  WizardSecondaryLink,
} from "../../components/wearable/WizardPrimitives";

interface OEMGuide {
  brand: string;
  packageName: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  steps: string[];
}

const OEM_GUIDES: OEMGuide[] = [
  {
    brand: "NoiseFit (Noise Smartwatches)",
    packageName: "com.noisefit",
    icon: "fitness-outline",
    color: "#e11d48",
    steps: [
      "Open the NoiseFit app on your smartphone.",
      "Go to Profile / Settings → Third-Party Apps.",
      "Select Health Connect and enable 'Sync All Health Data'.",
    ],
  },
  {
    brand: "Samsung Health (Galaxy Watch)",
    packageName: "com.sec.android.app.shealth",
    icon: "heart-outline",
    color: "#00b2a9",
    steps: [
      "Open Samsung Health → Settings.",
      "Tap 'Health Connect' under Data Sharing.",
      "Turn on 'Allow All' data access permissions.",
    ],
  },
  {
    brand: "boAt Crest (boAt Wearables)",
    packageName: "com.boat.crest",
    icon: "watch-outline",
    color: "#dc2626",
    steps: [
      "Open boAt Crest app → My Profile.",
      "Select System Integration → Health Connect.",
      "Toggle on automatic step & sleep syncing.",
    ],
  },
  {
    brand: "Fitbit App / Wearables",
    packageName: "com.fitbit.Fitbit",
    icon: "pulse-outline",
    color: "#00b0b9",
    steps: [
      "Open the Fitbit app → You tab.",
      "Tap App Settings → Health Connect.",
      "Turn on 'Sync with Health Connect'.",
    ],
  },
  {
    brand: "Garmin Connect",
    packageName: "com.garmin.android.apps.connect",
    icon: "navigate-outline",
    color: "#0f172a",
    steps: [
      "Open Garmin Connect → Settings → Connected Apps.",
      "Tap Health Connect and authorize read & write access.",
    ],
  },
];

export function HealthConnectHelpScreen() {
  const navigation = useNavigation<any>();
  const { isDark, theme } = useAppTheme();
  const { openSettings } = useWearablePermissions();
  const [syncing, setSyncing] = useState(false);
  const [activeBrand, setActiveBrand] = useState<string | null>(OEM_GUIDES[0].brand);

  const getText = (key: string): string => {
    return I18N_ONBOARDING_UI.english[key] || key;
  };

  const handleManualSync = async () => {
    setSyncing(true);
    try {
      const res = await syncWearables();
      if (res.ok) {
        Alert.alert("Sync Success", `Successfully synced ${res.samplesWritten} new records.`);
      } else {
        Alert.alert("Sync Notice", `Sync completed. Result: ${res.reason || "No new records"}`);
      }
    } catch (e: any) {
      Alert.alert("Sync Error", e.message || "Failed to trigger live sync.");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Container colors={isDark ? ["#0b1220", "#0f172a"] : ["#f5f3ff", "#ffffff"]}>
      <WizardStepHeader
        title={getText("hcWizard.stepHelpTitle")}
        subtitle={getText("hcWizard.stepHelpSub")}
        onBack={() => navigation.goBack()}
      />
      <WizardProgressDots currentStep={5} totalSteps={7} />

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <HeaderCard>
          <Ionicons name="help-buoy-outline" size={28} color={theme.colors.primary} style={{ marginBottom: 6 }} />
          <HeaderTitle>No Health Data Showing?</HeaderTitle>
          <HeaderSub>
            Follow this troubleshooting checklist to verify your smartwatch companion app is sharing data to Health Connect.
          </HeaderSub>
        </HeaderCard>

        <SectionTitle>Troubleshooting Checklist</SectionTitle>

        <WizardChecklistItem
          icon="watch-outline"
          label="1. Smartwatch Sync Check"
          description="Confirm smartwatch is connected & synced to its companion app."
          status="info"
          statusText="Step 1"
        />

        <WizardChecklistItem
          icon="git-compare-outline"
          label="2. Companion App Integration"
          description="Enable 'Sync with Health Connect' inside your brand app settings."
          status="info"
          statusText="Step 2"
        />

        <WizardChecklistItem
          icon="shield-checkmark-outline"
          label="3. Health Connect Permissions"
          description="Verify permissions are granted in Health Connect system settings."
          status="info"
          statusText="Step 3"
        />

        <WizardChecklistItem
          icon="sync-outline"
          label="4. Live Data Sync"
          description="Press 'Sync Now' to pull latest metric records."
          status="info"
          statusText="Step 4"
        />

        <SectionTitle>OEM Companion App Setup Guides</SectionTitle>

        {OEM_GUIDES.map((guide) => {
          const isExpanded = activeBrand === guide.brand;
          return (
            <GuideCard key={guide.brand}>
              <GuideHeader onPress={() => setActiveBrand(isExpanded ? null : guide.brand)}>
                <BrandBadge style={{ backgroundColor: guide.color }}>
                  <Ionicons name={guide.icon} size={18} color="#ffffff" />
                </BrandBadge>
                <BrandTitle>{guide.brand}</BrandTitle>
                <Ionicons
                  name={isExpanded ? "chevron-up" : "chevron-down"}
                  size={18}
                  color={theme.colors.textMuted}
                />
              </GuideHeader>

              {isExpanded && (
                <StepsList>
                  {guide.steps.map((step, idx) => (
                    <StepItem key={idx}>
                      <StepNumber>{idx + 1}</StepNumber>
                      <StepText>{step}</StepText>
                    </StepItem>
                  ))}
                </StepsList>
              )}
            </GuideCard>
          );
        })}

        <ButtonContainer>
          <WizardPrimaryButton
            title={getText("hcWizard.btnSyncNow")}
            onPress={handleManualSync}
            loading={syncing}
            icon="sync-outline"
          />

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

export default HealthConnectHelpScreen;

const Container = styled(LinearGradient)`
  flex: 1;
`;

const HeaderCard = styled.View`
  background-color: ${({ theme }: any) => theme.colors.surface};
  border-width: 1px;
  border-color: ${({ theme }: any) => theme.colors.border};
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 16px;
`;

const HeaderTitle = styled.Text`
  font-size: 17px;
  font-weight: 700;
  color: ${({ theme }: any) => theme.colors.textPrimary};
  margin-bottom: 4px;
`;

const HeaderSub = styled.Text`
  font-size: 13px;
  color: ${({ theme }: any) => theme.colors.textMuted};
  line-height: 18px;
`;

const SectionTitle = styled.Text`
  font-size: 14px;
  font-weight: 700;
  margin-top: 12px;
  margin-bottom: 12px;
  color: ${({ theme }: any) => theme.colors.textMuted};
  text-transform: uppercase;
`;

const GuideCard = styled.View`
  background-color: ${({ theme }: any) => theme.colors.surface};
  border-width: 1px;
  border-color: ${({ theme }: any) => theme.colors.border};
  border-radius: 14px;
  margin-bottom: 10px;
  overflow: hidden;
`;

const GuideHeader = styled.TouchableOpacity`
  flex-direction: row;
  align-items: center;
  padding: 14px;
`;

const BrandBadge = styled.View`
  width: 32px;
  height: 32px;
  border-radius: 10px;
  align-items: center;
  justify-content: center;
  margin-right: 10px;
`;

const BrandTitle = styled.Text`
  flex: 1;
  font-size: 15px;
  font-weight: 600;
  color: ${({ theme }: any) => theme.colors.textPrimary};
`;

const StepsList = styled.View`
  padding-horizontal: 14px;
  padding-bottom: 14px;
  border-top-width: 1px;
  border-top-color: ${({ theme }: any) => theme.colors.border};
  padding-top: 10px;
`;

const StepItem = styled.View`
  flex-direction: row;
  align-items: flex-start;
  margin-top: 8px;
`;

const StepNumber = styled.Text`
  width: 20px;
  height: 20px;
  border-radius: 10px;
  background-color: ${({ theme }: any) => theme.colors.iconBox};
  color: ${({ theme }: any) => theme.colors.primary};
  font-size: 11px;
  font-weight: 700;
  text-align: center;
  line-height: 20px;
  margin-right: 8px;
`;

const StepText = styled.Text`
  flex: 1;
  font-size: 13px;
  color: ${({ theme }: any) => theme.colors.textPrimary};
  line-height: 18px;
`;

const ButtonContainer = styled.View`
  margin-top: 24px;
`;
