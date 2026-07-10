/**
 * Utility to generate initials from a user's first and last name.
 * Handles edge cases like spaces, null/undefined, and returns uppercase.
 */
export const getInitials = (firstName?: string | null, lastName?: string | null): string => {
  try {
    const firstClean = firstName ? firstName.trim().replace(/\s+/g, "") : "";
    const lastClean = lastName ? lastName.trim().replace(/\s+/g, "") : "";

    if (firstClean && lastClean) {
      return `${firstClean.charAt(0)}${lastClean.charAt(0)}`.toUpperCase();
    }
    if (firstClean) {
      return firstClean.charAt(0).toUpperCase();
    }
    if (lastClean) {
      return lastClean.charAt(0).toUpperCase();
    }
    return "";
  } catch (error) {
    console.error("Error generating initials:", error);
    return "";
  }
};

/**
 * Utility to construct a display name preferring the profile's first/last name,
 * and falling back to Google account name (fullName) or default.
 */
export const getDisplayName = (
  user?: { firstName?: string | null; lastName?: string | null; fullName?: string | null } | null,
  profile?: { firstName?: string | null; lastName?: string | null } | null
): string => {
  const target = profile || user;
  if (!target) return "User Profile";
  const profileName = (target.firstName || target.lastName)
    ? `${target.firstName || ""} ${target.lastName || ""}`.trim()
    : "";
  if (profileName) return profileName;
  if (user?.fullName) return user.fullName;
  return "User Profile";
};

