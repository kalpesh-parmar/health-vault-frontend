import React, { useEffect, useState } from "react";
import { View, FlatList } from "react-native";
import styled from "styled-components/native";
import { Ionicons } from "@expo/vector-icons";
import ScreenHeader from "../../components/shared/Header";
import { useMutation } from "@tanstack/react-query";
import { listNotifications, markAllAsRead, markAsRead } from "../../services/notificationService";

type NotificationType = "alert" | "info" | "success" | "promo" | "reminder";

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  time: string;
  isRead: boolean;
  avatar?: string;
}

const FILTERS = ["All"];

export default function NotificationScreen() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activeFilter, setActiveFilter] = useState("All");

  const { mutateAsync: getNotificationsList } = useMutation({
    mutationFn: listNotifications,
    onSuccess: (data) => {
      setNotifications(data.data);
    },
    onError: (error) => {
      // Error handling can be added here
    },
  });

  const { mutateAsync: markNotificationAsRead } = useMutation({
    mutationFn: markAsRead,
    onSuccess: () => {
      getNotificationsList();
    },
    onError: (error) => {
      // Error handling can be added here
    },
  });

  const {mutateAsync: markAllRead} = useMutation({
    mutationFn: markAllAsRead,
    onSuccess: () => {
      getNotificationsList();
    },
    onError: (error) => {
      // Error handling can be added here
    },
  });

  useEffect(() => {
    getNotificationsList();
  }, []);

  const renderCard = ({ item }: { item: Notification }) => {
    return (
      <View>
        <CardWrapper
          isRead={item.isRead}
          onPress={() => {
            markNotificationAsRead({ notificationId: item.id });
          }}
          activeOpacity={0.85}
        >
          <CardContent>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "flex-start",
              }}
            >
              <CardTitle
                isRead={item.isRead}
                style={{ flex: 1, marginRight: 8 }}
              >
                {item.title}
              </CardTitle>
              {!item.isRead && <UnreadDot />}
            </View>

            <CardMessage numberOfLines={2}>
              {item.message}
            </CardMessage>

            <CardMeta>
              <Ionicons name="time-outline" size={11} color="#9E9E9E" />
              <CardTime>{item.time}</CardTime>
            </CardMeta>
          </CardContent>
        </CardWrapper>
      </View>
    );
  };

  return (
    <Container>
      <ScreenHeader
        title="Notifications"
        showBack
        rightAction={{
          icon: "checkmark-done-outline",
          onPress: markAllRead,
        }}
      />

      <FilterRow>
        {FILTERS.map((f) => (
          <FilterChip
            key={f}
            active={activeFilter === f}
            onPress={() => setActiveFilter(f)}
          >
            <FilterChipText active={activeFilter === f}>{f}</FilterChipText>
          </FilterChip>
        ))}
      </FilterRow>

      {notifications.length === 0 ? (
        <EmptyWrapper>
          <EmptyIcon>
            <Ionicons
              name="notifications-off-outline"
              size={40}
              color="#BDBDBD"
            />
          </EmptyIcon>
          <EmptyTitle>All Caught Up!</EmptyTitle>
          <EmptySubtitle>
            No notifications here. We'll let you know when something new
            arrives.
          </EmptySubtitle>
        </EmptyWrapper>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderCard}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 30 }}
        />
      )}
    </Container>
  );
}

const Container = styled.SafeAreaView`
  flex: 1;
  background-color: ${({ theme }: any) => theme.colors.background};
`;

const SubHeaderRow = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px 5px;
`;

const UnreadCountText = styled.Text`
  font-size: 13px;
  color: ${({ theme }: any) => theme.colors.textMuted};
  font-family: "Montserrat_400Regular";
`;

const MarkAllButton = styled.TouchableOpacity`
  align-items: flex-end;
`;

const MarkAllText = styled.Text`
  font-size: 13px;
  font-weight: 700;
  color: ${({ theme }: any) => theme.colors.primary};
  font-family: "Montserrat_700Bold";
`;

const FilterRow = styled.View`
  flex-direction: row;
  padding: 16px 20px 8px;
  gap: 10px;
`;

const FilterChip = styled.TouchableOpacity<{ active: boolean }>`
  padding: 7px 18px;
  border-radius: 20px;
  background-color: ${({ active, theme }: any) =>
    active ? theme.colors.primary : theme.colors.surface};
  elevation: ${({ active }: any) => (active ? 4 : 1)};
  shadow-color: ${({ theme }: any) => theme.colors.primary};
  shadow-opacity: ${({ active }: any) => (active ? 0.25 : 0)};
`;

const FilterChipText = styled.Text<{ active: boolean }>`
  font-size: 13px;
  font-weight: 700;
  font-family: "Montserrat_700Bold";
  color: ${({ active, theme }: any) =>
    active ? "#fff" : theme.colors.textMuted};
`;

const CardWrapper = styled.TouchableOpacity<{ isRead: boolean }>`
  flex-direction: row;
  align-items: flex-start;
  margin: 5px 16px;
  padding: 14px 14px;
  border: 2px;
  border-color: ${({ theme }: any) => theme.colors.border || "transparent"};
  border-radius: 20px;
`;

const CardContent = styled.View`
  flex: 1;
`;

const CardTitle = styled.Text<{ isRead: boolean }>`
  font-size: 14px;
  font-weight: ${({ isRead }: any) => (isRead ? "600" : "800")};
  color: ${({ theme }: any) => theme.colors.textPrimary};
  font-family: "Montserrat_700Bold";
  margin-bottom: 4px;
`;

const CardMessage = styled.Text`
  font-size: 12.5px;
  color: ${({ theme }: any) => theme.colors.textMuted};
  line-height: 18px;
  font-family: "Montserrat_400Regular";
`;

const CardMeta = styled.View`
  flex-direction: row;
  align-items: center;
  margin-top: 8px;
  gap: 6px;
`;

const CardTime = styled.Text`
  font-size: 11px;
  color: ${({ theme }: any) => theme.colors.textMuted};
  font-family: "Montserrat_400Regular";
`;

const UnreadDot = styled.View`
  width: 8px;
  height: 8px;
  border-radius: 4px;
  background-color: ${({ theme }: any) => theme.colors.primary};
`;

const EmptyWrapper = styled.View`
  flex: 1;
  justify-content: center;
  align-items: center;
  padding: 60px 40px;
`;

const EmptyIcon = styled.View`
  width: 90px;
  height: 90px;
  border-radius: 45px;
  background-color: ${({ theme }: any) => theme.colors.surface};
  justify-content: center;
  align-items: center;
  margin-bottom: 20px;
  elevation: 4;
`;

const EmptyTitle = styled.Text`
  font-size: 18px;
  font-weight: 800;
  color: ${({ theme }: any) => theme.colors.textPrimary};
  font-family: "Montserrat_700Bold";
  margin-bottom: 8px;
`;

const EmptySubtitle = styled.Text`
  font-size: 13px;
  color: ${({ theme }: any) => theme.colors.textMuted};
  text-align: center;
  line-height: 20px;
  font-family: "Montserrat_400Regular";
`;
