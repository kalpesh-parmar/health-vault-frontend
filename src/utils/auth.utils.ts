/**
 * Formats a 10 digit mobile number to E.164 standard (e.g. +91XXXXXXXXXX)
 */
export const formatPhoneNumberE164 = (mobile: string, countryCode = "+91"): string => {
  const cleaned = mobile.replace(/\D/g, "");
  // Ensure the countryCode has a plus sign
  const formattedCode = countryCode.startsWith("+") ? countryCode : `+${countryCode}`;
  return `${formattedCode}${cleaned}`;
};

/**
 * Masks a mobile number to show only the last 4 digits (e.g. +91******1234)
 */
export const maskPhoneNumber = (mobile: string): string => {
  if (mobile.length < 4) return mobile;
  const last4 = mobile.slice(-4);
  const countryAndHiddenLength = mobile.length - 4;
  const hidden = "*".repeat(Math.max(1, countryAndHiddenLength));
  return `${hidden}${last4}`;
};
