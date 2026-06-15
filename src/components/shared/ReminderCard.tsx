import React, { useState } from "react";
import {
  Platform,
  UIManager,
  ActivityIndicator,
  View,
} from "react-native";
import styled from "styled-components/native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Reminder } from "../../types";
import Animated, {
  ZoomIn,
  ZoomOut,
  LinearTransition,
} from "react-native-reanimated";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface ReminderCardProps {
  item: Reminder;
  isDark: boolean;
  index?: number;
  onActionPress?: () => void | Promise<void>;
  onSkipPress?: () => void;
  onSnoozePress?: () => void;
}

const parseSafeDate = (dateVal: any): Date => {
  if (!dateVal) return new Date("");
  if (typeof dateVal === 'object' && dateVal !== null && 'seconds' in dateVal) {
    return new Date(dateVal.seconds * 1000);
  }
  let date = new Date(dateVal);
  if (isNaN(date.getTime()) && typeof dateVal === 'string') {
    // Try converting "YYYY-MM-DD HH:mm:ss" to "YYYY-MM-DDTHH:mm:ss"
    date = new Date(dateVal.replace(" ", "T"));
  }
  return date;
};

const getReminderState = (item: Reminder, isDark: boolean) => {
  const baseStatus = (item.status || "pending").toUpperCase();
  let normalizedStatus = (baseStatus === "PENDING" && item.isOverdue) ? "OVERDUE" : baseStatus;
  if (baseStatus === "COMPLETED" && (item as any).isOverdue) {
    normalizedStatus = "COMPLETED_LATE";
  }

  // Icon Mapping
  const MEDICATION_ICONS: Record<
    string,
    { family: "Ionicons" | "MaterialCommunityIcons"; name: string }
  > = {
    TABLET: { family: "MaterialCommunityIcons", name: "pill" },
    CAPSULE: { family: "MaterialCommunityIcons", name: "pill" },
    DROPS: { family: "Ionicons", name: "water-outline" },
    INJECTION: { family: "MaterialCommunityIcons", name: "needle" },
    SYRUP: { family: "MaterialCommunityIcons", name: "bottle-tonic" },
  };

  const medType = (item.medicationType || "").toUpperCase();
  const medIcon = MEDICATION_ICONS[medType] || {
    family: "Ionicons",
    name: "medkit-outline",
  };

  // Actual MedicationTime
  let formattedTime = "Time Unknown";
  let dateLabel = "";
  if (item.actualMedicationTime) {
    const medDate = parseSafeDate(item.actualMedicationTime);

    if (!isNaN(medDate.getTime())) {
      const utcTime = medDate.getTime() + medDate.getTimezoneOffset() * 60000;
      const istTime = new Date(utcTime + 330 * 60000);

      let h = istTime.getHours();
      const m = istTime.getMinutes();
      const ampm = h >= 12 ? "PM" : "AM";
      h = h % 12;
      h = h ? h : 12;
      formattedTime = `${h < 10 ? "0" + h : h}:${m < 10 ? "0" + m : m} ${ampm} IST`;

      const now = new Date();
      const nowUtc = now.getTime() + now.getTimezoneOffset() * 60000;
      const nowIst = new Date(nowUtc + 330 * 60000);
      const today = new Date(
        nowIst.getFullYear(),
        nowIst.getMonth(),
        nowIst.getDate(),
      );
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const medDateOnly = new Date(
        istTime.getFullYear(),
        istTime.getMonth(),
        istTime.getDate(),
      );

      if (medDateOnly.getTime() === today.getTime()) {
        dateLabel = "Today";
      } else if (medDateOnly.getTime() === tomorrow.getTime()) {
        dateLabel = "Tomorrow";
      } else {
        dateLabel = istTime.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
      }
    } else {
      formattedTime = item.actualMedicationTime;
    }
  }
  const actualMedicationTimeStr = formattedTime;

  // Calculated Due Time
  let diffH = 0;
  let diffM = 0;
  let hasValidDiff = false;

  if (item.actualMedicationTime) {
    const medDate = parseSafeDate(item.actualMedicationTime);
    if (!isNaN(medDate.getTime())) {
      let compareDate: Date | null = null;
      if (item.status?.toUpperCase() === "COMPLETED") {
        if (item.completedAt) {
          compareDate = parseSafeDate(item.completedAt);
        }
      } else {
        compareDate = new Date();
      }

      if (compareDate && !isNaN(compareDate.getTime())) {
        let diffMs = medDate.getTime() - compareDate.getTime();

        // Just get the absolute difference for the display
        const absDiff = Math.abs(diffMs);
        diffH = Math.floor(absDiff / (1000 * 60 * 60));
        diffM = Math.floor((absDiff % (1000 * 60 * 60)) / (1000 * 60));
        hasValidDiff = true;
      }
    }
  }

  let calculatedDueTime = "";
  if (hasValidDiff) {
    if (diffH >= 24) {
      const days = Math.floor(diffH / 24);
      calculatedDueTime = `${days} Day${days > 1 ? "s" : ""}`;
    } else {
      calculatedDueTime = `${diffH}h ${diffM}m`;
    }
  }

  let completedAt = "Unknown";
  if (item.completedAt) {
    const d = parseSafeDate(item.completedAt);
    if (!isNaN(d.getTime())) {
      const utcTime = d.getTime() + d.getTimezoneOffset() * 60000;
      const istTime = new Date(utcTime + 330 * 60000);
      let h = istTime.getHours();
      const m = istTime.getMinutes();
      const ampm = h >= 12 ? "PM" : "AM";
      h = h % 12;
      h = h ? h : 12;
      const timeStr = `${h < 10 ? "0" + h : h}:${m < 10 ? "0" + m : m} ${ampm}`;
      
      const day = istTime.getDate().toString().padStart(2, "0");
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const month = monthNames[istTime.getMonth()];
      const year = istTime.getFullYear();
      
      completedAt = `${day} ${month} ${year}, ${timeStr}`;
    }
  }

  const UI_CONFIG = {
    PENDING: {
      themeColor: "#f97316", // orange
      bgLight: "#fff8f1",
      bgDark: "#2c1c0e",
      borderLight: "#ffedd5",
      borderDark: "#432c1a",
      reminderDate: dateLabel,
      topRightTextLine2: actualMedicationTimeStr,
      topRightIcon: "calendar-outline" as any,
      bottomLeftText: `Due in ${calculatedDueTime}`,
      bottomLeftIcon: "time-outline" as any,
      btnText: "Mark Complete",
      btnIcon: "checkmark-circle" as any,
      badgeText: "PENDING",
    },
    COMPLETED: {
      themeColor: "#10b981", // green
      bgLight: "#f0fdf4",
      bgDark: "#0f291e",
      borderLight: "#dcfce7",
      borderDark: "#1a402d",
      reminderDate: dateLabel,
      topRightTextLine2: actualMedicationTimeStr,
      topRightIcon: "checkmark-done-outline" as any,
      bottomLeftText: `Completed at ${completedAt}`,
      bottomLeftIcon: "time-outline" as any,
      btnText: "",
      btnIcon: "" as any,
      badgeText: "COMPLETED",
    },
    COMPLETED_LATE: {
      themeColor: "#10b981", // green (rest of card)
      bgLight: "#f0fdf4",
      bgDark: "#0f291e",
      borderLight: "#dcfce7",
      borderDark: "#1a402d",
      reminderDate: calculatedDueTime ? "Late By" : dateLabel,
      topRightTextLine2: calculatedDueTime ? calculatedDueTime : actualMedicationTimeStr,
      topRightIcon: "checkmark-done-outline" as any,
      bottomLeftText: `Completed at ${completedAt}`,
      bottomLeftIcon: "time-outline" as any,
      btnText: "",
      btnIcon: "" as any,
      badgeText: "COMPLETED LATE",
    },
    OVERDUE: {
      themeColor: "#ef4444", // red
      bgLight: "#fef2f2",
      bgDark: "#2d1618",
      borderLight: "#fee2e2",
      borderDark: "#451e20",
      reminderDate: `Late: ${calculatedDueTime}`,
      topRightTextLine2: actualMedicationTimeStr,
      topRightIcon: "alarm-outline" as any,
      bottomLeftText: `Scheduled at ${actualMedicationTimeStr}`,
      bottomLeftIcon: "calendar-outline" as any,
      btnText: "Complete Now",
      btnIcon: "checkmark-circle" as any,
      badgeText: "OVERDUE",
    },
  };

  const config =
    UI_CONFIG[normalizedStatus as keyof typeof UI_CONFIG] || UI_CONFIG.PENDING;

  let isActionAllowed = true;
  let availableAtTimeStr = "";
  if (normalizedStatus === "PENDING" && item.actualMedicationTime) {
    const time = parseSafeDate(item.actualMedicationTime);
    const now = new Date();
    const adjustedTime = new Date(time.getTime() - 5 * 60 * 1000);
    if (now.getTime() < adjustedTime.getTime()) {
      isActionAllowed = false;
      availableAtTimeStr = adjustedTime.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    }
  }

  const isCompletedLate = normalizedStatus === "COMPLETED_LATE";

  return {
    medIcon,
    actualMedicationTimeStr,
    calculatedDueTime,
    config,
    bg: isDark ? config.bgDark : config.bgLight,
    borderColor: isDark ? config.borderDark : config.borderLight,
    iconBg: isDark ? config.borderDark : config.borderLight,
    badgeThemeColor: isCompletedLate ? "#ef4444" : config.themeColor,
    badgeBg: isCompletedLate ? (isDark ? "#2d1618" : "#fef2f2") : (isDark ? config.borderDark : config.borderLight),
    badgeBorder: isCompletedLate ? "#ef4444" : config.themeColor,
    topRightBorder: isCompletedLate ? "#ef4444" : (isDark ? config.borderDark : config.borderLight),
    isActionAllowed,
    availableAtTimeStr,
  };
};

