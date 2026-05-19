import React, { useState } from "react";
import { LayoutAnimation, Platform, UIManager } from "react-native";
import styled from "styled-components/native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Reminder } from "../../types";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface ReminderCardProps {
  item: Reminder;
  isDark: boolean;
  onActionPress?: () => void;
  onAlarmPress?: () => void;
}

const ReminderCard: React.FC<ReminderCardProps> = ({
  item,
  isDark,
  onActionPress,
  onAlarmPress,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded(!isExpanded);
  };

  // Determine status color & icons
  let statusIcon = "time-outline";
  let statusColor = "#6366f1"; // Upcoming Violet
  if (item.status === "overdue") {
    statusIcon = "alert-circle-outline";
    statusColor = "#ef4444"; // Overdue Red
  } else if (item.status === "completed") {
    statusIcon = "checkmark-done-circle-outline";
    statusColor = "#10b981"; // Completed Green
  }

  // Determine category style & icons
  let categoryIcon: any = "alarm-outline";
  let categoryBg = isDark ? "rgba(255, 255, 255, 0.08)" : "#f1f5f9";
  let categoryColor = isDark ? "#cbd5e1" : "#475569";

  if (item.category === "Medication") {
    categoryIcon = "pill";
    categoryBg = isDark ? "rgba(99, 102, 241, 0.15)" : "#eef2ff";
    categoryColor = "#6366f1";
  } else if (item.category === "Vaccination") {
    categoryIcon = "needle";
    categoryBg = isDark ? "rgba(245, 158, 11, 0.15)" : "#fffbeb";
    categoryColor = "#f59e0b";
  } else if (item.category === "Appointment") {
    categoryIcon = "calendar-outline";
    categoryBg = isDark ? "rgba(20, 184, 166, 0.15)" : "#f0fdfa";
    categoryColor = "#14b8a6";
  }

  return (
    <CardContainer
      isDark={isDark}
      status={item.status}
      activeOpacity={0.9}
      onPress={toggleExpand}
    >
      <CardBody>
        <StatusIndicator status={item.status} />

        <TextContent>
          <HeaderRow>
            <CardTitle isDark={isDark} numberOfLines={1}>
              {item.title}
            </CardTitle>
            <CategoryBadge style={{ backgroundColor: "#fffbeb" }}>
              <CategoryText style={{ color: "#f59e0b" }}>
                {item.category}
              </CategoryText>
            </CategoryBadge>
          </HeaderRow>

          {item.medicationName && (
            <MedicationSubtext>Med: {item.medicationName}</MedicationSubtext>
          )}

          <ScheduleRow>
            <ScheduleItem>
              <Ionicons
                name="time-outline"
                size={13}
                color={isDark ? "#94a3b8" : "#64748b"}
              />
              <ScheduleText isDark={isDark}>{item.time}</ScheduleText>
            </ScheduleItem>
            <ScheduleItem style={{ marginLeft: 12 }}>
              <Ionicons
                name="calendar-outline"
                size={13}
                color={isDark ? "#94a3b8" : "#64748b"}
              />
              <ScheduleText isDark={isDark}>{item.date}</ScheduleText>
            </ScheduleItem>
          </ScheduleRow>
        </TextContent>
      </CardBody>

      <CardFooter isDark={isDark}>
        <StatusRow>
          <Ionicons name={statusIcon as any} size={15} color={statusColor} />
          <StatusLabel style={{ color: statusColor }}>
            {item.status.toUpperCase()}
          </StatusLabel>
        </StatusRow>

        <ActionsContainer>
          {onActionPress && (
            <ActionButton
              onPress={onActionPress}
              isDark={isDark}
              completed={item.status === "completed"}
            >
              {item.status === "completed" ? (
                <>
                  <Ionicons
                    name="refresh-outline"
                    size={15}
                    color={isDark ? "#94a3b8" : "#64748b"}
                  />
                  <ActionButtonLabel
                    style={{ color: isDark ? "#94a3b8" : "#64748b" }}
                  >
                    Undo
                  </ActionButtonLabel>
                </>
              ) : (
                <>
                  <Ionicons name="checkmark-done" size={15} color="#10b981" />
                  <ActionButtonLabel style={{ color: "#10b981" }}>
                    Done
                  </ActionButtonLabel>
                </>
              )}
            </ActionButton>
          )}
        </ActionsContainer>
      </CardFooter>
    </CardContainer>
  );
};

export default ReminderCard;

/**
 * Styled Components for ReminderCard
 */

