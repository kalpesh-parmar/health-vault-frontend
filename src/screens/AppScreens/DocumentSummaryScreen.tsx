import React, { useEffect, useState } from "react";
import { Modal, TouchableOpacity, ScrollView, Dimensions } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import styled from "styled-components/native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useAppTheme } from "../../context/ThemeContext";
import { getFileSource } from "../../services/fileService";
import ConfirmationModal from "../../components/shared/ConfirmationModal";
import { getFileExtension } from "../../utils/fileUtils";
import ErrorBoundary from "../../components/shared/ErrorBoundary";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const SummaryScreen = ({ route, navigation }: any) => {
  const { document } = route.params;
  const [imageSource, setImageSource] = useState<any>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState<boolean>(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const { isDark } = useAppTheme();

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const offsetX = useSharedValue(0);
  const offsetY = useSharedValue(0);

  const pinchGesture = Gesture.Pinch()
    .onUpdate((event) => {
      const nextScale = savedScale.value * event.scale;
      scale.value = Math.min(Math.max(nextScale, 1), 4);
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      if (scale.value <= 1) {
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        offsetX.value = 0;
        offsetY.value = 0;
      }
    });

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      if (scale.value > 1) {
        const maxTranslateX = Math.max(0, (SCREEN_WIDTH * scale.value - SCREEN_WIDTH) / 2);
        const maxTranslateY = Math.max(
          0,
          (SCREEN_HEIGHT * scale.value - SCREEN_HEIGHT) / 2,
        );

        translateX.value = Math.min(
          Math.max(offsetX.value + event.translationX, -maxTranslateX),
          maxTranslateX,
        );
        translateY.value = Math.min(
          Math.max(offsetY.value + event.translationY, -maxTranslateY),
          maxTranslateY,
        );
      }
    })
    .onEnd(() => {
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
        const response = await getFileSource(document?.s3Key);
        setImageSource(response || (document.imageUri ? { uri: document.imageUri } : null));
      } catch (e) {
        console.log("Failed to load document image URL", e);
      }
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
        colors={
          isDark
            ? ["#064e3b", "#0369a1", "#312e81"]
            : ["#0f766e", "#0ea5e9", "#4f46e5"]
        }
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
          keyboardShouldPersistTaps="handled">
          <MainInfoCard>
            <DocHeaderRow>
              <IconBox>
                <MaterialCommunityIcons name="file" size={40} color="#ff4d4d" />
                <FormatLabel>
                  {getFileExtension(document?.fileName)}
                </FormatLabel>
              </IconBox>
              <TitleCol>
                <DocTitle>{document?.fileName}</DocTitle>
                <DocSubInfo>
                  {document?.fileSize >= 1024 * 1024
                    ? (document?.fileSize / (1024 * 1024)).toFixed(1) + " MB"
                    : (document?.fileSize / 1024).toFixed(1) + " KB"}
                  •{" "}
                  {getFileExtension(document?.fileName)}
                </DocSubInfo>
              </TitleCol>
            </DocHeaderRow>
            <Divider />
            <GridInfo>
              <GridItem>
                <GridLabel>Date</GridLabel>
                <GridValue>
                  {new Date(document?.createdAt).toLocaleDateString("en-US", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </GridValue>
              </GridItem>
              <GridItem>
                <GridLabel>Category</GridLabel>
                <GridValue>{document?.documentType}</GridValue>
              </GridItem>
            </GridInfo>
          </MainInfoCard>

          {/* AI SUMMARY */}
          <SectionHeader>
            <Ionicons name="sparkles" size={18} color="#8b5cf6" />
            <SectionTitle>AI Summary</SectionTitle>
          </SectionHeader>
          <HighlightCard isDark={isDark}>
            <SummaryContainer vertical>
              <DescriptionText isDark={isDark}>
                {document?.summaryInPreferredLanguage ||
                  "AI is processing this document to generate a summary."}
              </DescriptionText>
            </SummaryContainer>
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
                <SummaryContainer>
                  <DescriptionText>{document.notes}</DescriptionText>
                </SummaryContainer>
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
            {imageSource ? (
              <ThumbnailImage source={imageSource} resizeMode="contain" />
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
                {imageSource ? (
                  <Animated.Image
                    source={imageSource}
                    style={[
                      { width: '100%', height: '100%' },
                      animatedStyle,
                    ]}
                    resizeMode="contain"
                  />
                ) : (
                  <EmptyPreviewBox>
                    <Ionicons
                      name="cloud-offline-outline"
                      size={48}
                      color="#cbd5e1"
                    />
                    <EmptyText>Image preview not available</EmptyText>
                  </EmptyPreviewBox>
                )}
              </GestureDetector>
            </ZoomContainer>
          </ModalBackdrop>
        </GestureHandlerRootView>
      </Modal>
    </Container>
  );
};

const SummaryScreenWithErrorBoundary = (props: any) => (
  <ErrorBoundary
    componentName="DocumentSummary"
    receivedProps={props}
    navigationParams={props.route?.params}
    fallbackTitle="Unable to load report summary"
    fallbackSubtitle="There was an error displaying the report details."
  >
    <SummaryScreen {...props} />
  </ErrorBoundary>
);

export default SummaryScreenWithErrorBoundary;

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

const HighlightCard = styled.View<{ isDark: boolean }>`
  border-radius: 16px;
  overflow: hidden;
`;
const SummaryContainer = styled.ScrollView<{ isDark: boolean }>`
  flex-direction: row;
  padding: 7px;
  padding-left: 0px;
`;

const DescriptionText = styled.Text<{ isDark: boolean }>`
  font-size: 14px;
  color: ${({ isDark }: { isDark: boolean }) =>
    isDark ? "#cbd5e1" : "#334155"};
  font-weight: 500;
  line-height: 22px;
  flex: 1;
  padding-horizontal: 15px;
`;

// IMAGE PREVIEW STYLES
const PreviewThumbnailContainer = styled.TouchableOpacity`
  height: 230px;
  width: 100%;
  border-radius: 16px;
  overflow: hidden;
  background-color: #f1f5f9;
  border-width: 1px;
  border-color: #e2e8f0;
  position: relative;
`;

const ThumbnailImage = styled.Image.attrs({
  resizeMode: "contain"
})`
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

// MODAL STYLES
const ModalBackdrop = styled.View`
  flex: 1;
  background-color: rgba(0, 0, 0, 0.95);
  justify-content: center;
  align-items: center;
`;

const ZoomContainer = styled.View`
  width: 100%;
  height: 100%;
  background-color: transparent;
  justify-content: center;
  align-items: center;
`;

const CloseButton = styled.TouchableOpacity`
  position: absolute;
  top: 60px;
  z-index: 100;
`;
