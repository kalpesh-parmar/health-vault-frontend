import React, { useMemo } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { PickedFile } from "../../hooks/useDocumentMedia";

export interface SelectedFile extends PickedFile {
  originalName: string;
}

interface SelectedFileCardProps {
  file: SelectedFile;
  index: number;
  isUploading: boolean;
  onEdit: (index: number) => void;
  onRemove: (index: number) => void;
}

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
    return { name: "file-pdf-box" as const, color: "#ef4444" };
  }
  return { name: "file-image" as const, color: "#3b82f6" };
};

const SelectedFileCardComponent: React.FC<SelectedFileCardProps> = ({
  file,
  index,
  isUploading,
  onEdit,
  onRemove,
}) => {
  const iconInfo = useMemo(() => getFileIcon(file.type, file.name), [file.type, file.name]);
  const formattedSize = useMemo(() => formatFileSize(file.size), [file.size]);
  const fileExt = useMemo(() => file.type.split("/")[1]?.toUpperCase() || "FILE", [file.type]);

  return (
    <View style={styles.card}>
      <View style={styles.iconBox}>
        <MaterialCommunityIcons name={iconInfo.name} size={28} color={iconInfo.color} />
      </View>

      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {file.name}
        </Text>
        <Text style={styles.originalName} numberOfLines={1}>
          Original: {file.originalName}
        </Text>
        <Text style={styles.meta}>
          {formattedSize} • {fileExt}
        </Text>
      </View>

      {!isUploading && (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => onEdit(index)}
            accessibilityRole="button"
            accessibilityLabel={`Edit ${file.name}`}
          >
            <Ionicons name="pencil-outline" size={20} color="#0d9488" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => onRemove(index)}
            accessibilityRole="button"
            accessibilityLabel={`Remove ${file.name}`}
          >
            <Ionicons name="trash-outline" size={20} color="#ef4444" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

export const SelectedFileCard = React.memo(SelectedFileCardComponent, (prev, next) => {
  return (
    prev.file.name === next.file.name &&
    prev.file.originalName === next.file.originalName &&
    prev.file.size === next.file.size &&
    prev.file.type === next.file.type &&
    prev.file.uri === next.file.uri &&
    prev.index === next.index &&
    prev.isUploading === next.isUploading
  );
});

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 2,
  },
  originalName: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 1,
    marginBottom: 2,
  },
  meta: {
    fontSize: 12,
    color: "#64748b",
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  actionButton: {
    padding: 8,
  },
});
