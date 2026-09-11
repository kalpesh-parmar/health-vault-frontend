import { formatPhoneNumberE164, maskPhoneNumber } from "../../../utils/auth.utils";
import * as authService from "../../../services/auth.service";
import apiClient from "../../../services/apiClient";

jest.mock("../../../services/apiClient");

describe("Auth Flow & Utilities Unit Tests", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Phone Number Normalization & Masking", () => {
    it("formats 10-digit mobile number to E.164 with default +91", () => {
      const result = formatPhoneNumberE164("9876543210");
      expect(result).toBe("+919876543210");
    });

    it("formats 10-digit mobile number with custom country code", () => {
      const result = formatPhoneNumberE164("1234567890", "+1");
      expect(result).toBe("+11234567890");
    });

    it("strips non-digit characters before formatting", () => {
      const result = formatPhoneNumberE164("(987) 654-3210", "91");
      expect(result).toBe("+919876543210");
    });

    it("masks phone number showing only last 4 digits", () => {
      const masked = maskPhoneNumber("9876543210");
      expect(masked).toBe("******3210");
    });

    it("returns short number unchanged if fewer than 4 digits", () => {
      expect(maskPhoneNumber("123")).toBe("123");
    });
  });

  describe("Auth Service Endpoints", () => {
    it("calls firebase-login endpoint with token and returns payload", async () => {
      const mockData = { token: "app-jwt-token", user: { id: "user-123", role: "patient" } };
      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        data: {
          success: true,
          data: mockData,
        },
      });

      const result = await authService.loginWithFirebaseToken("firebase-id-token-abc", "fcm-device-token");
      expect(apiClient.post).toHaveBeenCalledWith("/auth/firebase-login", {
        firebaseToken: "firebase-id-token-abc",
        deviceToken: "fcm-device-token",
      });
      expect(result).toEqual(mockData);
    });

    it("calls social-login endpoint with required parameters", async () => {
      const mockData = { token: "social-jwt-token", user: { id: "user-456" } };
      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        data: {
          success: true,
          data: mockData,
        },
      });

      const result = await authService.socialLogin(
        "social",
        "google",
        "firebase-token",
        "provider-token",
        "device-token",
        { email: "user@example.com" }
      );

      expect(apiClient.post).toHaveBeenCalledWith(
        "/auth/social-login",
        expect.objectContaining({
          loginType: "social",
          provider: "google",
          firebaseIdToken: "firebase-token",
          providerToken: "provider-token",
          deviceToken: "device-token",
          email: "user@example.com",
        })
      );
      expect(result).toEqual({ success: true, data: mockData });
    });

    it("handles activeConfirmationResult setter and getter", () => {
      const mockConfirmation = { confirm: jest.fn() };
      authService.setConfirmationResult(mockConfirmation);
      expect(authService.getConfirmationResult()).toBe(mockConfirmation);
    });
  });
});
