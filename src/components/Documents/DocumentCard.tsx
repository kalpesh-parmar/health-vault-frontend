import React, { useRef, useState, useCallback, memo, useMemo } from "react";
import styled from "styled-components/native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { TouchableOpacity, Modal, GestureResponderEvent, View, Text } from "react-native";
import { AppStackParamList, DocumentsStackParamList } from "../../navigation/types";
import ConfirmationModal from "../shared/ConfirmationModal";
import type { MedicalDocument } from "../../types";
import { useAppTheme } from "../../context/ThemeContext";
import { getFileExtension } from "../../utils/fileUtils";
import Toast from "react-native-toast-message";
import { getSignedUrl } from "../../services/documentService";
import { downloadSingleDocument, shareSingleDocument } from "../../utils/fileOperations";

interface Props {
  document: MedicalDocument;
  selected?: boolean;
  onSelect?: (id: string) => void;
  isSelectionMode?: boolean;
}

const getFileStyle = (ext: string, isDark: boolean) => {
  const normExt = (ext || "").toLowerCase();
  if (normExt === "pdf") {
    return {
      bgColor: isDark ? "#3f1f21" : "#ffeef0",
      textColor: "#ef4444",
      iconColor: "#ef4444"
    };
  }
  if (["png", "jpg", "jpeg", "webp"].includes(normExt)) {
    return {
      bgColor: isDark ? "#1e2e3d" : "#e0f2fe",
      textColor: "#0284c7",
      iconColor: "#0284c7"
    };
  }
  return {
    bgColor: isDark ? "#2d3748" : "#f1f5f9",
    textColor: isDark ? "#94a3b8" : "#475569",
    iconColor: isDark ? "#94a3b8" : "#475569"
  };
};

