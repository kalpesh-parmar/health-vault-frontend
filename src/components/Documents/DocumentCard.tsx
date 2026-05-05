import React from "react";
import styled from "styled-components/native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { AppStackParamList } from "../../navigation/types";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { TouchableOpacity } from "react-native";
import * as MailComposer from "expo-mail-composer";
import Toast from "react-native-toast-message";
import { generateProfessionalEmail } from "../../utils/ShareTemplate";
import { useAppTheme } from "../../context/ThemeContext";

export interface MedicalDocument {
  id: string;
  fileName: string;
  category: string;
  createdAt: string;
  imageUri?: string;
  documentId?: string;
  AISummary?: string;
  notes?: string;
}

interface Props {
  document: MedicalDocument;
}

const DocumentCard = ({ document }: Props) => {
  const { isDark } = useAppTheme();
  const filename = document?.fileName?.replaceAll("%20", " ");
  const fileNameWOExt = filename.split(".").slice(0, -1).join(".");

  const navigation =
    useNavigation<NativeStackNavigationProp<AppStackParamList>>();

  const handleShare = async (item: MedicalDocument) => {
    const result = await MailComposer.isAvailableAsync();
    if (!result) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Mail is not available",
      });
      return;
    }

    const subject = `Document Shared - ${fileNameWOExt}`;
    const body = generateProfessionalEmail(document);
    const attachment = item?.imageUri;

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
    <DocCard
      onPress={() =>
        navigation.navigate("DocumentSummary", {
          document: document,
        })
      }
    >
      <DocIconBox>
        <Ionicons name={"document-text"} size={20} color={isDark ? "#60a5fa" : "#1246A8"} />
      </DocIconBox>
      <DocInfo>
        <DocTitle numberOfLines={1}>{fileNameWOExt}</DocTitle>
        <DocDate>
          {new Date(document.createdAt).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </DocDate>
      </DocInfo>
      <DocRight>
        <TouchableOpacity onPress={() => handleShare(document)}>
          <MaterialIcons name="share" size={24} color={isDark ? "#60a5fa" : "#1246A8"} />
        </TouchableOpacity>
      </DocRight>
    </DocCard>
  );
};

export default DocumentCard;

const DocCard = styled.TouchableOpacity`
  background-color: ${({ theme }: any) => theme.colors.surface};
  border-radius: 20px;
  padding: 14px 16px;
  margin-bottom: 10px;
  flex-direction: row;
  align-items: center;
  gap: 12px;
  border-width: 0.5px;
  border-color: ${({ theme }: any) => theme.colors.border};
  elevation: 2;
  shadow-color: #000;
  shadow-opacity: 0.04;
  shadow-radius: 6px;
  shadow-offset: 0px 2px;
`;

const DocIconBox = styled.View`
  width: 44px;
  height: 44px;
  background-color: ${({ theme }: any) => theme.colors.iconBox};
  border-radius: 13px;
  align-items: center;
  justify-content: center;
`;

const DocInfo = styled.View`
  flex: 1;
`;

const DocTitle = styled.Text`
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }: any) => theme.colors.textPrimary};
  margin-bottom: 3px;
`;

const DocDate = styled.Text`
  font-size: 12px;
  color: ${({ theme }: any) => theme.colors.textMuted};
`;

const DocRight = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 8px;
`;
