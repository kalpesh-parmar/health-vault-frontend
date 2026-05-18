export default {
  expo: {
    name: "Health Vault",
    slug: "health-vault",
    icon: "./assets/AppIcon.png",
    android: {
      package: "com.anonymous.DocumentsVaultApp",
      adaptiveIcon: {
        foregroundImage: "./assets/AppIcon.png",
        backgroundColor: "#000000",
      },
    },
    ios: {
      bundleIdentifier: "com.anonymous.DocumentsVaultApp",
    },
    extra: {
      eas: {
        projectId: "b062fe9d-eb5f-437f-adf2-d5d6f4038b83",
      },
    },
  },
};
