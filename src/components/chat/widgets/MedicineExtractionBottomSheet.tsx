import React, { useState, useEffect, forwardRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
} from "react-native";
import styled from "styled-components/native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useOcrJobPolling } from "../../../hooks/useOcrJobPolling";
import { useDocumentUpload } from "../../../context/DocumentUploadContext";
import { MedicationReviewService } from "../../../services/medicationReviewService";
import {
  listMedications,
  updateMedication,
} from "../../../services/medicationservice";
import { ExtractedMedicine } from "../../../types/medicationReview";
import { AddOrEditMedication } from "../../../types";
import { queryClient } from "../../../config/queryClient";
import BottomSheet from "../../shared/BottomSheet";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { I18N_ONBOARDING_UI } from "./OnboardingI18n";
import { useBottomBarPadding } from "../../../hooks/useBottomBarPadding";

interface MedicineExtractionBottomSheetProps {
  preferredLang: string;
  isDark: boolean;
  onClose?: () => void;
}

export const MedicineExtractionBottomSheet = forwardRef<
  any,
  MedicineExtractionBottomSheetProps
>(({ preferredLang, isDark, onClose }, ref) => {
  const {
    chatWizardState,
    setChatWizardState,
    uploadingDocs,
    isUploading,
  } = useDocumentUpload();
  const bottomPadding = useBottomBarPadding(16, 8);

  const t = (key: string, replacements?: Record<string, string | number>) => {
    const lang = preferredLang || "english";
    const dict = I18N_ONBOARDING_UI[lang] || I18N_ONBOARDING_UI.english;
    let str = dict[key] || I18N_ONBOARDING_UI.english[key] || key;
    if (replacements) {
      Object.entries(replacements).forEach(([k, v]) => {
        str = str.replace(`{${k}}`, String(v));
      });
    }
    return str;
  };

  // OCR Job Polling Hook
  const { isAllTerminal } = useOcrJobPolling(chatWizardState.jobIds);

  useEffect(() => {
    if (
      isAllTerminal &&
      chatWizardState.step === "results" &&
      chatWizardState.jobIds.length > 0 &&
      !chatWizardState.hasViewedCompletedOcr
    ) {
      setChatWizardState((prev) => ({
        ...prev,
        hasViewedCompletedOcr: true,
      }));
    }
  }, [
    isAllTerminal,
    chatWizardState.step,
    chatWizardState.jobIds,
    chatWizardState.hasViewedCompletedOcr,
  ]);

  // STEP RENDERING LOGIC
  const renderProcessingStep = () => {
    const completedCount = uploadingDocs.filter(
      (d) =>
        d.status === "COMPLETED" ||
        d.status === "completed" ||
        d.status === "done" ||
        d.status === "success",
    ).length;
    const inProgressCount = uploadingDocs.filter(
      (d) =>
        d.status === "RUNNING" ||
        d.status === "running" ||
        d.status === "UPLOADING" ||
        d.status === "uploading",
    ).length;
    const queuedCount = uploadingDocs.filter(
      (d) =>
        d.status === "PENDING" ||
        d.status === "pending" ||
        d.status === "queued" ||
        d.status === "QUEUED" ||
        !d.status,
    ).length;
    const failedCount = uploadingDocs.filter(
      (d) =>
        d.status === "FAILED" ||
        d.status === "failed" ||
        d.status === "cancelled" ||
        d.status === "CANCELLED",
    ).length;

    return (
      <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
        {/* Header Row */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
          }}
        >
          <Text
            style={{
              fontSize: 16,
              fontWeight: "bold",
              color: isDark ? "#f8fafc" : "#0f172a",
            }}
          >
            Processing Documents
          </Text>
        </View>

        {/* Status Badge Pills Row */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 20,
            gap: 4,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              flex: 1,
              justifyContent: "center",
              backgroundColor: isDark ? "#064e3b" : "#ecfdf5",
              borderColor: "#10b981",
              borderWidth: 1,
              paddingHorizontal: 5,
              paddingVertical: 4,
              borderRadius: 12,
            }}
          >
            <Ionicons
              name="checkmark-circle"
              size={11}
              color="#10b981"
              style={{ marginRight: 3 }}
            />
            <Text
              style={{ fontSize: 9.5, fontWeight: "700", color: "#10b981" }}
              numberOfLines={1}
            >
              Done {completedCount}
            </Text>
          </View>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              flex: 1,
              justifyContent: "center",
              backgroundColor: isDark ? "#1e3a8a" : "#eff6ff",
              borderColor: "#3b82f6",
              borderWidth: 1,
              paddingHorizontal: 5,
              paddingVertical: 4,
              borderRadius: 12,
            }}
          >
            <ActivityIndicator
              size="small"
              color="#3b82f6"
              style={{ marginRight: 3, transform: [{ scale: 0.6 }] }}
            />
            <Text
              style={{ fontSize: 9.5, fontWeight: "700", color: "#3b82f6" }}
              numberOfLines={1}
            >
              Active {inProgressCount}
            </Text>
          </View>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              flex: 1,
              justifyContent: "center",
              backgroundColor: isDark ? "#334155" : "#f1f5f9",
              borderColor: "#94a3b8",
              borderWidth: 1,
              paddingHorizontal: 5,
              paddingVertical: 4,
              borderRadius: 12,
            }}
          >
            <Ionicons
              name="time"
              size={11}
              color="#64748b"
              style={{ marginRight: 3 }}
            />
            <Text
              style={{ fontSize: 9.5, fontWeight: "700", color: "#64748b" }}
              numberOfLines={1}
            >
              Queued {queuedCount}
            </Text>
          </View>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              flex: 1,
              justifyContent: "center",
              backgroundColor: isDark ? "#7f1d1d" : "#fef2f2",
              borderColor: "#ef4444",
              borderWidth: 1,
              paddingHorizontal: 5,
              paddingVertical: 4,
              borderRadius: 12,
            }}
          >
            <Ionicons
              name="alert-circle"
              size={11}
              color="#ef4444"
              style={{ marginRight: 3 }}
            />
            <Text
              style={{ fontSize: 9.5, fontWeight: "700", color: "#ef4444" }}
              numberOfLines={1}
            >
              Failed {failedCount}
            </Text>
          </View>
        </View>

        {/* List of document process rows */}
        <View
          style={{ maxHeight: 280, marginBottom: 20 }}
        >
          {uploadingDocs.map((doc, index) => {
            const isFailed =
              doc.status === "FAILED" ||
              doc.status === "CANCELLED" ||
              doc.status === "failed";
            const isDone =
              doc.status === "COMPLETED" ||
              doc.status === "completed" ||
              doc.status === "done" ||
              doc.status === "success";
            const progress = doc.progress || 0;

            let stepLabel = "Queued";
            let statusIcon = <Ionicons name="time" size={18} color="#64748b" />;
            let barColor = isDark ? "#475569" : "#cbd5e1";
            let statusTextColor = "#64748b";

            if (doc.status === "UPLOADING" || doc.status === "uploading") {
              stepLabel = "Uploading";
              statusIcon = (
                <ActivityIndicator
                  size="small"
                  color="#3b82f6"
                  style={{ transform: [{ scale: 0.8 }] }}
                />
              );
              barColor = "#3b82f6";
              statusTextColor = "#3b82f6";
            } else if (doc.status === "RUNNING" || doc.status === "running") {
              stepLabel =
                progress <= 50 ? "OCR Extraction" : "Medicine Extraction";
              statusIcon = (
                <ActivityIndicator
                  size="small"
                  color="#3b82f6"
                  style={{ transform: [{ scale: 0.8 }] }}
                />
              );
              barColor = "#3b82f6";
              statusTextColor = "#3b82f6";
            } else if (isDone) {
              stepLabel = "Completed";
              statusIcon = (
                <Ionicons name="checkmark-circle" size={18} color="#10b981" />
              );
              barColor = "#10b981";
              statusTextColor = "#10b981";
            } else if (isFailed) {
              stepLabel = "Failed";
              statusIcon = (
                <Ionicons name="alert-circle" size={18} color="#ef4444" />
              );
              barColor = "#ef4444";
              statusTextColor = "#ef4444";
            }

            return (
              <View
                key={doc.id}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 16,
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "bold",
                    color: "#64748b",
                    width: 22,
                  }}
                >
                  {index + 1}.
                </Text>

                <View style={{ flex: 1, marginRight: 12 }}>
                  <Text
                    numberOfLines={1}
                    style={{
                      fontSize: 13,
                      fontWeight: "bold",
                      color: isDark ? "#cbd5e1" : "#334155",
                    }}
                  >
                    {doc.name}
                  </Text>
                  <Text
                    style={{
                      fontSize: 11,
                      color: statusTextColor,
                      marginTop: 2,
                      fontWeight: "500",
                    }}
                  >
                    {stepLabel}
                  </Text>
                </View>

                <View style={{ marginRight: 12 }}>{statusIcon}</View>

                <View
                  style={{
                    flex: 0.6,
                    height: 4,
                    backgroundColor: isDark ? "#334155" : "#e2e8f0",
                    borderRadius: 2,
                    overflow: "hidden",
                    marginRight: 12,
                  }}
                >
                  <View
                    style={{
                      height: "100%",
                      width: `${progress}%`,
                      backgroundColor: barColor,
                    }}
                  />
                </View>

                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "bold",
                    color: isDark ? "#cbd5e1" : "#334155",
                    width: 35,
                    textAlign: "right",
                  }}
                >
                  {isFailed ? "-" : isDone ? "100%" : `${progress}%`}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  const renderStepContent = () => {
    return renderProcessingStep();
  };

  const hasContent =
    chatWizardState.step !== "idle" ||
    (isUploading && uploadingDocs.length > 0) ||
    chatWizardState.jobIds.length > 0;

  return (
    <BottomSheet
      ref={ref}
      onChange={(index: number) => {
        if (index === -1 && onClose) {
          onClose();
        }
      }}
    >
      <View style={{ paddingBottom: bottomPadding }}>
        {hasContent ? renderStepContent() : null}
      </View>
    </BottomSheet>
  );
});