const DocumentCard = memo(({ document, selected = false, onSelect, isSelectionMode = false }: Props) => {
  const navigation = useNavigation<NativeStackNavigationProp<DocumentsStackParamList>>();
  const { isDark } = useAppTheme();

  const [showModal, setShowModal] = useState<boolean>(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const moreButtonRef = useRef<View>(null);
  
  // Mock size - in production this would come from document metadata
  const docSize = useMemo(() => "2.4 MB", []);

  const handleDelete = useCallback(() => {
    setShowModal(true);
    setMenuVisible(false);
  }, []);

  const handleNavigateToSummary = useCallback(() => {
    navigation.navigate("DocumentSummary", { document } );
  }, [navigation, document]);

  const handleNavigateToEdit = useCallback(() => {
    setMenuVisible(false);
    navigation.navigate("EditDocument", { document });
  }, [navigation, document]);

  const handleDownload = useCallback(async (e: GestureResponderEvent) => {
    e.stopPropagation();
    if (document.s3Key) {
      try {
        const res = await getSignedUrl(document.s3Key);
        if (res.data?.downloadUrl) {
          await downloadSingleDocument(res.data.downloadUrl, document.fileName);
        }
      } catch (error) {
        Toast.show({
          type: "error",
          text1: "Error",
          text2: "Failed to download document.",
        });
      }
    } else {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "No download link available for this document.",
      });
    }
  }, [document]);

  const handleShare = useCallback(async (e: GestureResponderEvent) => {
    e.stopPropagation();
    setMenuVisible(false);
    if (document.s3Key) {
      try {
        const res = await getSignedUrl(document.s3Key);
        if (res.data?.downloadUrl) {
          await shareSingleDocument(res.data.downloadUrl, document.fileName);
        }
      } catch (error) {
        Toast.show({
          type: "error",
          text1: "Error",
          text2: "Failed to share document.",
        });
      }
    } else {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "No share link available for this document.",
      });
    }
  }, [document]);

  const handleCheckboxPress = useCallback(
    (e: GestureResponderEvent) => {
      e.stopPropagation();
      if (onSelect) {
        onSelect(document.id);
      }
    },
    [onSelect, document.id],
  );

  const handleMorePress = useCallback(
    (e: GestureResponderEvent) => {
      e.stopPropagation();
      if (moreButtonRef.current) {
        moreButtonRef.current.measure(
          (_x, _y, width, height, px, py) => {
            setMenuPosition({
              x: px - 125,
              y: py + height + 4,
            });
            setMenuVisible(true);
          },
        );
      }
    },
    [],
  );

  const formattedDate = useMemo(() => {
    try {
      return new Date(document.createdAt).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch (e) {
      return "Unknown Date";
    }
  }, [document.createdAt]);

  const formattedTime = useMemo(() => {
    try {
      return new Date(document.createdAt).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch (e) {
      return "";
    }
  }, [document.createdAt]);

  const metaText = useMemo(() => {
    const parts = [formattedDate];
    if (formattedTime) {
      parts.push(formattedTime);
    }
    const sizeStr = document?.fileSize
      ? document.fileSize >= 1024 * 1024
        ? (document.fileSize / (1024 * 1024)).toFixed(1) + " MB"
        : (document.fileSize / 1024).toFixed(1) + " KB"
      : docSize;
    parts.push(sizeStr);
    return parts.join("  •  ");
  }, [formattedDate, formattedTime, document?.fileSize, docSize]);

  const ext = getFileExtension(document?.fileName) || "doc";
  const fileStyle = getFileStyle(ext, isDark);

  return (
    <>
      <ConfirmationModal
        showModal={showModal}
        onClose={() => setShowModal(false)}
        mode="Delete Document"
        documentId={document?.id}
      />

      <DocCard
        activeOpacity={0.8}
        onPress={handleNavigateToSummary}
        isDark={isDark}
      >
        <CheckboxContainer onPress={handleCheckboxPress}>
          {selected ? (
            <CheckBoxFilled>
              <Ionicons name="checkmark" size={14} color="white" />
            </CheckBoxFilled>
          ) : (
            <CheckBoxOutline isDark={isDark} />
          )}
        </CheckboxContainer>

        <IconContainer style={{ backgroundColor: fileStyle.bgColor }}>
          <MaterialCommunityIcons name="file-document-outline" size={24} color={fileStyle.iconColor} />
          <Text style={{ fontSize: 10, fontWeight: "bold", color: fileStyle.textColor, textTransform: "uppercase", marginTop: 2 }}>
            {ext}
          </Text>
        </IconContainer>

        <DocInfo style={{ marginLeft: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6, width: "100%" }}>
            <DocTitle numberOfLines={1} style={{ color: isDark ? "#f8fafc" : "#1e293b", flexShrink: 1 }}>
              {document?.fileName || "Medical Report"}
            </DocTitle>
            {document?.category ? (
              <CategoryBadge isDark={isDark}>
                <CategoryText isDark={isDark}>{document.category}</CategoryText>
              </CategoryBadge>
            ) : null}
          </View>
          <DocMeta>{metaText}</DocMeta>
          {document?.notes ? (
            <DocNotes numberOfLines={1}>
              <Text style={{ fontWeight: "bold", color: isDark ? "#cbd5e1" : "#475569" }}>Notes: </Text>
              {document.notes}
            </DocNotes>
          ) : null}
        </DocInfo>

        <RightButtonsContainer>
          <RightIconButton onPress={handleDownload}>
            <Ionicons name="download-outline" size={20} color={isDark ? "#cbd5e1" : "#64748b"} />
          </RightIconButton>
          <View ref={moreButtonRef} collapsable={false}>
            <RightIconButton onPress={handleMorePress}>
              <Ionicons name="ellipsis-vertical" size={20} color={isDark ? "#cbd5e1" : "#64748b"} />
            </RightIconButton>
          </View>
        </RightButtonsContainer>
      </DocCard>

      <Modal visible={menuVisible} transparent animationType="fade">
        <Overlay onPress={() => setMenuVisible(false)} />
        <MenuContainer style={{ top: menuPosition.y, left: menuPosition.x }}>
          <MenuItem onPress={handleNavigateToEdit}>
            <Ionicons name="create-outline" size={18} color="#3b82f6" />
            <MenuText>Edit</MenuText>
          </MenuItem>
          <Divider />
          <MenuItem onPress={handleShare}>
            <Ionicons name="share-social-outline" size={18} color="#10b981" />
            <MenuText>Share</MenuText>
          </MenuItem>
          <Divider />
          <MenuItem onPress={handleDelete}>
            <Ionicons name="trash-outline" size={18} color="#ef4444" />
            <MenuText style={{ color: "#ef4444" }}>Delete</MenuText>
          </MenuItem>
        </MenuContainer>
      </Modal>
    </>
  );
});

