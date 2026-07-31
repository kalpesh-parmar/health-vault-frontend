import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  Modal,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Alert,
  TextInput,
  Share,
  Image,
  View,
  Text,
  Keyboard,
  Platform,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import styled from "styled-components/native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";
import { useAppTheme } from "../../context/ThemeContext";
import { formatUTCDateTime } from "../../utils/dateFormatter";
import { getFileSource } from "../../services/fileService";
import ConfirmationModal from "../../components/shared/ConfirmationModal";
import { getFileExtension } from "../../utils/fileUtils";
import ErrorBoundary from "../../components/shared/ErrorBoundary";
import { EditDocumentBottomSheet, formatDocumentType } from "../../components/shared/EditDocumentBottomSheet";
import { ShareDocumentSheet } from "../../components/shared/ShareDocumentSheet";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { getSharedLinks, revokeShareLink, ShareLinkResponse } from "../../services/documentService";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const SummaryScreen = ({ route, navigation }: any) => {
  const { document } = route.params;
  const [localDoc, setLocalDoc] = useState(document);
  const [imageSource, setImageSource] = useState<any>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState<boolean>(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [askText, setAskText] = useState("");
  const { isDark, theme } = useAppTheme();

  const scrollViewRef = useRef<ScrollView>(null);
  const editSheetRef = useRef<BottomSheetModal>(null);
  const shareSheetRef = useRef<BottomSheetModal>(null);
  const [keyboardPadding, setKeyboardPadding] = useState(0);

  const [sharedLinks, setSharedLinks] = useState<ShareLinkResponse[]>([]);

  /*
  useEffect(() => {
    (async () => {
      try {
        const res = await getSharedLinks(localDoc.id);
        if (res.status.success && res.data) {
          setSharedLinks(res.data);
        }
      } catch (error) {
        console.log("Failed to load shared links:", error);
      }
    })();
  }, [localDoc.id]);

  const handleRevokeLink = async (token: string) => {
    try {
      const res = await revokeShareLink(localDoc.id, token);
      if (res.status.success) {
        Toast.show({
          type: "success",
          text1: "Link Revoked",
          text2: "Share link revoked successfully.",
        });
        setSharedLinks((prev) => prev.filter((item) => item.shareToken !== token));
      }
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: "Revocation Failed",
        text2: error.message || "Failed to revoke share link.",
      });
    }
  };
  */

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (e) => {
        setKeyboardPadding(e.endCoordinates.height);
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 80);
      },
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => {
        setKeyboardPadding(0);
      },
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

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
        const maxTranslateX = Math.max(
          0,
          (SCREEN_WIDTH * scale.value - SCREEN_WIDTH) / 2,
        );
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
        const response = await getFileSource(localDoc?.s3Key);
        setImageSource(
          response ||
            (localDoc.imageUri ? { uri: localDoc.imageUri } : null),
        );
      } catch (e) {
        console.log("Failed to load document image URL", e);
      }
    })();
  }, [localDoc?.s3Key, localDoc?.imageUri]);

  const handleShare = async () => {
    if (imageSource?.uri) {
      try {
        await Share.share({
          message: `Check out this medical document: ${localDoc?.fileName}\nURL: ${imageSource.uri}`,
          url: imageSource.uri,
        });
      } catch (error) {
        console.log("Error sharing document:", error);
      }
    } else {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Document preview URL is not loaded yet.",
      });
    }
  };

  const handleMenuPress = () => {
    Alert.alert(
      "Document Actions",
      "Choose an action for this document",
      [
        {
          text: "Delete Document",
          onPress: () => setIsDeleteModalOpen(true),
          style: "destructive",
        },
        {
          text: "Cancel",
          style: "cancel",
        },
      ],
      { cancelable: true },
    );
  };

  const handleAskQuestion = (question: string) => {
    if (!question.trim()) return;
    navigation.navigate("AIChatScreen", {
      document: localDoc,
      initialQuestion: question.trim(),
    });
  };

  const formattedDate = localDoc?.createdAt
    ? formatUTCDateTime(localDoc.createdAt, "dd-MMM-yyyy")
    : "N/A";

  const formattedTime = localDoc?.createdAt
    ? formatUTCDateTime(localDoc.createdAt, "hh:mm a")
    : "N/A";

  const formattedSize = localDoc?.fileSize
    ? localDoc.fileSize >= 1024 * 1024
      ? (localDoc.fileSize / (1024 * 1024)).toFixed(1) + " MB"
      : (localDoc.fileSize / 1024).toFixed(1) + " KB"
    : "N/A";

  return (
    <Container>
      <StatusBar backgroundColor={""} />
      <ConfirmationModal
        showModal={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        mode="Delete Document"
        documentId={localDoc?.id}
      />

      <Header>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons
            name="arrow-back"
            size={24}
            color={theme.colors.textPrimary}
          />
        </TouchableOpacity>
        <HeaderRight>
          <HeaderIconButton onPress={() => shareSheetRef.current?.present()}>
            <Ionicons
              name="share-outline"
              size={22}
              color={theme.colors.textPrimary}
            />
          </HeaderIconButton>
          <HeaderIconButton onPress={() => editSheetRef.current?.present()}>
            <Ionicons
              name="create-outline"
              size={22}
              color={theme.colors.textPrimary}
            />
          </HeaderIconButton>
        </HeaderRight>
      </Header>

      <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: keyboardPadding + 40 }}
      >
        {/* Document Header Card */}
        <Card style={{ flexDirection: "row", alignItems: "center" }}>
          <DocIconBox>
            <MaterialCommunityIcons
              name={
                getFileExtension(localDoc?.fileName) === "pdf"
                  ? "file-pdf-box"
                  : "file-image-outline"
              }
              size={34}
              color={
                getFileExtension(localDoc?.fileName) === "pdf"
                  ? "#ef4444"
                  : "#3b82f6"
              }
            />
            <DocIconLabel>
              {String(getFileExtension(localDoc?.fileName)).toUpperCase()}
            </DocIconLabel>
          </DocIconBox>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text
              style={{
                fontSize: 15,
                fontWeight: "700",
                color: theme.colors.textPrimary,
              }}
              numberOfLines={1}
            >
              {localDoc?.fileName}
            </Text>
            <Badge>
              <BadgeText>{formatDocumentType(localDoc?.documentType)}</BadgeText>
            </Badge>
            <Text
              style={{
                fontSize: 12,
                color: theme.colors.textSecondary,
                fontWeight: "500",
              }}
            >
              {formattedDate} • {formattedTime} • {formattedSize}
            </Text>
          </View>
        </Card>

        {/* Document Details Grid Card */}
        <Card>
          <CardTitle>Document Details</CardTitle>

          <DetailRow>
            <DetailKey>Document Type</DetailKey>
            <DetailValue>{formatDocumentType(localDoc?.documentType)}</DetailValue>
          </DetailRow>

          <DetailRow>
            <DetailKey>Uploaded By</DetailKey>
            <DetailValue>You</DetailValue>
          </DetailRow>

          <DetailRow>
            <DetailKey>Uploaded On</DetailKey>
            <DetailValue>
              {formattedDate} • {formattedTime}
            </DetailValue>
          </DetailRow>

          <DetailRow>
            <DetailKey>File Size</DetailKey>
            <DetailValue>{formattedSize}</DetailValue>
          </DetailRow>

          <DetailRow>
            <DetailKey>Notes</DetailKey>
            <DetailValue>
              {localDoc?.notes || "No notes available"}
            </DetailValue>
          </DetailRow>

          <DetailRow style={{ marginBottom: 4 }}>
            <DetailKey>Tags</DetailKey>
            <View style={{ flex: 1 }}>
              <TagContainer>
                <TagPill>
                  <TagText>
                    {localDoc?.documentType || "Health Document"}
                  </TagText>
                </TagPill>
                <TagPill>
                  <TagText>
                    {new Date(localDoc?.createdAt).getFullYear().toString()}
                  </TagText>
                </TagPill>
              </TagContainer>
            </View>
          </DetailRow>

          <DetailRow style={{ marginTop: 10, marginBottom: 0 }}>
            <DetailKey>File Name</DetailKey>
            <DetailValue
              style={{
                fontSize: 12,
                fontWeight: "500",
                color: theme.colors.textSecondary,
              }}
              numberOfLines={2}
            >
              {localDoc?.fileName}
            </DetailValue>
          </DetailRow>
        </Card>

        {/* View Document Card */}
        <Card>
          <CardTitle>View Document</CardTitle>
          <ThumbnailContainer>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => setIsPreviewModalOpen(true)}
            >
              <ThumbnailBox>
                {imageSource ? (
                  <Image
                    source={imageSource}
                    style={{ width: "100%", height: "100%" }}
                    resizeMode="cover"
                  />
                ) : (
                  <EmptyPreviewBox>
                    <Ionicons
                      name="cloud-offline-outline"
                      size={24}
                      color="#cbd5e1"
                    />
                  </EmptyPreviewBox>
                )}
              </ThumbnailBox>
            </TouchableOpacity>

            <ActionRow>
              <GreenButton
                activeOpacity={0.8}
                onPress={() => setIsPreviewModalOpen(true)}
              >
                <GreenButtonText>View Fullscreen</GreenButtonText>
                <Ionicons name="expand" size={14} color="white" />
              </GreenButton>
            </ActionRow>
          </ThumbnailContainer>
        </Card>

        {/* Shared Links Card
        {sharedLinks.length > 0 && (
          <Card>
            <CardTitle>Shared Links</CardTitle>
            {sharedLinks.map((link) => {
              const expiryDate = new Date(link.expiresAt);
              const isExpired = expiryDate.getTime() < Date.now();
              return (
                <SharedLinkRow key={link.shareToken}>
                  <View style={{ flex: 1, paddingVertical: 4 }}>
                    <LinkText numberOfLines={1}>
                      {link.shareUrl}
                    </LinkText>
                    <ExpiryText isExpired={isExpired}>
                      {isExpired ? "Expired" : "Expires"}: {formatUTCDateTime(link.expiresAt, "dd-MMM-yyyy hh:mm a")}
                    </ExpiryText>
                  </View>
                  <RevokeButton
                    onPress={() => handleRevokeLink(link.shareToken)}
                    activeOpacity={0.7}
                  >
                    <RevokeButtonText>Revoke</RevokeButtonText>
                  </RevokeButton>
                </SharedLinkRow>
              );
            })}
          </Card>
        )}
        */}

        {/* Questions You Can Ask Card */}
        <Card style={{ marginBottom: 30 }}>
          <CardTitle>Questions You Can Ask</CardTitle>

          <QuestionRow
            activeOpacity={0.7}
            onPress={() =>
              handleAskQuestion("What do my blood sugar levels indicate?")
            }
          >
            <Ionicons
              name="chatbubble-outline"
              size={15}
              color="#10b981"
              style={{ marginRight: 8 }}
            />
            <QuestionText>What do my blood sugar levels indicate?</QuestionText>
          </QuestionRow>

          <QuestionRow
            activeOpacity={0.7}
            onPress={() =>
              handleAskQuestion("Are my cholesterol levels normal?")
            }
          >
            <Ionicons
              name="chatbubble-outline"
              size={15}
              color="#10b981"
              style={{ marginRight: 8 }}
            />
            <QuestionText>Are my cholesterol levels normal?</QuestionText>
          </QuestionRow>

          <QuestionRow
            activeOpacity={0.7}
            onPress={() =>
              handleAskQuestion("Please highlight any abnormal results.")
            }
          >
            <Ionicons
              name="chatbubble-outline"
              size={15}
              color="#10b981"
              style={{ marginRight: 8 }}
            />
            <QuestionText>Please highlight any abnormal results.</QuestionText>
          </QuestionRow>

          <InputBar>
            <AskInput
              value={askText}
              onChangeText={setAskText}
              placeholder="Ask a question about this document..."
              placeholderTextColor={theme.colors.textMuted}
              returnKeyType="send"
              onSubmitEditing={() => {
                handleAskQuestion(askText);
                setAskText("");
              }}
            />
            <SendButton
              activeOpacity={0.8}
              onPress={() => {
                handleAskQuestion(askText);
                setAskText("");
              }}
            >
              <Ionicons name="send" size={13} color="white" />
            </SendButton>
          </InputBar>
        </Card>
      </ScrollView>

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
                    style={[{ width: "100%", height: "100%" }, animatedStyle]}
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

      <EditDocumentBottomSheet
        ref={editSheetRef}
        document={localDoc}
        onSuccess={(updatedDoc) => {
          setLocalDoc(updatedDoc);
        }}
        onClose={() => {
          editSheetRef.current?.dismiss();
        }}
      />

      <ShareDocumentSheet
        ref={shareSheetRef}
        document={localDoc}
        onLinkCreated={(newLink) => {
          setSharedLinks((prev) => [newLink, ...prev]);
        }}
        onClose={() => {
          shareSheetRef.current?.dismiss();
        }}
      />
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
  background-color: ${(props: any) => props.theme.colors.background};
