import React from "react";
import { View } from "react-native";
import { useBottomBarPadding } from "../../hooks/useBottomBarPadding";

interface BottomSpacerProps {
  gestureValue?: number;
  extraOffset?: number;
}

/**
 * Reusable layout spacer component that automatically sizes its height
 * depending on whether the device navigation bar type is 3-button or gesture.
 */
export const BottomSpacer: React.FC<BottomSpacerProps> = ({
  gestureValue = 0,
  extraOffset = 0,
}) => {
  const height = useBottomBarPadding(gestureValue, extraOffset);
  return <View style={{ height }} />;
};

export default BottomSpacer;
