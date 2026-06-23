import React from "react";
import styled from "styled-components/native";
import { ActivityIndicator } from "react-native";
import { useAppTheme } from "../../context/ThemeContext";

import GoogleLogo from "../../assets/auth-logos/GoogleLogo";
import AppleLogo from "../../assets/auth-logos/AppleLogo";
import FacebookLogo from "../../assets/auth-logos/FacebookLogo";
import MicrosoftLogo from "../../assets/auth-logos/MicrosoftLogo";

type AuthProvider = "google" | "apple" | "facebook" | "microsoft";

interface SocialAuthButtonProps {
  provider: AuthProvider;
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}

const LOGO_COMPONENTS = {
  google: GoogleLogo,
  apple: AppleLogo,
  facebook: FacebookLogo,
  microsoft: MicrosoftLogo,
};

const SocialAuthButton: React.FC<SocialAuthButtonProps> = ({
  provider,
  label,
  onPress,
  loading = false,
  disabled = false,
}) => {
  const { theme, isDark } = useAppTheme();
  const Logo = LOGO_COMPONENTS[provider];
  
  // For Apple logo, we want it to adapt to theme (white in dark mode, black in light mode)
  // For other logos, they should maintain their original brand colors
  const appleLogoColor = isDark ? "#FFFFFF" : "#000000";

  return (
    <ButtonContainer
      themeColor={theme.colors}
      onPress={onPress}
      disabled={loading || disabled}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {loading ? (
        <ActivityIndicator color={theme.colors.textPrimary} />
      ) : (
        <>
          <IconWrapper>
            {provider === "apple" ? (
              <Logo width={24} height={24} color={appleLogoColor} />
            ) : (
              <Logo width={24} height={24} />
            )}
          </IconWrapper>
          <ButtonText themeColor={theme.colors}>{label}</ButtonText>
        </>
      )}
    </ButtonContainer>
  );
};

export default SocialAuthButton;

const ButtonContainer = styled.TouchableOpacity<{ themeColor: any }>`
  flex-direction: row;
  align-items: center;
  justify-content: center;
  background-color: ${(props: { themeColor: any }) => props.themeColor.surface};
  border-width: 1px;
  border-color: ${(props: { themeColor: any }) => props.themeColor.border};
  border-radius: 12px;
  padding-vertical: 14px;
  padding-horizontal: 16px;
  margin-bottom: 12px;
  box-shadow: 0px 2px 4px rgba(0, 0, 0, 0.05);
  elevation: 2;
  min-height: 52px;
`;

const IconWrapper = styled.View`
  position: absolute;
  left: 20px;
  width: 24px;
  height: 24px;
  align-items: center;
  justify-content: center;
`;

const ButtonText = styled.Text<{ themeColor: any }>`
  font-size: 16px;
  font-weight: 600;
  color: ${(props: { themeColor: any }) => props.themeColor.textPrimary};
`;