`;

const Header = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding-horizontal: 20px;
  padding-top: 50px;
  padding-bottom: 12px;
`;

const Card = styled.View`
  background-color: ${(props: any) => props.theme.colors.surface};
  border-radius: 16px;
  padding: 16px;
  margin-horizontal: 16px;
  margin-bottom: 16px;
  border-width: 1px;
  border-color: ${(props: any) => props.theme.colors.border};
  elevation: 2;
  shadow-color: #000;
  shadow-opacity: 0.03;
  shadow-radius: 8px;
  shadow-offset: 0px 2px;
`;

const DocIconBox = styled.View`
  width: 54px;
  height: 54px;
  background-color: #fef2f2;
  border-radius: 12px;
  justify-content: center;
  align-items: center;
`;

const DocIconLabel = styled.Text`
  font-size: 9px;
  font-weight: 800;
  color: #ef4444;
  margin-top: -2px;
`;

const Badge = styled.View`
  background-color: #e8fdf0;
  padding-horizontal: 8px;
  padding-vertical: 3px;
  border-radius: 6px;
  align-self: flex-start;
  margin-top: 4px;
  margin-bottom: 4px;
`;

const BadgeText = styled.Text`
  font-size: 11px;
  font-weight: 600;
  color: #10b981;
`;