export default MedicineExtractionBottomSheet;

/* --- Styled Components --- */

const StepWrapper = styled.View`
  width: 100%;
`;

const StepTitle = styled.Text<{ isDark: boolean }>`
  font-size: 18px;
  font-weight: 800;
  color: ${(props: any) => (props.isDark ? "#f8fafc" : "#0f172a")};
`;

const StepSubtitle = styled.Text`
  font-size: 13px;
  color: #64748b;
  margin-top: 4px;
  margin-bottom: 16px;
`;

const LoadingWrapper = styled.View`
  align-items: center;
  justify-content: center;
  padding: 32px;
`;

const LoadingText = styled.Text`
  margin-top: 12px;
  font-size: 14px;
  color: #64748b;
`;

const EmptyWrapper = styled.View`
  align-items: center;
  justify-content: center;
  padding: 32px;
`;

const EmptyText = styled.Text`
  text-align: center;
  margin-vertical: 16px;
  font-size: 14px;
  color: #64748b;
`;

const MedicineResultCard = styled.View<{ isDark: boolean }>`
  border-radius: 14px;
  padding: 12px;
  margin-bottom: 10px;
  background-color: ${(props: any) =>
    props.isDark ? "rgba(255,255,255,0.03)" : "#f8fafc"};
  border-width: 1px;
  border-color: ${(props: any) =>
    props.isDark ? "rgba(255,255,255,0.05)" : "#e2e8f0"};
`;

