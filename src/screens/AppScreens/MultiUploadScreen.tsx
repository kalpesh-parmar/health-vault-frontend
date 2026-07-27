import React, { useState, useCallback } from "react";
import {
  ScrollView,
  StatusBar,
  TouchableOpacity,
  Text,
  View,
  ActivityIndicator,
} from "react-native";
import styled from "styled-components/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";

import { useAppNavigation } from "../../types/navigation";
import { useAppTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/ContextAPI";
import { useDocumentMedia, PickedFile } from "../../hooks/useDocumentMedia";
import { uploadPatientDocuments, startOcrJob } from "../../services/documentService";

export const MultiUploadScreen = () => {
  const navigation = useAppNavigation();
  const { isDark, theme } = useAppTheme();
  const { userId } = useAuth();
  const { handleMultiDocumentPick } = useDocumentMedia();

  const [selectedFiles, setSelectedFiles] = useState<PickedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentActionText, setCurrentActionText] = useState("");

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getFileIcon = (mimeType: string, fileName: string) => {
    const ext = fileName.split(".").pop()?.toLowerCase();
    if (mimeType.includes("pdf") || ext === "pdf") {
      return { name: "file-pdf-box", color: "#ef4444" };
    }
    return { name: "file-image", color: "#3b82f6" };
  };

  const handlePickMoreFiles = async () => {
    if (selectedFiles.length >= 5) {
      Toast.show({
        type: "error",
        text1: "Limit Reached",
        text2: "You can select up to 5 documents at a time.",
      });
      return;
    }
    const newFiles = await handleMultiDocumentPick(selectedFiles.length);
    if (newFiles.length > 0) {
      setSelectedFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleStartUpload = async () => {
    if (!userId) {
      Toast.show({
        type: "error",
        text1: "Authentication Error",
        text2: "Patient session not found. Please log in again.",
      });
      return;
    }

    if (selectedFiles.length === 0) {
      Toast.show({
        type: "error",
        text1: "No Files Selected",
        text2: "Please select at least one document to upload.",
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setCurrentActionText("Uploading files to server...");

    try {
      // 1. Upload files
      const uploadRes = await uploadPatientDocuments(
        userId,
        selectedFiles,
        (progressEvent) => {
          if (progressEvent.total) {
            const pct = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(pct);
          }
        },
      );

      const items = uploadRes?.data || [];
      if (!Array.isArray(items) || items.length === 0) {
        throw new Error("Failed to receive document processing records from server.");
      }

      setCurrentActionText("Initiating background OCR jobs...");

      // 2. Start OCR job for each file
      const jobList: { jobId: string; fileName: string; fileKey: string }[] = [];

      for (const item of items) {
        if (item.jobId) {
          try {
            await startOcrJob(item.jobId);
          } catch (err: any) {
            console.warn(`[MultiUpload] Failed to trigger job start for ${item.jobId}:`, err.message);
          }
          jobList.push({
            jobId: item.jobId,
            fileName: item.fileName,
            fileKey: item.fileKey,
          });
        }
      }

      Toast.show({
        type: "success",
        text1: "Upload Complete",
        text2: "Documents uploaded and processing started.",
      });

      // 3. Navigate to DocumentProcessingScreen
      const jobIds = jobList.map((j) => j.jobId);
      navigation.navigate("DocumentProcessing" as any, {
        jobIds,
        filesInfo: jobList,
      });
    } catch (error: any) {
      console.error("[MultiUpload] Upload failed:", error);
      Toast.show({
        type: "error",
        text1: "Upload Failed",
        text2: error.message || "An error occurred while uploading documents.",
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      setCurrentActionText("");
    }
  };

  const gradientColors = isDark
    ? ["#064e3b", "#0369a1", "#312e81"]
    : ["#0f766e", "#0ea5e9", "#4f46e5"];

  return (
    <Container colors={gradientColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
      <StatusBar barStyle="light-content" translucent backgroundColor="rgba(0,0,0,0.2)" />

      <HeaderWrapper edges={["top"]}>
        <HeaderMain>
          <BackButton onPress={() => navigation.goBack()} disabled={isUploading}>
            <Ionicons name="arrow-back" size={28} color="white" />
          </BackButton>
          <HeaderTitle>Upload Documents</HeaderTitle>
        </HeaderMain>
      </HeaderWrapper>

      <ContentContainer>
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
          keyboardShouldPersistTaps="handled"
        >
          <SectionTitle>Select Documents (Max 5)</SectionTitle>
          <SubText>
            Upload up to 5 medical documents (PDF, PNG, JPG, WEBP, TIFF up to 150MB each).
          </SubText>

          {selectedFiles.length === 0 ? (
            <EmptyDropZone onPress={handlePickMoreFiles}>
              <IconCircle>
                <MaterialCommunityIcons name="cloud-upload" size={40} color="#0d9488" />
              </IconCircle>
              <DropZoneTitle>Tap to Select Documents</DropZoneTitle>
              <DropZoneSubtitle>Support PDF and Image formats</DropZoneSubtitle>
            </EmptyDropZone>
          ) : (
            <FileList>
              {selectedFiles.map((file, index) => {
                const iconInfo = getFileIcon(file.type, file.name);
                return (
                  <FileCard key={`${file.name}-${index}`}>
                    <FileIconBox>
                      <MaterialCommunityIcons name={iconInfo.name as any} size={28} color={iconInfo.color} />
                    </FileIconBox>

                    <FileInfo>
                      <FileName numberOfLines={1}>{file.name}</FileName>
                      <FileMeta>
                        {formatFileSize(file.size)} • {file.type.split("/")[1]?.toUpperCase() || "FILE"}
                      </FileMeta>
                    </FileInfo>

                    {!isUploading && (
                      <RemoveButton onPress={() => handleRemoveFile(index)}>
                        <Ionicons name="trash-outline" size={20} color="#ef4444" />
                      </RemoveButton>
                    )}
                  </FileCard>
                );
              })}
            </FileList>
          )}

          {selectedFiles.length > 0 && selectedFiles.length < 5 && !isUploading && (
            <AddMoreButton onPress={handlePickMoreFiles}>
              <Ionicons name="add-circle-outline" size={22} color="#0d9488" />
              <AddMoreText>Add Another Document ({selectedFiles.length}/5)</AddMoreText>
            </AddMoreButton>
          )}

          {isUploading && (
            <ProgressCard>
              <ProgressHeader>
                <ProgressTitle>{currentActionText}</ProgressTitle>
                <ProgressPct>{uploadProgress}%</ProgressPct>
              </ProgressHeader>

              <ProgressBarBackground>
                <ProgressBarFill style={{ width: `${uploadProgress}%` }} />
              </ProgressBarBackground>

              <RowCenter style={{ marginTop: 10 }}>
                <ActivityIndicator size="small" color="#0d9488" />
                <LoaderSubtitle style={{ marginLeft: 8 }}>
                  Processing files, please do not close the app.
                </LoaderSubtitle>
              </RowCenter>
            </ProgressCard>
          )}
        </ScrollView>

        <FooterContainer>
          <SubmitButton
            onPress={handleStartUpload}
            disabled={isUploading || selectedFiles.length === 0}
            activeOpacity={0.8}
            style={{
              opacity: isUploading || selectedFiles.length === 0 ? 0.6 : 1,
            }}
          >
            {isUploading ? (
              <RowCenter>
                <ActivityIndicator color="#ffffff" size="small" style={{ marginRight: 8 }} />
                <SubmitButtonText>Processing...</SubmitButtonText>
              </RowCenter>
            ) : (
              <RowCenter>
                <MaterialCommunityIcons name="lightning-bolt" size={20} color="#ffffff" style={{ marginRight: 6 }} />
                <SubmitButtonText>Upload & Start Processing</SubmitButtonText>
              </RowCenter>
            )}
          </SubmitButton>
        </FooterContainer>
      </ContentContainer>
    </Container>
  );
};

export default MultiUploadScreen;

/* --- Styled Components --- */

const Container = styled(LinearGradient)`
  flex: 1;
`;

const HeaderWrapper = styled(SafeAreaView)`
  background-color: transparent;
  padding-bottom: 12px;
`;

const HeaderMain = styled.View`
  flex-direction: row;
  align-items: center;
  padding-horizontal: 20px;
  height: 50px;
  position: relative;
  justify-content: center;
`;

const BackButton = styled.TouchableOpacity`
  position: absolute;
  left: 20px;
  z-index: 10;
  padding: 5px;
`;

const HeaderTitle = styled.Text`
  font-size: 20px;
  font-weight: 600;
  color: white;
  text-align: center;
`;

const ContentContainer = styled.View`
  flex: 1;
  background-color: #f8fafc;
  border-top-left-radius: 24px;
  border-top-right-radius: 24px;
`;

const SectionTitle = styled.Text`
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 4px;
`;

const SubText = styled.Text`
  font-size: 13px;
  color: #64748b;
  margin-bottom: 20px;
  line-height: 18px;
`;

const EmptyDropZone = styled.TouchableOpacity`
  border-width: 2px;
  border-color: #cbd5e1;
  border-style: dashed;
  border-radius: 16px;
  padding: 36px 20px;
  align-items: center;
  justify-content: center;
  background-color: #ffffff;
  margin-vertical: 10px;
`;

const IconCircle = styled.View`
  width: 64px;
  height: 64px;
  border-radius: 32px;
  background-color: #ccfbf1;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
`;

const DropZoneTitle = styled.Text`
  font-size: 16px;
  font-weight: 700;
  color: #0f766e;
  margin-bottom: 4px;
`;

const DropZoneSubtitle = styled.Text`
  font-size: 12px;
  color: #94a3b8;
`;

const FileList = styled.View`
  margin-bottom: 16px;
`;

const FileCard = styled.View`
  flex-direction: row;
  align-items: center;
  background-color: #ffffff;
  border-radius: 14px;
  padding: 14px 16px;
  margin-bottom: 10px;
  border-width: 1px;
  border-color: #e2e8f0;
  elevation: 1;
  shadow-color: #000;
  shadow-offset: 0px 1px;
  shadow-opacity: 0.05;
  shadow-radius: 4px;
`;

const FileIconBox = styled.View`
  width: 44px;
  height: 44px;
  border-radius: 10px;
  background-color: #f1f5f9;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
`;

const FileInfo = styled.View`
  flex: 1;
`;

const FileName = styled.Text`
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 2px;
`;

const FileMeta = styled.Text`
  font-size: 12px;
  color: #64748b;
`;

const RemoveButton = styled.TouchableOpacity`
  padding: 8px;
`;

const AddMoreButton = styled.TouchableOpacity`
  flex-direction: row;
  align-items: center;
  justify-content: center;
  padding: 12px;
  border-radius: 12px;
  background-color: #f0fdf4;
  border-width: 1px;
  border-color: #99f6e4;
  margin-bottom: 20px;
`;

const AddMoreText = styled.Text`
  font-size: 14px;
  font-weight: 600;
  color: #0d9488;
  margin-left: 6px;
`;

const ProgressCard = styled.View`
  background-color: #ffffff;
  border-radius: 16px;
  padding: 16px;
  border-width: 1px;
  border-color: #99f6e4;
  margin-top: 10px;
`;

const ProgressHeader = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
`;

const ProgressTitle = styled.Text`
  font-size: 13px;
  font-weight: 600;
  color: #0f766e;
`;

const ProgressPct = styled.Text`
  font-size: 14px;
  font-weight: 700;
  color: #0d9488;
`;

const ProgressBarBackground = styled.View`
  height: 8px;
  background-color: #e2e8f0;
  border-radius: 4px;
  overflow: hidden;
`;

const ProgressBarFill = styled.View`
  height: 100%;
  background-color: #0d9488;
  border-radius: 4px;
`;

const LoaderSubtitle = styled.Text`
  font-size: 12px;
  color: #64748b;
`;

const RowCenter = styled.View`
  flex-direction: row;
  align-items: center;
`;

const FooterContainer = styled.View`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: #ffffff;
  padding: 16px 20px 30px 20px;
  border-top-width: 1px;
  border-top-color: #e2e8f0;
`;

const SubmitButton = styled.TouchableOpacity`
  background-color: #0d9488;
  border-radius: 14px;
  height: 52px;
  align-items: center;
  justify-content: center;
  elevation: 3;
  shadow-color: #0d9488;
  shadow-offset: 0px 4px;
  shadow-opacity: 0.2;
  shadow-radius: 8px;
`;

const SubmitButtonText = styled.Text`
  color: #ffffff;
  font-size: 16px;
  font-weight: 700;
`;
