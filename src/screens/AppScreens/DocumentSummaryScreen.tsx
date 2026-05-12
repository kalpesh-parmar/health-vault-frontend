import React, { useEffect, useState, useCallback } from "react";
import { Modal, TouchableOpacity, ScrollView, Dimensions } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import styled from "styled-components/native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as MailComposer from "expo-mail-composer";
import { useAppTheme } from "../../context/ThemeContext";
import { getSignedUrl } from "../../services/documentService";
import ConfirmationModal from "../../components/shared/ConfirmationModal"; // Assuming path
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const SummaryScreen = ({ route, navigation }: any) => {
  const { document } = route.params;
  const [imageUri, setImageUri] = useState<string>("");
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState<boolean>(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const { isDark } = useAppTheme();

  // Animation values for preview modal
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const offsetX = useSharedValue(0);
  const offsetY = useSharedValue(0);

  const pinchGesture = Gesture.Pinch()
    .onUpdate((event) => {
      const nextScale = savedScale.value * event.scale;
      // Clamp scale: min 1 (size of image), max 4
      scale.value = Math.min(Math.max(nextScale, 1), 4);
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      if (scale.value <= 1) {
        // Reset position if zoomed out to original size
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        offsetX.value = 0;
        offsetY.value = 0;
      }
    });

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      if (scale.value > 1) {
        translateX.value = offsetX.value + event.translationX;
        translateY.value = offsetY.value + event.translationY;
      }
    })
    .onEnd(() => {
      // Save current position to prevent jumping on next interaction
      offsetX.value = translateX.value;
      offsetY.value = translateY.value;
    });

  const composedGesture = Gesture.Simultaneous(pinchGesture, panGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  useEffect(() => {
    (async () => {
      try {
        const response = await getSignedUrl(document?.s3Key);
        setImageUri(response?.data?.downloadUrl || document.imageUri);
      } catch (e) {}
    })();
  }, []);

  return (
    <Container>
      <ConfirmationModal
        showModal={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        mode="Delete Document"
        documentId={document?.id}
      />

      <GradientHeader
        colors={["#3b82f6", "#2563eb"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <HeaderActions>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <RightActions>
            <TouchableOpacity onPress={() => setIsDeleteModalOpen(true)}>
              <Ionicons name="trash-outline" size={24} color="white" />
            </TouchableOpacity>
          </RightActions>
        </HeaderActions>
      </GradientHeader>

      <ContentContainer>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          <MainInfoCard>
            <DocHeaderRow>
              <IconBox>
                <MaterialCommunityIcons
                  name="file-pdf-box"
                  size={40}
                  color="#ff4d4d"
                />
                <FormatLabel>PDF</FormatLabel>
              </IconBox>
              <TitleCol>
                <DocTitle>{document?.fileName || "Blood Test Report"}</DocTitle>
                <DocSubInfo>2.4 MB • PDF</DocSubInfo>
              </TitleCol>
            </DocHeaderRow>
            <Divider />
            <GridInfo>
              <GridItem>
                <GridLabel>Date</GridLabel>
                <GridValue>20 May 2024</GridValue>
              </GridItem>
              <GridItem>
                <GridLabel>Category</GridLabel>
                <GridValue>Pathology</GridValue>
              </GridItem>
            </GridInfo>
          </MainInfoCard>

          {/* AI SUMMARY */}
          <SectionHeader>
            <Ionicons name="sparkles" size={18} color="#8b5cf6" />
            <SectionTitle>AI Summary</SectionTitle>
          </SectionHeader>
          <HighlightCard>
            <HighlightGradient
              colors={isDark ? ["#797383ff", "#38333dff"] : ["#f5f3ff", "#9684e6ff"]}
            >
              <DescriptionText>
                {document?.AISummary ||
                  "AI is processing this document to generate a summary."}
              </DescriptionText>
            </HighlightGradient>
          </HighlightCard>

          {/* NOTES (Conditional) */}
          {document?.notes && (
            <>
              <SectionHeader>
                <Ionicons
                  name="document-text-outline"
                  size={18}
                  color="#065f46"
                />
                <SectionTitle>Notes</SectionTitle>
              </SectionHeader>
              <HighlightCard>
                <HighlightGradient
                  colors={
                    isDark ? ["#064e3b", "#022c22"] : ["#f0fdf4", "#dcfce7"]
                  }
                >
                  <AccentBar color="#10b981" />
                  <DescriptionText>{document.notes}</DescriptionText>
                </HighlightGradient>
              </HighlightCard>
            </>
          )}

          {/* IMAGE PREVIEW SECTION */}
          <SectionHeader>
            <Ionicons name="image-outline" size={18} color="#3b82f6" />
            <SectionTitle>Document Preview</SectionTitle>
          </SectionHeader>
          <PreviewThumbnailContainer
            activeOpacity={0.9}
            onPress={() => setIsPreviewModalOpen(true)}
          >
            {imageUri ? (
              <ThumbnailImage source={{ uri: imageUri }} resizeMode="cover" />
            ) : (
              <EmptyPreviewBox>
                <Ionicons
                  name="cloud-offline-outline"
                  size={32}
                  color="#cbd5e1"
                />
                <EmptyText>Image preview not available</EmptyText>
              </EmptyPreviewBox>
            )}
            <ZoomOverlay>
              <Ionicons name="expand-outline" size={20} color="white" />
              <ZoomText>Tap to zoom</ZoomText>
            </ZoomOverlay>
          </PreviewThumbnailContainer>
        </ScrollView>
      </ContentContainer>

      {/* FULL SCREEN ZOOM MODAL */}
      <Modal visible={isPreviewModalOpen} transparent animationType="fade">
        <GestureHandlerRootView style={{ flex: 1 }}>
          <ModalBackdrop>
            <CloseButton onPress={() => setIsPreviewModalOpen(false)}>
              <Ionicons name="close-circle" size={36} color="white" />
            </CloseButton>

            <ZoomContainer>
              <GestureDetector gesture={composedGesture}>
                <Animated.Image
                  source={{ uri: imageUri }}
                  style={[
                    { width: SCREEN_WIDTH * 0.9, height: SCREEN_WIDTH * 1.2 },
                    animatedStyle,
                  ]}
                  resizeMode="contain"
                />
              </GestureDetector>
            </ZoomContainer>
          </ModalBackdrop>
        </GestureHandlerRootView>
      </Modal>
    </Container>
  );
};

export default SummaryScreen;

/** STYLED COMPONENTS **/

const Container = styled.View`
  flex: 1;
  background-color: #f8fafc;
`;

const GradientHeader = styled(LinearGradient)`
  height: 200px;
  padding-top: 50px;
  padding-horizontal: 20px;
`;

const HeaderActions = styled.View`
  flex-direction: row;
  justify-content: space-between;
`;

const RightActions = styled.View`
  flex-direction: row;
`;

const ContentContainer = styled.View`
  flex: 1;
  margin-top: -100px;
  padding-horizontal: 20px;
`;

const MainInfoCard = styled.View`
  background-color: white;
  border-radius: 20px;
  padding: 20px;
  margin-bottom: 20px;
  elevation: 5;
  shadow-color: #000;
  shadow-opacity: 0.05;
  shadow-radius: 10px;
`;

const DocHeaderRow = styled.View`
  flex-direction: row;
  align-items: center;
`;
const IconBox = styled.View`
  width: 65px;
  height: 65px;
  background-color: #fff5f5;
  border-radius: 15px;
  align-items: center;
  justify-content: center;
`;
const FormatLabel = styled.Text`
  font-size: 10px;
  font-weight: 800;
  color: #ff4d4d;
`;
const TitleCol = styled.View`
  margin-left: 15px;
  flex: 1;
`;
const DocTitle = styled.Text`
  font-size: 18px;
  font-weight: 700;
  color: #1e293b;
`;
const DocSubInfo = styled.Text`
  font-size: 13px;
  color: #94a3b8;
`;
const Divider = styled.View`
  height: 1px;
  background-color: #f1f5f9;
  margin-vertical: 15px;
`;
const GridInfo = styled.View`
  flex-direction: row;
  justify-content: space-around;
`;
const GridItem = styled.View``;
const GridLabel = styled.Text`
  font-size: 12px;
  color: #94a3b8;
  margin-bottom: 4px;
`;
const GridValue = styled.Text`
  font-size: 13px;
  font-weight: 600;
  color: #334155;
`;

const SectionHeader = styled.View`
  flex-direction: row;
  align-items: center;
  margin-top: 20px;
  margin-bottom: 10px;
  gap: 8px;
`;
const SectionTitle = styled.Text`
  font-size: 16px;
  font-weight: 700;
  color: #1e293b;
`;

const HighlightCard = styled.View`
  border-radius: 16px;
  overflow: hidden;
  margin-bottom: 5px;
`;
const HighlightGradient = styled(LinearGradient)`
  flex-direction: row;
  padding: 16px;
  padding-left: 0px;
`;
const AccentBar = styled.View<{ color: string }>`
  width: 5px;
  height: 100%;
  border-top-right-radius: 4px;
  border-bottom-right-radius: 4px;
`;
const DescriptionText = styled.Text`
  font-size: 14px;
  color: #000000ff;
  font-weight: 600;
  line-height: 22px;
  flex: 1;
  padding-horizontal: 15px;
`;

// IMAGE PREVIEW STYLES
const PreviewThumbnailContainer = styled.TouchableOpacity`
  height: 180px;
  width: 100%;
  border-radius: 16px;
  overflow: hidden;
  background-color: #f1f5f9;
  border-width: 1px;
  border-color: #e2e8f0;
  position: relative;
`;

const ThumbnailImage = styled.Image`
  width: 100%;
  height: 100%;
`;

const ZoomOverlay = styled.View`
  position: absolute;
  bottom: 12px;
  right: 12px;
  background-color: rgba(0, 0, 0, 0.6);
  padding: 6px 12px;
  border-radius: 20px;
  flex-direction: row;
  align-items: center;
  gap: 6px;
`;

const ZoomText = styled.Text`
  color: white;
  font-size: 10px;
  font-weight: 600;
`;

const EmptyPreviewBox = styled.View`
  flex: 1;
  justify-content: center;
  align-items: center;
  gap: 8px;
`;

const EmptyText = styled.Text`
  color: #94a3b8;
  font-size: 12px;
`;

const ActionGrid = styled.View`
  flex-direction: row;
  justify-content: space-between;
  margin-top: 30px;
`;
const ActionBox = styled.TouchableOpacity`
  background-color: white;
  border-radius: 16px;
  align-items: center;
  padding: 12px;
  border-width: 1px;
  border-color: #f1f5f9;
  flex-direction: row;
  gap: 10px;
  justify-content: center;
`;
const ActionCircle = styled.View`
  width: 32px;
  height: 32px;
  border-radius: 16px;
  align-items: center;
  justify-content: center;
`;
const ActionLabel = styled.Text`
  font-size: 14px;
  font-weight: 700;
  color: #64748b;
`;

// MODAL STYLES
const ModalBackdrop = styled.View`
  flex: 1;
  background-color: rgba(0, 0, 0, 0.95);
  justify-content: center;
  align-items: center;
`;

const ZoomContainer = styled.View`
  width: 90%;
  height: 70%;
  background-color: #1e293b;
  border-radius: 20px;
  overflow: hidden;
  justify-content: center;
  align-items: center;
`;

const CloseButton = styled.TouchableOpacity`
  position: absolute;
  top: 60px;
  z-index: 100;
`;