const MedicineResultHeader = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
`;

const MedicineNameText = styled.Text<{ isDark: boolean }>`
  font-size: 15px;
  font-weight: 700;
  color: ${(props: any) => (props.isDark ? "#f1f5f9" : "#1e293b")};
`;

const MedicineGenericText = styled.Text`
  font-size: 12px;
  color: #64748b;
  margin-top: 1px;
`;

const MedicineMetaRow = styled.View`
  flex-direction: row;
  justify-content: space-between;
`;

const MetaItem = styled.View`
  flex: 1;
`;

const MetaLabel = styled.Text`
  font-size: 10px;
  color: #94a3b8;
  text-transform: uppercase;
`;

const MetaVal = styled.Text<{ isDark: boolean }>`
  font-size: 13px;
  font-weight: 600;
  color: ${(props: any) => (props.isDark ? "#cbd5e1" : "#475569")};
  margin-top: 1px;
`;

const ActionButton = styled.TouchableOpacity`
  background-color: #0f766e;
  border-radius: 14px;
  padding: 14px;
  align-items: center;
  justify-content: center;
  margin-top: 16px;
`;

const ActionButtonText = styled.Text`
  color: #ffffff;
  font-weight: 700;
  font-size: 15px;
`;

const SummaryRowItem = styled.View`
  flex-direction: row;
  justify-content: space-between;
  padding-vertical: 10px;
  border-bottom-width: 1px;
  border-bottom-color: rgba(0, 0, 0, 0.04);
