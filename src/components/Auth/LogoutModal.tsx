import { Modal } from "react-native";
import React from "react";
import styled from "styled-components/native";
import DualButtons from "../shared/Buttons/DualButtons";
import { Ionicons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";
import { useAuth } from "../../context/ContextAPI";
import { deleteDocument, deleteUserAccount, logoutUser } from "../../services/authService";
import { useMutation } from "@tanstack/react-query";
import * as SecureStore from "expo-secure-store";
import { queryClient } from "../../config/queryClient";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { AppStackParamList } from "../../navigation/types";

interface LogoutModalProps {
  showModal: boolean;
  onClose: () => void;
  mode?: "Log Out" | "Delete Account" | "Delete Document";
  documentId?: number;
}

const LogoutModal = ({
  showModal,
  onClose,
  mode = "Log Out",
  documentId,
}: LogoutModalProps) => {
  const { logout } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();

  const logoutMutation = useMutation({
    mutationFn: logoutUser,
    onSuccess: async () => {
      console.log("Logged out successfully.");
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

  const deleteUserMutation = useMutation({
    mutationFn: deleteUserAccount,
    onSuccess: async () => {
      await SecureStore.deleteItemAsync("userId");
      console.log("Account Deleted Successfully.");
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

  const deleteDocumentMutation = useMutation({
    mutationFn: deleteDocument,
    onSuccess: async (result) => {
      queryClient.invalidateQueries({
        queryKey: ['documents'],
      });
      console.log("Document Deleted Successfully.", result);
      onClose();
      Toast.show({
        type: "success",
        text1: "Document Deleted Successfully !!!",
        text2: "Document Deleted Successfully.",
      });
      navigation.navigate("DocumentList");
    },
    onError: (error: any) => {
      Toast.show({
        type: "error",
        text1: "OOPS!!! 😣",
        text2: error.message || "Error Deleting Document.",
      });
    },
  });

  const handleAction = async () => {
    try {
      if (mode === "Log Out") {
        logoutMutation.mutate();
      } else if (mode === "Delete Account") {
        deleteUserMutation.mutate();
      } else {
        await deleteDocumentMutation.mutateAsync(documentId as number);
        onClose();
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
            <Title>
              {mode === "Delete Document"
                ? "Delete Document"
                : isLogout
                  ? "Log Out"
                  : "Delete Account"}
            </Title>
            <Description>
              Are you sure you want to{" "}
              {mode === "Delete Document"
                ? "delete"
                : isLogout
                  ? "leave"
                  : "delete your account from"}{" "}
              this Document ?{" "}
              {mode === "Delete Document"
                ? "This action will permanently delete this document and it cannot be undone."
                : isLogout
                  ? "You will need to enter your credentials to return."
                  : "Your account will be deleted permanently."}
            </Description>
          </ContentContainer>

          <DualButtons
            secondaryBtnText="Cancel"
            secondaryBtnColor="grey"
            mainBtnText={
              mode === "Delete Document"
                ? "Delete"
                : isLogout
                  ? "Log Out"
                  : "Delete Account"
            }
            mainBtnColor="red"
            onSecondaryPress={onClose}
            onMainPress={handleAction}
          />
        </ModalCard>
      </Overlay>
    </Modal>
  );
};

export default LogoutModal;

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
  background-color: #ffffff;
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
  background-color: #e5e7eb;
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
  color: #111827;
  margin-bottom: 10px;
  letter-spacing: -0.5px;
`;

const Description = styled.Text`
  font-size: 15px;
  color: #6b7280;
  text-align: center;
  line-height: 22px;
  padding-horizontal: 10px;
`;
