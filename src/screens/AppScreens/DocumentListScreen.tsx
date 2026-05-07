import React, { useRef, useState, useCallback } from "react";
import { ActivityIndicator, FlatList } from "react-native";
import styled from "styled-components/native";
import EmptyContent from "../../components/shared/EmptyContent";
import ScreenHeader from "../../components/shared/Header";
import DocumentCard from "../../components/Documents/DocumentCard";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import BottomSheet from "../../components/shared/BottomSheet";
import { documentListPaginated } from "../../services/documentService";
import { useDocumentMedia } from "../../hooks/useDocumentMedia";
import { useQuery } from "@tanstack/react-query";
import { RouteProp } from "@react-navigation/native";
import { DocumentsStackParamList } from "../../navigation/types";
import ModernLoader from "../../components/shared/Loader";
import { useAppTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/ContextAPI";
import CameraModal from "../../components/shared/CameraModal";
import AddDocumentSheet from "../../components/shared/AddDocumentSheet";
import type { MedicalDocument } from "../../types";

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

  const { userId } = useAuth();

  const { data: documentListData, isFetching } = useQuery({
    queryKey: ["documents", userId, category, page],
    queryFn: () =>
      documentListPaginated({
        activeCategory: category,
        page,
        pageLimit: PAGE_SIZE,
      }),
    enabled: !!userId,
  });

  const documents: MedicalDocument[] = documentListData?.data || [];
  const totalCount: number = documents.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const hasNext = page < totalPages;
  const hasPrev = page > 1;

  const renderItem = useCallback(
    ({ item }: { item: MedicalDocument }) => <DocumentCard document={item} />,
    [],
  );

  const keyExtractor = useCallback((item: MedicalDocument) => item.id, []);

  const handleGalleryPickSheet = useCallback(() => {
    handleGalleryPick(() => refRBSheet?.current?.dismiss());
  }, [handleGalleryPick]);

  const handleCameraOpenSheet = useCallback(() => {
    handleOpenCamera(() => refRBSheet?.current?.dismiss());
  }, [handleOpenCamera]);

  return (
    <Container>
      {isCapturing && <ModernLoader visible={isCapturing} />}

      <HeaderBand>
        <ScreenHeader title="Documents" showBack />
        <HeaderContent>
          <HeaderTitle>Your Health Records</HeaderTitle>
        </HeaderContent>
      </HeaderBand>

      <CameraModal
        visible={isCameraVisible}
        onClose={() => setIsCameraVisible(false)}
        onCapture={takePicture}
        isCapturing={isCapturing}
        cameraRef={cameraRef}
      />

      <FlatList
        data={documents}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
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
            {totalCount > 0 && <SectionCount>{totalCount} total</SectionCount>}
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
              <EmptySubText>
                No documents yet. Add your first record.
              </EmptySubText>
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
                  color={
                    !hasPrev || isFetching
                      ? isDark
                        ? "#475569"
                        : "#94a3b8"
                      : isDark
                        ? "#60a5fa"
                        : "#2563eb"
                  }
                />
                <PageNavText isDisabled={!hasPrev || isFetching}>
                  Prev
                </PageNavText>
              </PageNavButton>

              <PageIndicator>
                {isFetching ? (
                  <ActivityIndicator size="small" color="#2563eb" />
                ) : (
                  <PageIndicatorText>
                    {page} / {totalPages}
                  </PageIndicatorText>
                )}
              </PageIndicator>

              <PageNavButton
                onPress={() => setPage((p) => p + 1)}
                disabled={!hasNext || isFetching}
                isDisabled={!hasNext || isFetching}
                isDark={isDark}
              >
                <PageNavText isDisabled={!hasNext || isFetching}>
                  Next
                </PageNavText>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={20}
                  color={
                    !hasNext || isFetching
                      ? isDark
                        ? "#475569"
                        : "#94a3b8"
                      : isDark
                        ? "#60a5fa"
                        : "#2563eb"
                  }
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
        <AddDocumentSheet
          onGalleryPick={handleGalleryPickSheet}
          onCameraOpen={handleCameraOpenSheet}
        />
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
  margin-top: 20px;
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

const PageNavButton = styled.TouchableOpacity<{
  isDisabled: boolean;
  isDark: boolean;
}>`
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
  color: ${({ isDisabled, theme }: any) =>
    isDisabled ? theme.colors.textMuted : theme.colors.primary};
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
  top: 114px;
  right: 20px;
`;

const FABButton = styled.TouchableOpacity`
  width: 50px;
  height: 50px;
  border-radius: 25px;
  background-color: ${({ theme }: any) => theme.colors.primary};
  justify-content: center;
  align-items: center;
  shadow-color: ${({ theme }: any) => theme.colors.primary};
  shadow-opacity: 0.4;
  shadow-radius: 20px;
  elevation: 12;
`;
