import React, { useState } from "react";
import { Switch } from "react-native";
import styled from "styled-components/native";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import ScreenHeader from "../../components/shared/Header";
import { useAppTheme } from "../../context/ThemeContext";

const SettingsScreen = () => {
  const [isBiometricEnabled, setBiometricEnabled] = useState(true);
  const [isNotificationsEnabled, setNotificationsEnabled] = useState(true);
  const { isDark, setThemeMode } = useAppTheme();

  return (
    <Container>
      <StatusBar style={isDark ? "light" : "dark"} />
      <ScreenHeader title="Settings" showBack={true} />

      <StyledScrollView showsVerticalScrollIndicator={false}>
        <SectionHeader>Preferences</SectionHeader>
        <SettingsGroup>
          <SettingItem>
            <IconBox bg={isDark ? "   white" : "#fff7ed"}>
              <MaterialCommunityIcons
                name="bell-outline"
                size={22}
                color="#f97316"
              />
            </IconBox>
            <SettingLabel>Notifications</SettingLabel>
            <Switch
              value={isNotificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: isDark ? "#475569" : "#e2e8f0", true: "#93c5fd" }}
            />
          </SettingItem>

          <Divider />

          <SettingItem>
            <IconBox bg={isDark ? "#334155" : "#fafafa"}>
              <MaterialCommunityIcons
                name="theme-light-dark"
                size={22}
                color={isDark ? "#f8fafc" : "#475569"}
              />
            </IconBox>
            <SettingLabel>Dark Mode</SettingLabel>
            <Switch
              value={isDark} 
              onValueChange={(val) => setThemeMode(val ? "dark" : "light")}
              trackColor={{ false: isDark ? "#475569" : "#e2e8f0", true: "#93c5fd" }} 
            />
          </SettingItem>
        </SettingsGroup>
        <FooterContainer>
          <FooterNote>Version 1.0.0 • HealthVault</FooterNote>
        </FooterContainer>
      </StyledScrollView>
    </Container>
  );
};

export default SettingsScreen;

const Container = styled.SafeAreaView`
  flex: 1;
  background-color: ${({ theme }: any) => theme.colors.background};
`;

const StyledScrollView = styled.ScrollView`
  flex: 1;
  padding: 20px;
`;

const SectionHeader = styled.Text`
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }: any) => theme.colors.textMuted};
  margin-bottom: 10px;
  margin-left: 10px;
  text-transform: uppercase;
  letter-spacing: 1px;
`;

const SettingsGroup = styled.View`
  background-color: ${({ theme }: any) => theme.colors.surface};
  border-radius: 24px;
  margin-bottom: 25px;
  overflow: hidden;
  shadow-color: #000;
  shadow-opacity: 0.03;
  elevation: 1;
`;

const SettingItem = styled.TouchableOpacity`
  flex-direction: row;
  align-items: center;
  padding: 16px;
`;

const IconBox = styled.View<{ bg: string }>`
  background-color: ${(props: { bg: string }) => props.bg};
  width: 40px;
  height: 40px;
  border-radius: 12px;
  justify-content: center;
  align-items: center;
`;

const SettingLabel = styled.Text`
  flex: 1;
  font-size: 16px;
  font-weight: 600;
  color: ${({ theme }: any) => theme.colors.textPrimary};
  margin-left: 15px;
`;

const ValueText = styled.Text`
  font-size: 14px;
  color: ${({ theme }: any) => theme.colors.textMuted};
  margin-right: 10px;
`;

const Divider = styled.View`
  height: 1px;
  background-color: ${({ theme }: any) => theme.colors.divider};
  margin-left: 70px;
`;

const FooterContainer = styled.View`
  flex: 1;
  justify-content: center;
  align-items: center;
  padding-bottom: 20px;
`;

const FooterNote = styled.Text`
  text-align: center;
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }: any) => theme.colors.textMuted};
  padding-bottom: 20px;
`;
