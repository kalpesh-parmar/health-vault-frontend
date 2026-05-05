import React, {
  useRef,
  useState,
  useEffect,
} from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
} from "react-native";
import styled from "styled-components/native";
import EmptyContent from "../shared/EmptyContent";
import ScreenHeader from "../shared/Header";
import DocumentCard, { MedicalDocument } from "./DocumentCard";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import BottomSheet from "../shared/BottomSheet";
import { documentListpaginated } from "../../services/authService";
import { useDocumentMedia } from "../../hooks/useDocumentMedia";
import { CameraView } from "expo-camera";
import { useQuery } from "@tanstack/react-query";
import { RouteProp, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { AppStackParamList, DocumentsStackParamList } from "../../navigation/types";
import ModernLoader from "../shared/Loader";
import { useAppTheme } from "../../context/ThemeContext";

const PAGE_SIZE = 7;

type DocumentListRouteProp = RouteProp<DocumentsStackParamList, "DocumentList">;
type Props = { route: DocumentListRouteProp };

const DocumentList = ({ route }: Props) => {
  const category = route.params?.category;

  const refRBSheet = useRef<BottomSheetModal>(null);
  const cameraRef = useRef<any>(null);
  const [page, setPage] = useState(1);

  const {
    isCameraVisible,
    setIsCameraVisible,
    handleGalleryPick,
    handleOpenCamera,
    takePicture,
    isCapturing,
  } = useDocumentMedia();
  const { isDark } = useAppTheme();

  const { data: documentListData, isFetching } = useQuery({
    queryKey: ["documents", { category, page }],
    queryFn: () => documentListpaginated({ activeCategory: category, page, pageLimit: PAGE_SIZE }),
  });

  const documents: MedicalDocument[] = documentListData?.data || [];
  const totalCount: number = documents.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const hasNext = page < totalPages;
  const hasPrev = page > 1;

  const renderItem = ({ item }: { item: MedicalDocument }) => (
    <DocumentCard document={item} />
  );

  return (
    <Container>
      {isCapturing && <ModernLoader visible={isCapturing} />}

      <HeaderBand>
        <ScreenHeader title="Documents" showBack />
        <HeaderContent>
          <HeaderTitle>Your Health Records</HeaderTitle>
        </HeaderContent>
      </HeaderBand>

      {isCameraVisible && (
        <Modal visible={isCameraVisible} animationType="slide" presentationStyle="fullScreen">
          <CameraContainer style={{ opacity: isCapturing ? 0.8 : 1 }}>
            <CameraView ref={cameraRef} facing="back" style={{ flex: 1 }}>
              <CameraControls>
                <CloseBtn onPress={() => setIsCameraVisible(false)}>
                  <Ionicons name="close" size={28} color="white" />
                </CloseBtn>
                <CaptureBtn onPress={async () => await takePicture(cameraRef)}>
                  <CaptureInner />
                </CaptureBtn>
              </CameraControls>
            </CameraView>
          </CameraContainer>
        </Modal>
      )}

      <FlatList
        data={documents}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 14,
          paddingBottom: 20,
          paddingTop: 0,
          flexGrow: 1,
        }}
        ListHeaderComponent={
          <SectionLabel>
            <SectionLabelText>Recent</SectionLabelText>
            {totalCount > 0 && (
              <SectionCount>{totalCount} total</SectionCount>
            )}
          </SectionLabel>
        }
        ListEmptyComponent={
          isFetching ? (
            <EmptyStateWrapper>
              <ActivityIndicator size="large" color="#2563eb" />
              <EmptySubText>Loading documents...</EmptySubText>
            </EmptyStateWrapper>
          ) : (
            <EmptyStateWrapper>
              <EmptyContent />
              <EmptySubText>No documents yet. Add your first record.</EmptySubText>
            </EmptyStateWrapper>
          )
        }
        ListFooterComponent={
          documents.length >= PAGE_SIZE ? (
            <PaginationRow>
              <PageNavButton
                onPress={() => setPage((p) => p - 1)}
                disabled={!hasPrev || isFetching}
                isDisabled={!hasPrev || isFetching}
                isDark={isDark}
              >
                <MaterialCommunityIcons
                  name="chevron-left"
                  size={20}
                  color={!hasPrev || isFetching ? (isDark ? "#475569" : "#94a3b8") : (isDark ? "#60a5fa" : "#2563eb")}
                />
                <PageNavText isDisabled={!hasPrev || isFetching}>Prev</PageNavText>
              </PageNavButton>

              <PageIndicator>
                {isFetching ? (
                  <ActivityIndicator size="small" color="#2563eb" />
                ) : (
                  <PageIndicatorText>{page} / {totalPages}</PageIndicatorText>
                )}
              </PageIndicator>

              <PageNavButton
                onPress={() => setPage((p) => p + 1)}
                disabled={!hasNext || isFetching}
                isDisabled={!hasNext || isFetching}
                isDark={isDark}
              >
                <PageNavText isDisabled={!hasNext || isFetching}>Next</PageNavText>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={20}
                  color={!hasNext || isFetching ? (isDark ? "#475569" : "#94a3b8") : (isDark ? "#60a5fa" : "#2563eb")}
                />
              </PageNavButton>
            </PaginationRow>
          ) : null
        }
      />

      <FABWrapper>
        <FABButton onPress={() => refRBSheet.current?.present()}>
          <MaterialCommunityIcons name="plus" size={30} color="white" />
        </FABButton>
      </FABWrapper>

      <BottomSheet ref={refRBSheet}>
        <SheetContentWrapper>
          <SheetTitle>Add Document</SheetTitle>
          <SheetSubtitle>Securely upload or capture your record</SheetSubtitle>
          <SheetButtonsContainer>
            <SheetActionButton
              onPress={() => handleGalleryPick(() => refRBSheet?.current?.dismiss())}
            >
              <IconWrapper style={{ backgroundColor: isDark ? "#1e3a8a" : "#eff6ff" }}>
                <MaterialCommunityIcons name="image-plus" size={28} color="#3b82f6" />
              </IconWrapper>
              <SheetActionButtonText>Gallery</SheetActionButtonText>
            </SheetActionButton>
            <SheetActionButton
              onPress={() => handleOpenCamera(() => refRBSheet?.current?.dismiss())}
            >
              <IconWrapper style={{ backgroundColor: isDark ? "#14532d" : "#f0fdf4" }}>
                <MaterialCommunityIcons name="camera-plus" size={28} color="#22c55e" />
              </IconWrapper>
              <SheetActionButtonText>Camera</SheetActionButtonText>
            </SheetActionButton>
          </SheetButtonsContainer>
        </SheetContentWrapper>
      </BottomSheet>
    </Container>
  );
};

