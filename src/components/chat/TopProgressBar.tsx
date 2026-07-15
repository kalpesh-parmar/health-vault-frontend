import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing, TouchableWithoutFeedback, LayoutAnimation, UIManager, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { MedicalDocument } from "../../types";

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface DocumentProgressState {
  status: "pending" | "processing" | "done" | "failed";
  progress: number; // 0 to 100
}

interface TopProgressBarProps {
  documents: MedicalDocument[];
  progressState: Record<string, DocumentProgressState>;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onCancelDocument: (docId: string) => void;
  isDark: boolean;
}

export const TopProgressBar: React.FC<TopProgressBarProps> = ({
  documents,
  progressState,
  isExpanded,
  onToggleExpand,
  onCancelDocument,
  isDark
}) => {
  const prevDocumentsRef = useRef(documents.length);
  const prevIsExpandedRef = useRef(isExpanded);

  useEffect(() => {
    if (prevDocumentsRef.current !== documents.length || prevIsExpandedRef.current !== isExpanded) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      prevDocumentsRef.current = documents.length;
      prevIsExpandedRef.current = isExpanded;
    }
  }, [documents.length, isExpanded]);

  // Calculate common progress
  let totalProgress = 0;
  let doneCount = 0;
  documents.forEach(doc => {
    const s = progressState[doc.id];
    if (s) {
      if (s.status === "done") {
        totalProgress += 100;
        doneCount++;
      } else if (s.status === "failed") {
        totalProgress += 100;
        doneCount++;
      } else {
        totalProgress += s.progress;
      }
    }
  });

  const overallProgress = documents.length > 0 ? totalProgress / documents.length : 0;
  const isAllDone = documents.length > 0 && doneCount === documents.length;

  useEffect(() => {
    if (isAllDone) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
  }, [isAllDone]);

  const bgColor = isDark ? "#1e293b" : "#ffffff";
  const textColor = isDark ? "#f8fafc" : "#0f172a";
  const mutedText = isDark ? "#94a3b8" : "#64748b";

  if (documents.length === 0) return null;

  const anyFailed = documents.some(doc => progressState[doc.id]?.status === "failed");

  return (
    <>
      {isExpanded && (
        <TouchableWithoutFeedback onPress={onToggleExpand}>
          <View style={StyleSheet.absoluteFill} />
        </TouchableWithoutFeedback>
      )}
      <View style={[styles.container, { backgroundColor: bgColor, shadowColor: isDark ? "#000" : "#94a3b8" }]}>
        <TouchableOpacity style={styles.headerRow} onPress={onToggleExpand} activeOpacity={0.7}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: textColor }]}>
              {isAllDone 
                ? (anyFailed ? "Document Processing Failed" : "Processing Complete")
                : `Processing ${documents.length} document${documents.length > 1 ? "s" : ""}...`}
            </Text>
            <View style={styles.commonProgressBg}>
              <View 
                style={[
                  styles.commonProgressFill, 
                  { 
                    width: `${overallProgress}%`, 
                    backgroundColor: isAllDone && !anyFailed ? "#10b981" : anyFailed ? "#ef4444" : "#0f766e" 
                  }
                ]} 
              />
            </View>
          </View>
          <Ionicons
            name={isExpanded ? "chevron-up" : "chevron-down"}
            size={20}
            color={mutedText}
            style={{ marginLeft: 12 }}
          />
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.expandedSection}>
            {documents.map((doc) => {
              const state = progressState[doc.id] || { status: "pending", progress: 0 };
              const isDone = state.status === "done";
              const isFailed = state.status === "failed";
              
              return (
                <View key={doc.id} style={styles.docRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.docName, { color: textColor }]} numberOfLines={1}>
                      {doc.fileName}
                    </Text>
                    <View style={styles.docProgressBg}>
                      <View 
                        style={[
                          styles.docProgressFill, 
                          { width: `${isDone || isFailed ? 100 : state.progress}%`, backgroundColor: isFailed ? "#ef4444" : "#0ea5e9" }
                        ]} 
                      />
                    </View>
                    <Text style={[styles.statusText, { color: isFailed ? "#ef4444" : mutedText }]}>
                      {isDone ? "Completed" : isFailed ? "Failed" : `${Math.round(state.progress)}% Processing`}
                    </Text>
                  </View>
                  {!isDone && !isFailed && (
                    <TouchableOpacity style={styles.cancelBtn} onPress={() => onCancelDocument(doc.id)}>
                      <Ionicons name="close" size={16} color="#ef4444" />
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 84 + 12, // Below header
    left: 16,
    right: 16,
    borderRadius: 12,
    padding: 12,
    zIndex: 50,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  title: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 8,
  },
  commonProgressBg: {
    height: 6,
    backgroundColor: "rgba(148, 163, 184, 0.2)",
    borderRadius: 3,
    overflow: "hidden",
  },
  commonProgressFill: {
    height: "100%",
    backgroundColor: "#0ea5e9",
  },
  expandedSection: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(148, 163, 184, 0.2)",
    paddingTop: 12,
  },
  docRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  docName: {
    fontSize: 12,
    fontWeight: "500",
    marginBottom: 4,
  },
  docProgressBg: {
    height: 4,
    backgroundColor: "rgba(148, 163, 184, 0.2)",
    borderRadius: 2,
    overflow: "hidden",
    marginBottom: 2,
  },
  docProgressFill: {
    height: "100%",
  },
  statusText: {
    fontSize: 10,
  },
  cancelBtn: {
    marginLeft: 12,
    padding: 4,
  },
});
