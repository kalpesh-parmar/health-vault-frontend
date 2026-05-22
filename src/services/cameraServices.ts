import { Camera } from "expo-camera";

export const requestCameraPermission = async () => {
  return await Camera.requestCameraPermissionsAsync();
};

export const capturePhoto = async (
  cameraRef: any
) => {
  if (!cameraRef?.current) return null;

  const photo = await cameraRef.current.takePictureAsync({
    quality: 1,
    base64: true,
  });
  return photo?.uri ? photo.uri : null;
};