export default DocumentCard;

const DocCard = styled.TouchableOpacity<{ isDark: boolean }>`
  background-color: ${({ isDark }: {isDark: boolean}) => (isDark ? "#0e1011" : "#fff")};
  border-radius: 20px;
  padding: 15px;
  flex-direction: row;
  align-items: center;
  margin-bottom: 15px;
  border-width: 1px;
  border-color: ${({ isDark }: {isDark: boolean}) => (isDark ? "#1e293b" : "#f1f5f9")};

  elevation: 3;
  shadow-color: #000;
  shadow-offset: 0px 2px;
  shadow-opacity: 0.05;
  shadow-radius: 8px;
`;

const CheckboxContainer = styled.TouchableOpacity`
  margin-right: 12px;
  justify-content: center;
  align-items: center;
  padding: 4px;
`;

const CheckBoxOutline = styled.View<{ isDark: boolean }>`
  width: 22px;
  height: 22px;
  border-radius: 6px;
  border-width: 2px;
  border-color: ${(props: { isDark: boolean }) => props.isDark ? "#475569" : "#cbd5e1"};
  background-color: transparent;
`;

const CheckBoxFilled = styled.View`
  width: 22px;
  height: 22px;
  border-radius: 6px;
  background-color: #10b981;
  justify-content: center;
  align-items: center;
`;

const IconContainer = styled.View`
  width: 55px;
  height: 55px;
  border-radius: 12px;
  justify-content: center;
  align-items: center;
  overflow: hidden;
`;

const DocInfo = styled.View`
  flex: 1;
`;

const DocTitle = styled.Text`
  font-size: 15px;
  font-weight: 700;
  color: #1e293b;
`;

const CategoryBadge = styled.View<{ isDark: boolean }>`
  background-color: ${(props: { isDark: boolean }) => props.isDark ? "rgba(16, 185, 129, 0.15)" : "#e6fcf5"};
  padding-horizontal: 8px;
  padding-vertical: 2px;
  border-radius: 12px;
`;

const CategoryText = styled.Text<{ isDark: boolean }>`
  font-size: 10px;
  font-weight: 600;
  color: ${(props: { isDark: boolean }) => props.isDark ? "#34d399" : "#0f766e"};
`;

const DocMeta = styled.Text`
  font-size: 12px;
  color: #94a3b8;
  margin-top: 6px;
`;

const DocNotes = styled.Text`
  font-size: 11px;
  color: #94a3b8;
  margin-top: 6px;
`;

const RightButtonsContainer = styled.View`
  flex-direction: row;
  align-items: center;
  margin-left: 8px;
`;

const RightIconButton = styled.TouchableOpacity`
  padding: 6px;
  justify-content: center;
  align-items: center;
`;

const Overlay = styled.TouchableOpacity`
  flex: 1;
`;

const MenuContainer = styled.View`
  position: absolute;
  width: 140px;
  background-color: white;
  border-radius: 12px;
  padding: 6px 0;
  border-width: 1px;
  border-color: #f1f5f9;
  elevation: 5;
  shadow-color: #000;
  shadow-opacity: 0.1;
  shadow-radius: 10px;
  shadow-offset: 0px 4px;
`;

const MenuItem = styled.TouchableOpacity`
  flex-direction: row;
  align-items: center;
  padding: 10px 15px;
  gap: 10px;
`;

const MenuText = styled.Text`
  font-size: 14px;
  font-weight: 500;
  color: #1e293b;
`;

const Divider = styled.View`
  height: 1px;
  background-color: #f1f5f9;
`;
