import { Modal } from "react-native";
import React from "react";
import styled from "styled-components/native";
import DualButtons from "./Buttons/DualButtons";
import { Ionicons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";
import { useAuth } from "../../context/ContextAPI";
import { logoutUser } from "../../services/auth.service";
import { deleteDocument } from "../../services/documentService";
import { deleteUserAccount } from "../../services/userService";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "../../config/queryClient";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { AppStackParamList } from "../../navigation/types";
import { deleteMedication } from "../../services/medicationservice";
import { usePreferredLanguage } from "../../hooks/usePreferredLanguage";
import { getModalTranslation } from "../../utils/modalI18n";

interface ConfirmationModalProps {
  showModal: boolean;
  onClose: () => void;
  mode?: "Log Out" | "Delete Account" | "Delete Document" | "Delete Medication";
  documentId?: string | null;
}

const ConfirmationModal = ({
  showModal,
  onClose,
  mode = "Log Out",
  documentId,
}: ConfirmationModalProps) => {
  const { logout } = useAuth();
  const navigation =
    useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const lang = usePreferredLanguage();

  const { mutateAsync: logoutMutation, isPending: isLoggingOut } = useMutation({
    mutationFn: logoutUser,
    onSuccess: async () => {
      await logout();
      onClose();
      Toast.show({
        type: "success",
        text1: getModalTranslation(lang, "loggedOutMsg"),
        text2: getModalTranslation(lang, "loginAgainMsg"),
      });
    },
    onError: (error: any) => {
      Toast.show({
        type: "error",
        text1: getModalTranslation(lang, "oops"),
        text2: error.message || getModalTranslation(lang, "errorMsg"),
      });
    },
  });

  const { mutateAsync: deleteUserMutation, isPending: isDeletingUser } = useMutation({
    mutationFn: deleteUserAccount,
    onSuccess: async () => {
      await logout();
      onClose();
      Toast.show({
        type: "success",
        text1: getModalTranslation(lang, "accDeletedMsg"),
        text2: getModalTranslation(lang, "createNewAccMsg"),
      });
    },
    onError: (error: any) => {
      Toast.show({
        type: "error",
        text1: getModalTranslation(lang, "oops"),
        text2: error.message || getModalTranslation(lang, "errorMsg"),
      });
    },
  });

  const { mutateAsync: deleteDocumentMutation, isPending: isDeletingDoc } = useMutation({
    mutationFn: async (idString: string) => {
      const ids = idString.split(",");
      for (const id of ids) {
        if (id) {
          await deleteDocument(id);
        }
      }
    },
    onSuccess: async (result) => {
      queryClient.invalidateQueries({
        queryKey: ["documents"],
      });
      queryClient.invalidateQueries({
        queryKey: ["allDocuments"],
      });
      queryClient.invalidateQueries({
        queryKey: ["filteredDocuments"],
      });
      queryClient.invalidateQueries({
        queryKey: ["documentsSummary"],
      });
      onClose();
      Toast.show({
        type: "success",
        text1: getModalTranslation(lang, "successMsg"),
        text2: getModalTranslation(lang, "docDeletedMsg"),
      });
      navigation.navigate("DocumentStack" as never);
    },
    onError: (error: any) => {
      Toast.show({
        type: "error",
        text1: getModalTranslation(lang, "oops"),
        text2: error.message || getModalTranslation(lang, "errorMsg"),
      });
    },
  });

  const { mutateAsync: deleteMedicationMutation, isPending: isDeletingMed } = useMutation({
    mutationFn: deleteMedication,
    onSuccess: async () => {
      queryClient.invalidateQueries({
        queryKey: ["medications"],
      });
      queryClient.invalidateQueries({
        queryKey: ["allMedications"],
      });
      queryClient.invalidateQueries({
        queryKey: ["filteredMedications"],
      });
      queryClient.invalidateQueries({ queryKey: ["paginatedReminders"] });
      queryClient.invalidateQueries({ queryKey: ["allRemindersCounts"] });
      queryClient.invalidateQueries({ queryKey: ["todayReminders"] });
      queryClient.invalidateQueries({ queryKey: ["allReminders"] });
      queryClient.invalidateQueries({ queryKey: ["notificationCount"] });
      queryClient.invalidateQueries({ queryKey: ["paginatedNotifications"] });
      onClose();
      Toast.show({
        type: "success",
        text1: getModalTranslation(lang, "successMsg"),
        text2: getModalTranslation(lang, "medDeletedMsg"),
      });
      navigation.navigate("MedicationStack" as never);
    },
    onError: (error: any) => {
      Toast.show({
        type: "error",
        text1: getModalTranslation(lang, "oops"),
        text2: error.message || getModalTranslation(lang, "errorMsg"),
      });
    },
  })

  const handleAction = async () => {
    try {
      if (mode === "Log Out") {
        await logoutMutation();
      } else if (mode === "Delete Account") {
        await deleteUserMutation();
      } else if (mode === "Delete Medication") {
        await deleteMedicationMutation(documentId || "");
      } else {
        await deleteDocumentMutation(documentId || "");
      }
    } catch (error: any) {
      console.error(`Error during ${mode}:`, error);
      Toast.show({
        type: "error",
        text1: getModalTranslation(lang, "oops"),
        text2: error.message || getModalTranslation(lang, "errorMsg"),
      });
    }
  };

  const isLogout = mode === "Log Out";
  
  let modalTitle = "";
  let modalDesc = "";
  let modalBtn = "";
  let modalLoadingBtn = "";

  if (mode === "Log Out") {
    modalTitle = getModalTranslation(lang, "logOutTitle");
    modalDesc = getModalTranslation(lang, "logOutDesc");
    modalBtn = getModalTranslation(lang, "logOutBtn");
    modalLoadingBtn = getModalTranslation(lang, "loggingOutBtn");
  } else if (mode === "Delete Account") {
    modalTitle = getModalTranslation(lang, "deleteAccTitle");
    modalDesc = getModalTranslation(lang, "deleteAccDesc");
    modalBtn = getModalTranslation(lang, "deleteAccBtn");
    modalLoadingBtn = getModalTranslation(lang, "deletingBtn");
  } else if (mode === "Delete Document") {
    modalTitle = getModalTranslation(lang, "deleteDocTitle");
    modalDesc = getModalTranslation(lang, "deleteDocDesc");
    modalBtn = getModalTranslation(lang, "deleteDocBtn");
    modalLoadingBtn = getModalTranslation(lang, "deletingBtn");
  } else if (mode === "Delete Medication") {
    modalTitle = getModalTranslation(lang, "deleteMedTitle");
    modalDesc = getModalTranslation(lang, "deleteMedDesc");
    modalBtn = getModalTranslation(lang, "deleteMedBtn");
    modalLoadingBtn = getModalTranslation(lang, "deletingBtn");
  }

  return (
    <Modal
      transparent
      visible={showModal}
      animationType="fade"
      onRequestClose={onClose}
    >
      <Overlay>
        <ModalCard>
          <Indicator />

          <IconWrapper>
            <CircleBg color={isLogout ? "#fee2e2" : "#e0f2fe"}>
              {isLogout ? (
                <Ionicons name="log-out" size={24} color="black" />
              ) : (
                <Ionicons name="trash" size={24} color="black" />
              )}
            </CircleBg>
          </IconWrapper>

          <ContentContainer>
            <Title>{modalTitle}</Title>
            <Description>{modalDesc}</Description>
          </ContentContainer>

          <DualButtons
            secondaryBtnText={getModalTranslation(lang, "cancelBtn")}
            secondaryBtnColor="grey"
            mainBtnText={modalBtn}
            mainBtnColor="red"
            onSecondaryPress={onClose}
            onMainPress={handleAction}
            isLoading={isLoggingOut || isDeletingUser || isDeletingDoc || isDeletingMed}
            mainLoadingText={modalLoadingBtn}
          />
        </ModalCard>
      </Overlay>
    </Modal>
  );
};

export default ConfirmationModal;

/* --- Styled Components --- */

const Overlay = styled.View`
  flex: 1;
  background-color: rgba(0, 0, 0, 0.7);
  justify-content: center;
  align-items: center;
  padding: 24px;
`;

const ModalCard = styled.View`
  width: 100%;
  max-width: 350px;
  background-color: ${({ theme }: any) => theme.colors.surface};
  border-radius: 32px; /* Extra rounded for modern feel */
  padding: 30px 24px 24px 24px;
  align-items: center;
  elevation: 20;
  shadow-color: #000;
  shadow-offset: 0px 10px;
  shadow-opacity: 0.2;
  shadow-radius: 20px;
`;

const Indicator = styled.View`
  width: 40px;
  height: 4px;
  background-color: ${({ theme }: any) => theme.colors.border};
  border-radius: 2px;
  position: absolute;
  top: 12px;
`;

const IconWrapper = styled.View`
  margin-bottom: 20px;
`;

const CircleBg = styled.View<{ color: string }>`
  width: 80px;
  height: 80px;
  border-radius: 40px;
  background-color: ${(props: { color: string }) => props.color};
  justify-content: center;
  align-items: center;
`;

const Emoji = styled.Text`
  font-size: 36px;
`;

const ContentContainer = styled.View`
  align-items: center;
  margin-bottom: 30px;
`;

const Title = styled.Text`
  font-size: 24px;
  font-weight: 800;
  color: ${({ theme }: any) => theme.colors.textPrimary};
  margin-bottom: 10px;
  letter-spacing: -0.5px;
`;

const Description = styled.Text`
  font-size: 15px;
  color: ${({ theme }: any) => theme.colors.textMuted};
  text-align: center;
  line-height: 22px;
  padding-horizontal: 10px;
`;
