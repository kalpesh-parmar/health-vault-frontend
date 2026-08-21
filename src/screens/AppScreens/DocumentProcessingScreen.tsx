import React, { useState, useEffect, useMemo } from "react";
import {
  ScrollView,
  StatusBar,
  TouchableOpacity,
  Text,
  View,
  ActivityIndicator,
  Modal,
  BackHandler,
} from "react-native";
import styled from "styled-components/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRoute, RouteProp, useIsFocused } from "@react-navigation/native";
import Toast from "react-native-toast-message";

import { useAppNavigation } from "../../types/navigation";
import { useAppTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/ContextAPI";
import { queryClient } from "../../config/queryClient";
import { useBottomBarPadding } from "../../hooks/useBottomBarPadding";
import { useOcrJobPolling, JobState } from "../../hooks/useOcrJobPolling";
import { getOcrJobResult, OcrJobResult } from "../../services/documentService";
import { useDocumentUpload } from "../../context/DocumentUploadContext";

type DocumentProcessingRouteProp = RouteProp<
  {
    DocumentProcessing: {
      jobIds: string[];
      filesInfo?: { jobId: string; fileName: string; fileKey: string }[];
      fromScreen?: string;
    };
  },
  "DocumentProcessing"
>;

export const DocumentProcessingScreen = () => {
  const navigation = useAppNavigation();
  const route = useRoute<DocumentProcessingRouteProp>();
  const { isDark } = useAppTheme();
  const { userId } = useAuth();
  const bottomPadding = useBottomBarPadding(20);
  const { startBackgroundOcr, retryDocument } = useDocumentUpload();
  const isFocused = useIsFocused();


  const { jobIds = [], filesInfo = [], fromScreen } = route.params || {};

  const {
    jobList,
    aggregatePercentage,
    isAllTerminal,
    completedCount,
    failedCount,
    queuedCount,
    runningCount,
  } = useOcrJobPolling(jobIds);

  const handleBackAction = () => {
    if (!isAllTerminal) {
      startBackgroundOcr(jobIds, filesInfo);
    }
    if (fromScreen && fromScreen !== "MultiUpload") {
      navigation.navigate(fromScreen as any);
    } else {
      navigation.reset({
        index: 0,
        routes: [{ name: "Home" as any }],
      });
    }
  };

  useEffect(() => {
    if (isAllTerminal && fromScreen === "AIChat") {
      navigation.reset({
        index: 1,
        routes: [
          { name: "Home" as any },
          { name: "AIChat" as any }
        ]
      });
    }
  }, [isAllTerminal, fromScreen, navigation]);

  useEffect(() => {
    if (!isFocused) return;

    const onBackPress = () => {
      handleBackAction();
      return true;
    };

    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      onBackPress
    );

    return () => subscription.remove();
  }, [isFocused, fromScreen, navigation, jobIds, filesInfo]);

  const [selectedResult, setSelectedResult] = useState<{
    fileName: string;
    result: OcrJobResult;
  } | null>(null);

  const [isLoadingResult, setIsLoadingResult] = useState<string | null>(null);

  // Invalidate documents query cache when all jobs reach terminal state
  useEffect(() => {
    if (isAllTerminal && userId) {
      queryClient.invalidateQueries({ queryKey: ["allDocuments", userId] });
      queryClient.invalidateQueries({ queryKey: ["documents", userId] });
      queryClient.invalidateQueries({ queryKey: ["filteredDocuments", userId] });
    }
  }, [isAllTerminal, userId]);

  const filesMap = useMemo(() => {
    const map: Record<string, { fileName: string; fileKey: string }> = {};
    filesInfo.forEach((f) => {
      map[f.jobId] = f;
    });
    return map;
  }, [filesInfo]);

  const handleCardPress = async (job: JobState) => {
    if (job.status !== "COMPLETED") return;

    setIsLoadingResult(job.jobId);
    try {
      const response = await getOcrJobResult(job.jobId);
      const resData = response?.data || response;
      const fileName = filesMap[job.jobId]?.fileName || "Document Result";
      setSelectedResult({
        fileName,
        result: resData,
      });
    } catch (error: any) {
      console.error("[ProcessingScreen] Failed to fetch job result:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: error.message || "Failed to load document result details.",
      });
    } finally {
      setIsLoadingResult(null);
    }
  };

  const isNonMedicalError = (errorStr?: string | null) => {
    if (!errorStr) return false;
    const lower = errorStr.toLowerCase();
    return (
      lower.includes("not a medical document") ||
      lower.includes("non_medical_document") ||
      lower.includes("nonmedical")
    );
  };

  const gradientColors = isDark
    ? ["#064e3b", "#0369a1", "#312e81"]
    : ["#0f766e", "#0ea5e9", "#4f46e5"];

  return (
    <Container colors={gradientColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
      <StatusBar barStyle="light-content" translucent backgroundColor="rgba(0,0,0,0.2)" />

      <HeaderWrapper edges={["top"]}>
        <HeaderMain>
          <BackButton onPress={handleBackAction}>
            <Ionicons name="close" size={26} color="white" />
          </BackButton>
          <HeaderTitle>Document Processing</HeaderTitle>
        </HeaderMain>

        <HeaderProgressSection>
          <ProgressTextRow>
            <HeaderProgressLabel>Overall Batch Progress</HeaderProgressLabel>
            <HeaderProgressPct>{aggregatePercentage}%</HeaderProgressPct>
          </ProgressTextRow>
          <HeaderProgressBarBg>
            <HeaderProgressBarFill style={{ width: `${aggregatePercentage}%` }} />
          </HeaderProgressBarBg>
          <HeaderStatusSubtext>
            {completedCount} Completed • {failedCount} Failed • {runningCount + queuedCount} In Progress
          </HeaderStatusSubtext>
        </HeaderProgressSection>
      </HeaderWrapper>

      <ContentContainer>
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
          keyboardShouldPersistTaps="handled"
        >
          <SectionTitle>Document Queue ({jobList.length})</SectionTitle>
          <SectionSubtitle>
            Live status of document AI parsing and medical extraction.
          </SectionSubtitle>

          {jobList.map((job) => {
            const fileMeta = filesMap[job.jobId];
            const fileName = fileMeta?.fileName || `Document ${job.jobId.slice(0, 8)}`;
            const nonMedical = isNonMedicalError(job.error);

            return (
              <JobCard
                key={job.jobId}
                status={job.status}
                nonMedical={nonMedical}
                activeOpacity={job.status === "COMPLETED" ? 0.8 : 1}
                onPress={() => handleCardPress(job)}
              >
                <JobCardHeader>
                  <FileIconBadge status={job.status} nonMedical={nonMedical}>
                    {job.status === "COMPLETED" ? (
                      <Ionicons name="checkmark-circle" size={24} color="#10b981" />
                    ) : job.status === "FAILED" ? (
                      <Ionicons name="alert-circle" size={24} color="#ef4444" />
                    ) : (
                      <ActivityIndicator size="small" color="#0d9488" />
                    )}
                  </FileIconBadge>

                  <HeaderInfo>
                    <JobFileName numberOfLines={1}>{fileName}</JobFileName>
                    <JobStepText numberOfLines={1}>
                      {job.status === "COMPLETED"
                        ? "Extraction Ready — Tap to view"
                        : job.status === "FAILED"
                          ? nonMedical
                            ? "Rejected: Non-Medical Document"
                            : job.error || "Processing failed"
                          : job.currentStep || "Processing..."}
                    </JobStepText>
                  </HeaderInfo>

                  <StatusBadge status={job.status} nonMedical={nonMedical}>
                    <StatusBadgeText status={job.status} nonMedical={nonMedical}>
                      {job.status}
                    </StatusBadgeText>
                  </StatusBadge>
                </JobCardHeader>

                {/* Progress bar during running/queued */}
                {job.status !== "COMPLETED" && job.status !== "FAILED" && (
                  <JobProgressContainer>
                    <ProgressBarBackground>
                      <ProgressBarFill style={{ width: `${job.percentage}%` }} />
                    </ProgressBarBackground>
                    <JobPctText>{job.percentage}%</JobPctText>
                  </JobProgressContainer>
                )}

                {/* Ad-Skip Banner */}
                {job.skippedPages.length > 0 && (
                  <AdSkipBanner>
                    <MaterialCommunityIcons name="alert-decagram" size={20} color="#b45309" />
                    <AdSkipText>
                      Advertisement detected on page{" "}
                      {job.skippedPages
                        .map((p) => (typeof p === "object" ? p.pageNumber : p))
                        .join(", ")}{" "}
                      — skipped
                    </AdSkipText>
                  </AdSkipBanner>
                )}

                {/* Error State & Retry Actions */}
                {job.status === "FAILED" && (
                  <RejectionContainer>
                    <RejectionReasonText>
                      {nonMedical
                        ? "This file was detected as a non-medical record and could not be processed."
                        : job.error || "Document extraction failed."}
                    </RejectionReasonText>
                    {!nonMedical && (
                      <TouchableOpacity
                        style={{
                          marginTop: 8,
                          paddingVertical: 6,
                          paddingHorizontal: 12,
                          backgroundColor: "#0d9488",
                          borderRadius: 6,
                          alignSelf: "flex-start",
                          flexDirection: "row",
                          alignItems: "center",
                        }}
                        onPress={() => {
                          const matchedFile = filesInfo.find((f) => f.jobId === job.jobId);
                          const fileKey = matchedFile?.fileKey || job.jobId;
                          retryDocument(fileKey);
                        }}
                      >
                        <Ionicons name="refresh" size={14} color="#ffffff" style={{ marginRight: 4 }} />
                        <Text style={{ color: "#ffffff", fontSize: 12, fontWeight: "600" }}>Retry Extraction</Text>
                      </TouchableOpacity>
                    )}
                  </RejectionContainer>
                )}


                {/* Loading Result Spinner Overlay */}
                {isLoadingResult === job.jobId && (
                  <CardLoadingOverlay>
                    <ActivityIndicator size="small" color="#0d9488" />
                    <CardLoadingText>Fetching extracted fields...</CardLoadingText>
                  </CardLoadingOverlay>
                )}
              </JobCard>
            );
          })}

          {isAllTerminal && (
            <DoneBanner>
              <Ionicons name="checkmark-done-circle" size={32} color="#10b981" />
              <DoneTitle>All Tasks Finished</DoneTitle>
              <DoneSubtitle>Your medical document library has been updated.</DoneSubtitle>
              <DoneButton onPress={() => navigation.navigate("DocumentStack" as any)}>
                <DoneButtonText>Go to My Documents</DoneButtonText>
              </DoneButton>
            </DoneBanner>
          )}

          <BackgroundButton onPress={handleBackAction} activeOpacity={0.8}>
            <Ionicons name="arrow-back-outline" size={16} color="white" style={{ marginRight: 8 }} />
            <BackgroundButtonText>Move to Background</BackgroundButtonText>
          </BackgroundButton>
        </ScrollView>
      </ContentContainer>

      {/* Result Modal / Bottom Sheet */}
      <Modal
        visible={Boolean(selectedResult)}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedResult(null)}
      >
        <ModalOverlay>
          <ModalContentCard bottomPadding={bottomPadding}>
            <ModalHeader>
              <ModalTitle numberOfLines={1}>{selectedResult?.fileName}</ModalTitle>
              <CloseModalButton onPress={() => setSelectedResult(null)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </CloseModalButton>
            </ModalHeader>

            <ScrollView contentContainerStyle={{ padding: 16 }}>
              <ModalSectionHeader>English Summary</ModalSectionHeader>
              <ModalSummaryBox>
                <ModalBodyText>
                  {selectedResult?.result?.summaries?.summaryEnglish ||
                    selectedResult?.result?.extractedStructuredData?.summaryEnglish ||
                    "No English summary generated."}
                </ModalBodyText>
              </ModalSummaryBox>

              {Boolean(selectedResult?.result?.summaries?.summaryInPreferredLanguage) && (
                <>
                  <ModalSectionHeader>Localized Summary</ModalSectionHeader>
                  <ModalSummaryBox>
                    <ModalBodyText>
                      {selectedResult?.result?.summaries?.summaryInPreferredLanguage}
                    </ModalBodyText>
                  </ModalSummaryBox>
                </>
              )}

              <ModalSectionHeader>Extracted Medical Data</ModalSectionHeader>
              <RawJsonContainer>
                <RawJsonText>
                  {JSON.stringify(
                    selectedResult?.result?.extractedStructuredData || {},
                    null,
                    2,
                  )}
                </RawJsonText>
              </RawJsonContainer>
            </ScrollView>

            <ModalFooterButton onPress={() => setSelectedResult(null)}>
              <ModalFooterButtonText>Close</ModalFooterButtonText>
            </ModalFooterButton>
          </ModalContentCard>
        </ModalOverlay>
      </Modal>
    </Container>
  );
};

