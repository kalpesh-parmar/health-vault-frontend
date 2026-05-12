import React, { useRef, useState, useCallback, memo } from "react";
import styled from "styled-components/native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { TouchableOpacity, Modal, Image } from "react-native";
import { AppStackParamList } from "../../navigation/types";
import ConfirmationModal from "../shared/ConfirmationModal";
import type { MedicalDocument } from "../../types";

interface Props {
  document: MedicalDocument;
}

const DocumentCard = memo(({ document }: Props) => {
  const navigation =
    useNavigation<NativeStackNavigationProp<AppStackParamList>>();

  const [showModal, setShowModal] = useState<boolean>(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const moreButtonRef = useRef<any>(null);
  const docSize = "2.4 MB";

  const handleDelete = useCallback(() => {
    setShowModal(true);
    setMenuVisible(false);
  }, []);

  const handleNavigateToSummary = useCallback(() => {
    navigation.navigate("DocumentStack", {
      screen: "DocumentSummary",
      params: { document },
    });
  }, [navigation, document]);

  const handleNavigateToEdit = useCallback(() => {
    setMenuVisible(false);
    navigation.navigate("DocumentStack", {
      screen: "EditDocument",
      params: { document },
    });
  }, [navigation, document]);
  
  const handleMorePress = useCallback(
    (e: any) => {
      e.stopPropagation();
      moreButtonRef.current.measure(
        (
          x: number,

          y: number,

          width: number,

          height: number,

          px: number,

          py: number,
        ) => {
          setMenuPosition({
            x: px - 125,

            y: py + height + 4,
          });

          setMenuVisible(true);
        },
      );
    },
    [],
  );

  return (
    <>
      <ConfirmationModal
        showModal={showModal}
        onClose={() => setShowModal(false)}
        mode="Delete Document"
        documentId={document?.id}
      />

      <DocCard activeOpacity={0.8} onPress={handleNavigateToSummary}>
        <IconContainer>
            <DocImage
              source={{
                uri: document.imageUri || "https://via.placeholder.com/150",
              }}
            />
        </IconContainer>

        <DocInfo>
          <DocTitle numberOfLines={1}>
            {document?.fileName || "Medical Report"}
          </DocTitle>
          <DocMeta>
            {new Date(document.createdAt).toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
            {`  •  ${docSize}`}
          </DocMeta>
        </DocInfo>

        <TouchableOpacity
          ref={moreButtonRef}
          onPress={handleMorePress}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="ellipsis-vertical" size={20} color="#94a3b8" />
        </TouchableOpacity>
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

const DocCard = styled.TouchableOpacity`
  background-color: ${({ isDark }: {isDark: boolean}) => isDark ? "#0e1011" : "#fff"};
  border-radius: 20px;
  padding: 15px;
  flex-direction: row;
  align-items: center;
  margin-bottom: 15px;
  border-width: 1px;
  border-color: #f1f5f9;

  /* Elevation for Android */
  elevation: 3;
  /* Shadow for iOS */
  shadow-color: #000;
  shadow-offset: 0px 2px;
  shadow-opacity: 0.05;
  shadow-radius: 8px;
`;

const IconContainer = styled.View<{ isImage: boolean }>`
  width: 55px;
  height: 55px;
  border-radius: 12px;
  background-color: ${({ isImage }: { isImage: boolean }) =>
    isImage ? "#f1f5f9" : "#fff5f5"};
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