`;

const SummaryLabel = styled.Text`
  font-size: 14px;
  color: #64748b;
`;

const SummaryValue = styled.Text<{ isDark: boolean }>`
  font-size: 14px;
  font-weight: 700;
  color: ${(props: any) => (props.isDark ? "#cbd5e1" : "#1e293b")};
`;

const SuccessWrapper = styled.View`
  align-items: center;
  justify-content: center;
  padding: 16px;
`;

const SuccessTitle = styled.Text<{ isDark: boolean }>`
  font-size: 18px;
  font-weight: 800;
  color: ${(props: any) => (props.isDark ? "#f8fafc" : "#0f172a")};
  margin-top: 12px;
`;

const SuccessSubtitle = styled.Text`
  font-size: 13px;
  color: #64748b;
  text-align: center;
  margin-top: 6px;
  margin-bottom: 16px;
`;

const SummaryCardContainer = styled.View<{ isDark: boolean }>`
  width: 100%;
  border-radius: 16px;
  padding: 14px;
  margin-top: 8px;
  background-color: ${(props: any) =>
    props.isDark ? "rgba(255,255,255,0.02)" : "#f8fafc"};
  border-width: 1px;
  border-color: ${(props: any) =>
    props.isDark ? "rgba(255,255,255,0.05)" : "#e2e8f0"};
`;

const SummaryHeaderRow = styled.View`
  flex-direction: row;
  align-items: center;
  margin-bottom: 10px;
  border-bottom-width: 1px;
  border-bottom-color: rgba(15, 118, 110, 0.15);
  padding-bottom: 8px;
`;

const SummaryHeaderText = styled.Text<{ isDark: boolean }>`
  font-size: 13px;
  font-weight: 700;
  color: ${(props: any) => (props.isDark ? "#cbd5e1" : "#0f766e")};
  margin-left: 6px;
  text-transform: uppercase;
`;

const SummaryTextGroup = styled.View`
  margin-bottom: 12px;
`;

const DocLabelText = styled.Text<{ isDark: boolean }>`
  font-size: 12px;
  font-weight: 700;
  color: ${(props: any) => (props.isDark ? "#94a3b8" : "#475569")};
  margin-bottom: 2px;
`;

const DocSummaryText = styled.Text<{ isDark: boolean }>`
  font-size: 13px;
  line-height: 18px;
  color: ${(props: any) => (props.isDark ? "#cbd5e1" : "#334155")};
`;
