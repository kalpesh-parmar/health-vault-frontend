import React from "react";
import { ActivityIndicator, Modal } from "react-native";
import styled from "styled-components/native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";

interface CameraModalProps {
  visible: boolean;
  onClose: () => void;
  onCapture: (cameraRef: React.RefObject<any>, fromRegisterScreen?: boolean) => Promise<void>;
  isCapturing: boolean;
  cameraRef: React.RefObject<any>;
  fromRegisterScreen?: boolean;
}

const CameraModal = ({
  visible,
  onClose,
  onCapture,
  isCapturing,
  cameraRef,
  fromRegisterScreen,
}: CameraModalProps) => {
  const [permission] = useCameraPermissions();
  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
    >
      <CameraContainer style={{ opacity: isCapturing ? 0.8 : 1 }}>
        {permission?.granted ? (
          <CameraView ref={cameraRef} facing="back" style={{ flex: 1 }}>
            <CameraControls>
              <CloseBtn onPress={onClose}>
                <Ionicons name="close" size={28} color="white" />
              </CloseBtn>

              <CaptureBtn
                onPress={async () =>
                  await onCapture(cameraRef, fromRegisterScreen)
                }
              >
                <CaptureInner />
              </CaptureBtn>
            </CameraControls>
          </CameraView>
        ) : (
          <PermissionFallback>
            <CloseBtn onPress={onClose}>
              <Ionicons name="close" size={28} color="white" />
            </CloseBtn>
            {/* <ActivityIndicator color="#ffffff" size="large" /> */}
            <FallbackText>Please allow camera access to use this feature.</FallbackText>
          </PermissionFallback>
        )}
      </CameraContainer>
    </Modal>
  );
};

export default CameraModal;

const CameraContainer = styled.View`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: black;
  z-index: 9000;
`;

const CameraControls = styled.View`
  flex: 1;
  justify-content: flex-end;
  padding-bottom: 50px;
`;

const PermissionFallback = styled.View`
  flex: 1;
  justify-content: center;
  align-items: center;
  padding: 24px;
`;

const FallbackText = styled.Text`
  color: white;
  font-size: 16px;
  margin-top: 16px;
  text-align: center;
`;

const CloseBtn = styled.TouchableOpacity`
  position: absolute;
  top: 50px;
  right: 20px;
  background-color: rgba(0, 0, 0, 0.6);
  padding: 12px;
  border-radius: 30px;
`;

const CaptureBtn = styled.TouchableOpacity`
  align-self: center;
  width: 85px;
  height: 85px;
  border-radius: 45px;
  border-width: 6px;
  border-color: rgba(255, 255, 255, 0.4);
  padding: 6px;
`;

const CaptureInner = styled.View`
  flex: 1;
  background-color: white;
  border-radius: 35px;
`;
