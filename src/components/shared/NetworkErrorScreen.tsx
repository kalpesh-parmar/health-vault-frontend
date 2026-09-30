import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Easing,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import styled from "styled-components/native";
import HealthVaultLogo from "./HealthVaultLogo";

interface NetworkErrorScreenProps {
  onRetry: () => void;
  isChecking?: boolean;
}

export const NetworkErrorScreen: React.FC<NetworkErrorScreenProps> = ({
  onRetry,
  isChecking = false,
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    // Fade & slide in animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    // Gentle pulse loop for the icon ring
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    pulse.start();

    return () => pulse.stop();
  }, [fadeAnim, slideAnim, pulseAnim]);

  return (
    <Container>
      <StatusBar style="light" translucent backgroundColor="transparent" />

      {/* Main Background Gradient matching Health Vault header theme */}
      <BackgroundGradient
        colors={["#1e1b4b", "#312e81", "#020617"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <DecorCircles>
          <Circle1 />
          <Circle2 />
        </DecorCircles>

        <ContentWrapper style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          {/* Top Logo & Brand */}
          <BrandHeader>
            <HealthVaultLogo size={52} />
            <BrandName>Health Vault</BrandName>
            <BrandBadge>
              <Ionicons name="shield-checkmark" size={12} color="#a5b4fc" />
              <BrandBadgeText>Secure Offline Gate</BrandBadgeText>
            </BrandBadge>
          </BrandHeader>

          {/* Central Offline Visual */}
          <VisualSection>
            <AnimatedPulseRing
              style={{
                transform: [{ scale: pulseAnim }],
              }}
            />
            <IconContainer>
              <LinearGradient
                colors={["#4338ca", "#312e81"]}
                style={styles.iconGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <MaterialCommunityIcons
                  name="wifi-off"
                  size={46}
                  color="#ffffff"
                />
              </LinearGradient>
              <AlertBadge>
                <Ionicons name="alert" size={14} color="#ffffff" />
              </AlertBadge>
            </IconContainer>
          </VisualSection>

          {/* Info Card */}
          <Card>
            <Title>No Connection Detected</Title>
            <Subtitle>
              Health Vault requires an active internet connection to securely access
              and sync your medical records, health documents, and reminders.
            </Subtitle>

            {/* Offline Status Indicator */}
            <StatusPill>
              <StatusDot />
              <StatusText>Network Disconnected</StatusText>
            </StatusPill>
          </Card>

          {/* Action Button */}
          <ActionSection>
            <RetryButton
              onPress={onRetry}
              disabled={isChecking}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={["#6366f1", "#4f46e5", "#3730a3"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.buttonGradient}
              >
                {isChecking ? (
                  <ButtonContent>
                    <ActivityIndicator size="small" color="#ffffff" />
                    <ButtonText style={{ marginLeft: 10 }}>Checking Network...</ButtonText>
                  </ButtonContent>
                ) : (
                  <ButtonContent>
                    <Ionicons name="refresh" size={20} color="#ffffff" />
                    <ButtonText style={{ marginLeft: 8 }}>Try Again</ButtonText>
                  </ButtonContent>
                )}
              </LinearGradient>
            </RetryButton>

            <HelperText>Please verify your Wi-Fi or mobile data settings</HelperText>
          </ActionSection>
        </ContentWrapper>
      </BackgroundGradient>
    </Container>
  );
};

export default NetworkErrorScreen;

// ─── Styled Components ──────────────────────────────────────────────

const Container = styled.View`
  flex: 1;
  background-color: #020617;
`;

const BackgroundGradient = styled(LinearGradient)`
  flex: 1;
  justify-content: center;
  align-items: center;
  padding: 24px;
`;

const DecorCircles = styled.View`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  overflow: hidden;
`;

const Circle1 = styled.View`
  position: absolute;
  top: -60px;
  right: -60px;
  width: 220px;
  height: 220px;
  border-radius: 110px;
  background-color: rgba(99, 102, 241, 0.12);
`;

const Circle2 = styled.View`
  position: absolute;
  bottom: -40px;
  left: -40px;
  width: 180px;
  height: 180px;
  border-radius: 90px;
  background-color: rgba(79, 70, 229, 0.08);
`;

const ContentWrapper = styled(Animated.View)`
  width: 100%;
  max-width: 400px;
  align-items: center;
`;

const BrandHeader = styled.View`
  align-items: center;
  margin-bottom: 28px;
`;

const BrandName = styled.Text`
  font-size: 20px;
  font-weight: 700;
  color: #ffffff;
  margin-top: 10px;
  letter-spacing: 0.5px;
`;

const BrandBadge = styled.View`
  flex-direction: row;
  align-items: center;
  background-color: rgba(99, 102, 241, 0.2);
  padding: 4px 10px;
  border-radius: 12px;
  margin-top: 6px;
  border-width: 1px;
  border-color: rgba(165, 180, 252, 0.2);
`;

const BrandBadgeText = styled.Text`
  font-size: 11px;
  color: #c7d2fe;
  font-weight: 600;
  margin-left: 5px;
`;

const VisualSection = styled.View`
  width: 110px;
  height: 110px;
  justify-content: center;
  align-items: center;
  margin-bottom: 24px;
`;

const AnimatedPulseRing = styled(Animated.View)`
  position: absolute;
  width: 110px;
  height: 110px;
  border-radius: 55px;
  background-color: rgba(239, 68, 68, 0.15);
  border-width: 1.5px;
  border-color: rgba(239, 68, 68, 0.35);
`;

const IconContainer = styled.View`
  width: 84px;
  height: 84px;
  border-radius: 42px;
  justify-content: center;
  align-items: center;
  shadow-color: #000;
  shadow-offset: 0px 8px;
  shadow-opacity: 0.35;
  shadow-radius: 12px;
  elevation: 8;
`;

const AlertBadge = styled.View`
  position: absolute;
  top: 2px;
  right: 2px;
  width: 24px;
  height: 24px;
  border-radius: 12px;
  background-color: #ef4444;
  justify-content: center;
  align-items: center;
  border-width: 2px;
  border-color: #1e1b4b;
`;

const Card = styled.View`
  width: 100%;
  background-color: rgba(30, 27, 75, 0.7);
  border-radius: 24px;
  padding: 24px 20px;
  align-items: center;
  border-width: 1px;
  border-color: rgba(99, 102, 241, 0.25);
  margin-bottom: 24px;
`;

const Title = styled.Text`
  font-size: 20px;
  font-weight: 700;
  color: #ffffff;
  text-align: center;
  margin-bottom: 10px;
`;

const Subtitle = styled.Text`
  font-size: 14px;
  color: #94a3b8;
  text-align: center;
  line-height: 20px;
  margin-bottom: 18px;
`;

const StatusPill = styled.View`
  flex-direction: row;
  align-items: center;
  background-color: rgba(239, 68, 68, 0.15);
  padding: 6px 14px;
  border-radius: 20px;
  border-width: 1px;
  border-color: rgba(239, 68, 68, 0.3);
`;

const StatusDot = styled.View`
  width: 8px;
  height: 8px;
  border-radius: 4px;
  background-color: #ef4444;
  margin-right: 8px;
`;

const StatusText = styled.Text`
  font-size: 12px;
  color: #fca5a5;
  font-weight: 600;
`;

const ActionSection = styled.View`
  width: 100%;
  align-items: center;
`;

const RetryButton = styled(TouchableOpacity)`
  width: 100%;
  border-radius: 16px;
  overflow: hidden;
  shadow-color: #4f46e5;
  shadow-offset: 0px 6px;
  shadow-opacity: 0.35;
  shadow-radius: 10px;
  elevation: 6;
`;

const ButtonContent = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: center;
  padding: 16px 24px;
`;

const ButtonText = styled.Text`
  font-size: 16px;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: 0.3px;
`;

const HelperText = styled.Text`
  font-size: 12px;
  color: #64748b;
  margin-top: 14px;
  text-align: center;
`;

const styles = StyleSheet.create({
  iconGradient: {
    width: 84,
    height: 84,
    borderRadius: 42,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "rgba(165, 180, 252, 0.3)",
  },
  buttonGradient: {
    width: "100%",
    borderRadius: 16,
  },
});
