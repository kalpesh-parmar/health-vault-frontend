import auth from "@react-native-firebase/auth";
import {
  requestPhoneOtp,
  verifyPhoneOtp,
  signInWithFirebaseCustomToken,
  loginSocialWithFirebase,
  logoutUser,
  setConfirmationResult,
  getConfirmationResult,
} from "../auth.service";
import apiClient from "../apiClient";
import { DUMMY_TOKEN, type DummyConfirmationResult } from "../dummyAuth.service";

jest.mock("../apiClient", () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
    get: jest.fn(),
  },
}));

describe("Unified Firebase Authentication Service Unit Tests", () => {
  const mockSignInWithPhoneNumber = jest.fn();
  const mockSignInWithCustomToken = jest.fn();
  const mockSignInWithCredential = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    setConfirmationResult(null);

    (auth as unknown as jest.Mock).mockReturnValue({
      signInWithPhoneNumber: mockSignInWithPhoneNumber,
      signInWithCustomToken: mockSignInWithCustomToken,
      signInWithCredential: mockSignInWithCredential,
    });
  });

  describe("requestPhoneOtp", () => {
    it("handles standard phone numbers via Firebase Auth signInWithPhoneNumber", async () => {
      const mockResult = {
        confirm: jest.fn().mockResolvedValue({
          user: { getIdToken: jest.fn().mockResolvedValue("firebase-id-token-123") },
        }),
      };
      mockSignInWithPhoneNumber.mockResolvedValue(mockResult);

      const result = await requestPhoneOtp("+19876543210");

      expect(mockSignInWithPhoneNumber).toHaveBeenCalledWith("+19876543210");
      expect(result).toBe(mockResult);
      expect(getConfirmationResult()).toBe(mockResult);
    });

    it("handles dummy test phone numbers by returning mock confirmation object", async () => {
      const dummyNumber = "+15555550100";
      const result = await requestPhoneOtp(dummyNumber);

      expect(mockSignInWithPhoneNumber).not.toHaveBeenCalled();
      expect(result).toBeDefined();
      expect((result as DummyConfirmationResult).isDummy).toBe(true);
      expect(getConfirmationResult()).toBe(result);
    });
  });

  describe("verifyPhoneOtp", () => {
    it("throws error if no active confirmation result exists", async () => {
      setConfirmationResult(null);
      await expect(verifyPhoneOtp("123456")).rejects.toThrow(
        "No active phone verification session found. Please try again."
      );
    });

    it("verifies code with real Firebase confirmation result and returns ID token", async () => {
      const mockGetIdToken = jest.fn().mockResolvedValue("real-firebase-id-token");
      const mockConfirmation = {
        isDummy: false,
        confirm: jest.fn().mockResolvedValue({
          user: {
            getIdToken: mockGetIdToken,
          },
        }),
      };
      setConfirmationResult(mockConfirmation);

      const token = await verifyPhoneOtp("654321");

      expect(mockConfirmation.confirm).toHaveBeenCalledWith("654321");
      expect(mockGetIdToken).toHaveBeenCalled();
      expect(token).toBe("real-firebase-id-token");
    });

    it("verifies dummy code and returns DUMMY_TOKEN", async () => {
      const mockDummyConfirm = {
        isDummy: true,
        confirm: jest.fn().mockResolvedValue({
          user: { uid: "dummy-patient-id" },
        }),
      };
      setConfirmationResult(mockDummyConfirm);

      const token = await verifyPhoneOtp("123456");

      expect(mockDummyConfirm.confirm).toHaveBeenCalledWith("123456");
      expect(token).toBe(DUMMY_TOKEN);
    });

    it("throws error if Firebase confirmation returns no user object", async () => {
      const mockConfirmation = {
        isDummy: false,
        confirm: jest.fn().mockResolvedValue({ user: null }),
      };
      setConfirmationResult(mockConfirmation);

      await expect(verifyPhoneOtp("123456")).rejects.toThrow(
        "Firebase verification failed: No user returned"
      );
    });
  });

  describe("signInWithFirebaseCustomToken", () => {
    it("invokes Firebase auth().signInWithCustomToken with provided token", async () => {
      const mockCredential = { user: { uid: "custom-token-user" } };
      mockSignInWithCustomToken.mockResolvedValue(mockCredential);

      const result = await signInWithFirebaseCustomToken("mock-server-custom-token");

      expect(mockSignInWithCustomToken).toHaveBeenCalledWith("mock-server-custom-token");
      expect(result).toBe(mockCredential);
    });
  });

  describe("loginSocialWithFirebase", () => {
    it("handles Google credentials correctly", async () => {
      const mockGetIdToken = jest.fn().mockResolvedValue("social-firebase-token");
      mockSignInWithCredential.mockResolvedValue({
        user: { getIdToken: mockGetIdToken },
      });

      const token = await loginSocialWithFirebase("google", "google-token-xyz");

      expect(auth.GoogleAuthProvider.credential).toHaveBeenCalledWith("google-token-xyz");
      expect(mockSignInWithCredential).toHaveBeenCalled();
      expect(mockGetIdToken).toHaveBeenCalledWith(true);
      expect(token).toBe("social-firebase-token");
    });

    it("throws error on invalid social provider", async () => {
      await expect(
        loginSocialWithFirebase("unknown" as any, "token-xyz")
      ).rejects.toThrow("Invalid provider");
    });
  });

  describe("logoutUser", () => {
    it("calls API logout endpoint successfully", async () => {
      (apiClient.post as jest.Mock).mockResolvedValue({
        data: { success: true, message: "Logged out" },
      });

      const response = await logoutUser();

      expect(apiClient.post).toHaveBeenCalledWith("/auth/logout", {});
      expect(response.success).toBe(true);
    });

    it("gracefully resolves logout if session is already expired or unauthorized", async () => {
      (apiClient.post as jest.Mock).mockRejectedValue({
        response: {
          status: 401,
          data: { message: "Session expired" },
        },
      });

      const response = await logoutUser();

      expect(response).toEqual({ success: true, message: "Logged out" });
    });

    it("rethrows unexpected network or server errors", async () => {
      (apiClient.post as jest.Mock).mockRejectedValue(new Error("Network Error 500"));

      await expect(logoutUser()).rejects.toThrow("Network Error 500");
    });
  });
});
