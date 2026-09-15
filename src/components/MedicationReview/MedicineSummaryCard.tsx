import React from "react";
import styled from "styled-components/native";
import { Ionicons } from "@expo/vector-icons";
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
          <NameRow>
            <MedicineName isDark={isDark} numberOfLines={1}>{medicine.name}</MedicineName>
            {medicine.resolution === "REPLACE" && (
              <ResolutionBadge type="replace">
                <Ionicons name="swap-horizontal" size={10} color="#2563eb" style={{ marginRight: 2 }} />
                <ResolutionBadgeText type="replace">Replacing</ResolutionBadgeText>
              </ResolutionBadge>
            )}
            {medicine.resolution === "KEEP_NEW" && (medicine.isBackendDuplicate || medicine.hasDuplicate) && (
              <ResolutionBadge type="keep_new">
                <Ionicons name="add-circle" size={10} color="#059669" style={{ marginRight: 2 }} />
                <ResolutionBadgeText type="keep_new">Added as new</ResolutionBadgeText>
              </ResolutionBadge>
            )}
          </NameRow>
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

const NameRow = styled.View`
  flex-direction: row;
  align-items: center;
  margin-bottom: 2px;
  gap: 6px;
`;

const MedicineName = styled.Text<{ isDark: boolean }>`
  font-size: 15px;
  font-weight: 700;
  color: ${(props: any) => props.isDark ? "#f8fafc" : "#1f2937"};
  flex-shrink: 1;
`;

const ResolutionBadge = styled.View<{ type: "replace" | "keep_new" }>`
  background-color: ${(props: any) => props.type === "replace" ? "#eff6ff" : "#ecfdf5"};
  padding-horizontal: 6px;
  padding-vertical: 2px;
  border-radius: 4px;
  flex-direction: row;
  align-items: center;
  border-width: 0.5px;
  border-color: ${(props: any) => props.type === "replace" ? "#bfdbfe" : "#a7f3d0"};
`;

const ResolutionBadgeText = styled.Text<{ type: "replace" | "keep_new" }>`
  font-size: 9px;
  font-weight: 700;
  color: ${(props: any) => props.type === "replace" ? "#1d4ed8" : "#047857"};
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

