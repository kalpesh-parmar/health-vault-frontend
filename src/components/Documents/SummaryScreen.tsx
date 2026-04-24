import React from "react";
import styled from "styled-components/native";
import ScreenHeader from "../shared/Header";
import { MedicalDocument } from "./DocumentCard";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

const SummaryScreen = ({ route, navigation }: any) => {
  const { document } = route.params;
  console.log("Document :-", document);

  const handleDelete = (id: string) => {};
  const handleEdit = (id: string, updatedData?: Partial<MedicalDocument>) => {
    navigation.navigate("EditDocument", { document });
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
        </MetaCard>

        <SummaryCard>
          <SummaryGradient
            colors={["#EEF3FD", "#F5F0FF"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <SummaryHeader>
              <SummaryIconBadge>
                <Ionicons name="sparkles" size={14} color="#ffffff" />
              </SummaryIconBadge>
              <SummaryTitle>AI Summary</SummaryTitle>
              <GeneratedBadge>
                <GeneratedBadgeText>GENERATED</GeneratedBadgeText>
              </GeneratedBadge>
            </SummaryHeader>
            <SummaryText>
              {document?.AISummary ||
                "AI summary will be generated on OCR API call."}
            </SummaryText>
          </SummaryGradient>
        </SummaryCard>

        {document?.notes && (
          <SummaryCard>
            <SummaryGradient
              colors={["#EEF3FD", "#FFFCF3"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <SummaryHeader>
                <SummaryIconBadge>
                  <Ionicons name="book-outline" size={14} color="#ffffff" />
                </SummaryIconBadge>
                <SummaryTitle>Notes</SummaryTitle>
              </SummaryHeader>
              <SummaryText>{document?.notes}</SummaryText>
            </SummaryGradient>
          </SummaryCard>
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

        <ActionRow>
          <ActionButton
            variant="edit"
            onPress={() => handleEdit(document?.id || "")}
          >
            <Ionicons name="pencil-sharp" size={18} color="#1246A8" />
            <ActionButtonText variant="edit">Edit Document</ActionButtonText>
          </ActionButton>

          <ActionButton
            variant="delete"
            onPress={() => handleDelete(document?.id || "")}
          >
            <Ionicons name="trash-outline" size={18} color="#E53535" />
            <ActionButtonText variant="delete">Delete</ActionButtonText>
          </ActionButton>
        </ActionRow>
      </ScrollContent>
    </Container>
  );
};

export default SummaryScreen;

const BLUE = "#1246A8";
const BLUE_LIGHT = "#EEF3FD";
const BLUE_BORDER = "#C5D5F7";
const RED = "#E53535";
const RED_LIGHT = "#FEF2F2";
const RED_BORDER = "#FECACA";

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
  flex-direction: row;
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
  width: 38px;
  height: 38px;
  border-radius: 12px;
  background-color: ${BLUE_LIGHT};
  border-width: 0.5px;
  border-color: ${BLUE_BORDER};
  align-items: center;
  justify-content: center;
  margin-left: 12px;
`;

const SummaryCard = styled.View`
  border-radius: 20px;
  overflow: hidden;
  margin-bottom: 14px;
  border-width: 0.5px;
  border-color: ${BLUE_BORDER};
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
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background-color: ${BLUE};
  align-items: center;
  justify-content: center;
`;

const SummaryTitle = styled.Text`
  font-size: 15px;
  font-weight: 700;
  color: ${BLUE};
  flex: 1;
`;

const GeneratedBadge = styled.View`
  background-color: ${BLUE};
  border-radius: 20px;
  padding: 3px 10px;
`;

const GeneratedBadgeText = styled.Text`
  font-size: 9px;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: 0.8px;
`;

const SummaryText = styled.Text`
  font-size: 13px;
  color: #2d3b5a;
  line-height: 22px;
`;

const PreviewCard = styled.View`
  background-color: #ffffff;
  border-radius: 20px;
  overflow: hidden;
  margin-bottom: 14px;
  border-width: 0.5px;
  border-color: #e2e8f0;
`;

const PreviewHeader = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 7px;
  padding: 10px 16px;
  border-bottom-width: 0.5px;
  border-bottom-color: #e2e8f0;
  background-color: #f8fafc;
`;

const PreviewLabel = styled.Text`
  font-size: 12px;
  font-weight: 600;
  color: #94a3b8;
`;

const PreviewImage = styled.Image`
  width: 100%;
  height: 200px;
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

const ActionRow = styled.View`
  flex-direction: row;
  gap: 10px;
`;

const ActionButton = styled.TouchableOpacity<{ variant: "edit" | "delete" }>`
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 16px 10px;
  border-radius: 18px;
  background-color: ${({ variant }: any) =>
    variant === "edit" ? BLUE_LIGHT : RED_LIGHT};
  border-width: 0.5px;
  border-color: ${({ variant }: any) =>
    variant === "edit" ? BLUE_BORDER : RED_BORDER};
`;

const ActionButtonText = styled.Text<{ variant: "edit" | "delete" }>`
  font-size: 13px;
  font-weight: 700;
  color: ${({ variant }: any) => (variant === "edit" ? BLUE : RED)};
`;
