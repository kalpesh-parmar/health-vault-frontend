import React, { useState } from "react";
import { ScrollView, View, Text, TouchableOpacity } from "react-native";
import styled from "styled-components/native";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

import { useAppTheme } from "../../context/ThemeContext";
import { healthSourceResolver, APP_MAPPING } from "../../services/wearable/HealthSourceResolver";
import { I18N_ONBOARDING_UI } from "../../components/chat/widgets/OnboardingI18n";
import {
  WizardStepHeader,
  WizardProgressDots,
  WizardChecklistItem,
  WizardPrimaryButton,
  WizardSecondaryLink,
} from "../../components/wearable/WizardPrimitives";

export function HealthConnectSourcesScreen() {
  const navigation = useNavigation<any>();
  const { isDark, theme } = useAppTheme();
  const [showAllSources, setShowAllSources] = useState(false);

  const getText = (key: string): string => {
    return I18N_ONBOARDING_UI.english[key] || key;
  };

  const allPackages = Object.keys(APP_MAPPING);
  const primaryPackages = [
    "com.sec.android.app.shealth",
    "com.noisefit",
    "com.fitbit.Fitbit",
    "com.garmin.android.apps.connect",
  ];

  const displayedPackages = showAllSources ? allPackages : primaryPackages;

  return (
    <Container colors={isDark ? ["#0b1220", "#0f172a"] : ["#f5f3ff", "#ffffff"]}>
      <WizardStepHeader
        title={getText("hcWizard.stepDataSourcesTitle")}
        subtitle={getText("hcWizard.stepDataSourcesSub")}
        onBack={() => navigation.goBack()}
      />
      <WizardProgressDots currentStep={4} totalSteps={7} />

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <HeaderInfoCard>
          <Ionicons name="apps-outline" size={24} color={theme.colors.primary} style={{ marginBottom: 6 }} />
          <InfoTitle>Contributing App Sources</InfoTitle>
          <InfoText>
            Health Connect automatically merges and deduplicates metrics from your installed fitness companion apps.
          </InfoText>
        </HeaderInfoCard>

        <SectionTitle>Detected & Supported Sources</SectionTitle>

        {displayedPackages.map((pkg) => {
          const info = healthSourceResolver.getSourceInfo(pkg);
          return (
            <WizardChecklistItem
              key={pkg}
              icon={info.iconName as any}
              label={info.displayName}
              description={`Package: ${pkg}`}
              status="info"
              statusText="Supported"
            />
          );
        })}

        <ExpanderButton onPress={() => setShowAllSources(!showAllSources)}>
          <ExpanderText>
            {showAllSources ? "Show Primary Sources" : "More Sources (" + (allPackages.length - primaryPackages.length) + " additional)"}
          </ExpanderText>
          <Ionicons
            name={showAllSources ? "chevron-up" : "chevron-down"}
            size={18}
            color={theme.colors.primary}
          />
        </ExpanderButton>

        <ButtonContainer>
          <WizardPrimaryButton
            title={getText("hcWizard.btnNext")}
            onPress={() => navigation.navigate("HealthConnectHelp")}
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

export default HealthConnectSourcesScreen;

const Container = styled(LinearGradient)`
  flex: 1;
`;

const HeaderInfoCard = styled.View`
  background-color: ${({ theme }: any) => theme.colors.surface};
  border-width: 1px;
  border-color: ${({ theme }: any) => theme.colors.border};
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 16px;
`;

const InfoTitle = styled.Text`
  font-size: 16px;
  font-weight: 700;
  color: ${({ theme }: any) => theme.colors.textPrimary};
  margin-bottom: 4px;
`;

const InfoText = styled.Text`
  font-size: 13px;
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

const ExpanderButton = styled.TouchableOpacity`
  flex-direction: row;
  align-items: center;
  justify-content: center;
  padding-vertical: 12px;
  margin-bottom: 16px;
  gap: 6px;
`;

const ExpanderText = styled.Text`
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }: any) => theme.colors.primary};
`;

const ButtonContainer = styled.View`
  margin-top: 16px;
`;
