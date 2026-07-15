import React from "react";
import { View, Text } from "react-native";
import Svg, { Circle, Rect, Path } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";

export interface MedicineIconProps {
  type: string;
  size?: number;
  color?: string;
}

export function MedicineIcon({
  type,
  size = 24,
  color = "#6366f1",
}: MedicineIconProps) {
  const normType = (type || "").toUpperCase();

  if (normType === "TABLET") {
    return (
      <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
        <Circle cx="24" cy="24" r="20" stroke={color} strokeWidth="4" />
        <Path
          d="M10 24H38"
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
        />
      </Svg>
    );
  }

  if (normType === "CAPSULE") {
    return (
      <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
        <Path
          d="M16 18C16 13.58 19.58 10 24 10C28.42 10 32 13.58 32 18V24H16V18Z"
          fill={color}
        />
        <Path
          d="M16 24V30C16 34.42 19.58 38 24 38C28.42 38 32 34.42 32 30V24H16Z"
          stroke={color}
          strokeWidth="4"
          fill={`${color}30`}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    );
  }

  if (normType === "SYRUP") {
    return (
      <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
        <Rect x="20" y="6" width="8" height="6" rx="1" fill={color} />
        <Rect x="22" y="12" width="4" height="6" fill={color} />
        <Rect
          x="14"
          y="18"
          width="20"
          height="24"
          rx="4"
          stroke={color}
          strokeWidth="4"
        />
        <Rect
          x="18"
          y="24"
          width="12"
          height="12"
          rx="1"
          fill={color}
          opacity="0.3"
        />
      </Svg>
    );
  }

  if (normType === "INJECTION") {
    return (
      <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
        <Path
          d="M24 4V12"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
        />
        <Rect
          x="20"
          y="12"
          width="8"
          height="22"
          rx="1"
          stroke={color}
          strokeWidth="4"
        />
        <Path
          d="M20 18H24M20 23H24M20 28H24"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
        />
        <Path
          d="M24 34V42M18 42H30"
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
        />
      </Svg>
    );
  }

  if (normType === "DROPS") {
    return (
      <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
        <Path
          d="M26 12L12 26"
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
        />
        <Path
          d="M36 6C34 4 30 4 28 6L32 10"
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
        />
        <Path
          d="M12 36C12 36 9 39 9 41C9 42.66 10.34 44 12 44C13.66 44 15 42.66 15 41C15 39 12 36 12 36Z"
          fill={color}
        />
      </Svg>
    );
  }

  if (normType === "SPRAY") {
    return (
      <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
        <Rect
          x="16"
          y="22"
          width="16"
          height="20"
          rx="3"
          stroke={color}
          strokeWidth="4"
        />
        <Rect x="22" y="14" width="4" height="8" fill={color} />
        <Path d="M20 8H28V14H20V8Z" fill={color} />
        <Circle cx="12" cy="10" r="2" fill={color} />
        <Circle cx="36" cy="10" r="2" fill={color} />
      </Svg>
    );
  }

  if (normType === "INHALER") {
    return (
      <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
        <Rect
          x="26"
          y="6"
          width="10"
          height="24"
          rx="2"
          stroke={color}
          strokeWidth="4"
        />
        <Path
          d="M22 18H38V42H22V36H10V26H22V18Z"
          stroke={color}
          strokeWidth="4"
          strokeLinejoin="round"
          fill="none"
        />
        <Path d="M10 26V36H6V26H10Z" fill={color} />
      </Svg>
    );
  }

  return <Ionicons name="medical-outline" size={size} color={color} />;
}

export interface DoseVisualProps {
  type: string;
  value: number;
  unit?: string;
  size?: number;
  color?: string;
}

