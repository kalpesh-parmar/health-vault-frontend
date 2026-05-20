import React from "react";
import styled from "styled-components/native";
import {
  Ionicons,
  FontAwesome5,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { AppStackParamList } from "../../navigation/types";
import { useAppTheme } from "../../context/ThemeContext";

// Define strict typing parameters for incoming navigation data models
type UploadSuccessRouteProp = RouteProp<
  {
    UploadSuccess: {
      documentName: string;
      fileSize: string;
      fileType: "pdf" | "jpg" | "png" | "doc" | string;
      uploadedAt: string;
      category: string;
    };
  },
  "UploadSuccess"
>;

const UploadSuccessScreen = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const route = useRoute<UploadSuccessRouteProp>();
  const { isDark } = useAppTheme();

  // Fallback structural mock data values in case params are not actively provided
  const {
    documentName = "Blood Test Report.pdf",
    fileSize = "2.45 MB",
    fileType = "pdf",
    uploadedAt = "20 May 2026, 10:30 AM",
    category = "Lab Report",
  } = route.params || {};

  // Custom function to return dynamic icons based on the document's file extension type
  const renderFileTypeIcon = (type: string) => {
    const formattedType = type.toLowerCase();
    if (formattedType === "pdf") {
      return <FontAwesome5 name="file-pdf" size={32} color="#ef4444" />;
    } else if (["jpg", "jpeg", "png"].includes(formattedType)) {
      return <FontAwesome5 name="file-image" size={32} color="#3b82f6" />;
    } else {
      return <FontAwesome5 name="file-alt" size={32} color="#64748b" />;
    }
  };

  // Aesthetic color profile configuration for matching dark/light themes cleanly
  const gradientColors = isDark
    ? ["#3b0764", "#1e1b4b"]
    : ["#a855f7", "#6366f1"];

  return (
    <Container isDark={isDark}>
      <StatusBar style={isDark ? "light" : "dark"} />

      <ContentBody
        contentContainerStyle={{ alignItems: "center" }}
        bounces={false}
      >
        {/* --- CELEBRATORY VISUAL SECTION --- */}
        <AnimationContainer>
          {/* Replace this static image source string with your customized local confetti or celebration GIF asset path */}
          <SuccessGif
            source={{
              uri: "https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3Z0cm03bW00M3E0dG1idXNyeGNpbnZpZGs1MTRwZHpxbms0bTRmYiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/C21GGDOpKT6Z4VuXyn/giphy.gif",
            }}
            resizeMode="contain"
          />
        </AnimationContainer>

        <StatusHeading>Upload Successful!</StatusHeading>
        <StatusSubheading>
          Your document has been uploaded successfully.
        </StatusSubheading>

        {/* --- METADATA METRIC CARD CONTAINER --- */}
        <DocumentCard
          isDark={isDark}
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.05,
            shadowRadius: 12,
            elevation: 3,
          }}
        >
          {/* Document File Core Details Row Header Layout */}
          <FileDetailsHeaderRow>
            <IconBadgeWrapper type={fileType}>
              {renderFileTypeIcon(fileType)}
            </IconBadgeWrapper>
            <FileTextMetaDataColumn>
              <DocumentTitle numberOfLines={1} isDark={isDark}>
                {documentName}
              </DocumentTitle>
              <DocumentSizeText>{fileSize}</DocumentSizeText>
            </FileTextMetaDataColumn>
          </FileDetailsHeaderRow>

          <CardDivider isDark={isDark} />

          {/* Row Field Component Item: Upload Date Info */}
          <MetaFieldItemRow>
            <Ionicons name="calendar-outline" size={20} color="#94a3b8" />
            <MetaFieldLabel numberOfLines={1}>
              Uploaded on {uploadedAt}
            </MetaFieldLabel>
          </MetaFieldItemRow>

          {/* Row Field Component Item: Classification Category Info */}
          <MetaFieldItemRow style={{ marginTop: 14 }}>
            <Ionicons name="folder-outline" size={20} color="#94a3b8" />
            <MetaFieldLabel numberOfLines={1}>{category}</MetaFieldLabel>
          </MetaFieldItemRow>
        </DocumentCard>
      </ContentBody>

      {/* --- FLOATING DISMISS BUTTON WORKFLOW --- */}
      <BottomActionArea>
        <TouchableOpacityAction
          onPress={() => {
            navigation.navigate("DocumentStack", {
              screen: "DocumentList",
              params: { category: category },
            });
          }}
          activeOpacity={0.85}
        >
          <ButtonGradient
            colors={gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <ButtonLabelText>View My Documents</ButtonLabelText>
          </ButtonGradient>
        </TouchableOpacityAction>
      </BottomActionArea>
    </Container>
  );
};

