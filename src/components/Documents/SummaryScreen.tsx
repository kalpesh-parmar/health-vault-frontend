import React from "react";
import styled from "styled-components/native";
import ScreenHeader from "../shared/Header";
import { MedicalDocument } from "./DocumentCard";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as MailComposer from 'expo-mail-composer'; 
import Toast from "react-native-toast-message";
import { generateProfessionalEmail } from "../../utils/ShareTemplate";

const SummaryScreen = ({ route, navigation }: any) => {
  const { document } = route.params;
  console.log("Document :-", document);

  const handleDelete = (id: string) => {};
  const handleEdit = (id: string, updatedData?: Partial<MedicalDocument>) => {
    navigation.navigate("EditDocument", { document });
  };

  const handleShare = async () => {
    const result = await MailComposer.isAvailableAsync();
    if(!result) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Mail is not available'
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
    }

    const share = await MailComposer.composeAsync(mail);

    if(share.status === "cancelled") {
      Toast.show({
        type: 'info',
        text1: 'Cancelled',
        text2: 'Mail not sent'
      })
    } else {
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Mail sent successfully'
      })
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
              <CategoryLabel>{document.category}</CategoryLabel>
            </CategoryRow>
            <DocumentTitle>{document?.title}</DocumentTitle>
            <DateRow>
              <Ionicons name="calendar-outline" size={12} color="#94A3B8" />
              <DocumentDate>Created {document?.createdAt}</DocumentDate>
            </DateRow>
          </MetaLeft>
          <EditButton onPress={() => handleEdit(document?.id || "")}>
            <Ionicons name="pencil-sharp" size={16} color="#1246A8" />
          </EditButton>

          <SummaryCard>
            <SummaryGradient
              colors={["#E8EFFD", "#EDE6FF", "#F5F0FF"]}
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
              colors={["#FFFDF0", "#FFF8D6", "#FFF4C2"]}
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
            <Ionicons name="document-outline" size={13} color="#94A3B8" />
            <PreviewLabel>Document Preview</PreviewLabel>
          </PreviewHeader>
          {document?.imageUri ? (
            <PreviewImage source={{ uri: document?.imageUri }} />
          ) : (
            <EmptyPreview>
              <Ionicons name="image-outline" size={36} color="#CBD5E1" />
              <EmptyText>No image attached</EmptyText>
            </EmptyPreview>
          )}
        </PreviewCard>

        <ActionButton onPress={() => handleShare}>
          <ActionButtonText>Share Document</ActionButtonText>
          <Ionicons name="share" size={24} color="#ffffff" />
        </ActionButton>
      </ScrollContent>
    </Container>
  );
};

export default SummaryScreen;

const BLUE = "#1246A8";
const BLUE_LIGHT = "#EEF3FD";
const BLUE_BORDER = "#C5D5F7";

const Container = styled.SafeAreaView`
  flex: 1;
  background-color: #f8fafc;
`;

const HeaderBand = styled.View`
  background-color: #ffffff;
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
  background-color: #ffffff;
  border-radius: 20px;
  padding: 18px;
  flex: 1;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 14px;
  border-width: 0.5px;
  border-color: #e2e8f0;
  elevation: 4;
  shadow-color: ${BLUE};
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
  background-color: ${BLUE};
`;

const CategoryLabel = styled.Text`
  font-size: 11px;
  font-weight: 600;
  color: ${BLUE};
  letter-spacing: 1px;
  text-transform: uppercase;
`;

const DocumentTitle = styled.Text`
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
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
  color: #94a3b8;
`;

const EditButton = styled.TouchableOpacity`
  position: absolute;
  top: 40px;
  right: 20px;
  width: 38px;
  height: 38px;
  border-radius: 12px;
  background-color: ${BLUE_LIGHT};
  border-width: 0.5px;
  border-color: ${BLUE_BORDER};
  align-items: center;
  justify-content: center;
`;

const SummaryCard = styled.View`
  width: 100%;
  margin-top: 20px;
  border-radius: 20px;
  overflow: hidden;
  border-width: 0.5px;
  border-color: ${BLUE_BORDER};
  shadow-color: #6b8cda;
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
  background-color: ${BLUE};
  align-items: center;
  justify-content: center;
  shadow-color: ${BLUE};
  shadow-offset: 0px 3px;
  shadow-opacity: 0.45;
  shadow-radius: 6px;
  elevation: 4;
`;

const SummaryTitle = styled.Text`
  font-size: 15px;
  font-weight: 800;
  color: ${BLUE};
  flex: 1;
  letter-spacing: 0.2px;
`;

const SummaryText = styled.Text`
  font-size: 13px;
  color: #2d3b5a;
  line-height: 22px;
`;

const NotesCard = styled.View`
  border-radius: 20px;
  overflow: hidden;
  margin-bottom: 14px;
  border-width: 0.5px;
  border-color: #e8d9a0;
  shadow-color: #c4a84f;
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
  background-color: #f0c040;
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
  background-color: #c68a00;
  align-items: center;
  justify-content: center;
  shadow-color: #c68a00;
  shadow-offset: 0px 3px;
  shadow-opacity: 0.35;
  shadow-radius: 5px;
  elevation: 3;
`;

const NotesTitle = styled.Text`
  font-size: 15px;
  font-weight: 800;
  color: #8a6200;
  flex: 1;
  letter-spacing: 0.2px;
`;

const NotesRuledContainer = styled.View`
  position: relative;
`;

const NotesText = styled.Text`
  font-size: 13px;
  color: #4a3800;
  line-height: 22px;
  opacity: 0.9;
`;

const PreviewCard = styled.View`
  background-color: #ffffff;
  border-radius: 20px;
  overflow: hidden;
  margin-bottom: 14px;
  border-width: 0.5px;
  border-color: #797c7fff;
`;

const PreviewHeader = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 7px;
  padding: 10px 16px;
  border-bottom-width: 0.5px;
  border-bottom-color: #797c7fff;
  background-color: #f8fafc;
`;

const PreviewLabel = styled.Text`
  font-size: 12px;
  font-weight: 600;
  color: #94a3b8;
`;

const PreviewImage = styled.Image`
  width: 100%;
  height: fit-content;
`;

const EmptyPreview = styled.View`
  height: 140px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background-color: #f8fafc;
`;

const EmptyText = styled.Text`
  font-size: 13px;
  color: #94a3b8;
`;

const ActionButton = styled.TouchableOpacity`
  background-color: #000000;
  flex: 1;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  padding: 14px;
  margin-bottom: 10px;
  flex-direction: row;
  align-items: center;
  border-width: 0.5px;
  border-color: ${BLUE_BORDER};
`;

const ActionButtonText = styled.Text`
  font-size: 16px;
  font-weight: 700;
  color: #ffffffff;
  letter-spacing: 0.5px;
  padding-right: 10px;
`;
