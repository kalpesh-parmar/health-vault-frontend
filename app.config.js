// Dynamic Expo config.
//
// IMPORTANT: When both `app.json` and `app.config.js` exist, Expo uses
// `app.config.js`. By exporting the function form `({ config }) => ...`, we
// receive the fully-parsed `app.json` as `config` and extend it, instead of
// silently replacing it (which would drop all plugins, newArchEnabled, splash,
// permissions and Android settings defined in app.json).
export default ({ config }) => ({
  ...config,
  ios: {
    ...config.ios,
    bundleIdentifier: "com.anonymous.DocumentsVaultApp",
  },
  extra: {
    ...config.extra,
    eas: {
      ...(config.extra && config.extra.eas),
      projectId: "b062fe9d-eb5f-437f-adf2-d5d6f4038b83",
    },
  },
});
