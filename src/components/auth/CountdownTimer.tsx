import React, { useState, useEffect } from "react";
import { ActivityIndicator } from "react-native";
import styled from "styled-components/native";
import { useAppTheme } from "../../context/ThemeContext";

interface CountdownTimerProps {
  onResend: () => Promise<void>;
  initialSeconds?: number;
  disabled?: boolean;
}

const CountdownTimer: React.FC<CountdownTimerProps> = ({ onResend, initialSeconds = 30, disabled }) => {
  const [seconds, setSeconds] = useState(initialSeconds);
  const [loading, setLoading] = useState(false);
  const { theme } = useAppTheme();

  useEffect(() => {
    if (seconds <= 0) return;

    const interval = setInterval(() => {
      setSeconds((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [seconds]);

  const handleResendPress = async () => {
    if (seconds > 0 || loading || disabled) return;
    setLoading(true);
    try {
      await onResend();
      setSeconds(initialSeconds);
    } catch (error) {
      console.error("Resend error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container>
      <QuestionText themeColor={theme.colors}>Didn’t receive the code?</QuestionText>
      {seconds > 0 ? (
        <TimerText themeColor={theme.colors}>Resend in {seconds}s</TimerText>
      ) : loading ? (
        <LoadingWrapper>
          <ActivityIndicator size="small" color={theme.colors.primary} />
        </LoadingWrapper>
      ) : (
        <ResendLink onPress={handleResendPress} disabled={disabled} style={{ opacity: disabled ? 0.5 : 1 }}>
          <ResendText themeColor={theme.colors}>Resend OTP</ResendText>
        </ResendLink>
      )}
    </Container>
  );
};

export default CountdownTimer;

const Container = styled.View`
  flex-direction: row;
  justify-content: center;
  align-items: center;
  margin-vertical: 16px;
`;

const QuestionText = styled.Text<{ themeColor: any }>`
  font-size: 14px;
  color: ${(props: { themeColor: any }) => props.themeColor.textMuted};
`;

const TimerText = styled.Text<{ themeColor: any }>`
  font-size: 14px;
  font-weight: 700;
  color: ${(props: { themeColor: any }) => props.themeColor.textPrimary};
  margin-left: 6px;
`;

const ResendLink = styled.TouchableOpacity`
  margin-left: 6px;
  padding: 4px;
`;

const ResendText = styled.Text<{ themeColor: any }>`
  font-size: 14px;
  font-weight: 700;
  color: ${(props: { themeColor: any }) => props.themeColor.primary};
`;

const LoadingWrapper = styled.View`
  margin-left: 6px;
`;
