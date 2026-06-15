import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, Dimensions, Platform, Modal } from "react-native";
import styled from "styled-components/native";
import { BlurView } from "expo-blur";
import { useAppTheme } from "../../context/ThemeContext";
import HealthVaultLogo from "./HealthVaultLogo";

const { width, height } = Dimensions.get("screen");

interface Props {
  visible: boolean;
  title?: string;
  subtitle?: string;
  currentStage?: string;
  percentage?: number;
  message?: string;
}

interface Stage {
  title: string;
  subtitle: string;
}

const tokens = {
  dark: {
    blur: "dark" as const,
    blurIntensity: 18,
    bg: "#070D1A",
    accent: "#3B82F6",
    accentRing: "rgba(59,130,246,0.26)",
    iconBg: "rgba(59,130,246,0.09)",
    iconBorder: "rgba(59,130,246,0.2)",
    crossColor: "#60A5FA",
    pulseColor: "rgba(59,130,246,0.07)",
    title: "#EFF6FF",
    subtitle: "rgba(148,172,220,0.78)",
    divider: "rgba(59,130,246,0.13)",
    progressBg: "rgba(59,130,246,0.09)",
    progressFill: "#3B82F6",
    orb1: "rgba(29,78,216,0.22)",
    orb2: "rgba(17,24,60,0.9)",
    brand: "rgba(96,165,250,0.5)",
  },
  light: {
    blur: "light" as const,
    blurIntensity: 25,
    bg: "#EEF4FF",
    accent: "#2563EB",
    accentRing: "rgba(37,99,235,0.18)",
    iconBg: "rgba(37,99,235,0.07)",
    iconBorder: "rgba(37,99,235,0.15)",
    crossColor: "#2563EB",
    pulseColor: "rgba(37,99,235,0.05)",
    title: "#0F1E3D",
    subtitle: "rgba(50,76,130,0.72)",
    divider: "rgba(37,99,235,0.1)",
    progressBg: "rgba(37,99,235,0.08)",
    progressFill: "#2563EB",
    orb1: "rgba(191,219,254,0.85)",
    orb2: "rgba(224,237,255,0.95)",
    brand: "rgba(37,99,235,0.45)",
  },
};

const getBoxesCount = (stage: string) => {
  switch (stage) {
    case "UPLOADING_FILE":
      return 0;
    case "VALIDATING":
      return 1;
    case "EXTRACTING":
      return 2;
    case "ANALYZING":
      return 3;
    case "SUMMARIZING":
      return 4;
    case "COMPLETED":
      return 5;
    default:
      return 0;
  }
};

const getStageTitle = (stage: string) => {
  switch (stage) {
    case "UPLOADING_FILE":
      return "Uploading File";
    case "VALIDATING":
      return "Medical Document Validation";
    case "EXTRACTING":
      return "Extracting Text";
    case "ANALYZING":
      return "Analyzing Report";
    case "SUMMARIZING":
      return "Generating Summary";
    case "COMPLETED":
      return "Ready";
    default:
      return "Processing Document";
  }
};

const getStageDescription = (stage: string, message?: string) => {
  if (message) return message;
  switch (stage) {
    case "UPLOADING_FILE":
      return "Uploading report to secure storage.";
    case "VALIDATING":
      return "Checking whether the document is medical.";
    case "EXTRACTING":
      return "Reading report contents.";
    case "ANALYZING":
      return "Finding tests and medical values.";
    case "SUMMARIZING":
      return "Preparing easy explanation.";
    case "COMPLETED":
      return "You can now ask questions.";
    default:
      return "Please wait...";
  }
};

