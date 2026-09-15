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
  isBackendDuplicate?: boolean;
  onResolve?: () => void;
  resolution?: string;
}

export const ExtractedMedicineCard: React.FC<ExtractedMedicineCardProps> = ({
  medicine,
  onPress,
  onToggle,
  isDuplicate = false,
  duplicateHasDifference = false,
  isBackendDuplicate = false,
  onResolve,
  resolution,
}) => {
  const { isDark, theme } = useAppTheme();

  const isLowConfidence = medicine.confidence !== undefined && medicine.confidence < 0.8;
  const confidencePct = medicine.confidence !== undefined ? Math.round(medicine.confidence * 100) : 100;

  const activeResolution = resolution || medicine.resolution;
  const isConflict = Boolean(
    isBackendDuplicate ||
    medicine.isBackendDuplicate ||
    medicine.duplicateInfo?.hasDuplicate ||
    medicine.hasDuplicate ||
    (isDuplicate && duplicateHasDifference)
  );

  const isResolved = Boolean(activeResolution && activeResolution !== "NONE");

  return (
    <CardContainer
      isDark={isDark}
      isConflict={isConflict && !isResolved}
      style={{
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
      }}
    >
      <MainRow>
        <CheckboxWrapper>
          <MedicineCheckbox checked={medicine.selected} onPress={onToggle} />
        </CheckboxWrapper>

        <MedIconContainer isDark={isDark}>
          <MedEmoji>💊</MedEmoji>
        </MedIconContainer>

        <InfoColumn>
          <MedicineName numberOfLines={1} isDark={isDark}>{medicine.name}</MedicineName>
          <MedicineDetails numberOfLines={1} isDark={isDark}>
            {medicine.medicineType || "Tablet"} • {medicine.dosage || "N/A"}{medicine.dosageUnit || ""}
            {medicine.frequency ? ` • ${medicine.frequency}` : ""}
          </MedicineDetails>
        </InfoColumn>

        <ActionButtonsRow>
          <EditButton onPress={onPress} activeOpacity={0.7} isDark={isDark}>
            <Ionicons name="pencil" size={16} color={isDark ? "#94a3b8" : "#475569"} />
          </EditButton>
        </ActionButtonsRow>
      </MainRow>

      {/* Conflict & Resolution Banner - Aligned inside the Medicine Box */}
      {isConflict && (
        <CardConflictContainer isDark={isDark}>
          {isResolved ? (
            <ResolvedBadge isDark={isDark}>
              <Ionicons name="checkmark-circle" size={14} color="#059669" style={{ marginRight: 6 }} />
              <ResolvedBadgeText isDark={isDark} numberOfLines={1}>
                {activeResolution === "REMOVE_NEW"
                  ? "Keep Existing Profile Medicine"
                  : activeResolution === "REPLACE"
                    ? "Replacing Existing Profile Medicine"
                    : "Added as New Medicine"}
              </ResolvedBadgeText>
            </ResolvedBadge>
          ) : (
            <ConflictBadge isDark={isDark} onPress={onResolve} activeOpacity={0.8}>
              <ConflictBadgeLeft>
                <Ionicons name="alert-circle" size={14} color="#ea580c" style={{ marginRight: 6 }} />
                <ConflictBadgeText isDark={isDark} numberOfLines={1}>
                  {medicine.duplicateInfo?.conflictType === "DIFF_DOSAGE" || duplicateHasDifference
                    ? "Conflict: Different Dose in Profile"
                    : "Conflict: Already in Profile"}
                </ConflictBadgeText>
              </ConflictBadgeLeft>
              {onResolve && (
                <ResolveActionPill isDark={isDark}>
                  <ResolveActionText>Resolve</ResolveActionText>
                  <Ionicons name="chevron-forward" size={12} color="#2563eb" style={{ marginLeft: 2 }} />
                </ResolveActionPill>
              )}
            </ConflictBadge>
          )}
        </CardConflictContainer>
      )}

      {/* Cross-document duplicate warning */}
      {isDuplicate && !isConflict && (
        <CardConflictContainer isDark={isDark}>
          <DuplicateBadge hasDifference={duplicateHasDifference} isDark={isDark}>
            <Ionicons name="information-circle-outline" size={13} color={duplicateHasDifference ? "#dc2626" : "#4338ca"} style={{ marginRight: 4 }} />
            <DuplicateBadgeText hasDifference={duplicateHasDifference} isDark={isDark} numberOfLines={1}>
              {duplicateHasDifference ? "Different version found in another document" : "Identical duplicate in another document"}
            </DuplicateBadgeText>
          </DuplicateBadge>
        </CardConflictContainer>
      )}

      {/* Low confidence warning */}
      {isLowConfidence && (
        <ConfidenceRow isDark={isDark}>
          <Ionicons name="warning" size={12} color="#b45309" style={{ marginRight: 4 }} />
          <ConfidenceText numberOfLines={1}>
            {confidencePct}% confidence • Review recommended
          </ConfidenceText>
        </ConfidenceRow>
      )}
    </CardContainer>
  );
};

const CardContainer = styled.View<{ isDark: boolean; isConflict: boolean }>`
  background-color: ${(props: any) => props.isDark ? "#1e293b" : "#ffffff"};
  border-radius: 12px;
  padding: 12px 14px;
  margin-bottom: 10px;
  border-width: 1px;
  border-color: ${(props: any) =>
    props.isConflict
      ? "#fb923c"
      : props.isDark
        ? "#334155"
        : "#f1f5f9"};
  overflow: hidden;
`;

