import React, { useMemo } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useDocumentUpload } from "../../context/DocumentUploadContext";

interface FloatingProgressPanelProps {
  onOpenSheet: () => void;
  isDark: boolean;
}

export const FloatingProgressPanel = ({ onOpenSheet, isDark }: FloatingProgressPanelProps) => {
  const { chatWizardState, resetChatWizard, uploadingDocs, isUploading } = useDocumentUpload();

  const avgProgress = useMemo(() => {
    if (!uploadingDocs || uploadingDocs.length === 0) return 0;
    const sum = uploadingDocs.reduce((acc, doc) => acc + (doc.progress || 0), 0);
    return Math.round(sum / uploadingDocs.length);
  }, [uploadingDocs]);

  const completedJobsCount = useMemo(() => {
    if (!uploadingDocs) return 0;
    return uploadingDocs.filter(
      (doc) =>
        doc.status === "COMPLETED" ||
        doc.status === "FAILED" ||
        doc.status === "CANCELLED" ||
        doc.status === "done" ||
        doc.status === "completed" ||
        doc.status === "success"
    ).length;
  }, [uploadingDocs]);

  const docCount = uploadingDocs?.length || 0;

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginHorizontal: 16,
        marginTop: 10,
        marginBottom: 6,
        padding: 10,
        borderRadius: 14,
        backgroundColor: isDark ? "#1e293b" : "#ffffff",
        borderColor: isDark ? "#334155" : "#e2e8f0",
        borderWidth: 1,
        shadowColor: "#0f172a",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 3,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Left side: Info */}
      <View style={{ flexDirection: "row", alignItems: "center", flex: 1, marginRight: 8 }}>
        <Text style={{ color: isDark ? "#f1f5f9" : "#0f172a", fontWeight: "bold", fontSize: 13 }}>
          {isUploading
            ? "Uploading"
            : `Processed ${completedJobsCount} of ${docCount}`}
        </Text>
        <Text style={{ color: "#64748b", marginHorizontal: 6, fontSize: 13 }}>•</Text>
        <Text style={{ color: "#64748b", fontSize: 13 }} numberOfLines={1}>
          {isUploading ? "Uploading files" : "Analyzing"}
        </Text>
      </View>

      {/* Right side: Actions */}
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <Text style={{ color: "#0f766e", fontWeight: "bold", fontSize: 13, marginRight: 12 }}>
          {avgProgress}%
        </Text>

        <TouchableOpacity
          onPress={onOpenSheet}
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingVertical: 4,
            paddingHorizontal: 8,
            borderRadius: 8,
            backgroundColor: isDark ? "#334155" : "#f1f5f9",
          }}
        >
          <Text style={{ color: isDark ? "#f1f5f9" : "#0f172a", fontSize: 12, fontWeight: "500" }}>
            View
          </Text>
        </TouchableOpacity>
      </View>

      {/* Progress Bar at the very bottom edge */}
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 3,
          backgroundColor: isDark ? "#334155" : "#e2e8f0",
          overflow: "hidden",
        }}
      >
        <View
          style={{
            height: "100%",
            width: `${avgProgress}%`,
            backgroundColor: "#0f766e",
          }}
        />
      </View>
    </View>
  );
};
