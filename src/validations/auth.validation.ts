export const validateMobileNumber = (mobile: string): boolean => {
  // Check if mobile number contains exactly 10 digits
  const cleaned = mobile.replace(/\D/g, "");
  return cleaned.length === 10;
};