const ModernLoader = ({ visible, title, subtitle, currentStage, percentage, message }: Props) => {
  const { isDark } = useAppTheme();
  const t = isDark ? tokens.dark : tokens.light;

  const stage = currentStage || "UPLOADING_FILE";
  const displayTitle = currentStage ? getStageTitle(stage) : (title || "Processing");
  const displayDescription = currentStage ? getStageDescription(stage, message) : (subtitle || "Please wait...");
  const filledCount = getBoxesCount(stage);

  const masterFade = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.94)).current;
  const cardFade = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(1)).current;
  const ringScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(masterFade, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }),
        Animated.spring(cardScale, {
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.timing(cardFade, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }),
      ]).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(logoScale, {
            toValue: 1.1,
            duration: 1700,
            useNativeDriver: true,
          }),
          Animated.timing(logoScale, {
            toValue: 1,
            duration: 1700,
            useNativeDriver: true,
          }),
        ]),
      ).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(ringScale, {
            toValue: 1.2,
            duration: 1700,
            useNativeDriver: true,
          }),
          Animated.timing(ringScale, {
            toValue: 1,
            duration: 1700,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    }
  }, [visible]);

  return (
    <Modal transparent visible={visible}>
      <FullScreen style={{ opacity: masterFade }}>
        <BlurView
          intensity={Platform.OS === "ios" ? t.blurIntensity : 80}
          tint={t.blur}
          style={{ position: "absolute", width, height }}
        />

        <BgFill color={t.bg} />

        <ContentWrapper
          style={{ opacity: cardFade, transform: [{ scale: cardScale }] }}
        >
          <LogoArea>
            <OuterRing
              color={t.accentRing}
              style={{ transform: [{ scale: ringScale }] }}
            />
            <Animated.View style={{ transform: [{ scale: logoScale }], width: 80, height: 80, justifyContent: "center", alignItems: "center" }}>
              <HealthVaultLogo size={80} />
            </Animated.View>
          </LogoArea>

          <TextBlock>
            <TitleText color={t.title}>
              {displayTitle}
            </TitleText>
            
            <BoxesRow>
              {[1, 2, 3, 4, 5].map((idx) => {
                const filled = idx <= filledCount;
                return <BoxKey key={idx} filled={filled} />;
              })}
            </BoxesRow>

            <SubtitleText color={t.subtitle}>
              {displayDescription}
            </SubtitleText>
          </TextBlock>

          <BrandLabel color={t.brand}>HealthVault</BrandLabel>
        </ContentWrapper>
      </FullScreen>
    </Modal>
  );
};

export default ModernLoader;

/* ---------------- STYLES ---------------- */

const FullScreen = styled(Animated.View)`
  position: absolute;
  width: ${width}px;
  height: ${height}px;
  justify-content: center;
  align-items: center;
`;

const BgFill = styled.View<{ color: string }>`
  position: absolute;
  width: 100%;
  height: 100%;
  background-color: ${({ color }: { color: string }) => color};
`;

const ContentWrapper = styled(Animated.View)`
  width: 100%;
  padding-horizontal: 40px;
  align-items: center;
`;

const LogoArea = styled.View`
  width: 120px;
  height: 120px;
  justify-content: center;
  align-items: center;
  margin-bottom: 50px;
`;

const OuterRing = styled(Animated.View)<{ color: string }>`
  position: absolute;
  width: 100px;
  height: 100px;
  border-radius: 50px;
  border-width: 1.5px;
  border-color: ${({ color }: {color: string}) => color};
`;

const LogoCircle = styled(Animated.View)<{ bg: string; border: string }>`
  width: 80px;
  height: 80px;
  border-radius: 40px;
  background-color: ${({ bg }: {bg: string}) => bg};
  border-width: 1.5px;
  border-color: ${({ border }: {border: string}) => border};
  align-items: center;
  justify-content: center;
`;

const CrossV = styled.View<{ color: string }>`
  position: absolute;
  width: 4px;
  height: 24px;
  background-color: ${({ color }: {color: string}) => color};
`;

const CrossH = styled.View<{ color: string }>`
  position: absolute;
  width: 24px;
  height: 4px;
  background-color: ${({ color }: {color: string}) => color};
`;

const TextBlock = styled.View`
  align-items: center;
  margin-bottom: 40px;
`;

const TitleText = styled(Animated.Text)<{ color: string }>`
  font-size: 22px;
  font-weight: 700;
  color: ${({ color }: {color: string}) => color};
  text-align: center;
  margin-bottom: 8px;
`;

const SubtitleText = styled(Animated.Text)<{ color: string }>`
  font-size: 14px;
  color: ${({ color }: {color: string}) => color};
  text-align: center;
`;

const ProgressTrack = styled.View<{ bg: string }>`
  width: 100%;
  height: 3px;
  background-color: ${({ bg }: {bg: string}) => bg};
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 20px;
`;

const ProgressFill = styled(Animated.View)<{ fill: string }>`
  height: 3px;
  background-color: ${({ fill }: {fill: string}) => fill};
`;

const BrandLabel = styled.Text<{ color: string }>`
  font-size: 11px;
  letter-spacing: 2px;
  color: ${({ color }: {color: string}) => color};
`;

const BoxesRow = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: center;
  margin-top: 15px;
  margin-bottom: 25px;
`;

const BoxKey = styled.View<{ filled: boolean }>`
  width: 20px;
  height: 20px;
  border-radius: 4px;
  background-color: ${({ filled }: { filled: boolean }) => (filled ? "#22c55e" : "#e2e8f0")};
  border-width: 1.5px;
  border-color: ${({ filled }: { filled: boolean }) => (filled ? "#22c55e" : "#cbd5e1")};
  margin-horizontal: 4px;
`;

