import { Linking, Share } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as Notifications from "expo-notifications";

export const downloadSingleDocument = async (downloadUrl: string, fileName: string): Promise<boolean> => {
  try {
    // Notify download started
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Downloading Document",
        body: `Downloading ${fileName}...`,
        sound: false,
      },
      trigger: null,
    });

    const sanitizedFileName = fileName.replace(/\s+/g, "_");
    const fileUri = FileSystem.documentDirectory + sanitizedFileName;
    const downloadRes = await FileSystem.downloadAsync(downloadUrl, fileUri);
    
    if (downloadRes.status === 200) {
      // Notify download complete
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Download Complete",
          body: `${fileName} downloaded successfully.`,
          sound: true,
        },
        trigger: null,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(downloadRes.uri);
      }
      return true;
    }
    throw new Error(`Download failed with status ${downloadRes.status}`);
  } catch (error) {
    console.error("[fileOperations] Download error:", error);
    try {
      await Linking.openURL(downloadUrl);
      return true;
    } catch (e) {
      return false;
    }
  }
};

export const shareSingleDocument = async (downloadUrl: string, fileName: string): Promise<boolean> => {
  try {
    const sanitizedFileName = fileName.replace(/\s+/g, "_");
    const fileUri = FileSystem.documentDirectory + sanitizedFileName;
    const downloadRes = await FileSystem.downloadAsync(downloadUrl, fileUri);
    
    if (downloadRes.status === 200) {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(downloadRes.uri);
        return true;
      }
    }
    
    await Share.share({
      url: downloadUrl,
      title: fileName,
      message: `Check out this document: ${fileName}`,
    });
    return true;
  } catch (error) {
    console.error("[fileOperations] Share error:", error);
    try {
      await Share.share({
        url: downloadUrl,
        title: fileName,
        message: `Check out this document: ${fileName}`,
      });
      return true;
    } catch (e) {
      return false;
    }
  }
};
