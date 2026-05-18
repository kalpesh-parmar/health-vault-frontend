// src/components/Signup/TermsBottomSheet.tsx
import React, { forwardRef } from "react";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import styled from "styled-components/native";

import BottomSheet from "../shared/BottomSheet";

interface TermsBottomSheetProps {
  onClose: () => void;
}

const TermsBottomSheet = forwardRef<BottomSheetModal, TermsBottomSheetProps>(
  ({ onClose }, ref) => {
    return (
      <BottomSheet ref={ref}>
        <TermsContainer>
          <TermsHeaderRow>
            <TermsTitle>Terms & Conditions</TermsTitle>

            <CloseButton onPress={onClose}>
              <Ionicons name="close" size={20} color="#6B7280" />
            </CloseButton>
          </TermsHeaderRow>

          <TermsScrollView showsVerticalScrollIndicator={false}>
            <TermsSection>
              <TermsHeading>1. Account Responsibility</TermsHeading>

              <TermsDescription>
                You are responsible for maintaining the confidentiality of
                your account credentials and all activities performed using
                your account.
              </TermsDescription>
            </TermsSection>

            <TermsSection>
              <TermsHeading>2. Personal Information</TermsHeading>

              <TermsDescription>
                By creating an account, you agree to provide accurate and
                updated information including your email address, phone
                number, and profile details.
              </TermsDescription>
            </TermsSection>

            <TermsSection>
              <TermsHeading>3. Privacy & Security</TermsHeading>

              <TermsDescription>
                Your personal data is securely stored and handled according to
                our privacy standards. We do not share sensitive information
                without consent.
              </TermsDescription>
            </TermsSection>

            <TermsSection>
              <TermsHeading>4. Acceptable Usage</TermsHeading>

              <TermsDescription>
                Users must not misuse the application, attempt unauthorized
                access, distribute harmful content, or violate applicable laws
                and regulations.
              </TermsDescription>
            </TermsSection>

            <TermsSection>
              <TermsHeading>5. Service Availability</TermsHeading>

              <TermsDescription>
                We may update, modify, or temporarily suspend certain services
                for maintenance, improvements, or security purposes.
              </TermsDescription>
            </TermsSection>

            <TermsSection>
              <TermsHeading>6. Consent</TermsHeading>

              <TermsDescription>
                By continuing registration, you acknowledge that you have read
                and agreed to these Terms & Conditions.
              </TermsDescription>
            </TermsSection>
          </TermsScrollView>
        </TermsContainer>
      </BottomSheet>
    );
  }
);

TermsBottomSheet.displayName = "TermsBottomSheet";

export default TermsBottomSheet;

// ─── Styled Components ────────────────────────────────────────────────────────

const TermsContainer = styled.View`
  padding: 22px 20px 34px 20px;
  background-color: #ffffff;
`;

const TermsHeaderRow = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18px;
`;

const TermsTitle = styled.Text`
  font-size: 22px;
  font-weight: 800;
  color: #1e1b4b;
  letter-spacing: -0.4px;
`;

const CloseButton = styled.TouchableOpacity`
  width: 34px;
  height: 34px;
  border-radius: 17px;
  background-color: #f3f4f6;
  align-items: center;
  justify-content: center;
`;

const TermsScrollView = styled.ScrollView`
  max-height: 420px;
`;

const TermsSection = styled.View`
  margin-bottom: 18px;
`;

const TermsHeading = styled.Text`
  font-size: 15px;
  font-weight: 700;
  color: #4c1d95;
  margin-bottom: 6px;
`;

const TermsDescription = styled.Text`
  font-size: 13.5px;
  line-height: 22px;
  color: #6b7280;
`;
