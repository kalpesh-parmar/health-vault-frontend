import React, { useEffect, useRef } from "react";
import styled from "styled-components/native";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import {
  useNavigation,
  useRoute,
  RouteProp,
} from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Animated, Easing } from "react-native";
import LottieView from "lottie-react-native";

import { AppStackParamList } from "../../navigation/types";

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

  const {
    documentName = "Blood Test Report.pdf",
    fileSize = "2.45 MB",
    fileType = "pdf",
    uploadedAt = "20 May 2026, 10:30 AM",
    category = "Lab Report",
  } = route.params || {};

  const scaleAnim = useRef(new Animated.Value(0.7)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        tension: 80,
        useNativeDriver: true,
      }),

      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const renderFileTypeIcon = (type: string) => {
    const formattedType = type.toLowerCase();

    if (formattedType === "pdf") {
      return (
        <FontAwesome5
          name="file-pdf"
          size={32}
          color="#ef4444"
        />
      );
    }

    if (["jpg", "jpeg", "png"].includes(formattedType)) {
      return (
        <FontAwesome5
          name="file-image"
          size={32}
          color="#3b82f6"
        />
      );
    }

    return (
      <FontAwesome5
        name="file-alt"
        size={32}
        color="#64748b"
      />
    );
  };

  return (
    <Container>
      <StatusBar style="dark" />

      <ContentBody
        contentContainerStyle={{
          alignItems: "center",
          paddingBottom: 30,
        }}
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        <AnimationContainer>
          <ConfettiAnimation
            source={"../../../assets/success.json"}
            autoPlay
            loop={false}
          />

          <AnimatedCircle
            style={{
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim,
            }}
          >
            <GlowCircle />

            <Ionicons
              name="checkmark"
              size={72}
              color="#ffffff"
            />
          </AnimatedCircle>
        </AnimationContainer>

        <StatusHeading>
          Upload Successful!
        </StatusHeading>

        <StatusSubheading>
          Your document has been uploaded successfully and securely stored.
        </StatusSubheading>

        <DocumentCard
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.08,
            shadowRadius: 14,
            elevation: 5,
          }}
        >
          <FileDetailsHeaderRow>
            <IconBadgeWrapper type={fileType}>
              {renderFileTypeIcon(fileType)}
            </IconBadgeWrapper>

            <FileTextMetaDataColumn>
              <DocumentTitle numberOfLines={1}>
                {documentName}
              </DocumentTitle>

              <DocumentSizeText>
                {fileSize}
              </DocumentSizeText>
            </FileTextMetaDataColumn>
          </FileDetailsHeaderRow>

          <CardDivider />

          <MetaFieldItemRow>
            <Ionicons
              name="calendar-outline"
              size={20}
              color="#94a3b8"
            />

            <MetaFieldLabel>
              Uploaded on {uploadedAt}
            </MetaFieldLabel>
          </MetaFieldItemRow>

          <MetaFieldItemRow style={{ marginTop: 14 }}>
            <Ionicons
              name="folder-outline"
              size={20}
              color="#94a3b8"
            />

            <MetaFieldLabel>
              {category}
            </MetaFieldLabel>
          </MetaFieldItemRow>
        </DocumentCard>
      </ContentBody>

      <BottomActionArea>
        <TouchableOpacityAction
          activeOpacity={0.9}
          onPress={() => {
            navigation.navigate("DocumentStack", {
              screen: "DocumentList",
              params: {
                category,
              },
            });
          }}
        >
          <ButtonGradient
            colors={["#22c55e", "#16a34a"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <ButtonLabelText>
              View My Documents
            </ButtonLabelText>
          </ButtonGradient>
        </TouchableOpacityAction>
      </BottomActionArea>
    </Container>
  );
};

export default UploadSuccessScreen;

const Container = styled.View`
  flex: 1;
  background-color: #ffffff;
`;

const ContentBody = styled.ScrollView`
  flex: 1;
  padding-horizontal: 24px;
`;

const AnimationContainer = styled.View`
  width: 100%;
  height: 300px;
  margin-top: 30px;
  justify-content: center;
  align-items: center;
`;

const ConfettiAnimation = styled(LottieView)`
  position: absolute;
  width: 340px;
  height: 340px;
`;

const AnimatedCircle = styled(Animated.View)`
  width: 170px;
  height: 170px;
  border-radius: 85px;
  background-color: #22c55e;
  justify-content: center;
  align-items: center;
  shadow-color: #22c55e;
  shadow-offset: 0px 12px;
  shadow-opacity: 0.45;
  shadow-radius: 20px;
  elevation: 12;
`;

const GlowCircle = styled.View`
  position: absolute;
  width: 220px;
  height: 220px;
  border-radius: 110px;
  background-color: rgba(34, 197, 94, 0.15);
`;

const StatusHeading = styled.Text`
  font-size: 28px;
  font-weight: 800;
  color: #0f172a;
  text-align: center;
  margin-top: 10px;
`;

const StatusSubheading = styled.Text`
  font-size: 15px;
  color: #64748b;
  text-align: center;
  margin-top: 10px;
  line-height: 24px;
  padding-horizontal: 20px;
`;

const DocumentCard = styled.View`
  width: 100%;
  background-color: #ffffff;
  border-radius: 24px;
  border-width: 1px;
  border-color: #e2e8f0;
  padding: 22px;
  margin-top: 40px;
`;

const FileDetailsHeaderRow = styled.View`
  flex-direction: row;
  align-items: center;
`;

const IconBadgeWrapper = styled.View<{ type: string }>`
  width: 58px;
  height: 58px;
  border-radius: 16px;
  background-color: ${({ type }: {type: string}) =>
    type.toLowerCase() === "pdf"
      ? "#fef2f2"
      : "#eff6ff"};
  justify-content: center;
  align-items: center;
`;

const FileTextMetaDataColumn = styled.View`
  flex: 1;
  margin-left: 16px;
`;

const DocumentTitle = styled.Text`
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
`;

const DocumentSizeText = styled.Text`
  font-size: 13px;
  color: #94a3b8;
  margin-top: 5px;
  font-weight: 500;
`;

const CardDivider = styled.View`
  height: 1px;
  background-color: #f1f5f9;
  margin-vertical: 20px;
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
`;

const TouchableOpacityAction = styled.TouchableOpacity`
  width: 100%;
  height: 56px;
  border-radius: 18px;
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