const CardContainer = styled.TouchableOpacity<{ isDark: boolean; status: string }>`
  background-color: ${({ isDark }: { isDark: boolean }) =>
    isDark ? "#1e293b" : "white"};
  border-radius: 18px;
  padding: 14px;
  margin-bottom: 12px;
  elevation: 3;
  shadow-color: #000;
  shadow-offset: 0px 3px;
  shadow-opacity: 0.04;
  shadow-radius: 6px;
  border-width: 1px;
  border-color: ${({ isDark }: { isDark: boolean }) =>
    isDark ? "#334155" : "#f1f5f9"};
  overflow: hidden;
  position: relative;
`;

const CardBody = styled.View`
  flex-direction: row;
  align-items: flex-start;
`;

const StatusIndicator = styled.View<{ status: string }>`
  position: absolute;
  left: -14px;
  top: 0;
  bottom: 0;
  width: 4px;
  background-color: ${({ status }: { status: string }) =>
    status === "overdue"
      ? "#ef4444"
      : status === "completed"
        ? "#10b981"
        : "#6366f1"};
`;

const IconWrapper = styled.View`
  width: 44px;
  height: 44px;
  border-radius: 10px;
  justify-content: center;
  align-items: center;
  margin-right: 12px;
`;

const TextContent = styled.View`
  flex: 1;
`;

const HeaderRow = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
`;

const CardTitle = styled.Text<{ isDark: boolean }>`
  font-size: 15px;
  font-weight: 700;
  color: ${({ isDark }: { isDark: boolean }) =>
    isDark ? "#f8fafc" : "#1e293b"};
  flex: 1;
  margin-right: 6px;
`;

const CategoryBadge = styled.View`
  padding-horizontal: 8px;
  padding-vertical: 3px;
  border-radius: 6px;
`;

const CategoryText = styled.Text`
  font-size: 9px;
  font-weight: 700;
`;

const MedicationSubtext = styled.Text`
  font-size: 11px;
  font-weight: 600;
  color: #6366f1;
  margin-top: 2px;
`;

const ScheduleRow = styled.View`
  flex-direction: row;
  align-items: center;
  margin-top: 6px;
`;

const ScheduleItem = styled.View`
  flex-direction: row;
  align-items: center;
`;

const ScheduleText = styled.Text<{ isDark: boolean }>`
  font-size: 11px;
  color: ${({ isDark }: { isDark: boolean }) =>
    isDark ? "#cbd5e1" : "#64748b"};
  font-weight: 500;
  margin-left: 4px;
`;

const NotesSection = styled.View<{ isDark: boolean }>`
  margin-top: 12px;
  padding-top: 10px;
  border-top-width: 1px;
  border-top-color: ${({ isDark }: { isDark: boolean }) =>
    isDark ? "#334155" : "#f1f5f9"};
`;

const NotesTitle = styled.Text<{ isDark: boolean }>`
  font-size: 11px;
  font-weight: 700;
  color: ${({ isDark }: { isDark: boolean }) =>
    isDark ? "#cbd5e1" : "#475569"};
  margin-bottom: 3px;
`;

const NotesBody = styled.Text<{ isDark: boolean }>`
  font-size: 12px;
  color: ${({ isDark }: { isDark: boolean }) =>
    isDark ? "#94a3b8" : "#64748b"};
  line-height: 16px;
`;

const CardFooter = styled.View<{ isDark: boolean }>`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  margin-top: 12px;
  padding-top: 10px;
  border-top-width: 1px;
  border-top-color: ${({ isDark }: { isDark: boolean }) =>
    isDark ? "#334155" : "#f1f5f9"};
`;

const StatusRow = styled.View`
  flex-direction: row;
  align-items: center;
`;

const StatusLabel = styled.Text`
  font-size: 10px;
  font-weight: 800;
  margin-left: 5px;
  letter-spacing: 0.3px;
`;

const ActionsContainer = styled.View`
  flex-direction: row;
  align-items: center;
`;

const ActionButton = styled.TouchableOpacity<{
  isDark: boolean;
  completed?: boolean;
}>`
  flex-direction: row;
  align-items: center;
  padding-horizontal: 8px;
  padding-vertical: 5px;
  border-radius: 6px;
  border-width: 1px;
  border-color: ${({
    isDark,
    completed,
  }: {
    isDark: boolean;
    completed?: boolean;
  }) =>
    completed
      ? isDark
        ? "#334155"
        : "#cbd5e1"
      : isDark
        ? "#334155"
        : "#e2e8f0"};
  background-color: ${({ isDark }: { isDark: boolean }) =>
    isDark ? "#0f172a" : "#f8fafc"};
`;

const ActionButtonLabel = styled.Text`
  font-size: 10px;
  font-weight: 700;
  margin-left: 4px;
`;
