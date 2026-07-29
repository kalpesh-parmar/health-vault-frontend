import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * Reusable hook to handle bottom spacing (padding or margin) depending on the
 * device's bottom navigation bar type.
 * 
 * - Android 3-button navigation (insets.bottom > 20): returns the system inset + extraOffset.
 * - Gesture navigation (Android/iOS): returns gestureValue (default is 0).
 * 
 * @param gestureValue Spacing value to use when gesture navigation is enabled (default: 0)
 * @param extraOffset Additional offset to add to the navigation bar height in 3-button mode (default: 0)
 */
export const useBottomBarPadding = (gestureValue = 0, extraOffset = 0) => {
  const insets = useSafeAreaInsets();

  if (Platform.OS === "android") {
    const isThreeButton = insets.bottom > 20;
    return isThreeButton ? insets.bottom + extraOffset : gestureValue;
  }

  // iOS notch/home indicator devices only support gesture navigation.
  // The user requested no bottom padding when gesture navigation is active.
  return gestureValue;
};