export default UploadSuccessScreen;

// --- Styled Components Structural Setup ---

const Container = styled.View<{ isDark: boolean }>`
  flex: 1;
  background-color: ${({ isDark }: { isDark: boolean }) =>
    isDark ? "#0f172a" : "#ffffff"};
`;

const ContentBody = styled.ScrollView`
  flex: 1;
  padding-horizontal: 24px;
`;

const AnimationContainer = styled.View`
  width: 100%;
  height: 200px;
  margin-top: 60px;
  justify-content: center;
  align-items: center;
`;

const SuccessGif = styled.Image`
  width: 180px;
  height: 180px;
`;

const StatusHeading = styled.Text`
  font-size: 24px;
  font-weight: 700;
  color: #1e293b;
  text-align: center;
  margin-top: 10px;
`;

const StatusSubheading = styled.Text`
  font-size: 15px;
  color: #64748b;
  text-align: center;
  margin-top: 8px;
  line-height: 22px;
  padding-horizontal: 20px;
`;

const DocumentCard = styled.View<{ isDark: boolean }>`
  width: 100%;
  background-color: ${({ isDark }: { isDark: boolean }) =>
    isDark ? "#1e293b" : "#ffffff"};
  border-radius: 20px;
  border-width: 1px;
  border-color: ${({ isDark }: { isDark: boolean }) =>
    isDark ? "#334155" : "#e2e8f0"};
  padding: 20px;
  margin-top: 35px;
`;

const FileDetailsHeaderRow = styled.View`
  flex-direction: row;
  align-items: center;
`;

const IconBadgeWrapper = styled.View<{ type: string }>`
  width: 54px;
  height: 54px;
  border-radius: 14px;
  background-color: ${({ type }: { type: string }) =>
    type.toLowerCase() === "pdf" ? "#fef2f2" : "#eff6ff"};
  justify-content: center;
  align-items: center;
`;

const FileTextMetaDataColumn = styled.View`
  flex: 1;
  margin-left: 16px;
`;

const DocumentTitle = styled.Text<{ isDark: boolean }>`
  font-size: 16px;
  font-weight: 700;
  color: ${({ isDark }: { isDark: boolean }) =>
    isDark ? "#f1f5f9" : "#0f172a"};
`;

const DocumentSizeText = styled.Text`
  font-size: 13px;
  color: #94a3b8;
  margin-top: 4px;
  font-weight: 500;
`;

const CardDivider = styled.View<{ isDark: boolean }>`
  height: 1px;
  background-color: ${({ isDark }: { isDark: boolean }) =>
    isDark ? "#334155" : "#f1f5f9"};
  margin-vertical: 18px;
`;

const MetaFieldItemRow = styled.View`
  flex-direction: row;
  align-items: center;
`;

const MetaFieldLabel = styled.Text`
  font-size: 14px;
  color: #475569;
  font-weight: 500;
  margin-left: 12px;
  flex: 1;
`;

const BottomActionArea = styled.View`
  padding: 24px;
  background-color: transparent;
`;

const TouchableOpacityAction = styled.TouchableOpacity`
  width: 100%;
  height: 54px;
  border-radius: 16px;
  overflow: hidden;
`;

const ButtonGradient = styled(LinearGradient)`
  flex: 1;
  justify-content: center;
  align-items: center;
`;

const ButtonLabelText = styled.Text`
  color: #ffffff;
  font-size: 16px;
  font-weight: 700;
`;
