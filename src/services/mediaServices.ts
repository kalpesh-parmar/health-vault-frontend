import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";

export const requestGalleryPermission = async () => {
  return await ImagePicker.requestMediaLibraryPermissionsAsync();
};

export const requestCameraPermission = async () => {
  return await ImagePicker.requestCameraPermissionsAsync();
};

export const openGallery = async () => {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    quality: 1,
    allowsEditing: false,
    allowsMultipleSelection: false,
    selectionLimit: 1,
  });

  if (result.canceled || !result.assets?.length) {
    return null;
  }

  return result.assets[0].uri;
};

export const openGalleryAsset = async () => {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    quality: 1,
    allowsEditing: false,
    allowsMultipleSelection: false,
    selectionLimit: 1,
  });

  if (result.canceled || !result.assets?.length) {
    return null;
  }

  return result.assets[0];
};

export const takePhotoAsset = async () => {
  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ["images"],
    quality: 1,
    allowsEditing: false,
  });

  if (result.canceled || !result.assets?.length) {
    return null;
  }

  return result.assets[0];
};

export const pickDocumentAsset = async () => {
  const result = await DocumentPicker.getDocumentAsync({
    type: ["application/pdf", "image/*"],
    copyToCacheDirectory: true,
  });

  if (result.canceled || !result.assets?.length) {
    return null;
  }

  return result.assets[0];
};
