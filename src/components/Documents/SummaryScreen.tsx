import React, { useEffect, useState } from "react";
import styled from "styled-components/native";
import ScreenHeader from "../shared/Header";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as MailComposer from "expo-mail-composer";
import Toast from "react-native-toast-message";
import { generateProfessionalEmail } from "../../utils/ShareTemplate";
import { useAppTheme } from "../../context/ThemeContext";
import { getSignedUrl } from "../../services/authService";
import * as SecureStore from "expo-secure-store";

const SummaryScreen = ({ route, navigation }: any) => {
  const { document } = route.params;
  const [imageUri, setImageUri] = useState<string>("");
  const { isDark } = useAppTheme();
  console.log("Document :-", document?.s3Key);
  const token = async () => {
    const token = await SecureStore.getItemAsync("token");
    return token;
  }

  const getSignedURL = async () => {
    try {
      const response = await getSignedUrl(document?.s3Key);
      console.log("Signed URL", response?.data);
      setImageUri(response?.data);

    } catch (error) {
      console.log("Error getting signed URL", error);
    }
  };

  useEffect(() => {
    getSignedURL();
  }, []);

  const handleEdit = () => {
    navigation.navigate("EditDocument", { document });
  };

  const handleShare = async () => {
    const result = await MailComposer.isAvailableAsync();
    if (!result) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Mail is not available",
      });
      return;
    }

    const subject = `Document Shared - ${document?.title}`;
    const body = generateProfessionalEmail(document);
    const attachment = document?.imageUri;

    const mail = {
      subject: subject,
      body: body,
      attachments: attachment ? [attachment] : [],
    };

    const share = await MailComposer.composeAsync(mail);

    if (share.status === "cancelled") {
      Toast.show({
        type: "info",
        text1: "Cancelled",
        text2: "Mail not sent",
      });
    } else {
      Toast.show({
        type: "success",
        text1: "Success",
        text2: "Mail sent successfully",
      });
    }
  };

  return (
    <Container>
      <HeaderBand>
        <ScreenHeader title="Summary" showBack={true} />
      </HeaderBand>

      <ScrollContent>
        <MetaCard>
          <MetaLeft>
            <CategoryRow>
              <CategoryDot />
              <CategoryLabel>{document.documentType}</CategoryLabel>
            </CategoryRow>
            <DocumentTitle>{document?.fileName}</DocumentTitle>
            <DateRow>
              <Ionicons
                name="calendar-outline"
                size={12}
                color={isDark ? "#64748b" : "#94A3B8"}
              />
              <DocumentDate>
                Created On{" "}
                {new Date(document?.createdAt).toLocaleDateString("en-US", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </DocumentDate>
            </DateRow>
          </MetaLeft>
          <EditButton onPress={handleEdit}>
            <Ionicons
              name="pencil-sharp"
              size={16}
              color={isDark ? "#60a5fa" : "#1246A8"}
            />
          </EditButton>

          <SummaryCard>
            <SummaryGradient
              colors={
                isDark
                  ? ["#1e293b", "#334155"]
                  : ["#E8EFFD", "#EDE6FF", "#F5F0FF"]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <SummaryHeader>
                <SummaryIconBadge>
                  <Ionicons name="sparkles" size={14} color="#ffffff" />
                </SummaryIconBadge>
                <SummaryTitle>AI Summary</SummaryTitle>
              </SummaryHeader>
              <SummaryText>
                {document?.AISummary ||
                  "AI summary will be generated on OCR API call."}
              </SummaryText>
            </SummaryGradient>
          </SummaryCard>
        </MetaCard>

        {document?.notes && (
          <NotesCard>
            <NotesGradient
              colors={
                isDark
                  ? ["#332d1e", "#42381e"]
                  : ["#FFFDF0", "#FFF8D6", "#FFF4C2"]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <NotesMarginLine />
              <NotesContent>
                <NotesHeader>
                  <NotesIconBadge>
                    <Ionicons name="book-outline" size={14} color="#ffffff" />
                  </NotesIconBadge>
                  <NotesTitle>Notes</NotesTitle>
                </NotesHeader>
                <NotesRuledContainer>
                  <NotesText>{document?.notes}</NotesText>
                </NotesRuledContainer>
              </NotesContent>
            </NotesGradient>
          </NotesCard>
        )}

        <PreviewCard>
          <PreviewHeader>
            <Ionicons
              name="document-outline"
              size={13}
              color={isDark ? "#64748b" : "#94A3B8"}
            />
            <PreviewLabel>Document Preview</PreviewLabel>
          </PreviewHeader>
          {imageUri ? (
            <PreviewImage
              source={{
                uri: imageUri,
              }}
              onError={(e: any) => console.log("Image error:", e.nativeEvent)}
            />
          ) : (
            <EmptyPreview>
              <Ionicons
                name="image-outline"
                size={36}
                color={isDark ? "#475569" : "#CBD5E1"}
              />
              <EmptyText>No image attached</EmptyText>
            </EmptyPreview>
          )}
        </PreviewCard>

        <ActionButton onPress={handleShare}>
          <ActionButtonText>Share Document</ActionButtonText>
          <Ionicons name="share" size={24} color="#ffffff" />
        </ActionButton>
      </ScrollContent>
    </Container>
  );
};

export default SummaryScreen;

const Container = styled.SafeAreaView`
  flex: 1;
  background-color: ${({ theme }: any) => theme.colors.background};
`;

const HeaderBand = styled.View`
  background-color: ${({ theme }: any) => theme.colors.surface};
  padding-bottom: 24px;
  overflow: hidden;
`;

const ScrollContent = styled.ScrollView.attrs({
  contentContainerStyle: { padding: 16, paddingBottom: 32 },
  showsVerticalScrollIndicator: false,
})`
  flex: 1;
  margin-top: -14px;
`;

const MetaCard = styled.View`
  background-color: ${({ theme }: any) => theme.colors.surface};
  border-radius: 20px;
  padding: 18px;
  flex: 1;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 14px;
  border-width: 0.5px;
  border-color: ${({ theme }: any) => theme.colors.border};
  elevation: 4;
  shadow-color: ${({ theme }: any) => theme.colors.primary};
  shadow-opacity: 0.08;
  shadow-radius: 12px;
  shadow-offset: 0px 4px;
`;

const MetaLeft = styled.View`
  flex: 1;
`;

const CategoryRow = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
`;

const CategoryDot = styled.View`
  width: 8px;
  height: 8px;
  border-radius: 4px;
  background-color: ${({ theme }: any) => theme.colors.primary};
`;

const CategoryLabel = styled.Text`
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }: any) => theme.colors.primary};
  letter-spacing: 1px;
  text-transform: uppercase;
