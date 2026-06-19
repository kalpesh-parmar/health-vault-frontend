export const DUMMY_MOBILE = "+911111111111";
export const DUMMY_UID = "msAipc6g4vNEQl24OePv56pe6Qy2";
export const DUMMY_TOKEN = "dummy-token-msAipc6g4vNEQl24OePv56pe6Qy2";

const isDummyAuthEnabled =
  process.env.EXPO_PUBLIC_ENABLE_DUMMY_AUTH === "true" ||
  process.env.ENABLE_DUMMY_AUTH === "true";

export const ENABLE_DUMMY_AUTH = isDummyAuthEnabled;

export interface DummyConfirmationResult {
  isDummy: boolean;
  confirm: (code: string) => Promise<{
    user: {
      uid: string;
      phoneNumber: string;
    };
  }>;
}

export const isDummyNumber = (mobile: string) => {
  // Check if mobile number (with or without country code) matches the dummy number
  const cleaned = mobile.replace(/[^+\d]/g, "");
  return cleaned === DUMMY_MOBILE || cleaned === "1111111111";
};

export const getDummyConfirmationResult = (): DummyConfirmationResult => {
  console.log("[DUMMY_AUTH] Generated dummy confirmation result");
  return {
    isDummy: true,
    confirm: async (code: string) => {
      console.log(`[DUMMY_AUTH] Dummy verification called with code: ${code}`);
      // Accept fixed OTPs: 123456 or 654321, or any 6-digit code
      if (!/^\d{6}$/.test(code)) {
        throw {
          code: "auth/invalid-verification-code",
          message: "The verification code is invalid.",
        };
      }
      return {
        user: {
          uid: DUMMY_UID,
          phoneNumber: DUMMY_MOBILE,
        },
      };
    },
  };
};