export default DocumentProcessingScreen;

/* --- Styled Components --- */

const Container = styled(LinearGradient)`
  flex: 1;
`;

const HeaderWrapper = styled(SafeAreaView)`
  background-color: transparent;
  padding-bottom: 16px;
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

const HeaderProgressSection = styled.View`
  padding-horizontal: 20px;
  margin-top: 10px;
`;

const ProgressTextRow = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
`;

const HeaderProgressLabel = styled.Text`
  color: rgba(255, 255, 255, 0.9);
  font-size: 13px;
  font-weight: 600;
`;

const HeaderProgressPct = styled.Text`
  color: #ffffff;
  font-size: 16px;
  font-weight: 800;
`;

const HeaderProgressBarBg = styled.View`
  height: 8px;
  background-color: rgba(255, 255, 255, 0.25);
  border-radius: 4px;
  overflow: hidden;
`;

const HeaderProgressBarFill = styled.View`
  height: 100%;
  background-color: #ffffff;
  border-radius: 4px;
`;

const HeaderStatusSubtext = styled.Text`
  color: rgba(255, 255, 255, 0.8);
  font-size: 12px;
  margin-top: 6px;
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
  margin-bottom: 2px;
`;

const SectionSubtitle = styled.Text`
  font-size: 13px;
  color: #64748b;
  margin-bottom: 16px;
`;