export function DoseVisual({
  type,
  value,
  unit,
  size = 32,
  color = "#6366f1",
}: DoseVisualProps) {
  const normType = (type || "").toUpperCase();
  const val = Number(value) || 0;

  if (normType === "TABLET") {
    const wholePills = Math.floor(val);
    const remainder = val - wholePills;

    const renderPillSVG = (filledWedges: number, keyStr: string) => {
      return (
        <Svg
          key={keyStr}
          width={size}
          height={size}
          viewBox="0 0 100 100"
          style={{ marginRight: 6 }}
        >
          <Circle
            cx="50"
            cy="50"
            r="42"
            stroke={color}
            strokeWidth="6"
            fill="#f8fafc"
          />
          <Path
            d="M 50 50 L 50 8 C 73 8, 92 27, 92 50 Z"
            fill={filledWedges >= 1 ? color : "transparent"}
          />
          <Path
            d="M 50 50 L 92 50 C 92 73, 73 92, 50 92 Z"
            fill={filledWedges >= 2 ? color : "transparent"}
          />
          <Path
            d="M 50 50 L 50 92 C 27 92, 8 73, 8 50 Z"
            fill={filledWedges >= 3 ? color : "transparent"}
          />
          <Path
            d="M 50 50 L 8 50 C 8 27, 27 8, 50 8 Z"
            fill={filledWedges >= 4 ? color : "transparent"}
          />
          <Path
            d="M 50 8 L 50 92 M 8 50 L 92 50"
            stroke={color}
            strokeWidth="2"
            strokeDasharray="4 2"
          />
        </Svg>
      );
    };

    const pills = [];
    for (let i = 0; i < wholePills; i++) {
      pills.push(renderPillSVG(4, `whole-${i}`));
    }
    if (remainder > 0) {
      const wedges = Math.round(remainder * 4);
      pills.push(renderPillSVG(wedges, "remainder"));
    }
    if (pills.length === 0) {
      pills.push(renderPillSVG(0, "empty"));
    }

    return (
      <View
        style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap" }}
        accessibilityLabel={`${val} tablet`}
      >
        {pills}
      </View>
    );
  }

  if (normType === "CAPSULE") {
    const roundedVal = Math.max(1, Math.round(val));
    const showCount = roundedVal <= 5;
    return (
      <View
        style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap" }}
        accessibilityLabel={`${roundedVal} capsule`}
      >
        {showCount ? (
          Array.from({ length: roundedVal }).map((_, i) => (
            <View key={i} style={{ marginRight: 4 }}>
              <MedicineIcon type="CAPSULE" size={size} color={color} />
            </View>
          ))
        ) : (
          <>
            <MedicineIcon type="CAPSULE" size={size} color={color} />
            <Text
              style={{ fontSize: 14, fontWeight: "bold", color, marginLeft: 4 }}
            >
              ×{roundedVal}
            </Text>
          </>
        )}
      </View>
    );
  }

  if (normType === "SPRAY" || normType === "INHALER") {
    const roundedVal = Math.max(1, Math.round(val));
    const showCount = roundedVal <= 5;
    return (
      <View
        style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap" }}
        accessibilityLabel={`${roundedVal} puff`}
      >
        {showCount ? (
          Array.from({ length: roundedVal }).map((_, i) => (
            <View key={i} style={{ marginRight: 4 }}>
              <MedicineIcon type={normType} size={size} color={color} />
            </View>
          ))
        ) : (
          <>
            <MedicineIcon type={normType} size={size} color={color} />
            <Text
              style={{ fontSize: 14, fontWeight: "bold", color, marginLeft: 4 }}
            >
              ×{roundedVal}
            </Text>
          </>
        )}
      </View>
    );
  }

  return (
    <View
      style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap" }}
      accessibilityLabel={`${val} ${unit || ""}`}
    >
      <View style={{ marginRight: 6 }}>
        <MedicineIcon type={normType} size={size} color={color} />
      </View>
      <Text style={{ fontSize: 14, fontWeight: "bold", color }}>
        {val} {unit || ""}
      </Text>
    </View>
  );
}

/**
 * Safely parses the chosen JSON raw value and returns the parsed object (or null on failure).
 * Exposes helper properties to quickly resolve selections in widgets.
 */
export function parseChosenJson(rawValue: string | null | undefined): any {
  if (!rawValue) return null;
  const trimmed = rawValue.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
    return null;
  }
  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}