const MainRow = styled.View`
  flex-direction: row;
  align-items: center;
`;

const MedIconContainer = styled.View<{ isDark: boolean }>`
  width: 38px;
  height: 38px;
  border-radius: 19px;
  background-color: ${(props: any) => props.isDark ? "#334155" : "#f1f5f9"};
  justify-content: center;
  align-items: center;
  margin-right: 10px;
`;

const MedEmoji = styled.Text`
  font-size: 18px;
`;

const InfoColumn = styled.View`
  flex: 1;
  margin-right: 8px;
`;

const MedicineName = styled.Text<{ isDark: boolean }>`
  font-size: 15px;
  font-weight: 700;
  color: ${(props: any) => props.isDark ? "#f8fafc" : "#1f2937"};
  margin-bottom: 2px;
`;

const MedicineDetails = styled.Text<{ isDark: boolean }>`
  font-size: 12px;
  font-weight: 500;
  color: ${(props: any) => props.isDark ? "#94a3b8" : "#64748b"};
`;

const CheckboxWrapper = styled.View`
  margin-right: 8px;
  justify-content: center;
  align-items: center;
`;

const ActionButtonsRow = styled.View`
  flex-direction: row;
  align-items: center;
`;

const EditButton = styled.TouchableOpacity<{ isDark: boolean }>`
  width: 34px;
  height: 34px;
  border-radius: 17px;
  background-color: ${(props: any) => props.isDark ? "#334155" : "#f1f5f9"};
  justify-content: center;
  align-items: center;
`;

const CardConflictContainer = styled.View<{ isDark: boolean }>`
  margin-top: 10px;
  padding-top: 8px;
  border-top-width: 1px;
  border-top-color: ${(props: any) => props.isDark ? "#334155" : "#f1f5f9"};
  width: 100%;
`;

const ConflictBadge = styled.TouchableOpacity<{ isDark: boolean }>`
  background-color: ${(props: any) => props.isDark ? "rgba(234, 88, 12, 0.12)" : "#ffedd5"};
  padding-horizontal: 10px;
  padding-vertical: 6px;
  border-radius: 8px;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  border-width: 1px;
  border-color: ${(props: any) => props.isDark ? "rgba(234, 88, 12, 0.4)" : "#fdba74"};
  width: 100%;
`;

const ConflictBadgeLeft = styled.View`
  flex-direction: row;
  align-items: center;
  flex: 1;
  margin-right: 8px;
`;

const ConflictBadgeText = styled.Text<{ isDark: boolean }>`
  font-size: 11px;
  font-weight: 700;
  color: ${(props: any) => props.isDark ? "#fb923c" : "#c2410c"};
  flex-shrink: 1;
`;

const ResolveActionPill = styled.View<{ isDark: boolean }>`
  flex-direction: row;
  align-items: center;
  background-color: ${(props: any) => props.isDark ? "#1e293b" : "#dbeafe"};
  padding-horizontal: 8px;
  padding-vertical: 3px;
  border-radius: 6px;
`;

const ResolveActionText = styled.Text`
  font-size: 11px;
  font-weight: 700;
  color: #2563eb;
`;

const ResolvedBadge = styled.View<{ isDark: boolean }>`
  background-color: ${(props: any) => props.isDark ? "rgba(5, 150, 105, 0.12)" : "#ecfdf5"};
  padding-horizontal: 10px;
  padding-vertical: 6px;
  border-radius: 8px;
  flex-direction: row;
  align-items: center;
  border-width: 1px;
  border-color: ${(props: any) => props.isDark ? "rgba(5, 150, 105, 0.35)" : "#a7f3d0"};
  width: 100%;
`;

const ResolvedBadgeText = styled.Text<{ isDark: boolean }>`
  font-size: 11px;
  font-weight: 700;
  color: ${(props: any) => props.isDark ? "#34d399" : "#047857"};
  flex-shrink: 1;
`;

const DuplicateBadge = styled.View<{ hasDifference: boolean; isDark: boolean }>`
  background-color: ${(props: any) =>
    props.hasDifference
      ? props.isDark ? "rgba(220, 38, 38, 0.12)" : "#fee2e2"
      : props.isDark ? "rgba(99, 102, 241, 0.12)" : "#e0e7ff"};
  padding-horizontal: 10px;
  padding-vertical: 5px;
  border-radius: 6px;
  flex-direction: row;
  align-items: center;
  width: 100%;
`;

const DuplicateBadgeText = styled.Text<{ hasDifference: boolean; isDark: boolean }>`
  font-size: 11px;
  font-weight: 600;
  color: ${(props: any) =>
    props.hasDifference
      ? props.isDark ? "#f87171" : "#b91c1c"
      : props.isDark ? "#a5b4fc" : "#312e81"};
  flex-shrink: 1;
`;

const ConfidenceRow = styled.View<{ isDark: boolean }>`
  flex-direction: row;
  align-items: center;
  margin-top: 8px;
  padding-top: 6px;
  border-top-width: 1px;
  border-top-color: ${(props: any) => props.isDark ? "#334155" : "#f1f5f9"};
  width: 100%;
`;

const ConfidenceText = styled.Text`
  font-size: 11px;
  font-weight: 600;
  color: #b45309;
  flex-shrink: 1;
`;

export default ExtractedMedicineCard;