const CardTitle = styled.Text`
  font-size: 15px;
  font-weight: 700;
  color: ${(props: any) => props.theme.colors.textPrimary};
  margin-bottom: 14px;
`;

const DetailRow = styled.View`
  flex-direction: row;
  margin-bottom: 10px;
  align-items: flex-start;
`;

const DetailKey = styled.Text`
  width: 110px;
  font-size: 13px;
  font-weight: 500;
  color: ${(props: any) => props.theme.colors.textSecondary};
`;

const DetailValue = styled.Text`
  flex: 1;
  font-size: 13px;
  font-weight: 600;
  color: ${(props: any) => props.theme.colors.textPrimary};
`;

const TagContainer = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  gap: 6px;
`;

const TagPill = styled.View`
  background-color: ${(props: any) => props.theme.colors.surfaceLight};
  padding-horizontal: 8px;
  padding-vertical: 4px;
  border-radius: 6px;
  border-width: 1px;
  border-color: ${(props: any) => props.theme.colors.border};
`;

const TagText = styled.Text`
  font-size: 11px;
  font-weight: 600;
  color: ${(props: any) => props.theme.colors.textPrimary};
`;

const ThumbnailContainer = styled.View`
  flex-direction: column;
  gap: 10px;
  align-items: center;
  justify-content: space-between;
