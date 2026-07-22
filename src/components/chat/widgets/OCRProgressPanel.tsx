import React, { useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
  Dimensions,
} from "react-native";
import styled from "styled-components/native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { UploadingDoc } from "../../../hooks/useMultipleUpload";

const { width } = Dimensions.get("window");

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface OCRProgressPanelProps {
  uploadingDocs: UploadingDoc[];
  isExpanded: boolean;
  setIsExpanded: (expanded: boolean) => void;
  onDismiss: () => void;
  isDark: boolean;
  isModal?: boolean;
}

const OCRProgressPanel: React.FC<OCRProgressPanelProps> = ({
  uploadingDocs,
  isExpanded,
  setIsExpanded,
  onDismiss,
  isDark,
  isModal = false,
}) => {
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withTiming(isExpanded ? 180 : 0, { duration: 250 });
  }, [isExpanded]);

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const handleToggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded(!isExpanded);
  };

  const completedCount = uploadingDocs.filter(
    (doc) =>
      doc.status === "done" ||
      doc.status === "completed" ||
      doc.status === "success",
  ).length;

  const totalCount = uploadingDocs.length;
  const isFinished = uploadingDocs.every(
    (doc) =>
      doc.status === "done" ||
      doc.status === "completed" ||
      doc.status === "success" ||
      doc.status === "failed" ||
      doc.progress < 0,
  );

  // Calculate overall/common progress percentage
  const totalProgressSum = uploadingDocs.reduce((acc, doc) => {
    // If failed, treat progress as 0 for sum or just display fail color
    return acc + Math.max(0, doc.progress);
  }, 0);
  const commonProgress =
    totalCount > 0 ? Math.round(totalProgressSum / totalCount) : 0;

  return (
    <PanelCard isModal={isModal} isDark={isDark}>
      <HeaderRow>
        <HeaderClickArea onPress={handleToggle} activeOpacity={0.8}>
          <TitleContainer>
            <ProgressTitle isDark={isDark}>
              OCR Processing ({completedCount}/{totalCount})
            </ProgressTitle>
            <Animated.View style={chevronStyle}>
              <Ionicons
                name="chevron-down"
                size={16}
                color={isDark ? "#94a3b8" : "#64748b"}
              />
            </Animated.View>
          </TitleContainer>
        </HeaderClickArea>

        {isFinished && (
          <DismissButton onPress={onDismiss} activeOpacity={0.7}>
            <Ionicons
              name="close-circle-outline"
              size={20}
              color={isDark ? "#94a3b8" : "#64748b"}
            />
          </DismissButton>
        )}
      </HeaderRow>

      <TouchableOpacity onPress={handleToggle} activeOpacity={0.9}>
        <ProgressBarContainer isDark={isDark}>
          <ProgressBarFill progress={commonProgress} />
        </ProgressBarContainer>
      </TouchableOpacity>

      {isExpanded && (
        <DetailsList isDark={isDark}>
          {uploadingDocs.map((doc) => {
            const isFailed = doc.status === "failed" || doc.progress < 0;
            const isDone =
              doc.status === "done" ||
              doc.status === "completed" ||
              doc.status === "success";

            return (
              <DocItem key={doc.id}>
                <DocInfoRow>
                  <Ionicons
                    name="document-text-outline"
                    size={14}
                    color="#0f766e"
                    style={{ marginRight: 6 }}
                  />
                  <DocName numberOfLines={1} isDark={isDark}>
                    {doc.name}
                  </DocName>
                  <DocStatusText isFailed={isFailed} isDone={isDone}>
                    {isFailed ? "Failed" : isDone ? "Completed" : `${doc.progress}%`}
                  </DocStatusText>
                </DocInfoRow>
                <SmallProgressBarContainer isDark={isDark}>
                  <SmallProgressBarFill
                    progress={doc.progress}
                    isFailed={isFailed}
                  />
                </SmallProgressBarContainer>
              </DocItem>
            );
          })}
        </DetailsList>
      )}
    </PanelCard>
  );
};

