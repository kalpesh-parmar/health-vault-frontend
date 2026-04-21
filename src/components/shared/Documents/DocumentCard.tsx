import React from "react";
import styled from "styled-components/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { RootStackParamList } from "../../../navigation/types";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

export interface MedicalDocument {
  id: string;
  title: string;
  createdAt: string;
  imageUri?: string;
  documentId?: string;
  AISummary?: string;
}

interface Props {
  item: MedicalDocument;
}

const DocumentCard = ({ item }: Props) => {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  return (
    <Card
      onPress={() =>
        navigation.navigate("SummaryScreen", {
          document: item,
        })
      }
    >
      <IconContainer>
        <MaterialCommunityIcons
          name="file-document-outline"
          size={22}
          color="#2563eb"
        />
      </IconContainer>

      <Content>
        <Title numberOfLines={1}>{item.title}</Title>
        <DateText>{item.createdAt}</DateText>
      </Content>
    </Card>
  );
};

export default DocumentCard;

const Card = styled.TouchableOpacity`
  flex-direction: row;
  align-items: center;
  background-color: #ffffff;
  padding: 14px;
  border-radius: 14px;
  border: 1px solid #f1f5f9;
`;

const IconContainer = styled.View`
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background-color: #eff6ff;
  justify-content: center;
  align-items: center;
  margin-right: 12px;
`;

const Content = styled.View`
  flex: 1;
`;

const Title = styled.Text`
  font-size: 15px;
  font-weight: 600;
  color: #0f172a;
`;

const DateText = styled.Text`
  font-size: 12px;
  color: #94a3b8;
  margin-top: 2px;
`;
