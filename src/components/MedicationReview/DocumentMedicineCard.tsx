import React, { useState } from "react";
import styled from "styled-components/native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../../context/ThemeContext";
import { ProcessedDocument } from "../../types/medicationReview";

interface DocumentMedicineCardProps {
  document: ProcessedDocument;
  children: React.ReactNode;
}

export const DocumentMedicineCard: React.FC<DocumentMedicineCardProps> = ({
  document,
  children,
}) => {
  const { isDark } = useAppTheme();
  const medicineCount = document.medicines.length;
  const hasMedicines = medicineCount > 0;

  const [expanded, setExpanded] = useState<boolean>(hasMedicines);

  const toggleExpand = () => {
    if (hasMedicines) {
      setExpanded(!expanded);
    }
  };

  return (
    <Container isDark={isDark}>
      <HeaderRow
        onPress={toggleExpand}
        activeOpacity={hasMedicines ? 0.8 : 1}
        hasMedicines={hasMedicines}
        isDark={isDark}
      >
        <DocIconContainer isDark={isDark} hasMedicines={hasMedicines}>
          <Ionicons
            name={document.name.endsWith(".pdf") ? "file-tray-full" : "image"}
            size={22}
            color={hasMedicines ? "#5B4BFF" : "#94a3b8"}
          />
        </DocIconContainer>

        <TitleContainer>
          <DocName numberOfLines={1} isDark={isDark} hasMedicines={hasMedicines}>
            {document.name}
          </DocName>
          <DocSubtitle isDark={isDark} hasMedicines={hasMedicines}>
            {hasMedicines
              ? `${medicineCount} medicine${medicineCount === 1 ? "" : "s"} found`
              : "No medicines found"}
          </DocSubtitle>
        </TitleContainer>

        {hasMedicines && (
          <ArrowIconContainer>
            <Ionicons
              name={expanded ? "chevron-up" : "chevron-down"}
              size={20}
              color={isDark ? "#94a3b8" : "#64748b"}
            />
          </ArrowIconContainer>
        )}
      </HeaderRow>

      {expanded && hasMedicines && <ContentBody>{children}</ContentBody>}
    </Container>
  );
};

const Container = styled.View<{ isDark: boolean }>`
  margin-bottom: 16px;
  background-color: ${(props: any) => props.isDark ? "#0f172a" : "#f8fafc"};
`;

const HeaderRow = styled.TouchableOpacity<{
  hasMedicines: boolean;
  isDark: boolean;
}>`
  flex-direction: row;
  align-items: center;
  padding-vertical: 12px;
  border-bottom-width: ${(props: any) => props.hasMedicines ? "1px" : "0px"};
  border-bottom-color: ${(props: any) => props.isDark ? "#334155" : "#e2e8f0"};
  opacity: ${(props: any) => props.hasMedicines ? 1 : 0.65};
`;

const DocIconContainer = styled.View<{ isDark: boolean; hasMedicines: boolean }>`
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background-color: ${(props: any) => {
    if (!props.hasMedicines) return props.isDark ? "#1e293b" : "#f1f5f9";
    return props.isDark ? "#1e1b4b" : "#e0e7ff";
  }};
  justify-content: center;
  align-items: center;
  margin-right: 12px;
`;

const TitleContainer = styled.View`
  flex: 1;
  margin-right: 8px;
`;

const DocName = styled.Text<{ isDark: boolean; hasMedicines: boolean }>`
  font-size: 15px;
  font-weight: 700;
  color: ${(props: any) => {
    if (!props.hasMedicines) return props.isDark ? "#64748b" : "#94a3b8";
    return props.isDark ? "#f8fafc" : "#1f2937";
  }};
  margin-bottom: 2px;
`;

const DocSubtitle = styled.Text<{ isDark: boolean; hasMedicines: boolean }>`
  font-size: 12px;
  font-weight: 500;
  color: ${(props: any) => {
    if (!props.hasMedicines) return props.isDark ? "#475569" : "#cbd5e1";
    return props.isDark ? "#94a3b8" : "#64748b";
  }};
`;

const ArrowIconContainer = styled.View`
  padding: 4px;
`;

const ContentBody = styled.View`
  padding-top: 12px;
  padding-left: 4px;
`;

export default DocumentMedicineCard;