`;

const ThumbnailBox = styled.View`
  width: 200px;
  height: 150px;
  padding: 10px;
  border-radius: 10px;
  overflow: hidden;
  background-color: ${(props: any) => props.theme.colors.surfaceLight};
  border-width: 1px;
  border-color: ${(props: any) => props.theme.colors.border};
`;

const ActionRow = styled.View`
  flex-direction: row;
  gap: 30px;
  align-items: center;
  flex: 1;
  justify-content: flex-end;
  margin-left: 12px;
`;

const GreenButton = styled.TouchableOpacity`
  flex-direction: row;
  align-items: center;
  background-color: #059669;
  padding-horizontal: 12px;
  padding-vertical: 8px;
  border-radius: 8px;
  margin-right: 8px;
`;

const GreenButtonText = styled.Text`
  color: white;
  font-size: 12px;
  font-weight: 600;
  margin-right: 4px;
`;

const CircleIconButton = styled.TouchableOpacity`
  width: 34px;
  height: 34px;
  border-radius: 17px;
  border-width: 1px;
  border-color: #10b981;
  justify-content: center;
  align-items: center;
`;

const QuestionRow = styled.TouchableOpacity`
  flex-direction: row;
  align-items: center;
  border-width: 1px;
  border-color: ${(props: any) => props.theme.colors.border};
  border-radius: 10px;
  padding: 10px;
  margin-bottom: 8px;
