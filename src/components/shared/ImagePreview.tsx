import React, { useState } from "react";
import { ActivityIndicator, Dimensions, StatusBar } from "react-native";
import styled from "styled-components/native";
import { RouteProp, useNavigation } from "@react-navigation/native";
import { AppStackParamList } from "../../navigation/types";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import ScreenHeader from "./Header";
import { useAppTheme } from "../../context/ThemeContext";

type Props = {
  route: RouteProp<AppStackParamList, "ImagePreview">;
};

const { height } = Dimensions.get("window");

const ImagePreviewScreen = ({ route }: Props) => {
  const { images } = route.params;
  const navigation =
    useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const [loading, setLoading] = useState(false);
  const { isDark, theme } = useAppTheme();

  const handleProceed = async () => {
    try {
      setLoading(true);

      // 👉 Call OCR API
      // const response = await callOCRApi(images[0]);
      // assume it returns { summary: string }

      navigation.navigate("SaveDocument", {
        images,
        aiSummary: "response-summary",
      });
    } catch (err) {
      console.error("OCR Error:", err);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={theme.colors.background} />
      <ScreenHeader title="Image Preview" showBack={true} />
      <Container>
        <Container style={{ paddingTop: 84 }}>
          <ImageWrapper>
            <PreviewImage source={{ uri: images || "" }} resizeMode="cover" />
          </ImageWrapper>
        </Container>
        <Label>
          1 Image Selected
        </Label>

        <ActionArea>
          {loading ? (
            <LoadingWrapper>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <LoadingText>Analysing document…</LoadingText>
            </LoadingWrapper>
          ) : (
            <ProceedButton onPress={handleProceed} activeOpacity={0.85}>
              <ProceedButtonText>Proceed</ProceedButtonText>
              <ArrowIcon>
                <ArrowText>→</ArrowText>
              </ArrowIcon>
            </ProceedButton>
          )}
        </ActionArea>
      </Container>
    </>
  );
};

export default ImagePreviewScreen;

const Container = styled.View`
  flex: 1;
  background-color: ${({ theme }: any) => theme.colors.background};
`;

const ImageWrapper = styled.View`
  margin: 20px;
  justify-content: center;
  align-items: center;
  border-radius: 16px;
  overflow: hidden;
  shadow-color: #000;
  shadow-offset: 0px 8px;
  shadow-opacity: 0.1;
  shadow-radius: 20px;
  elevation: 10;
`;

const PreviewImage = styled.Image`
  width: 100%;
  height: ${height * 0.52}px;
  background-color: #f0f0f0;
`;

const Label = styled.Text`
  position: absolute;
  top: 10%;
  left: 31.5%;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: ${({ theme }: any) => theme.colors.textMuted};
`;

const ActionArea = styled.View`
  position: absolute;
  bottom: 40px;
  left: 20px;
  right: 20px;
`;

const ProceedButton = styled.TouchableOpacity`
  flex-direction: row;
  align-items: center;
  justify-content: center;
  background-color: ${({ theme }: any) => theme.colors.textPrimary};
  border-radius: 14px;
  padding-vertical: 18px;
  padding-horizontal: 32px;
  gap: 10px;
  shadow-color: #000;
  shadow-offset: 0px 4px;
  shadow-opacity: 0.2;
  shadow-radius: 12px;
  elevation: 8;
`;

const ProceedButtonText = styled.Text`
  font-size: 16px;
  font-weight: 700;
  color: ${({ theme }: any) => theme.colors.background};
  letter-spacing: 0.5px;
`;

const ArrowIcon = styled.View`
  width: 26px;
  height: 26px;
  border-radius: 13px;
  background-color: rgba(255, 255, 255, 0.15);
  align-items: center;
  justify-content: center;
`;

const ArrowText = styled.Text`
  font-size: 14px;
  color: ${({ theme }: any) => theme.colors.background};
  font-weight: 700;
`;

const LoadingWrapper = styled.View`
  align-items: center;
  gap: 12px;
  padding-vertical: 20px;
`;

const LoadingText = styled.Text`
  font-size: 13px;
  color: ${({ theme }: any) => theme.colors.textMuted};
  letter-spacing: 0.5px;
`;