`;

const DocumentTitle = styled.Text`
  font-size: 18px;
  font-weight: 700;
  color: ${({ theme }: any) => theme.colors.textPrimary};
  line-height: 24px;
  margin-bottom: 8px;
`;

const DateRow = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 5px;
`;

const DocumentDate = styled.Text`
  font-size: 12px;
  color: ${({ theme }: any) => theme.colors.textMuted};
`;

const EditButton = styled.TouchableOpacity`
  position: absolute;
  top: 40px;
  right: 20px;
  width: 38px;
  height: 38px;
  border-radius: 12px;
  background-color: ${({ theme }: any) => theme.colors.iconBox};
  border-width: 0.5px;
  border-color: ${({ theme }: any) => theme.colors.border};
  align-items: center;
  justify-content: center;
`;

const SummaryCard = styled.View`
  width: 100%;
  margin-top: 20px;
  border-radius: 20px;
  overflow: hidden;
  border-width: 0.5px;
  border-color: ${({ theme }: any) => theme.colors.border};
  shadow-color: ${({ theme }: any) => theme.colors.primary};
  shadow-offset: 0px 8px;
  shadow-opacity: 0.18;
  shadow-radius: 20px;
  elevation: 6;
`;

const SummaryGradient = styled(LinearGradient)`
  padding: 18px;
`;

