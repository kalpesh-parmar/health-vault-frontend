// Setup file for Jest in health-vault-frontend
/* eslint-disable no-undef */

// Mock AsyncStorage
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

// Mock react-native-reanimated
try {
  require("react-native-reanimated").setUpTests();
} catch {
  // Fallback mock if setUpTests is not available
  jest.mock("react-native-reanimated", () => {
    const Reanimated = require("react-native-reanimated/mock");
    Reanimated.default.call = () => {};
    return Reanimated;
  });
}

// Mock Expo Speech modules
jest.mock("expo-speech", () => ({
  speak: jest.fn(),
  stop: jest.fn(),
  isSpeakingAsync: jest.fn().mockResolvedValue(false),
}));

jest.mock("expo-speech-recognition", () => ({
  ExpoSpeechRecognitionModule: {
    requestPermissionsAsync: jest.fn().mockResolvedValue({ status: "granted" }),
    getStateAsync: jest.fn().mockResolvedValue("inactive"),
    start: jest.fn(),
    stop: jest.fn(),
    abort: jest.fn(),
  },
  useSpeechRecognitionEvent: jest.fn(),
}));

// Mock Expo Notifications
jest.mock("expo-notifications", () => ({
  setNotificationHandler: jest.fn(),
  scheduleNotificationAsync: jest.fn().mockResolvedValue("mock-id"),
  cancelScheduledNotificationAsync: jest.fn().mockResolvedValue(undefined),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: "granted" }),
  getPermissionsAsync: jest.fn().mockResolvedValue({ status: "granted" }),
}));

// Mock React Native Toast Message
jest.mock("react-native-toast-message", () => ({
  show: jest.fn(),
  hide: jest.fn(),
}));

// Mock @react-native-firebase
const mockFirebaseAuthInstance = {
  signInWithCredential: jest.fn().mockResolvedValue({
    user: {
      getIdToken: jest.fn().mockResolvedValue("mock-firebase-id-token"),
    },
  }),
  currentUser: {
    getIdToken: jest.fn().mockResolvedValue("mock-firebase-id-token"),
  },
};
const mockAuthFn = jest.fn(() => mockFirebaseAuthInstance);
mockAuthFn.GoogleAuthProvider = { credential: jest.fn() };
mockAuthFn.FacebookAuthProvider = { credential: jest.fn() };
mockAuthFn.OAuthProvider = { credential: jest.fn() };
mockAuthFn.AppleAuthProvider = { credential: jest.fn() };

jest.mock("@react-native-firebase/auth", () => ({
  __esModule: true,
  default: mockAuthFn,
  FirebaseAuthTypes: {},
}));

jest.mock("@react-native-firebase/app", () => ({
  __esModule: true,
  default: {},
}));

jest.mock("@react-native-firebase/messaging", () => () => ({
  getToken: jest.fn().mockResolvedValue("mock-fcm-token"),
  onMessage: jest.fn(),
  setBackgroundMessageHandler: jest.fn(),
}));

// Mock web firebase SDK
jest.mock("firebase/app", () => ({
  initializeApp: jest.fn(),
  getApps: jest.fn().mockReturnValue([{ name: "[DEFAULT]" }]),
  getApp: jest.fn().mockReturnValue({ name: "[DEFAULT]" }),
}));

jest.mock("firebase/auth", () => ({
  getAuth: jest.fn().mockReturnValue({
    currentUser: null,
  }),
  signOut: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("firebase/firestore", () => ({
  getFirestore: jest.fn(),
}));

jest.mock("firebase/storage", () => ({
  getStorage: jest.fn(),
}));

// Mock @react-native-google-signin/google-signin
jest.mock("@react-native-google-signin/google-signin", () => ({
  GoogleSignin: {
    hasPlayServices: jest.fn().mockResolvedValue(true),
    signIn: jest.fn().mockResolvedValue({
      data: { idToken: "mock-google-id-token" },
    }),
    signOut: jest.fn().mockResolvedValue(undefined),
    configure: jest.fn(),
  },
}));

// Mock react-native-fbsdk-next
jest.mock("react-native-fbsdk-next", () => ({
  LoginManager: {
    logInWithPermissions: jest.fn().mockResolvedValue({ isCancelled: false }),
  },
  AccessToken: {
    getCurrentAccessToken: jest.fn().mockResolvedValue({
      accessToken: { toString: () => "mock-facebook-access-token" },
    }),
  },
  AuthenticationToken: {
    getAuthenticationTokenIOS: jest.fn().mockResolvedValue({
      authenticationToken: "mock-facebook-auth-token",
    }),
  },
}));

// Mock expo-apple-authentication
jest.mock("expo-apple-authentication", () => ({
  signInAsync: jest.fn().mockResolvedValue({
    identityToken: "mock-apple-identity-token",
    authorizationCode: "mock-code",
    fullName: { givenName: "Apple", familyName: "User" },
    email: "apple@example.com",
    user: "apple-user-id",
  }),
  AppleAuthenticationScope: {
    FULL_NAME: 0,
    EMAIL: 1,
  },
}));

// Mock expo-secure-store
jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));
