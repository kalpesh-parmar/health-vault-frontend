import React, { forwardRef, useState, useEffect } from "react";
import { View, TextInput, Platform, Keyboard } from "react-native";
import styled from "styled-components/native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import BottomSheet from "../../../../components/shared/BottomSheet";
import { useAppTheme } from "../../../../context/ThemeContext";
import { AddOrEditMedication } from "../../../../types";
import { useBottomBarPadding } from "../../../../hooks/useBottomBarPadding";

interface RefillBottomSheetProps {
  medication: AddOrEditMedication | null;
  onCancel: () => void;
  onRefill: (amount: number) => void;
}

export const RefillBottomSheet = forwardRef<any, RefillBottomSheetProps>(
  ({ medication, onCancel, onRefill }, ref) => {
    const { isDark } = useAppTheme();
    const [pillsToAdd, setPillsToAdd] = useState("");
    const [keyboardPadding, setKeyboardPadding] = useState(0);
    const bottomPadding = useBottomBarPadding(24, 12);

    useEffect(() => {
      const showSub = Keyboard.addListener(
        Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
        (e) => {
          setKeyboardPadding(Platform.OS === "ios" ? e.endCoordinates.height : 250);
        }
      );
      const hideSub = Keyboard.addListener(
        Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
        () => {
          setKeyboardPadding(0);
        }
      );

      return () => {
        showSub.remove();
        hideSub.remove();
      };
    }, []);

    const remainingPills = medication?.totalQuantity || 0;

    const handleRefill = () => {
      const amount = parseInt(pillsToAdd, 10);
      if (!isNaN(amount) && amount > 0) {
        onRefill(amount);
        setPillsToAdd("");
      }
    };

    return (
      <BottomSheet ref={ref}>
        {medication ? (
            <Container style={{ paddingBottom: keyboardPadding || 16 }}>
              <HeaderRow>
                <Title>Refill Medication</Title>
                <Subtitle>
                  Add new pills to continue your medication and avoid missing any doses.
                </Subtitle>
              </HeaderRow>

              <CardsContainer>
                <InfoCard isDark={isDark}>
                  <IconBox>
                    <Ionicons
                      name={
                        medication.medicationType?.toUpperCase() === "TABLET"
                          ? "medkit"
                          : "medical"
                      }
                      size={24}
                      color="#6366f1"
                    />
                  </IconBox>
                  <CardTextContent>
                    <CardTitle isDark={isDark}>{medication.medicationName}</CardTitle>
                    <CardSubtitle isDark={isDark}>{medication.medicationType}</CardSubtitle>
                  </CardTextContent>
                </InfoCard>

                <Divider />

                <InfoCard isDark={isDark}>
                  <IconBoxGreen>
                    <MaterialCommunityIcons name="bottle-tonic-plus" size={24} color="#10b981" />
                  </IconBoxGreen>
                  <CardTextContent>
                    <CardSubtitle isDark={isDark}>Remaining Pills</CardSubtitle>
                    <PillCountRow>
                      <PillCountText isDark={isDark}>{remainingPills}</PillCountText>
                      <CardSubtitle isDark={isDark}>pills left</CardSubtitle>
                    </PillCountRow>
                  </CardTextContent>
                </InfoCard>
              </CardsContainer>

              <InputSection>
                <InputTitle isDark={isDark}>Add Pills to Refill</InputTitle>
                <InputSubtitle isDark={isDark}>
                  Enter the number of pills you want to add.
                </InputSubtitle>

                <InputWrapper isDark={isDark}>
                  <Ionicons name="medkit-outline" size={20} color="#94a3b8" />
                  <StyledInput
                    isDark={isDark}
                    placeholder="Enter number of pills"
                    placeholderTextColor="#94a3b8"
                    keyboardType="numeric"
                    value={pillsToAdd}
                    onChangeText={setPillsToAdd}
                  />
                  <InputSuffix isDark={isDark}>pills</InputSuffix>
                </InputWrapper>
              </InputSection>

              <InfoBox isDark={isDark}>
                <Ionicons name="information-circle-outline" size={20} color="#10b981" />
                <InfoBoxText isDark={isDark}>
                  These pills will be added to your current remaining pills and your medication will continue as usual.
                </InfoBoxText>
              </InfoBox>

              <ActionRow bottomPadding={bottomPadding}>
                <CancelButton onPress={onCancel} activeOpacity={0.8} isDark={isDark}>
                  <CancelButtonText isDark={isDark}>Cancel</CancelButtonText>
                </CancelButton>
                <RefillButton onPress={handleRefill} activeOpacity={0.8}>
                  <RefillButtonText>Refill</RefillButtonText>
                </RefillButton>
              </ActionRow>
            </Container>
        ) : (
          <View />
        )}
      </BottomSheet>
    );
  }
);

export default RefillBottomSheet;

// ─── Styled Components ──────────────────────────────────────────────