const JobCard = styled.TouchableOpacity<{ status: string; nonMedical: boolean }>`
  background-color: #ffffff;
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 12px;
  border-width: 1px;
  border-color: ${(props: any) =>
    props.status === "COMPLETED"
      ? "#a7f3d0"
      : props.status === "FAILED"
        ? props.nonMedical
          ? "#fca5a5"
          : "#fecaca"
        : "#e2e8f0"};
  elevation: 2;
  shadow-color: #000;
  shadow-offset: 0px 2px;
  shadow-opacity: 0.05;
  shadow-radius: 6px;
  position: relative;
`;

const JobCardHeader = styled.View`
  flex-direction: row;
  align-items: center;
`;

const FileIconBadge = styled.View<{ status: string; nonMedical: boolean }>`
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background-color: ${(props: any) =>
    props.status === "COMPLETED"
      ? "#ecfdf5"
      : props.status === "FAILED"
        ? "#fef2f2"
        : "#f0fdfa"};
  align-items: center;
  justify-content: center;
  margin-right: 12px;
`;

const HeaderInfo = styled.View`
  flex: 1;
`;

const JobFileName = styled.Text`
  font-size: 15px;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 2px;
`;

const JobStepText = styled.Text`
  font-size: 12px;
  color: #64748b;
`;