`;

const QuestionText = styled.Text`
  flex: 1;
  font-size: 12px;
  color: ${(props: any) => props.theme.colors.textPrimary};
  font-weight: 500;
`;

const InputBar = styled.View`
  flex-direction: row;
  align-items: center;
  border-width: 1px;
  border-color: ${(props: any) => props.theme.colors.border};
  border-radius: 24px;
  padding-horizontal: 14px;
  padding-vertical: 6px;
  background-color: ${(props: any) => props.theme.colors.surface};
  margin-top: 8px;
`;

const AskInput = styled.TextInput`
  flex: 1;
  font-size: 13px;
  color: ${(props: any) => props.theme.colors.textPrimary};
  padding: 0px;
`;

const SendButton = styled.TouchableOpacity`
  width: 32px;
  height: 32px;
  border-radius: 16px;
  background-color: #10b981;
  justify-content: center;
  align-items: center;
  margin-left: 8px;
`;

const EmptyPreviewBox = styled.View`
  flex: 1;
  justify-content: center;
  align-items: center;
`;

const EmptyText = styled.Text`
  color: #94a3b8;
  font-size: 12px;
  margin-top: 8px;
`;

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

const HeaderRight = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 16px;
`;

const HeaderIconButton = styled.TouchableOpacity`
  padding: 4px;
`;

const SharedLinkRow = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding-vertical: 8px;
`;

const LinkText = styled.Text`
  font-size: 13px;
  font-family: monospace;
  color: ${(props: any) => props.theme.colors.textSecondary};
`;

const ExpiryText = styled.Text<{ isExpired: boolean }>`
  font-size: 11px;
  color: ${({ isExpired }: { isExpired: boolean }) => (isExpired ? "#ef4444" : "#64748b")};
  margin-top: 4px;
`;

const RevokeButton = styled.TouchableOpacity`
  padding-horizontal: 12px;
  padding-vertical: 6px;
  border-radius: 6px;
  background-color: #fee2e2;
  margin-left: 10px;
`;

const RevokeButtonText = styled.Text`
  color: #ef4444;
  font-size: 11px;
  font-weight: 700;
`;