const Container = styled.View`
  padding: 16px;
  flex: 1;
`;

const HeaderRow = styled.View`
  margin-bottom: 16px;
  align-items: center;
`;

const Title = styled.Text`
  font-size: 18px;
  font-weight: 800;
  color: ${({ theme }: any) => theme.colors.textPrimary};
  margin-bottom: 6px;
`;

const Subtitle = styled.Text`
  font-size: 12px;
  color: ${({ theme }: any) => theme.colors.textMuted};
  text-align: center;
  line-height: 18px;
`;

const CardsContainer = styled.View`
  background-color: ${({ isDark }: any) => (isDark ? "#1e293b" : "#f8fafc")};
  border-radius: 12px;
  padding: 12px;
  margin-bottom: 16px;
`;

const InfoCard = styled.View<{ isDark: boolean }>`
  flex-direction: row;
  align-items: center;
`;

const IconBox = styled.View`
  width: 40px;
  height: 40px;
  border-radius: 20px;
  background-color: #e0e7ff;
  justify-content: center;
  align-items: center;
  margin-right: 12px;
`;

const IconBoxGreen = styled(IconBox)`
  background-color: #d1fae5;
`;

const CardTextContent = styled.View`
  flex: 1;
`;

const CardTitle = styled.Text<{ isDark: boolean }>`
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }: any) => theme.colors.textPrimary};
  margin-bottom: 2px;
`;

const CardSubtitle = styled.Text<{ isDark: boolean }>`
  font-size: 12px;
  color: ${({ theme }: any) => theme.colors.textMuted};
`;

const PillCountRow = styled.View`
  flex-direction: row;
  align-items: baseline;
  gap: 4px;
`;

const PillCountText = styled.Text<{ isDark: boolean }>`
  font-size: 16px;
  font-weight: 700;
  color: #10b981;
`;

const Divider = styled.View`
  height: 1px;
  background-color: ${({ theme }: any) => theme.colors.border};
  margin-vertical: 12px;
`;

const InputSection = styled.View`
  margin-bottom: 16px;
`;

const InputTitle = styled.Text<{ isDark: boolean }>`
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }: any) => theme.colors.textPrimary};
  margin-bottom: 4px;
`;

const InputSubtitle = styled.Text<{ isDark: boolean }>`
  font-size: 12px;
  color: ${({ theme }: any) => theme.colors.textMuted};
  margin-bottom: 10px;
`;

const InputWrapper = styled.View<{ isDark: boolean }>`
  flex-direction: row;
  align-items: center;
  border-width: 1px;
  border-color: ${({ theme }: any) => theme.colors.border};
  border-radius: 12px;
  padding: 0 12px;
  height: 48px;
  background-color: ${({ isDark }: any) => (isDark ? "#1e293b" : "#ffffff")};
`;

const StyledInput = styled(TextInput)<{ isDark: boolean }>`
  flex: 1;
  height: 100%;
  margin-left: 10px;
  color: ${({ theme }: any) => theme.colors.textPrimary};
  font-size: 14px;
`;

const InputSuffix = styled.Text<{ isDark: boolean }>`
  color: ${({ theme }: any) => theme.colors.textMuted};
  font-size: 12px;
`;

const InfoBox = styled.View<{ isDark: boolean }>`
  flex-direction: row;
  background-color: ${({ isDark }: any) => (isDark ? "#064e3b" : "#f0fdf4")};
  padding: 12px;
  border-radius: 12px;
  margin-bottom: 16px;
  align-items: flex-start;
`;

const InfoBoxText = styled.Text<{ isDark: boolean }>`
  flex: 1;
  color: ${({ isDark }: any) => (isDark ? "#34d399" : "#166534")};
  font-size: 12px;
  line-height: 18px;
  margin-left: 10px;
`;

const ActionRow = styled.View<{ bottomPadding: number }>`
  flex-direction: row;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: ${(props: any) => props.bottomPadding}px;
`;

const CancelButton = styled.TouchableOpacity<{ isDark: boolean }>`
  flex: 1;
  padding: 12px;
  border-radius: 12px;
  align-items: center;
  justify-content: center;
  border-width: 1px;
  border-color: ${({ theme }: any) => theme.colors.primary};
  background-color: transparent;
`;

const CancelButtonText = styled.Text<{ isDark: boolean }>`
  color: ${({ theme }: any) => theme.colors.primary};
  font-size: 14px;
  font-weight: 700;
`;

const RefillButton = styled.TouchableOpacity`
  flex: 1;
  background-color: ${({ theme }: any) => theme.colors.primary};
  padding: 12px;
  border-radius: 12px;
  align-items: center;
  justify-content: center;
  shadow-color: ${({ theme }: any) => theme.colors.primary};
  shadow-opacity: 0.3;
  shadow-radius: 10px;
  elevation: 5;
`;

const RefillButtonText = styled.Text`
  color: #ffffff;
  font-size: 14px;
  font-weight: 700;
`;
