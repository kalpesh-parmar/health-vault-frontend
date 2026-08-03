import React from "react";
import styled from "styled-components/native";
import { useAppTheme } from "../../context/ThemeContext";
import { ExtractedMedicine } from "../../types/medicationReview";

interface MedicineSummaryCardProps {
  medicine: ExtractedMedicine;
}

export const MedicineSummaryCard: React.FC<MedicineSummaryCardProps> = ({ medicine }) => {
  const { isDark } = useAppTheme();

  return (
    <CardContainer
      isDark={isDark}
      style={{
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 4,
        elevation: 1,
      }}
    >
      <MainRow>
        <MedIconContainer>
          <MedEmoji>💊</MedEmoji>
        </MedIconContainer>
        <InfoColumn>
          <MedicineName isDark={isDark}>{medicine.name}</MedicineName>
          <MedicineDetails isDark={isDark}>
            {medicine.medicineType || "Tablet"} • {medicine.dosage || "N/A"}{medicine.dosageUnit || ""}
          </MedicineDetails>
          {medicine.frequency && (
            <MedicineSubDetails isDark={isDark}>
              {medicine.frequency}{medicine.timing ? ` • ${medicine.timing}` : ""}
            </MedicineSubDetails>
          )}
        </InfoColumn>
      </MainRow>
    </CardContainer>
  );
};

const CardContainer = styled.View<{ isDark: boolean }>`
  background-color: ${(props: any) => props.isDark ? "#1e293b" : "#ffffff"};
  border-radius: 12px;
  padding: 12px 14px;
  margin-bottom: 8px;
  border-width: 1px;
  border-color: ${(props: any) => props.isDark ? "#334155" : "#f1f5f9"};
`;

const MainRow = styled.View`
  flex-direction: row;
  align-items: center;
`;

const MedIconContainer = styled.View`
  width: 36px;
  height: 36px;
  border-radius: 18px;
  background-color: #f1f5f9;
  justify-content: center;
  align-items: center;
  margin-right: 12px;
`;

const MedEmoji = styled.Text`
  font-size: 18px;
`;

const InfoColumn = styled.View`
  flex: 1;
`;

const MedicineName = styled.Text<{ isDark: boolean }>`
  font-size: 15px;
  font-weight: 700;
  color: ${(props: any) => props.isDark ? "#f8fafc" : "#1f2937"};
  margin-bottom: 2px;
`;

const MedicineDetails = styled.Text<{ isDark: boolean }>`
  font-size: 12px;
  font-weight: 600;
  color: ${(props: any) => props.isDark ? "#94a3b8" : "#64748b"};
`;

const MedicineSubDetails = styled.Text<{ isDark: boolean }>`
  font-size: 11px;
  font-weight: 500;
  color: ${(props: any) => props.isDark ? "#64748b" : "#94a3b8"};
  margin-top: 2px;
`;

export default MedicineSummaryCard;