const SummaryHeader = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
`;

const SummaryIconBadge = styled.View`
  width: 30px;
  height: 30px;
  border-radius: 9px;
  background-color: ${({ theme }: any) => theme.colors.primary};
  align-items: center;
  justify-content: center;
  shadow-color: ${({ theme }: any) => theme.colors.primary};
  shadow-offset: 0px 3px;
  shadow-opacity: 0.45;
  shadow-radius: 6px;
  elevation: 4;
`;

const SummaryTitle = styled.Text`
  font-size: 15px;
  font-weight: 800;
  color: ${({ theme }: any) => theme.colors.primary};
  flex: 1;
  letter-spacing: 0.2px;
`;

const SummaryText = styled.Text`
  font-size: 13px;
  color: ${({ theme }: any) => theme.colors.textPrimary};
  line-height: 22px;
`;

const NotesCard = styled.View`
  border-radius: 20px;
  overflow: hidden;
  margin-bottom: 14px;
  border-width: 0.5px;
  border-color: ${({ theme }: any) => theme.colors.warning};
  shadow-color: ${({ theme }: any) => theme.colors.warning};
  shadow-offset: 0px 4px;
  shadow-opacity: 0.12;
  shadow-radius: 14px;
  elevation: 3;
`;

const NotesGradient = styled(LinearGradient)`
  padding: 18px 18px 18px 0px;
  flex-direction: row;
`;

const NotesMarginLine = styled.View`
  width: 3px;
  border-radius: 3px;
  background-color: ${({ theme }: any) => theme.colors.warning};
  margin-left: 16px;
  margin-right: 14px;
  opacity: 0.75;
`;

const NotesContent = styled.View`
  flex: 1;
`;

const NotesHeader = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
`;

const NotesIconBadge = styled.View`
  width: 30px;
  height: 30px;
  border-radius: 9px;
  background-color: ${({ theme }: any) => theme.colors.warning};
  align-items: center;
  justify-content: center;
  shadow-color: ${({ theme }: any) => theme.colors.warning};
  shadow-offset: 0px 3px;
  shadow-opacity: 0.35;
  shadow-radius: 5px;
  elevation: 3;
`;

const NotesTitle = styled.Text`
  font-size: 15px;
  font-weight: 800;
  color: ${({ theme }: any) => theme.colors.warning};
  flex: 1;
  letter-spacing: 0.2px;
`;

const NotesRuledContainer = styled.View`
  position: relative;
`;

const NotesText = styled.Text`
  font-size: 13px;
  color: ${({ theme }: any) => theme.colors.textPrimary};
  line-height: 22px;
  opacity: 0.9;
`;

const PreviewCard = styled.View`
  background-color: ${({ theme }: any) => theme.colors.surface};
  border-radius: 20px;
  overflow: hidden;
  margin-bottom: 14px;
  border-width: 0.5px;
  border-color: ${({ theme }: any) => theme.colors.border};
`;

const PreviewHeader = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 7px;
  padding: 10px 16px;
  border-bottom-width: 0.5px;
  border-bottom-color: ${({ theme }: any) => theme.colors.border};
  background-color: ${({ theme }: any) => theme.colors.surfaceLight};
`;

const PreviewLabel = styled.Text`
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }: any) => theme.colors.textMuted};
`;

const PreviewImage = styled.Image`
  width: 100%;
  height: 230px;
  resize-mode: contain;
`;

const EmptyPreview = styled.View`
  height: 140px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background-color: ${({ theme }: any) => theme.colors.surfaceLight};
`;

const EmptyText = styled.Text`
  font-size: 13px;
  color: ${({ theme }: any) => theme.colors.textMuted};
`;

const ActionButton = styled.TouchableOpacity`
  background-color: ${({ theme }: any) => theme.colors.primary};
  flex: 1;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  padding: 14px;
  margin-bottom: 10px;
  flex-direction: row;
  align-items: center;
  border-width: 0.5px;
  border-color: ${({ theme }: any) => theme.colors.border};
`;

const ActionButtonText = styled.Text`
  font-size: 16px;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: 0.5px;
  padding-right: 10px;
`;