export default DocumentList;

const Container = styled.View`
  flex: 1;
  background-color: ${({ theme }: any) => theme.colors.surfaceLight};
`;

const HeaderBand = styled.View`
  margin-bottom: 12px;
`;

const HeaderContent = styled.View`
  padding: 8px 20px 0;
`;

const HeaderTitle = styled.Text`
  font-size: 26px;
  font-weight: 800;
  color: ${({ theme }: any) => theme.colors.textPrimary};
  margin-top: 13px;
`;

const SectionLabel = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
`;

const SectionLabelText = styled.Text`
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }: any) => theme.colors.textPrimary};
  padding-left: 13px;
`;

const SectionCount = styled.Text`
  font-size: 12px;
  color: ${({ theme }: any) => theme.colors.primary};
  font-weight: 600;
  padding-right: 4px;
`;

const PaginationRow = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: center;
  padding-vertical: 20px;
  gap: 16px;
`;

const PageNavButton = styled.TouchableOpacity<{ isDisabled: boolean; isDark: boolean }>`
  flex-direction: row;
  align-items: center;
  gap: 4px;
  background-color: ${({ isDisabled, isDark, theme }: any) => 
    isDisabled ? (isDark ? "#334155" : "#f1f5f9") : theme.colors.iconBox};
  border-width: 1.5px;
  border-color: ${({ isDisabled, isDark, theme }: any) => 
    isDisabled ? (isDark ? "#475569" : "#e2e8f0") : theme.colors.border};
  border-radius: 20px;
  padding-horizontal: 16px;
  padding-vertical: 9px;
`;