const StatusBadge = styled.View<{ status: string; nonMedical: boolean }>`
  padding-horizontal: 10px;
  padding-vertical: 4px;
  border-radius: 8px;
  background-color: ${(props: any) =>
    props.status === "COMPLETED"
      ? "#d1fae5"
      : props.status === "FAILED"
        ? "#fee2e2"
        : props.status === "RUNNING"
          ? "#e0f2fe"
          : "#f1f5f9"};
`;

const StatusBadgeText = styled.Text<{ status: string; nonMedical: boolean }>`
  font-size: 11px;
  font-weight: 700;
  color: ${(props: any) =>
    props.status === "COMPLETED"
      ? "#047857"
      : props.status === "FAILED"
        ? "#b91c1c"
        : props.status === "RUNNING"
          ? "#0369a1"
          : "#64748b"};
`;

const JobProgressContainer = styled.View`
  flex-direction: row;
  align-items: center;
  margin-top: 12px;
`;

const ProgressBarBackground = styled.View`
  flex: 1;
  height: 6px;
  background-color: #f1f5f9;
  border-radius: 3px;
  overflow: hidden;
  margin-right: 10px;
`;

const ProgressBarFill = styled.View`
  height: 100%;
  background-color: #0d9488;
  border-radius: 3px;
`;

const JobPctText = styled.Text`
  font-size: 12px;
  font-weight: 700;
  color: #0d9488;
`;

const AdSkipBanner = styled.View`
  flex-direction: row;
  align-items: center;
  background-color: #fef3c7;
  border-width: 1px;
  border-color: #fde68a;
  border-radius: 10px;
  padding: 8px 12px;
  margin-top: 10px;
`;

const AdSkipText = styled.Text`
  font-size: 12px;
  font-weight: 600;
  color: #92400e;
  margin-left: 8px;
  flex: 1;
`;

