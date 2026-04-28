import React, { useState } from "react";
import { Switch } from "react-native";
import styled from "styled-components/native";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import ScreenHeader from "../../components/shared/Header";

const SettingsScreen = () => {
  const [isBiometricEnabled, setBiometricEnabled] = useState(true);
  const [isDarkMode, setDarkMode] = useState(false);
  const [isNotificationsEnabled, setNotificationsEnabled] = useState(true);

  return (
    <Container>
      <StatusBar style="dark" />
      <ScreenHeader title="Settings" showBack={true} />

      <StyledScrollView showsVerticalScrollIndicator={false}>

        <SectionHeader>Account Settings</SectionHeader>
        <SettingsGroup>
          <SettingItem>
            <IconBox bg="#eff6ff">
              <MaterialCommunityIcons
                name="shield-lock-outline"
                size={22}
                color="#2563eb"
              />
            </IconBox>
            <SettingLabel>Security & Password</SettingLabel>
            <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
          </SettingItem>

          <Divider />

          <SettingItem>
            <IconBox bg="#f0fdf4">
              <MaterialCommunityIcons
                name="fingerprint"
                size={22}
                color="#22c55e"
              />
            </IconBox>
            <SettingLabel>Biometric Unlock</SettingLabel>
            <Switch
              value={isBiometricEnabled}
              onValueChange={setBiometricEnabled}
              trackColor={{ false: "#e2e8f0", true: "#93c5fd" }}
            />
          </SettingItem>
        </SettingsGroup>

        <SectionHeader>Preferences</SectionHeader>
        <SettingsGroup>
          <SettingItem>
            <IconBox bg="#fff7ed">
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
            />
          </SettingItem>

          <Divider />

          <SettingItem>
            <IconBox bg="#fafafa">
              <MaterialCommunityIcons
                name="theme-light-dark"
                size={22}
                color="#475569"
              />
            </IconBox>
            <SettingLabel>Dark Mode</SettingLabel>
            <Switch value={isDarkMode} onValueChange={setDarkMode} />
          </SettingItem>

          <Divider />

          <SettingItem>
            <IconBox bg="#f5f3ff">
              <MaterialCommunityIcons
                name="translate"
                size={22}
                color="#7c3aed"
              />
            </IconBox>
            <SettingLabel>Language</SettingLabel>
            <ValueText>English</ValueText>
            <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
          </SettingItem>
        </SettingsGroup>

        <SectionHeader>Storage & Data</SectionHeader>
        <SettingsGroup>
          <SettingItem>
            <IconBox bg="#fdf2f8">
              <MaterialCommunityIcons
                name="cloud-upload-outline"
                size={22}
                color="#db2777"
              />
            </IconBox>
            <SettingLabel>Auto Backup</SettingLabel>
            <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
          </SettingItem>

          <Divider />

          <SettingItem>
            <IconBox bg="#f1f5f9">
              <MaterialCommunityIcons
                name="trash-can-outline"
                size={22}
                color="#ef4444"
              />
            </IconBox>
            <SettingLabel style={{ color: "#ef4444" }}>
              Clear Cache
            </SettingLabel>
            <ValueText>124 MB</ValueText>
          </SettingItem>
        </SettingsGroup>
        <FooterContainer>
          <FooterNote>Version 2.0.4 • HealthVault Pro</FooterNote>
        </FooterContainer>
      </StyledScrollView>
    </Container>
  );
};

export default SettingsScreen;

const Container = styled.SafeAreaView`
  flex: 1;
  background-color: #f8fafc; /* Slightly off-white background for modern feel */
`;

const StyledScrollView = styled.ScrollView`
  flex: 1;
  padding: 20px;
`;

const SectionHeader = styled.Text`
  font-size: 14px;
  font-weight: 700;
  color: #94a3b8;
  margin-bottom: 10px;
  margin-left: 10px;
  text-transform: uppercase;
  letter-spacing: 1px;
`;

const SettingsGroup = styled.View`
  background-color: #ffffff;
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
  color: #1e293b;
  margin-left: 15px;
`;

const ValueText = styled.Text`
  font-size: 14px;
  color: #94a3b8;
  margin-right: 10px;
`;

const Divider = styled.View`
  height: 1px;
  background-color: #f1f5f9;
  margin-left: 70px; /* Aligns with the text, skipping the icon */
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
  color: #94a3b8;
  padding-bottom: 20px;
`;
