import React, { useRef, useState, useCallback, memo } from "react";
import styled from "styled-components/native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { TouchableOpacity, Modal } from "react-native";
import { useAppTheme } from "../../context/ThemeContext";
import { AppStackParamList } from "../../navigation/types";
import ConfirmationModal from "../shared/ConfirmationModal";
import type { MedicalDocument } from "../../types";

interface Props {
  document: MedicalDocument;
}

const DocumentCard = memo(({ document }: Props) => {
  const { isDark } = useAppTheme();
  const navigation =
    useNavigation<NativeStackNavigationProp<AppStackParamList>>();

  const [showModal, setShowModal] = useState<boolean>(false);
  const modalMode = "Delete Document";

  const filename = document?.fileName?.replaceAll("%20", " ");
  const fileNameWOExt = filename.split(".").slice(0, -1).join(".");

  const [menuVisible, setMenuVisible] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });

  const moreButtonRef = useRef<any>(null);

  const handleDelete = useCallback(() => {
    setShowModal(true);
    setMenuVisible(false);
  }, []);

  const handleNavigateToSummary = useCallback(() => {
    navigation.navigate("DocumentSummary", { document });
  }, [navigation, document]);

  const handleNavigateToEdit = useCallback(() => {
    setMenuVisible(false);
    navigation.navigate("EditDocument", { document });
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
        mode={modalMode}
        documentId={document?.id}
      />

      <DocCard
        activeOpacity={0.85}
        onPress={handleNavigateToSummary}
      >
        <DocIconBox>
          <Ionicons
            name="document-text"
            size={20}
            color={isDark ? "#60a5fa" : "#1246A8"}
          />
        </DocIconBox>

        <DocInfo>
          <DocTitle numberOfLines={1}>{fileNameWOExt}</DocTitle>
          <DocDate>
            {new Date(document.createdAt).toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </DocDate>
        </DocInfo>

        <DocRight>
          <TouchableOpacity ref={moreButtonRef} onPress={handleMorePress}>
            <MaterialIcons
              name="more-vert"
              size={24}
              color={isDark ? "#60a5fa" : "#1246A8"}
            />
          </TouchableOpacity>
        </DocRight>
      </DocCard>

      <Modal visible={menuVisible} transparent animationType="fade">
        <Overlay onPress={() => setMenuVisible(false)} />

        <MenuContainer
          style={{
            top: menuPosition.y,
            left: menuPosition.x,
          }}
        >
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

DocumentCard.displayName = "DocumentCard";

export default DocumentCard;

const DocCard = styled.TouchableOpacity`
  background-color: ${({ theme }: any) => theme.colors.surface};
  border-radius: 20px;
  padding: 14px 16px;
  margin-bottom: 10px;
  flex-direction: row;
  align-items: center;
  gap: 12px;
  border-width: 0.5px;
  border-color: ${({ theme }: any) => theme.colors.border};
  elevation: 2;
  shadow-color: #000;
  shadow-opacity: 0.04;
  shadow-radius: 6px;
  shadow-offset: 0px 2px;
`;

const DocIconBox = styled.View`
  width: 44px;
  height: 44px;
  background-color: ${({ theme }: any) => theme.colors.iconBox};
  border-radius: 13px;
  align-items: center;
  justify-content: center;
`;

const DocInfo = styled.View`
  flex: 1;
`;

const DocTitle = styled.Text`
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }: any) => theme.colors.textPrimary};
`;

const DocDate = styled.Text`
  font-size: 12px;
  color: ${({ theme }: any) => theme.colors.textMuted};
`;

const DocRight = styled.View`
  flex-direction: row;
  align-items: center;
`;

const Overlay = styled.TouchableOpacity`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
`;

const MenuContainer = styled.View`
  position: absolute;
  width: 140px;
  background-color: ${({ theme }: any) => theme.colors.surface};
  border-radius: 12px;
  padding: 6px 0;
  border-width: 0.5px;
  border-color: ${({ theme }: any) => theme.colors.border};

  shadow-color: #000;
  shadow-opacity: 0.15;
  shadow-radius: 12px;
  shadow-offset: 0px 6px;
  elevation: 6;
`;

const MenuItem = styled.TouchableOpacity`
  flex-direction: row;
  align-items: center;
  padding: 10px 12px;
  gap: 10px;
`;

const MenuText = styled.Text`
  font-size: 14px;
  color: ${({ theme }: any) => theme.colors.textPrimary};
  font-weight: 500;
`;

const Divider = styled.View`
  height: 0.5px;
  background-color: ${({ theme }: any) => theme.colors.border};
  margin: 4px 0;
`;
