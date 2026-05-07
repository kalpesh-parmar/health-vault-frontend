import * as ImagePicker from "expo-image-picker";
import * as SecureStore from "expo-secure-store";

export const requestGalleryPermission = async () => {
  return await ImagePicker.requestMediaLibraryPermissionsAsync();
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


  await SecureStore.setItemAsync("profileImage", result.assets[0].uri);
  return result.assets[0].uri;
};

export const getProfileImage = async () => {
  return await SecureStore.getItemAsync("profileImage");
};