export default OCRProgressPanel;

// --- Styled Components ---

const PanelCard = styled.View<{ isModal: boolean; isDark: boolean }>`
  background-color: ${({ isDark }: { isDark: boolean }) => (isDark ? "#1e293b" : "#ffffff")};
  border-width: 1px;
  border-color: ${({ isDark }: { isDark: boolean }) =>
    isDark ? "rgba(255,255,255,0.08)" : "#e2e8f0"};
  border-radius: 16px;
  padding: 16px;
  margin: ${({ isModal }: { isModal: boolean }) => (isModal ? "0px" : "12px 16px")};
  width: ${({ isModal }: { isModal: boolean }) => (isModal ? `${width - 40}px` : "auto")};
  shadow-color: #000;
  shadow-offset: 0px 4px;
  shadow-opacity: 0.08;
  shadow-radius: 8px;
  elevation: 4;
`;

const HeaderRow = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
`;

const HeaderClickArea = styled.TouchableOpacity`
  flex: 1;
`;

const TitleContainer = styled.View`
  flex-direction: row;
  align-items: center;
`;

const ProgressTitle = styled.Text<{ isDark: boolean }>`
  font-size: 13.5px;
  font-weight: 700;
  color: ${({ isDark }: { isDark: boolean }) => (isDark ? "#f1f5f9" : "#1e293b")};
  margin-right: 6px;
`;

const DismissButton = styled.TouchableOpacity`
  padding: 2px;
`;

const ProgressBarContainer = styled.View<{ isDark: boolean }>`
  height: 6px;
  background-color: ${({ isDark }: { isDark: boolean }) =>
    isDark ? "rgba(255,255,255,0.08)" : "#f1f5f9"};
  border-radius: 3px;
  overflow: hidden;
  width: 100%;
`;

const ProgressBarFill = styled.View<{ progress: number }>`
  height: 100%;
  background-color: #0f766e;
  border-radius: 3px;
  width: ${({ progress }: { progress: number }) => `${progress}%`};
`;

const DetailsList = styled.View<{ isDark: boolean }>`
  margin-top: 12px;
  border-top-width: 1px;
  border-top-color: ${({ isDark }: { isDark: boolean }) =>
    isDark ? "rgba(255,255,255,0.08)" : "#f1f5f9"};
  padding-top: 8px;
`;

const DocItem = styled.View`
  margin-bottom: 10px;
`;

const DocInfoRow = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
`;

const DocName = styled.Text<{ isDark: boolean }>`
  font-size: 11.5px;
  color: ${({ isDark }: { isDark: boolean }) => (isDark ? "#cbd5e1" : "#475569")};
  flex: 1;
  margin-right: 8px;
`;

const DocStatusText = styled.Text<{ isFailed: boolean; isDone: boolean }>`
  font-size: 11px;
  font-weight: 700;
  color: ${({ isFailed, isDone }: { isFailed: boolean; isDone: boolean }) =>
    isFailed ? "#ef4444" : isDone ? "#10b981" : "#0f766e"};
`;

const SmallProgressBarContainer = styled.View<{ isDark: boolean }>`
  height: 4px;
  background-color: ${({ isDark }: { isDark: boolean }) =>
    isDark ? "rgba(255,255,255,0.05)" : "#f8fafc"};
  border-radius: 2px;
  overflow: hidden;
  width: 100%;
`;

const SmallProgressBarFill = styled.View<{ progress: number; isFailed: boolean }>`
  height: 100%;
  background-color: ${({ isFailed }: { isFailed: boolean }) => (isFailed ? "#ef4444" : "#0f766e")};
  border-radius: 2px;
  width: ${({ progress, isFailed }: { progress: number; isFailed: boolean }) => `${Math.max(0, progress)}%`};
`;