const ReminderCard: React.FC<ReminderCardProps> = ({
  item,
  isDark,
  index,
  onActionPress,
}) => {
  const [isCompleting, setIsCompleting] = useState(false);
  const state = getReminderState(item, isDark);

  const handlePress = async () => {
    if (onActionPress) {
      setIsCompleting(true);
      try {
        await onActionPress();
      } catch (error) {
        setIsCompleting(false);
      }
    }
  };

  const description =
    (item as any).notes ||
    `Take ${item.dosePerIntake || 1} ${item.medicationType ? item.medicationType.toLowerCase() : "dose"}${item.frequency ? ` • ${item.frequency.replace(/_/g, " ")}` : ""}`;

  return (
    <Animated.View
      entering={ZoomIn.delay(((index || 0) % 10) * 100).springify()}
      exiting={isCompleting ? ZoomOut.springify() : undefined}
      layout={LinearTransition.springify()}
    >
      <CardContainer
        bg={state.bg}
        borderColor={state.borderColor}
        activeOpacity={0.9}
      >
        <MainContent>
          <DetailsContainer>
            <HeaderRow>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <StatusBadge
                  bg={state.badgeBg}
                  borderColor={state.badgeBorder}
                >
                  <StatusText color={state.badgeThemeColor}>
                    {state.config.badgeText || item.status}
                  </StatusText>
                </StatusBadge>
              </View>

                <TopRightBadge
                  bg={state.badgeBg}
                  borderColor={state.topRightBorder}
                >
                  <Ionicons
                    name={state.config.topRightIcon}
                    size={16}
                    color={state.badgeThemeColor}
                    style={{ marginRight: 6 }}
                  />
                  <TopRightTextContainer>
                    <TopRightDateText color={state.badgeThemeColor}>
                      {state.config.reminderDate}
                    </TopRightDateText>
                    <TopRightTimeText color={state.badgeThemeColor}>
                      {state.config.topRightTextLine2}
                    </TopRightTimeText>
                  </TopRightTextContainer>
                </TopRightBadge>
            </HeaderRow>

            <TitleText isDark={isDark} numberOfLines={1}>
              {item.medicationName || "Medication"}
            </TitleText>
            <DescText isDark={isDark} numberOfLines={2}>
              {description}
            </DescText>

            <InfoRow>
              {item.medicationType && (
                <InfoBadge bg={state.iconBg}>
                  {state.medIcon.family === "Ionicons" ? (
                    <Ionicons
                      name={state.medIcon.name as any}
                      size={12}
                      color={state.config.themeColor}
                    />
                  ) : (
                    <MaterialCommunityIcons
                      name={state.medIcon.name as any}
                      size={12}
                      color={state.config.themeColor}
                    />
                  )}
                  <InfoText color={state.config.themeColor}>
                    {item.medicationType}
                  </InfoText>
                </InfoBadge>
              )}
            </InfoRow>
          </DetailsContainer>
        </MainContent>

        <Divider color={state.borderColor} />

        <FooterRow>
          <BottomLeft>
            <Ionicons
              name={state.config.bottomLeftIcon}
              size={15}
              color={state.config.themeColor}
            />
            <BottomLeftText color={state.config.themeColor} numberOfLines={1}>
              {state.config.bottomLeftText}
            </BottomLeftText>
          </BottomLeft>

          {state.config.btnText !== "" &&
            onActionPress &&
            (state.isActionAllowed ? (
              <ActionButton
                bg={state.config.themeColor}
                onPress={handlePress}
                disabled={isCompleting}
              >
                {isCompleting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <ActionText>{state.config.btnText}</ActionText>
                    <Ionicons
                      name={state.config.btnIcon}
                      size={14}
                      color="#fff"
                      style={{ marginLeft: 4 }}
                    />
                  </>
                )}
              </ActionButton>
            ) : (
              <NotAllowedContainer>
                <Ionicons
                  name="lock-closed-outline"
                  size={13}
                  color={isDark ? "#94a3b8" : "#64748b"}
                  style={{ marginRight: 4 }}
                />
                <NotAllowedText isDark={isDark}>
                  Action available at {state.availableAtTimeStr}
                </NotAllowedText>
              </NotAllowedContainer>
            ))}
        </FooterRow>
      </CardContainer>
    </Animated.View>
  );
};

