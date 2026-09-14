import apiClient, {
  resetForceLogout,
  getValidAccessToken,
  shouldSkipAuth,
  normalizePath,
} from "../apiClient";
import * as SecureStore from "expo-secure-store";
import Toast from "react-native-toast-message";
import axios from "axios";

function createTestJwt(expSecondsFromNow: number): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({
      exp: Math.floor(Date.now() / 1000) + expSecondsFromNow,
      userId: "test-patient-user-id",
    })
  ).toString("base64url");
  return `${header}.${payload}.mock-signature`;
}

describe("Hardened Authentication & ApiClient Interceptor Test Suite", () => {
  let originalAdapter: any;

  beforeAll(() => {
    originalAdapter = apiClient.defaults.adapter;
  });

  afterAll(() => {
    apiClient.defaults.adapter = originalAdapter;
  });

  beforeEach(() => {
    resetForceLogout();
    jest.clearAllMocks();
  });

  describe("URL Normalization & shouldSkipAuth", () => {
    it("correctly normalizes paths without protocol, host, query, or trailing slash", () => {
      expect(normalizePath("http://localhost:4001/auth/social-login")).toBe("/auth/social-login");
      expect(normalizePath("https://api.healthvault.com/auth/social-login?redirect=true")).toBe("/auth/social-login");
      expect(normalizePath("/auth/social-login/")).toBe("/auth/social-login");
      expect(normalizePath("/auth/social-login#fragment")).toBe("/auth/social-login");
      expect(normalizePath("")).toBe("");
    });

    it("respects skipAuth flag over path matching", () => {
      expect(shouldSkipAuth({ skipAuth: true, url: "/custom/endpoint" })).toBe(true);
      expect(shouldSkipAuth({ skipAuth: false, url: "/auth/logout" })).toBe(false);
    });

    it("identifies public auth paths exactly without substring includes() leakage", () => {
      expect(shouldSkipAuth({ url: "/auth/social-login" })).toBe(true);
      expect(shouldSkipAuth({ url: "/auth/refresh-token" })).toBe(true);
      expect(shouldSkipAuth({ url: "/auth/auth-failure" })).toBe(true);
      // /auth/logout requires authentication
      expect(shouldSkipAuth({ url: "/auth/logout" })).toBe(false);
      // Similar substring in non-auth endpoint must NOT match
      expect(shouldSkipAuth({ url: "/documents/auth/social-login" })).toBe(false);
    });
  });

  describe("Test (a): Never-logged-in public call does NOT logout/abort", () => {
    it("allows unauthenticated call to proceed without force-logout or abort", async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);

      let capturedConfig: any = null;
      apiClient.defaults.adapter = async (config) => {
        capturedConfig = config;
        return {
          data: { success: true, data: { message: "ok" } },
          status: 200,
          statusText: "OK",
          headers: {},
          config,
        };
      };

      const res = await apiClient.post(
        "/auth/social-login",
        { loginType: "social", provider: "google" },
        { skipAuth: true } as any
      );

      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
      // Ensure triggerForceLogout did not fire
      expect(Toast.show).not.toHaveBeenCalledWith(
        expect.objectContaining({ text1: "Session Expired" })
      );
      // No Authorization header should be attached
      expect(capturedConfig.headers.Authorization).toBeUndefined();
    });

    it("getValidAccessToken() returns null without triggering force-logout when no session ever existed", async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);

      const token = await getValidAccessToken(false);

      expect(token).toBeNull();
      expect(Toast.show).not.toHaveBeenCalledWith(
        expect.objectContaining({ text1: "Session Expired" })
      );
    });
  });

  describe("Test (b): Real expired session STILL logs out", () => {
    it("triggers force logout when a session existed and refresh token is expired", async () => {
      const expiredAccessToken = createTestJwt(-600); // 10m expired
      const expiredRefreshToken = createTestJwt(-120); // 2m expired

      (SecureStore.getItemAsync as jest.Mock).mockImplementation(async (key) => {
        if (key === "accessToken") return expiredAccessToken;
        if (key === "authToken") return expiredRefreshToken;
        return null;
      });

      apiClient.defaults.adapter = async (config) => {
        return {
          data: {},
          status: 200,
          statusText: "OK",
          headers: {},
          config,
        };
      };

      // Authenticated call with expired session
      const reqPromise = apiClient.get("/patient/profile");

      await expect(reqPromise).rejects.toThrow();

      // Toast must notify session expired
      expect(Toast.show).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "error",
          text1: "Session Expired",
        })
      );
    });
  });

  describe("Test (c): An authenticated /auth route still attaches Bearer", () => {
    it("attaches Bearer token to /auth/logout because it requires authentication", async () => {
      const validAccessToken = createTestJwt(3600); // valid 1h

      (SecureStore.getItemAsync as jest.Mock).mockImplementation(async (key) => {
        if (key === "accessToken") return validAccessToken;
        if (key === "authToken") return "valid-refresh-token";
        return null;
      });

      let capturedConfig: any = null;
      apiClient.defaults.adapter = async (config) => {
        capturedConfig = config;
        return {
          data: { success: true },
          status: 200,
          statusText: "OK",
          headers: {},
          config,
        };
      };

      const res = await apiClient.post("/auth/logout", {});

      expect(res.status).toBe(200);
      expect(capturedConfig).toBeDefined();
      expect(capturedConfig.headers.Authorization).toBe(`Bearer ${validAccessToken}`);
    });
  });

  describe("Test (d): Concurrent requests during refresh", () => {
    it("deduplicates concurrent refresh calls into exactly ONE refresh request", async () => {
      const expiredAccessToken = createTestJwt(-600); // expired
      const validRefreshToken = "valid-mock-refresh-token";
      const newAccessToken = createTestJwt(3600);
      const newRefreshToken = "new-mock-refresh-token";

      (SecureStore.getItemAsync as jest.Mock).mockImplementation(async (key) => {
        if (key === "accessToken") return expiredAccessToken;
        if (key === "authToken") return validRefreshToken;
        return null;
      });

      let refreshNetworkCalls = 0;
      const originalAxiosPost = axios.post;
      jest.spyOn(axios, "post").mockImplementation(async (url, data, config) => {
        if (String(url).includes("/auth/refresh-token")) {
          refreshNetworkCalls++;
          // Simulate latency
          await new Promise((resolve) => setTimeout(resolve, 60));
          return {
            data: {
              data: {
                accessToken: newAccessToken,
                refreshToken: newRefreshToken,
              },
            },
          } as any;
        }
        return originalAxiosPost(url, data, config);
      });

      const capturedHeaders: string[] = [];
      apiClient.defaults.adapter = async (config) => {
        capturedHeaders.push(String(config.headers?.Authorization));
        return {
          data: { success: true, url: config.url },
          status: 200,
          statusText: "OK",
          headers: {},
          config,
        };
      };

      // Launch 3 simultaneous requests while token is expired
      const results = await Promise.all([
        apiClient.get("/documents/list"),
        apiClient.get("/patient/profile"),
        apiClient.get("/notifications/list"),
      ]);

      expect(results).toHaveLength(3);
      // Exactly ONE refresh request was made across all 3 concurrent calls
      expect(refreshNetworkCalls).toBe(1);

      // All 3 requests proceeded with the new access token
      expect(capturedHeaders).toHaveLength(3);
      capturedHeaders.forEach((authHeader) => {
        expect(authHeader).toBe(`Bearer ${newAccessToken}`);
      });
    });
  });
});
