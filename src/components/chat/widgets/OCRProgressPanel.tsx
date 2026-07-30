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
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { UploadingDoc } from "../../../context/DocumentUploadContext";

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
  onCancelAll?: () => void;
  isDark: boolean;
  isModal?: boolean;
}

// Smooth animated progress bar fill with Horizontal Linear Gradient
const AnimatedProgressFill = ({ progress, isFailed }: { progress: number; isFailed?: boolean }) => {
  const animatedWidth = useSharedValue(progress);

  useEffect(() => {
    animatedWidth.value = withTiming(Math.max(0, Math.min(100, progress)), { duration: 600 });
  }, [progress]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      width: `${animatedWidth.value}%`,
    };
  });

  const gradientColors = isFailed
    ? (["#ef4444", "#fca5a5"] as const)
    : (["#0f766e", "#0ea5e9"] as const);

  return (
    <Animated.View style={[{ height: "100%", borderRadius: 4, overflow: "hidden" }, animatedStyle]}>
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{ width: "100%", height: "100%" }}
      />
    </Animated.View>
  );
};

const OCRProgressPanel: React.FC<OCRProgressPanelProps> = ({
  uploadingDocs,
  isExpanded,
  setIsExpanded,
  onDismiss,
  onCancelAll,
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

  const completedCount = uploadingDocs.filter((doc) => {
    const s = doc.status?.toLowerCase() || "";
    return s === "completed" || s === "done" || s === "success";
  }).length;

  const totalCount = uploadingDocs.length;
  const isFinished = uploadingDocs.every((doc) => {
    const s = doc.status?.toLowerCase() || "";
    return (
      s === "completed" ||
      s === "done" ||
      s === "success" ||
      s === "failed" ||
      s === "cancelled" ||
      doc.progress < 0
    );
  });

  // Calculate overall/common progress percentage
  const totalProgressSum = uploadingDocs.reduce((acc, doc) => {
    return acc + Math.max(0, doc.progress);
  }, 0);
  const commonProgress =
    totalCount > 0 ? Math.round(totalProgressSum / totalCount) : 0;

  return (
    <PanelCard isModal={isModal} isDark={isDark}>
      <BlurView
        intensity={isDark ? 25 : 60}
        tint={isDark ? "dark" : "light"}
        style={{
          paddingHorizontal: 16,
          paddingVertical: 14,
          minHeight: 66,
          justifyContent: "center",
          backgroundColor: isDark ? "rgba(30, 41, 59, 0.75)" : "rgba(255, 255, 255, 0.8)",
        }}
      >
        <MainRow>
          {/* Left stack: Heading & Progress Bar */}
          <LeftContent>
            <ProgressTitle isDark={isDark}>
              {isFinished ? "OCR Processing Complete" : `OCR Processing (${completedCount}/${totalCount})`}
            </ProgressTitle>
            <ProgressBarContainer isDark={isDark}>
              <AnimatedProgressFill progress={commonProgress} />
            </ProgressBarContainer>
          </LeftContent>

          {/* Right action row: Expand toggle & close button */}
          <RightActions>
            <ToggleButton onPress={handleToggle} activeOpacity={0.8}>
              <Animated.View style={chevronStyle}>
                <Ionicons
                  name="chevron-down"
                  size={20}
                  color={isDark ? "#cbd5e1" : "#475569"}
                />
              </Animated.View>
            </ToggleButton>

            {isFinished && (
              <DismissButton onPress={onDismiss} activeOpacity={0.7}>
                <Ionicons
                  name="close-circle-outline"
                  size={20}
                  color={isDark ? "#94a3b8" : "#64748b"}
                  style={{ marginLeft: 6 }}
                />
              </DismissButton>
            )}
          </RightActions>
        </MainRow>

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
                    <AnimatedProgressFill progress={doc.progress} isFailed={isFailed} />
                  </SmallProgressBarContainer>
                </DocItem>
              );
            })}

            {!isFinished && onCancelAll && (
              <CancelAllButton onPress={onCancelAll} activeOpacity={0.8}>
                <Ionicons
                  name="close-circle-outline"
                  size={16}
                  color="#ef4444"
                  style={{ marginRight: 6 }}
                />
                <CancelAllText>Cancel Processing</CancelAllText>
              </CancelAllButton>
            )}
          </DetailsList>
        )}
      </BlurView>
    </PanelCard>
  );
};

export default OCRProgressPanel;

// --- Styled Components ---

const PanelCard = styled.View<{ isModal: boolean; isDark: boolean }>`
  border-width: 1px;
  border-color: ${({ isDark }: { isDark: boolean }) =>
    isDark ? "rgba(255,255,255,0.08)" : "rgba(13, 148, 136, 0.15)"};
  border-radius: 16px;
  margin: ${({ isModal }: { isModal: boolean }) => (isModal ? "0px" : "12px 16px")};
  width: ${({ isModal }: { isModal: boolean }) => (isModal ? `${width - 40}px` : `${width * 0.9}px`)};
  align-self: center;
  overflow: hidden;
  shadow-color: #000;
  shadow-offset: 0px 4px;
  shadow-opacity: 0.08;
  shadow-radius: 8px;
  elevation: 4;
`;

const MainRow = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
`;

const LeftContent = styled.View`
  flex: 1;
  margin-right: 12px;
`;

const RightActions = styled.View`
  flex-direction: row;
  align-items: center;
`;

const ToggleButton = styled.TouchableOpacity`
  padding: 4px;
`;

const ProgressTitle = styled.Text<{ isDark: boolean }>`
  font-size: 13.5px;
  font-weight: 700;
  color: ${({ isDark }: { isDark: boolean }) => (isDark ? "#f1f5f9" : "#1e293b")};
  margin-bottom: 6px;
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

const CancelAllButton = styled.TouchableOpacity`
  flex-direction: row;
  align-items: center;
  justify-content: center;
  border-width: 1.5px;
  border-color: #fca5a5;
  background-color: rgba(239, 68, 68, 0.05);
  border-radius: 12px;
  padding-vertical: 8px;
  margin-top: 12px;
`;

const CancelAllText = styled.Text`
  font-size: 12.5px;
  font-weight: 700;
  color: #ef4444;
`;