export default ReminderCard;

// --- Styled Components ---

const CardContainer = styled.TouchableOpacity<{
  bg: string;
  borderColor: string;
}>`
  background-color: ${({ bg }: { bg: string }) => bg};
  border-radius: 14px;
  padding: 12px;
  margin-bottom: 10px;
  border-width: 1px;
  border-color: ${({ borderColor }: { borderColor: string }) => borderColor};
  elevation: 1;
  shadow-color: #000;
  shadow-offset: 0px 1px;
  shadow-opacity: 0.04;
  shadow-radius: 3px;
`;

const MainContent = styled.View`
  flex-direction: row;
  align-items: stretch;
`;

const DetailsContainer = styled.View`
  flex: 1;
`;

const HeaderRow = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
`;

const StatusBadge = styled.View<{ bg: string; borderColor: string }>`
  background-color: ${({ bg }: { bg: string }) => bg};
  padding-horizontal: 8px;
  padding-vertical: 3px;
  border-radius: 10px;
  border-width: 1px;
  border-color: ${({ borderColor }: { borderColor: string }) => borderColor};
  align-self: flex-start;
`;

const StatusText = styled.Text<{ color: string }>`
  color: ${({ color }: { color: string }) => color};
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
`;

const TopRightBadge = styled.View<{ bg: string; borderColor: string }>`
  flex-direction: row;
  align-items: center;
  background-color: ${({ bg }: { bg: string }) => bg};
  padding-horizontal: 8px;
  padding-vertical: 4px;
  border-radius: 6px;
  border-width: 1px;
  border-color: ${({ borderColor }: { borderColor: string }) => borderColor};
