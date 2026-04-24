import {
  FlatList,
  LayoutChangeEvent,
  ListRenderItem,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from "react-native";
import styled from "styled-components/native";
import React, { useState } from "react";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import DualButtons from "./Buttons/DualButtons";
import Loader from "./Loader";

interface ImagePreviewProps {
  images: string[];
  isVisible: boolean;
  setIsVisible: (modal: boolean) => void;
  onRetake: () => void;
  onSave: (fileName: string, category: string, images: string[]) => void;
  retakeLabel?: string;
  isPending: boolean;
}

const ImagePreview = ({
  images,
  isVisible,
  setIsVisible,
  onRetake,
  onSave,
  retakeLabel = "Retake",
  isPending
}: ImagePreviewProps) => {
  if (!images || images.length === 0) return null;

  const [showInput, setShowInput] = useState<boolean>(false);
  const [fileName, setFileName] = useState("");
  const [category, setCategory] = useState("");
  const [error, setError] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [width, setWidth] = useState(0);

  const handleLayout = (event: LayoutChangeEvent) => {
    setWidth(event.nativeEvent.layout.width);
  };

  const handleMomentumScrollEnd = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {
    const index = Math.round(
      event.nativeEvent.contentOffset.x /
        event.nativeEvent.layoutMeasurement.width,
    );
    setCurrentIndex(index);
  };

  const renderImage: ListRenderItem<string> = ({ item }) => (
    <ImageWrapper style={{ width }}>
      <PreviewImage source={{ uri: item }} resizeMode="contain" />
    </ImageWrapper>
  );

  const resetPreviewState = () => {
    setShowInput(false);
    setFileName("");
    setCategory("");
    setError("");
  };

  return (
    <>

    {isPending && <Loader visible={isVisible} />}
      <Modal visible={isVisible} animationType="fade" transparent={false}>
        <Container>
          <CloseBtn
            onPress={() => {
              setIsVisible(false);
              resetPreviewState();
              setCurrentIndex(0);
            }}
          >
            <Ionicons name="close" size={24} color="black" />
          </CloseBtn>
          <Header>
            <HeaderText>
              Preview ({currentIndex + 1} / {images.length})
            </HeaderText>
          </Header>

          <CenterArea>
            <PreviewContainer onLayout={handleLayout}>
              <ImagesList<any>
                data={images}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                keyExtractor={(_item: string, index: number) =>
                  index.toString()
                }
                onMomentumScrollEnd={handleMomentumScrollEnd}
                renderItem={renderImage}
              />
            </PreviewContainer>
          </CenterArea>

          <ActionBar>
            <SecondaryButton
              onPress={() => {
                setCurrentIndex(0);
                onRetake();
              }}
            >
              <MaterialCommunityIcons
                name="camera-retake"
                size={18}
                color="#cbd5f5"
              />
              <SecondaryText>{retakeLabel}</SecondaryText>
            </SecondaryButton>

            <PrimaryButton
              onPress={() => {
                setShowInput(true);
              }}
            >
              <MaterialCommunityIcons name="check" size={20} color="#fff" />
              <PrimaryText style={{ color: "white" }}>Save</PrimaryText>
            </PrimaryButton>
          </ActionBar>

          {showInput && (
            <InputOverlay>
              <InputBox>
                <InputLabel>Enter File Name</InputLabel>

                <FileInput
                  value={fileName}
                  placeholder="E.G :- my_scan"
                  placeholderTextColor="#000000"
                  cursorColor="black"
                  onChangeText={(text: string) => {
                    setFileName(text);
                    setError("");
                    if (!text) setError("Filename is required.");
                  }}
                  autoFocus
                />
                {error && <PrimaryText>Filename is required.</PrimaryText>}

                <InputLabel>Enter Category</InputLabel>
                <FileInput
                  value={category}
                  placeholder="Family, Insurance, Medication, Medical Documents, Others"
                  placeholderTextColor="#000000"
                  cursorColor="black"
                  onChangeText={(text: string) => {
                    setCategory(text);
                    setError("");
                    if (!text) setError("Category is required.");
                  }}
                />
                {error && <PrimaryText>Category is required.</PrimaryText>}

                <DualButtons
                  secondaryBtnText="Cancel"
                  secondaryBtnColor="black"
                  mainBtnText="Save"
                  mainBtnColor="#2563eb"
                  onSecondaryPress={() => {
                    setShowInput(false);
                    setFileName("");
                    setError("");
                  }}
                  onMainPress={() => {
                    if (!fileName?.trim()) {
                      setError("Filename is required.");
                    } else if (!category?.trim()) {
                      setError("Category is required.");
                    } else {
                      onSave(fileName.trim(), category.trim(), images);
                      resetPreviewState();
                    }
                  }}
                />
              </InputBox>
            </InputOverlay>
          )}
        </Container>
      </Modal>
    </>
  );
};

export default ImagePreview;

const Container = styled.View`
  flex: 1;
  background-color: #020617; /* deeper black for premium feel */
`;

const CloseBtn = styled.TouchableOpacity`
  position: absolute;
  top: 60px;
  right: 20px;
  height: 40px;
  width: 40px;
  border-radius: 20px;
  background-color: rgba(255, 255, 255, 0.9);
  justify-content: center;
  align-items: center;
  z-index: 100;
`;

const Header = styled.View`
  position: absolute;
  top: 60px;
  width: 100%;
  align-items: center;
  z-index: 10;
`;

const HeaderText = styled.Text`
  color: #e2e8f0;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 1px;
`;

const CenterArea = styled.View`
  flex: 1;
  justify-content: center;
  align-items: center;
`;

const PreviewContainer = styled.View`
  width: 95%;
  height: 70%;
  border-radius: 20px;
  overflow: hidden;
  background-color: #020617;
  border: 2px solid white;
  shadow-color: #000;
  shadow-opacity: 0.4;
  shadow-radius: 10px;
  elevation: 10;
`;

const ImagesList = styled.FlatList`
  flex: 1;
`;

const ImageWrapper = styled.View`
  flex: 1;
  padding: 30px;
`;

const PreviewImage = styled.Image`
  width: 100%;
  height: 100%;
`;

const ActionBar = styled.View`
  position: absolute;
  bottom: 25px;
  left: 20px;
  right: 20px;
  flex-direction: row;
  gap: 12px;
  background-color: rgba(15, 23, 42, 0.85);
  padding: 12px;
  border-radius: 20px;
`;

const SecondaryButton = styled.TouchableOpacity`
  flex: 1;
  height: 52px;
  border-radius: 16px;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  background-color: rgba(255, 255, 255, 0.06);
`;

const SecondaryText = styled.Text`
  color: #cbd5f5;
  font-weight: 600;
  margin-left: 6px;
`;

const PrimaryButton = styled.TouchableOpacity`
  flex: 1;
  height: 52px;
  border-radius: 16px;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  background-color: #2563eb;
  shadow-color: #2563eb;
  shadow-opacity: 0.5;
  shadow-radius: 12px;
  elevation: 6;
`;

const PrimaryText = styled.Text`
  color: black;
  font-weight: 700;
  margin-left: 6px;
`;

const InputOverlay = styled.View`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(2, 6, 23, 0.7);
  justify-content: center;
  align-items: center;
  elevation: 100000;
`;

const InputBox = styled.View`
  width: 85%;
  background-color: #ffffff;
  border-radius: 20px;
  padding: 20px;
`;

const InputLabel = styled.Text`
  color: #000;
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 10px;
`;

const FileInput = styled.TextInput`
  background-color: #bcbfd0;
  border-radius: 12px;
  padding: 12px;
  color: white;
`;