const PageNavText = styled.Text<{ isDisabled: boolean }>`
  font-size: 13px;
  font-weight: 700;
  color: ${({ isDisabled, theme }: any) => (isDisabled ? theme.colors.textMuted : theme.colors.primary)};
`;

const PageIndicator = styled.View`
  width: 60px;
  align-items: center;
  justify-content: center;
`;

const PageIndicatorText = styled.Text`
  font-size: 13px;
  font-weight: 700;
  color: ${({ theme }: any) => theme.colors.textPrimary};
`;

const EmptyStateWrapper = styled.View`
  flex: 1;
  justify-content: center;
  align-items: center;
  padding: 40px 20px;
`;

const EmptySubText = styled.Text`
  margin-top: 8px;
  font-size: 13px;
  color: ${({ theme }: any) => theme.colors.textMuted};
  text-align: center;
`;

const FABWrapper = styled.View`
  position: absolute;
  top: 60px;
  right: 25px;
`;

const FABButton = styled.TouchableOpacity`
  width: 65px;
  height: 65px;
  border-radius: 24px;
  background-color: ${({ theme }: any) => theme.colors.primary};
  justify-content: center;
  align-items: center;
  shadow-color: ${({ theme }: any) => theme.colors.primary};
  shadow-opacity: 0.4;
  shadow-radius: 20px;
  elevation: 12;
`;

const SheetContentWrapper = styled.View`
  padding: 25px 20px;
  align-items: center;
`;

const SheetTitle = styled.Text`
  font-size: 22px;
  font-weight: 800;
  color: ${({ theme }: any) => theme.colors.textPrimary};
`;

const SheetSubtitle = styled.Text`
  font-size: 14px;
  color: ${({ theme }: any) => theme.colors.textMuted};
  margin-top: 6px;
  margin-bottom: 30px;
  text-align: center;
`;

const SheetButtonsContainer = styled.View`
  flex-direction: row;
  justify-content: space-evenly;
  width: 100%;
`;

const SheetActionButton = styled.TouchableOpacity`
  align-items: center;
  width: 100px;
  background-color: ${({ theme }: any) => theme.colors.surface};
  padding: 16px;
  border-radius: 20px;
  shadow-color: #000;
  shadow-opacity: 0.05;
  shadow-radius: 10px;
  elevation: 3;
`;

const IconWrapper = styled.View`
  width: 30px;
  height: 30px;
  border-radius: 20px;
  justify-content: center;
  align-items: center;
  margin-bottom: 12px;
`;

const SheetActionButtonText = styled.Text`
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }: any) => theme.colors.textPrimary};
`;

const CameraContainer = styled.View`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: black;
  z-index: 9000;
`;

const CameraControls = styled.View`
  flex: 1;
  justify-content: flex-end;
  padding-bottom: 50px;
`;

const CloseBtn = styled.TouchableOpacity`
  position: absolute;
  top: 50px;
  right: 20px;
  background-color: rgba(0, 0, 0, 0.6);
  padding: 12px;
  border-radius: 30px;
`;

const CaptureBtn = styled.TouchableOpacity`
  align-self: center;
  width: 85px;
  height: 85px;
  border-radius: 45px;
  border-width: 6px;
  border-color: rgba(255, 255, 255, 0.4);
  padding: 6px;
`;

const CaptureInner = styled.View`
  flex: 1;
  background-color: white;
  border-radius: 35px;
`;