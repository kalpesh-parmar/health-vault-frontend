import React, { useEffect, useState, useCallback } from "react";
import { View, FlatList, ActivityIndicator } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import styled from "styled-components/native";
import { Ionicons } from "@expo/vector-icons";
import ScreenHeader from "../../components/shared/Header";
import { useMutation, useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { listNotifications, markAllAsRead, markAsRead } from "../../services/notificationService";
import { useAuth } from "../../context/ContextAPI";
import FilterTabs from "../../components/shared/FilterTabs";
import { useAppTheme } from "../../context/ThemeContext";

type NotificationType = "alert" | "info" | "success" | "promo" | "reminder";

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  time: string;
  isRead: boolean;
  avatar?: string;
}

const FILTERS = ["All", "Unread"];

export default function NotificationScreen() {
  const { userId } = useAuth();
  const { isDark } = useAppTheme();
  const queryClient = useQueryClient();
  const [activeFilter, setActiveFilter] = useState("All");

  const {
    data,
    isLoading: isPending,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ["notifications", userId, activeFilter],
    queryFn: () => {
      const filterParams: any = { userId };
      if (activeFilter === "Unread") {
        filterParams.isRead = false;
      }
      return listNotifications({
        filter: filterParams,
        sort: {
          sortBy: "createdAt",
          orderBy: "desc",
        },
      });
    },
    getNextPageParam: (lastPage, allPages) => {
      return lastPage?.data?.length === 10 ? allPages.length + 1 : undefined;
    },
    initialPageParam: 0,
    enabled: !!userId,
  });

  useFocusEffect(
    useCallback(() => {
      if (userId) {
        refetch();
      }
    }, [userId, refetch])
  );

  const notifications = data?.pages.flatMap((page) => page.data || []) || [];

  const { mutateAsync: markNotificationAsRead } = useMutation({
    mutationFn: markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notificationCount"] });
    },
    onError: (error) => {
      // Error handling can be added here
    },
  });

  const { mutateAsync: markAllRead } = useMutation({
    mutationFn: markAllAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notificationCount"] });
    },
    onError: (error) => {
      // Error handling can be added here
    },
  });

  const loadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  const renderCard = ({ item }: { item: Notification }) => {
    console.log("Notification Id :- ", item.id);
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
              {item.body}
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

      <View style={{ paddingVertical: 10 }}>
        <FilterTabs
          data={FILTERS}
          activeTab={activeFilter}
          onSelectTab={setActiveFilter}
          isDark={isDark}
        />
      </View>

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
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            isFetchingNextPage ? (
              <View style={{ padding: 20 }}>
                <ActivityIndicator size="small" color="#000" />
              </View>
            ) : null
          }
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