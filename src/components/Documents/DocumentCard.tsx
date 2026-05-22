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

interface Props {
  document: MedicalDocument;
}

const DocumentCard = memo(({ document }: Props) => {
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
        <IconContainer isImage={!!document.imageUri}>
          <MaterialCommunityIcons name="file" size={20} color="#ff4d4d" />
          <Text style={{ fontSize: 10 }}>{document?.fileName.split(".")[1].toUpperCase()}</Text>
        </IconContainer>

        <DocInfo>
          <DocTitle numberOfLines={1}>
            {document?.fileName || "Medical Report"}
          </DocTitle>
          <DocMeta>
            {formattedDate}
            {`  •  ${
              document?.fileSize! >= 1024 * 1024
                ? (document?.fileSize! / (1024 * 1024)).toFixed(1) + " MB"
                : (document?.fileSize! / 1024).toFixed(1) + " KB"
            }`}
          </DocMeta>
        </DocInfo>

        <View ref={moreButtonRef} collapsable={false}>
          <TouchableOpacity
            onPress={handleMorePress}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="ellipsis-vertical" size={20} color="#94a3b8" />
          </TouchableOpacity>
        </View>
      </DocCard>

      <Modal visible={menuVisible} transparent animationType="fade">
        <Overlay onPress={() => setMenuVisible(false)} />
        <MenuContainer style={{ top: menuPosition.y, left: menuPosition.x }}>
          <MenuItem onPress={handleNavigateToEdit}>
            <Ionicons name="create-outline" size={18} color="#3b82f6" />
            <MenuText>Edit</MenuText>
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

const IconContainer = styled.View<{ isImage: boolean }>`
  width: 55px;
  height: 55px;
  border-radius: 12px;
  background-color: ${({ isImage }: {isImage: boolean}) => (isImage ? "#f1f5f9" : "#fff5f5")};
  justify-content: center;
  align-items: center;
  overflow: hidden;
`;

const DocImage = styled.Image`
  width: 100%;
  height: 100%;
  resize-mode: cover;
`;

const DocInfo = styled.View`
  flex: 1;
  margin-left: 15px;
`;

const DocTitle = styled.Text`
  font-size: 16px;
  font-weight: 700;
  color: #1e293b;
`;

const DocMeta = styled.Text`
  font-size: 12px;
  color: #94a3b8;
  margin-top: 6px;
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