`;

const TopRightTextContainer = styled.View`
  flex-direction: column;
  justify-content: center;
`;

const TopRightDateText = styled.Text<{ color: string }>`
  color: ${({ color }: { color: string }) => color};
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  opacity: 0.8;
`;

const TopRightTimeText = styled.Text<{ color: string }>`
  color: ${({ color }: { color: string }) => color};
  font-size: 12px;
  font-weight: 600;
  margin-top: 1px;
`;

const TitleText = styled.Text<{ isDark: boolean }>`
  font-size: 15px;
  font-weight: 700;
  color: ${({ isDark }: { isDark: boolean }) =>
    isDark ? "#f8fafc" : "#1e293b"};
  margin-bottom: 3px;
`;

const DescText = styled.Text<{ isDark: boolean }>`
  font-size: 12px;
  color: ${({ isDark }: { isDark: boolean }) =>
    isDark ? "#94a3b8" : "#64748b"};
  margin-bottom: 8px;
`;

const InfoRow = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 8px;
`;

const InfoBadge = styled.View<{ bg: string }>`
  flex-direction: row;
  align-items: center;
  background-color: ${({ bg }: { bg: string }) => bg};
  padding-horizontal: 6px;
  padding-vertical: 3px;
  border-radius: 6px;
`;

const InfoText = styled.Text<{ color: string }>`
  color: ${({ color }: { color: string }) => color};
  font-size: 10px;
  font-weight: 600;
  margin-left: 4px;
`;

const Divider = styled.View<{ color: string }>`
  height: 1px;
  background-color: ${({ color }: { color: string }) => color};
  margin-vertical: 10px;
`;

const FooterRow = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
`;

const BottomLeft = styled.View`
  flex-direction: row;
  align-items: center;
  flex: 1;
  margin-right: 8px;
`;

const BottomLeftText = styled.Text<{ color: string }>`
  color: ${({ color }: { color: string }) => color};
  font-size: 12px;
  font-weight: 600;
  margin-left: 6px;
  flex-shrink: 1;
`;

const ActionButton = styled.TouchableOpacity<{ bg: string }>`
  flex-direction: row;
  align-items: center;
  background-color: ${({ bg }: { bg: string }) => bg};
  padding-horizontal: 12px;
  padding-vertical: 6px;
  border-radius: 16px;
  flex-shrink: 1;
`;

const ActionText = styled.Text`
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  flex-shrink: 1;
`;

const NotAllowedContainer = styled.View`
  flex-direction: row;
  align-items: center;
  background-color: transparent;
  padding-horizontal: 8px;
  padding-vertical: 6px;
  flex-shrink: 1;
`;

const NotAllowedText = styled.Text<{ isDark: boolean }>`
  color: ${({ isDark }: { isDark: boolean }) =>
    isDark ? "#94a3b8" : "#64748b"};
  font-size: 11px;
  font-weight: 500;
  flex-shrink: 1;
`;
