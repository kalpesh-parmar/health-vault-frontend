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

  const { mutateAsync: logoutMutation, isPending: isLoggingOut } = useMutation({
    mutationFn: logoutUser,
    onSuccess: async () => {
      await logout();
      onClose();
      Toast.show({
        type: "success",
        text1: "Logged Out Successfully !!!",
        text2: "Enter Your Credentials again to Login.",
      });
    },
    onError: (error: any) => {
      Toast.show({
        type: "error",
        text1: "OOPS!!! 😣",
        text2: error.message || "Error Logging out.",
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
        text1: "Account Deleted Successfully !!!",
        text2: "Create New Account to get Started.",
      });
    },
    onError: (error: any) => {
      Toast.show({
        type: "error",
        text1: "OOPS!!! 😣",
        text2: error.message || "Error Deleting Account.",
      });
    },
  });

  const { mutateAsync: deleteDocumentMutation, isPending: isDeletingDoc } = useMutation({
    mutationFn: deleteDocument,
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
      onClose();
      Toast.show({
        type: "success",
        text1: "Document Deleted Successfully !!!",
        text2: "Document Deleted Successfully.",
      });
      navigation.navigate("DocumentStack" as never);
    },
    onError: (error: any) => {
      Toast.show({
        type: "error",
        text1: "OOPS!!! 😣",
        text2: error.message || "Error Deleting Document.",
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
        text1: "Deleted Successfully !!!",
        text2: "Medication Deleted Successfully.",
      });
      navigation.navigate("MedicationStack" as never);
    },
    onError: (error: any) => {
      Toast.show({
        type: "error",
        text1: "OOPS!!! 😣",
        text2: error.message || "Error Deleting Medication.",
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
        text1: "OOPS!!! 😣",
        text2: error.message || "Error Logging out.",
      });
    }
  };

  const isLogout = mode === "Log Out";

  return (
    <Modal transparent visible={showModal} animationType="fade">
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
            <Title>{mode}</Title>
            <Description>
              Are you sure you want to {mode}. This action cannot be undone.
            </Description>
          </ContentContainer>

          <DualButtons
            secondaryBtnText="Cancel"
            secondaryBtnColor="grey"
            mainBtnText={mode}
            mainBtnColor="red"
            onSecondaryPress={onClose}
            onMainPress={handleAction}
            isLoading={isLoggingOut || isDeletingUser || isDeletingDoc || isDeletingMed}
            mainLoadingText={mode === "Log Out" ? "Logging out..." : "Deleting..."}
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
