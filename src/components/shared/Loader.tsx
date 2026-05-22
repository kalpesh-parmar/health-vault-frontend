import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, Dimensions, Platform, Modal } from "react-native";
import styled from "styled-components/native";
import { BlurView } from "expo-blur";
import { useAppTheme } from "../../context/ThemeContext";

const { width, height } = Dimensions.get("screen");

interface Props {
  visible: boolean;
  title?: string;
  subtitle?: string;
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

const ModernLoader = ({ visible, title, subtitle }: Props) => {
  const { isDark } = useAppTheme();
  const t = isDark ? tokens.dark : tokens.light;

  const [stageIndex, setStageIndex] = useState(0);

  // ✅ Dynamic stages
  const stages: Stage[] = [
    {
      title: title || "Processing",
      subtitle: subtitle || "Please wait...",
    },
    {
      title: "Almost Done",
      subtitle: "Thank you for your patience.",
    },
  ];

  const masterFade = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.94)).current;
  const cardFade = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(1)).current;
  const ringScale = useRef(new Animated.Value(1)).current;
  const pulse1 = useRef(new Animated.Value(1)).current;
  const pulse2 = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const titleFade = useRef(new Animated.Value(1)).current;
  const titleY = useRef(new Animated.Value(0)).current;
  const subFade = useRef(new Animated.Value(1)).current;
  const orbAnim = useRef(new Animated.Value(0)).current;

  const stageTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (visible) {
      setStageIndex(0);
      progressAnim.setValue(0);

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

      // loops
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

      Animated.timing(progressAnim, {
        toValue: 0.6,
        duration: 2800,
        useNativeDriver: false,
      }).start();

      // ✅ Stage switch after 3 sec
      stageTimer.current = setTimeout(() => {
        Animated.parallel([
          Animated.timing(titleFade, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(titleY, {
            toValue: -10,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(subFade, {
            toValue: 0,
            duration: 150,
            useNativeDriver: true,
          }),
        ]).start(() => {
          setStageIndex(1);
          titleY.setValue(10);

          Animated.parallel([
            Animated.timing(titleFade, {
              toValue: 1,
              duration: 250,
              useNativeDriver: true,
            }),
            Animated.timing(titleY, {
              toValue: 0,
              duration: 250,
              useNativeDriver: true,
            }),
            Animated.timing(subFade, {
              toValue: 1,
              duration: 250,
              useNativeDriver: true,
            }),
          ]).start();

          Animated.timing(progressAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: false,
          }).start();
        });
      }, 3000);
    } else {
      if (stageTimer.current) clearTimeout(stageTimer.current);
      setStageIndex(0);
    }
  }, [visible]);

  const currentStage = stages[stageIndex];

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

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
            <LogoCircle
              bg={t.iconBg}
              border={t.iconBorder}
              style={{ transform: [{ scale: logoScale }] }}
            >
              <CrossV color={t.crossColor} />
              <CrossH color={t.crossColor} />
            </LogoCircle>
          </LogoArea>

          <TextBlock>
            <TitleText
              style={{
                opacity: titleFade,
                transform: [{ translateY: titleY }],
              }}
              color={t.title}
            >
              {currentStage.title}
            </TitleText>
            <SubtitleText style={{ opacity: subFade }} color={t.subtitle}>
              {currentStage.subtitle}
            </SubtitleText>
          </TextBlock>

          <ProgressTrack bg={t.progressBg}>
            <ProgressFill
              fill={t.progressFill}
              style={{ width: progressWidth }}
            />
          </ProgressTrack>

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
