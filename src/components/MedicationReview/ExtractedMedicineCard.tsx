import React from "react";
import styled from "styled-components/native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../../context/ThemeContext";
import { ExtractedMedicine } from "../../types/medicationReview";
import MedicineCheckbox from "./MedicineCheckbox";

interface ExtractedMedicineCardProps {
  medicine: ExtractedMedicine;
  onPress: () => void;
  onToggle: () => void;
  isDuplicate?: boolean;
  duplicateHasDifference?: boolean;
}

export const ExtractedMedicineCard: React.FC<ExtractedMedicineCardProps> = ({
  medicine,
  onPress,
  onToggle,
  isDuplicate = false,
  duplicateHasDifference = false,
}) => {
  const { isDark } = useAppTheme();

  const isLowConfidence = medicine.confidence !== undefined && medicine.confidence < 0.8;
  const confidencePct = medicine.confidence !== undefined ? Math.round(medicine.confidence * 100) : 100;

  return (
    <CardContainer
      onPress={onPress}
      activeOpacity={0.9}
      isDark={isDark}
      style={{
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
      }}
    >
      <MainRow>
        <MedIconContainer>
          <MedEmoji>💊</MedEmoji>
        </MedIconContainer>

        <InfoColumn>
          <MedicineName numberOfLines={1} isDark={isDark}>{medicine.name}</MedicineName>
          <MedicineDetails numberOfLines={1} isDark={isDark}>
            {medicine.medicineType || "Tablet"} • {medicine.dosage || "N/A"}{medicine.dosageUnit || ""}
            {medicine.frequency ? ` • ${medicine.frequency}` : ""}
          </MedicineDetails>

          {isDuplicate && (
            <BadgeRow>
              <DuplicateBadge hasDifference={duplicateHasDifference}>
                <DuplicateBadgeText>
                  {duplicateHasDifference ? "Different version found" : "Identical duplicate"}
                </DuplicateBadgeText>
              </DuplicateBadge>
            </BadgeRow>
          )}

          {isLowConfidence && (
            <ConfidenceRow>
              <Ionicons name="warning" size={12} color="#b45309" />
              <ConfidenceText>
                {confidencePct}% confidence • Review recommended
              </ConfidenceText>
            </ConfidenceRow>
          )}
        </InfoColumn>

        <CheckboxWrapper>
          <MedicineCheckbox checked={medicine.selected} onPress={onToggle} />
        </CheckboxWrapper>
      </MainRow>
    </CardContainer>
  );
};

const CardContainer = styled.TouchableOpacity<{ isDark: boolean }>`
  background-color: ${(props: any) => props.isDark ? "#1e293b" : "#ffffff"};
  border-radius: 12px;
  padding: 14px;
  margin-bottom: 10px;
  border-width: 1px;
  border-color: ${(props: any) => props.isDark ? "#334155" : "#f1f5f9"};
`;

const MainRow = styled.View`
  flex-direction: row;
  align-items: center;
`;

const MedIconContainer = styled.View`
  width: 40px;
  height: 40px;
  border-radius: 20px;
  background-color: #f1f5f9;
  justify-content: center;
  align-items: center;
  margin-right: 12px;
`;

const MedEmoji = styled.Text`
  font-size: 20px;
`;

const InfoColumn = styled.View`
  flex: 1;
  margin-right: 12px;
`;

const MedicineName = styled.Text<{ isDark: boolean }>`
  font-size: 16px;
  font-weight: 700;
  color: ${(props: any) => props.isDark ? "#f8fafc" : "#1f2937"};
  margin-bottom: 2px;
`;

const MedicineDetails = styled.Text<{ isDark: boolean }>`
  font-size: 13px;
  font-weight: 500;
  color: ${(props: any) => props.isDark ? "#94a3b8" : "#64748b"};
`;

const ConfidenceRow = styled.View`
  flex-direction: row;
  align-items: center;
  margin-top: 6px;
  background-color: #fef3c7;
  padding-horizontal: 8px;
  padding-vertical: 4px;
  border-radius: 6px;
  align-self: flex-start;
  gap: 4px;
`;

const ConfidenceText = styled.Text`
  font-size: 11px;
  font-weight: 600;
  color: #b45309;
`;

const CheckboxWrapper = styled.View`
  padding: 6px;
  justify-content: center;
  align-items: center;
`;

const BadgeRow = styled.View`
  flex-direction: row;
  margin-top: 6px;
`;

const DuplicateBadge = styled.View<{ hasDifference: boolean }>`
  background-color: ${(props: any) => props.hasDifference ? "#fee2e2" : "#e0e7ff"};
  padding-horizontal: 8px;
  padding-vertical: 3px;
  border-radius: 6px;
`;

const DuplicateBadgeText = styled.Text`
  font-size: 10px;
  font-weight: 700;
  color: #312e81;
`;

export default ExtractedMedicineCard;
