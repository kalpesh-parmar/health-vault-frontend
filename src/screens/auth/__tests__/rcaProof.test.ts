import apiClient, { resetForceLogout } from "../../../services/apiClient";
import Toast from "react-native-toast-message";

describe("RCA Proof & Regression Verification: /auth/social-login force logout", () => {
  beforeEach(() => {
    resetForceLogout();
    jest.clearAllMocks();
  });

  it("VERIFIES FIX: calling /auth/social-login with no existing tokens does NOT trigger triggerForceLogout", async () => {
    try {
      await apiClient.post("/auth/social-login", {
        loginType: "social",
        provider: "google",
      });
    } catch (e) {
      // Axios mock adapter / network handler in test environment
    }

    // Verify Toast "Session Expired" was NOT called
    expect(Toast.show).not.toHaveBeenCalledWith(
      expect.objectContaining({
        type: "error",
        text1: "Session Expired",
      })
    );
  });
});