const RejectionContainer = styled.View`
  margin-top: 10px;
  padding-top: 10px;
  border-top-width: 1px;
  border-top-color: #fee2e2;
`;

const RejectionReasonText = styled.Text`
  font-size: 12px;
  color: #991b1b;
  margin-bottom: 8px;
`;

const RejectionActionsRow = styled.View`
  flex-direction: row;
  gap: 10px;
`;

const RejectionButton = styled.TouchableOpacity<{ bgColor: string }>`
  padding-vertical: 6px;
  padding-horizontal: 14px;
  border-radius: 8px;
  background-color: ${(props: any) => props.bgColor};
`;

const RejectionButtonText = styled.Text<{ textColor: string }>`
  font-size: 12px;
  font-weight: 700;
  color: ${(props: any) => props.textColor};
`;

const CardLoadingOverlay = styled.View`
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: rgba(255, 255, 255, 0.85);
  border-radius: 16px;
  flex-direction: row;
  align-items: center;
  justify-content: center;
`;

const CardLoadingText = styled.Text`
  font-size: 12px;
  color: #0d9488;
  font-weight: 600;
  margin-left: 8px;
`;

const DoneBanner = styled.View`
  background-color: #ffffff;
  border-radius: 20px;
  padding: 24px;
  align-items: center;
  border-width: 1px;
  border-color: #a7f3d0;
  margin-top: 10px;
`;

const DoneTitle = styled.Text`
  font-size: 18px;
  font-weight: 800;
  color: #065f46;
  margin-top: 8px;
`;

const DoneSubtitle = styled.Text`
  font-size: 13px;
  color: #047857;
  margin-top: 2px;
  margin-bottom: 16px;
`;

const DoneButton = styled.TouchableOpacity`
  background-color: #0d9488;
  padding-vertical: 12px;
  padding-horizontal: 24px;
  border-radius: 12px;
`;

const DoneButtonText = styled.Text`
  color: #ffffff;
  font-size: 14px;
  font-weight: 700;
`;

/* --- Modal Styled Components --- */

const ModalOverlay = styled.View`
  flex: 1;
  background-color: rgba(0, 0, 0, 0.6);
  justify-content: flex-end;
`;

const ModalContentCard = styled.View<{ bottomPadding: number }>`
  background-color: #ffffff;
  border-top-left-radius: 24px;
  border-top-right-radius: 24px;
  max-height: 80%;
  padding-bottom: ${(props: any) => props.bottomPadding}px;
`;

const ModalHeader = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom-width: 1px;
  border-bottom-color: #e2e8f0;
`;

const ModalTitle = styled.Text`
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
  flex: 1;
  margin-right: 12px;
`;

const CloseModalButton = styled.TouchableOpacity`
  padding: 4px;
`;

const ModalSectionHeader = styled.Text`
  font-size: 14px;
  font-weight: 700;
  color: #0f766e;
  margin-top: 12px;
  margin-bottom: 6px;
`;

const ModalSummaryBox = styled.View`
  background-color: #f0fdfa;
  border-radius: 12px;
  padding: 12px;
  border-width: 1px;
  border-color: #ccfbf1;
`;

const ModalBodyText = styled.Text`
  font-size: 13px;
  color: #334155;
  line-height: 19px;
`;

const RawJsonContainer = styled.View`
  background-color: #0f172a;
  border-radius: 12px;
  padding: 12px;
  margin-top: 4px;
`;

const RawJsonText = styled.Text`
  font-size: 11px;
  color: #38bdf8;
  font-family: Platform.OS === "ios" ? "Menlo" : "monospace";
`;

const ModalFooterButton = styled.TouchableOpacity`
  margin-horizontal: 20px;
  margin-top: 10px;
  background-color: #0d9488;
  height: 46px;
  border-radius: 12px;
  align-items: center;
  justify-content: center;
`;

const ModalFooterButtonText = styled.Text`
  color: #ffffff;
  font-size: 14px;
  font-weight: 700;
`;

const BackgroundButton = styled.TouchableOpacity`
  background-color: #6366f1;
  padding-vertical: 12px;
  padding-horizontal: 24px;
  border-radius: 24px;
  margin-top: 15px;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  width: 100%;
  elevation: 2;
  shadow-color: #000;
  shadow-offset: 0px 2px;
  shadow-opacity: 0.15;
  shadow-radius: 3px;
`;

const BackgroundButtonText = styled.Text`
  color: white;
  font-size: 15px;
  font-weight: 700;
`;
