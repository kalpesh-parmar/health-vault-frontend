import React, { useRef, useCallback, useMemo } from "react";
import styled from "styled-components/native";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import {
  DrawerActions,
  useNavigation,
  useIsFocused,
} from "@react-navigation/native";
import Animated, { FadeInRight } from "react-native-reanimated";
import { BottomSheetModal, BottomSheetBackdrop, BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { LinearGradient } from "expo-linear-gradient";
import { useDocumentUpload } from "../../context/DocumentUploadContext";
import { useBottomBarPadding } from "../../hooks/useBottomBarPadding";

import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { AppStackParamList } from "../../navigation/types";
import { useAppTheme } from "../../context/ThemeContext";
import Toast from "react-native-toast-message";
import { DocumentUploadBottomSheet } from "../../components/document-upload/DocumentUploadBottomSheet";
import CameraModal from "../../components/shared/CameraModal";
import Loader from "../../components/shared/Loader";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "../../config/queryClient";
import { getNotificationCount } from "../../services/notificationService";
import { getUser } from "../../services/userService";
import { getFileSource } from "../../services/fileService";
import { ActivityIndicator, View, TouchableOpacity, Text } from "react-native";
import ReminderCard from "../../components/shared/ReminderCard";
import {
  listTodayOccurrences,
  updateReminderOccurrenceStatus,
  listTodayOccurrencesCount,
} from "../../services/reminderService";
import { listMedications } from "../../services/medicationservice";
import { listDocument, getDocumentsSummary } from "../../services/documentService";
import { Reminder } from "../../types";
import { getInitials } from "../../utils/avatarUtils";

interface ActionItemProps {
  onPress: () => void;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  iconColor: string;
}

const memo = React.memo;

const ActionItem = memo(
  ({ onPress, icon, label, color, iconColor }: ActionItemProps) => (
    <ActionItemContainer onPress={onPress}>
      <ActionIcon color={color}>
        <Ionicons name={icon} size={26} color={iconColor} />
      </ActionIcon>
      <ActionLabel>{label}</ActionLabel>
    </ActionItemContainer>
  ),
);

const HomeScreen = () => {
  const isFocused = useIsFocused();
  const refRBSheet = useRef<BottomSheetModal>(null);
  const cameraRef = useRef<any>(null);

  const navigation =
    useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const { isDark } = useAppTheme();
  const bottomPadding = useBottomBarPadding(40, 20);

  const {
    uploadingDocs,
    completedBatch,
    clearCompletedBatch,
    processingError,
    clearProcessingError,
  } = useDocumentUpload();

  const [isBannerDismissed, setIsBannerDismissed] = React.useState(false);
  const lastBatchIdRef = useRef<string | null>(null);

  React.useEffect(() => {
    if (completedBatch) {
      const batchId = completedBatch.jobIds.join(",");
      if (batchId !== lastBatchIdRef.current) {
        lastBatchIdRef.current = batchId;
        setIsBannerDismissed(false);
      }
    }
  }, [completedBatch]);

  const handleOpenDrawer = useCallback(() => {
    navigation.dispatch(DrawerActions.openDrawer());
  }, [navigation]);

  const { data, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const response = await getUser();
      return response?.data || response;
    },
  });

  const [profileImageSource, setProfileImageSource] = React.useState<any>(null);

  React.useEffect(() => {
    if (data?.profileImageKey) {
      const fetchImage = async () => {
        try {
          const res = await getFileSource(data.profileImageKey!);
          setProfileImageSource(res);
        } catch (e) {
          console.log("Failed to load profile image URL", e);
        }
      };
      fetchImage();
    }
  }, [data?.profileImageKey]);

  const { data: notificationData } = useQuery(
    {
      queryKey: ["notificationCount"],
      queryFn: getNotificationCount,
    },
  );

  const { data: remindersData, isLoading: isLoadingReminders } = useQuery({
    queryKey: ["todayReminders"],
    queryFn: listTodayOccurrences,
  });

  const rawReminders =
    remindersData?.data?.occurrences ||
    remindersData?.data ||
    remindersData ||
    [];
  const reminders = Array.isArray(rawReminders) ? rawReminders : [];

  const { data: medicationsData } = useQuery({
    queryKey: ["allMedications"],
    queryFn: listMedications,
  });

  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);

  const { data: todayOccurrencesCountData } = useQuery({
    queryKey: ["todayOccurrencesCount", todayStr],
    queryFn: () => listTodayOccurrencesCount({ startDate: todayStr, endDate: todayStr }),
  });

  const { data: documentsSummaryData } = useQuery({
    queryKey: ["documentsSummary"],
    queryFn: getDocumentsSummary,
  });

  const medicationsCount = Array.isArray(medicationsData?.data) 
    ? medicationsData.data.length 
    : 0;

  const documentsCount = documentsSummaryData?.data?.total || 0;

  const pendingMedicinesCount = todayOccurrencesCountData?.data?.total ?? 0;

  const recentTwoReminders = useMemo(() => {
    return reminders
      .filter((r: Reminder) => r.status?.toUpperCase() !== "COMPLETED")
      .sort((a: any, b: any) => {
        const timeA = new Date(a.actualMedicationTime).getTime();
        const timeB = new Date(b.actualMedicationTime).getTime();
        return timeA - timeB; // Ascending: soonest first
      })
      .slice(0, 2);
  }, [reminders]);
  
  const updateStatusMutation = useMutation({
    mutationFn: updateReminderOccurrenceStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allReminders"] });
      queryClient.invalidateQueries({ queryKey: ["todayReminders"] });
      queryClient.invalidateQueries({ queryKey: ["allRemindersCounts"] });
      queryClient.invalidateQueries({ queryKey: ["paginatedReminders"] });
      queryClient.invalidateQueries({ queryKey: ["notificationCount"] });
      queryClient.invalidateQueries({ queryKey: ["paginatedNotifications"] });
      queryClient.invalidateQueries({ queryKey: ["todayOccurrencesCount"] });
    },
  });

  const handleToggleStatus = async (item: Reminder) => {
    if (item.status === "completed") return;

    await updateStatusMutation.mutateAsync({
      occurrenceId: item.id!,
      status: "COMPLETED",
    });
  };

  const notificationBadgeCount = notificationData?.data?.count ?? 0;

  // Vibrant gradient style matching your reference design theme
  const headerColors = useMemo(
    () => (isDark ? ["#3b0764", "#1e1b4b"] : ["#a855f7", "#6366f1"]),
    [isDark],
  );

  return (
    <Container isDark={isDark}>
      <StatusBar style="light" />



      {/* --- BACKGROUND HEADER REGION --- */}
      <HeaderGradient
        colors={headerColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <TopRow>
          <IconButton onPress={handleOpenDrawer}>
            <Ionicons name="menu-outline" size={28} color="#fff" />
          </IconButton>
          <NotificationWrapper
            onPress={() => navigation.navigate("Notifications")}
          >
            <Ionicons name="notifications-outline" size={26} color="#fff" />
            {notificationBadgeCount > 0 && (
              <Badge>
                <BadgeText>{notificationBadgeCount}</BadgeText>
              </Badge>
            )}
          </NotificationWrapper>
        </TopRow>

        <UserRow>
          {profileImageSource ? (
            <Avatar
              source={profileImageSource}
            />
          ) : (
            <UserAvatarFallback>
              <UserAvatarFallbackText>
                {getInitials(data?.firstName, data?.lastName) || "?"}
              </UserAvatarFallbackText>
            </UserAvatarFallback>
          )}
          <UserTextContent>
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <GreetingText>Hi, {data?.firstName}!</GreetingText>
                <SubGreetingText>Health Vault Welcomes You.</SubGreetingText>
              </>
            )}
          </UserTextContent>
        </UserRow>
      </HeaderGradient>

      <FixedOverviewCard
        style={{
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.07,
          shadowRadius: 10,
          elevation: 5,
        }}
      >
        <OverviewTextContainer>
          <OverviewTitle>Health Overview</OverviewTitle>
          <OverviewSubtitle>
            Complete insights about your health
          </OverviewSubtitle>
        </OverviewTextContainer>
        <MaterialCommunityIcons
          name="chart-timeline-variant"
          size={42}
          color="#818cf8"
          style={{ opacity: 0.6 }}
        />
      </FixedOverviewCard>

      <ScrollContent showsVerticalScrollIndicator={false}>
        <SectionHeader>
          <SectionTitle>Health Vault Summary</SectionTitle>
        </SectionHeader>

        <SummaryRow>
          <Animated.View
            style={{ flex: 1 }}
            key={isFocused ? "med-f" : "med-u"}
            entering={FadeInRight.delay(100).springify()}
          >
            <SummaryCard>
              <SummaryIconCircle color="#ffe4e6">
                <MaterialCommunityIcons name="pill" size={20} color="#f43f5e" />
              </SummaryIconCircle>
              <SummaryCardLabel numberOfLines={1}>Medications</SummaryCardLabel>
              <SummaryPrimaryValue>{medicationsCount}</SummaryPrimaryValue>
            </SummaryCard>
          </Animated.View>

          <Animated.View
            style={{ flex: 1, marginHorizontal: 10 }}
            key={isFocused ? "doc-f" : "doc-u"}
            entering={FadeInRight.delay(200).springify()}
          >
            <SummaryCard>
              <SummaryIconCircle color="#dbeafe">
                <Ionicons name="document-text" size={20} color="#2563eb" />
              </SummaryIconCircle>
              <SummaryCardLabel numberOfLines={1}>Documents</SummaryCardLabel>
              <SummaryPrimaryValue>{documentsCount}</SummaryPrimaryValue>
            </SummaryCard>
          </Animated.View>

          <Animated.View
            style={{ flex: 1 }}
            key={isFocused ? "tod-f" : "tod-u"}
            entering={FadeInRight.delay(300).springify()}
          >
            <SummaryCard>
              <SummaryIconCircle color="#e0f2fe">
                <Ionicons name="calendar" size={20} color="#0284c7" />
              </SummaryIconCircle>
              <SummaryCardLabel numberOfLines={2} style={{ textAlign: "center" }}>Today's Doses</SummaryCardLabel>
              <SummaryPrimaryValue>{pendingMedicinesCount}</SummaryPrimaryValue>
            </SummaryCard>
          </Animated.View>
        </SummaryRow>

        {/* --- SECTION: QUICK ACTIONS --- */}
        <SectionHeader style={{ marginTop: 15 }}>
          <SectionTitle>Quick Actions</SectionTitle>
        </SectionHeader>

        <ActionsRow>
          <ActionItem
            onPress={() => refRBSheet?.current?.present()}
            icon="add"
            label="Add Documents"
            color="#ecfdf5"
            iconColor="#10b981"
          />
          <ActionItem
            onPress={() =>
              navigation.navigate("DocumentStack", {
                screen: "DocumentList",
                params: { category: "all" },
              })
            }
            icon="document-text-outline"
            label="My Documents"
            color="#eff6ff"
            iconColor="#2563eb"
          />
          <ActionItem
            onPress={() => navigation.navigate("Reminders")}
            icon="calendar-outline"
            label="Reminders"
            color="#f5f3ff"
            iconColor="#8b5cf6"
          />
          <ActionItem
            onPress={() =>
              navigation.navigate("MedicationStack", {
                screen: "MedicationList",
              })
            }
            icon="medkit"
            label="Medications"
            color="#fff1f2"
            iconColor="#f43f5e"
          />
        </ActionsRow>

        {/* Inline Processing Documents Card */}
        {uploadingDocs.length > 0 && (
          <ProcessingCard style={{ marginHorizontal: 24, marginTop: 15, paddingBottom: 15 }}>
            <SheetHeaderRow style={{ flexWrap: "nowrap", marginBottom: 12 }}>
              <View style={{ flexDirection: "row", alignItems: "center", flex: 1, marginRight: 8, flexShrink: 1 }}>
                <SheetHeaderTitle style={{ color: "#4f46e5", flexShrink: 1 }} numberOfLines={1}>Processing</SheetHeaderTitle>
                <SheetHeaderBadge style={{ backgroundColor: "#e0e7ff", marginLeft: 6 }}>
                  <SheetHeaderBadgeText style={{ color: "#4f46e5" }}>
                    {uploadingDocs.filter(d => d.status === "COMPLETED" || d.status === "completed" || d.status === "success" || d.status === "FAILED" || d.status === "failed").length}/{uploadingDocs.length} Completed
                  </SheetHeaderBadgeText>
                </SheetHeaderBadge>
              </View>
              <TouchableOpacity
                onPress={() => {
                  navigation.navigate("DocumentProcessing", {
                    jobIds: uploadingDocs.map(d => d.id),
                    filesInfo: uploadingDocs.map(d => ({ jobId: d.id, fileName: d.name, fileKey: "" })),
                  });
                }}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                style={{
                  backgroundColor: "#6366f1",
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 8,
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Text style={{ color: "#ffffff", fontWeight: "bold", fontSize: 12 }}>View</Text>
              </TouchableOpacity>
            </SheetHeaderRow>

            {/* Progress bar */}
            <SheetProgressRow style={{ marginBottom: 0 }}>
              <SheetProgressBarBg>
                <SheetProgressBarFill
                  style={{
                    backgroundColor: "#6366f1",
                    width: `${Math.round(
                      uploadingDocs.reduce((acc, doc) => acc + (doc.progress || 0), 0) / uploadingDocs.length
                    )}%`
                  }}
                />
              </SheetProgressBarBg>
              <SheetProgressPctText>
                {Math.round(
                  uploadingDocs.reduce((acc, doc) => acc + (doc.progress || 0), 0) / uploadingDocs.length
                )}%
              </SheetProgressPctText>
            </SheetProgressRow>
          </ProcessingCard>
        )}

        {/* Processing Error or Interrupted Warning Banner */}
        {processingError !== null && (
          <AnalysisCompleteBanner
            style={{
              marginHorizontal: 24,
              marginTop: 15,
              backgroundColor: isDark ? "#7f1d1d20" : "#fffbeb",
              borderColor: isDark ? "#f8717150" : "#fef3c7",
              borderWidth: 1,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "flex-start", flex: 1 }}>
              <Ionicons
                name="alert-circle"
                size={22}
                color={isDark ? "#f87171" : "#d97706"}
                style={{ marginRight: 10, marginTop: 2 }}
              />
              <View style={{ flex: 1 }}>
                <AnalysisCompleteTitle style={{ color: isDark ? "#f87171" : "#b45309" }}>
                  Processing Failed or Interrupted
                </AnalysisCompleteTitle>
                <AnalysisCompleteSub style={{ color: isDark ? "#cbd5e1" : "#78350f", marginTop: 4, marginLeft: 0 }}>
                  {processingError.type === "cancelled"
                    ? "Document processing was stopped or interrupted."
                    : "The document analysis failed. Please ensure the document is a valid medical report."}
                </AnalysisCompleteSub>
              </View>
            </View>
            <CloseBannerBtn
              onPress={clearProcessingError}
              style={{ alignSelf: "flex-start", padding: 2 }}
            >
              <Ionicons name="close" size={20} color={isDark ? "#f87171" : "#b45309"} />
            </CloseBannerBtn>
          </AnalysisCompleteBanner>
        )}

        {/* Analysis Complete Banner */}
        {completedBatch && !isBannerDismissed && (() => {
          const docs = completedBatch.documents || [];
          const completedDocs = docs.filter(
            (d: any) => d.status === "COMPLETED" || d.status === "completed" || d.status === "success"
          ).length;
          const failedDocs = docs.filter(
            (d: any) => d.status === "FAILED" || d.status === "failed" || d.status === "error"
          );
          const rejectedDocs = docs.filter(
            (d: any) => d.status === "REJECTED" || d.status === "rejected"
          );
          
          const totalMedicines = completedBatch.medicineCount || 0;
          const docsWithMedicines = docs.filter((d: any) => (d.medicineCount || 0) > 0).length;

          return (
            <View style={{
              marginHorizontal: 24,
              marginTop: 16,
              borderRadius: 16,
              backgroundColor: isDark ? "#1e293b" : "#ffffff",
              borderWidth: 1,
              borderColor: isDark ? "#334155" : "#e2e8f0",
              padding: 16,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 4,
              elevation: 2,
            }}>
              {/* Header Row */}
              <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                <View style={{
                  width: 32, height: 32, borderRadius: 16,
                  backgroundColor: "#10b981",
                  justifyContent: "center", alignItems: "center", marginRight: 12,
                }}>
                  <Ionicons name="checkmark" size={20} color="#ffffff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: "700", color: isDark ? "#f8fafc" : "#0f172a" }}>
                    Analysis Complete
                  </Text>
                  <Text style={{ fontSize: 12, marginTop: 2, color: isDark ? "#94a3b8" : "#64748b" }}>
                    {completedDocs} of {docs.length} documents processed successfully
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => { setIsBannerDismissed(true); clearCompletedBatch(); }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close" size={18} color={isDark ? "#64748b" : "#94a3b8"} />
                </TouchableOpacity>
              </View>

              {/* Divider */}
              <View style={{ height: 1, backgroundColor: isDark ? "#334155" : "#f1f5f9", marginVertical: 16 }} />

              {/* Middle Section: Medicines Found & Documents with medicines */}
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
                <View style={{ flex: 1, flexDirection: "row", alignItems: "baseline" }}>
                  <Text style={{ fontSize: 24, fontWeight: "700", color: isDark ? "#f8fafc" : "#0f172a", marginRight: 8 }}>
                    {totalMedicines}
                  </Text>
                  <Text style={{ fontSize: 12, color: isDark ? "#94a3b8" : "#64748b" }}>medicines found</Text>
                </View>
                
                <View style={{ width: 1, height: "100%", backgroundColor: isDark ? "#334155" : "#e2e8f0", marginHorizontal: 12 }} />
                
                <View style={{ flex: 1, flexDirection: "row", alignItems: "baseline" }}>
                  <Text style={{ fontSize: 24, fontWeight: "700", color: isDark ? "#f8fafc" : "#0f172a", marginRight: 8 }}>
                    {docsWithMedicines}
                  </Text>
                  <Text style={{ fontSize: 12, color: isDark ? "#94a3b8" : "#64748b" }}>document with medicines</Text>
                </View>
              </View>

              {/* Warnings (Optional - static for now based on design) */}
              {/* <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
                <Ionicons name="warning-outline" size={16} color="#f59e0b" style={{ marginRight: 8 }} />
                <Text style={{ fontSize: 12, color: "#d97706" }}>1 document contains promotional content</Text>
              </View> */}

              {/* Divider before errors (only if there are errors) */}
              {(failedDocs.length > 0 || rejectedDocs.length > 0) && (
                <>
                  <View style={{ height: 1, backgroundColor: isDark ? "#334155" : "#f1f5f9", marginBottom: 16 }} />
                  
                  {failedDocs.length > 0 && (
                    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
                      <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: "#ef4444", justifyContent: "center", alignItems: "center", marginRight: 12 }}>
                        <Ionicons name="close" size={14} color="#ffffff" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 12, fontWeight: "500", color: isDark ? "#f8fafc" : "#0f172a" }}>
                          {failedDocs.length} document{failedDocs.length !== 1 ? 's' : ''} failed to process
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => {
                          Toast.show({
                            type: "info",
                            text1: "Feature will be implemented soon",
                          });
                        }}
                        style={{ paddingHorizontal: 12, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: "#f87171" }}
                      >
                        <Text style={{ fontSize: 12, color: "#ef4444", fontWeight: "500" }}>Retry</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {rejectedDocs.length > 0 && (
                    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
                      <Ionicons name="ban-outline" size={20} color={isDark ? "#94a3b8" : "#64748b"} style={{ marginRight: 12 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 12, fontWeight: "500", color: isDark ? "#f8fafc" : "#0f172a" }}>
                          {rejectedDocs.length} document{rejectedDocs.length !== 1 ? 's' : ''} was rejected
                        </Text>
                        <Text style={{ fontSize: 10, color: isDark ? "#94a3b8" : "#64748b" }}>Unsupported file type</Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => {
                          Toast.show({
                            type: "info",
                            text1: "Feature will be implemented soon",
                          });
                        }}
                        style={{ paddingHorizontal: 12, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: "#94a3b8" }}
                      >
                        <Text style={{ fontSize: 12, color: isDark ? "#94a3b8" : "#64748b" }}>View Details</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </>
              )}

              {/* Review Button */}
              <TouchableOpacity
                onPress={() => {
                  if (completedBatch.fromScreen === "AIChat") {
                    navigation.navigate("AIChat");
                  } else {
                    navigation.navigate("ReviewMedicines", {
                      jobIds: completedBatch.jobIds,
                      filesInfo: completedBatch.filesInfo,
                    });
                  }
                }}
                activeOpacity={0.8}
                style={{
                  backgroundColor: "#6366f1", // Purple-ish blue from design
                  borderRadius: 8,
                  paddingVertical: 12,
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "row",
                  marginTop: failedDocs.length === 0 && rejectedDocs.length === 0 ? 0 : 4,
                }}
              >
                <Text style={{ color: "#ffffff", fontSize: 14, fontWeight: "600", marginRight: 8 }}>
                  Review Results
                </Text>
                <Ionicons name="chevron-forward" size={16} color="#ffffff" />
              </TouchableOpacity>
            </View>
          );
        })()}

        {/* --- SECTION: UPCOMING REMINDERS --- */}
        <SectionHeader style={{ marginTop: 25 }}>
          <SectionTitle>Today's Reminders</SectionTitle>
          <ViewAllButton onPress={() => navigation.navigate("Reminders")}>
            <ViewAllText>View All</ViewAllText>
          </ViewAllButton>
        </SectionHeader>

        <RemindersListContainer>
          {isLoadingReminders ? (
            <ActivityIndicator
              size="large"
              color="#6366f1"
              style={{ marginVertical: 20 }}
            />
          ) : (
            <>
              {recentTwoReminders.map((reminder: Reminder) => (
                <ReminderCard
                  key={reminder.id}
                  item={reminder}
                  isDark={isDark}
                  onActionPress={() => handleToggleStatus(reminder)}
                />
              ))}
              {recentTwoReminders.length === 0 && (
                <View style={{ alignItems: "center", marginVertical: 20 }}>
                  <SectionTitle style={{ fontSize: 14, color: "#64748b" }}>
                    No Reminders For Today
                  </SectionTitle>
                </View>
              )}
            </>
          )}
        </RemindersListContainer>

        <BottomSpacing />
      </ScrollContent>
      <DocumentUploadBottomSheet ref={refRBSheet} />
    </Container>
  );
};

export default HomeScreen;

// --- Styled Components ---

const Container = styled.View<{ isDark: boolean }>`
  flex: 1;
  background-color: ${({ isDark }: { isDark: boolean }) =>
    isDark ? "#0f172a" : "#f8fafc"};
`;

const HeaderGradient = styled(LinearGradient)`
  padding: 50px 24px 60px;
  border-bottom-left-radius: 50px;
  border-bottom-right-radius: 50px;
`;

const TopRow = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
`;

const IconButton = styled.TouchableOpacity``;

const NotificationWrapper = styled.TouchableOpacity`
  position: relative;
`;

const Badge = styled.View`
  position: absolute;
  top: -2px;
  right: -2px;
  background-color: #ef4444;
  width: 16px;
  height: 16px;
  border-radius: 8px;
  justify-content: center;
  align-items: center;
  border-width: 2px;
  border-color: #a855f7;
`;

const BadgeText = styled.Text`
  color: white;
  font-size: 8px;
  font-weight: bold;
`;

const UserRow = styled.View`
  flex-direction: row;
  align-items: center;
  margin-top: 20px;
`;

const UserAvatarFallback = styled.View`
  width: 54px;
  height: 54px;
  border-radius: 27px;
  border-width: 2px;
  border-color: rgba(255, 255, 255, 0.4);
  background-color: rgba(255, 255, 255, 0.2);
  justify-content: center;
  align-items: center;
`;

const UserAvatarFallbackText = styled.Text`
  color: white;
  font-size: 24px;
  font-weight: bold;
`;

const Avatar = styled.Image`
  width: 54px;
  height: 54px;
  border-radius: 27px;
  border-width: 2px;
  border-color: rgba(255, 255, 255, 0.4);
`;

const UserTextContent = styled.View`
  margin-left: 14px;
`;

const GreetingText = styled.Text`
  color: white;
  font-size: 20px;
  font-weight: 700;
`;

const SubGreetingText = styled.Text`
  color: rgba(255, 255, 255, 0.84);
  font-size: 14px;
  margin-top: 2px;
`;

/* Overlapping Health Overview Card Container absolute position configurations */
const FixedOverviewCard = styled.View`
  position: absolute;
  top: 160px;
  left: 20px;
  right: 20px;
  background-color: #ffffff;
  border-radius: 20px;
  padding: 24px;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  z-index: 10;
`;

const OverviewTextContainer = styled.View`
  flex: 1;
`;

const OverviewTitle = styled.Text`
  font-size: 18px;
  font-weight: 700;
  color: #1e293b;
`;

const OverviewSubtitle = styled.Text`
  font-size: 13px;
  color: #64748b;
  margin-top: 4px;
`;

const ScrollContent = styled.ScrollView`
  flex: 1;
`;

const SectionHeader = styled.View`
  flex-direction: row;
  justify-content: space-between;
  padding: 12px 24px;
  align-items: center;
  margin-top: 35px;
`;

const SectionTitle = styled.Text`
  font-size: 17px;
  font-weight: 700;
  color: #0f172a;
`;

const ViewAllButton = styled.TouchableOpacity``;

const ViewAllText = styled.Text`
  font-size: 13px;
  font-weight: 600;
  color: #6366f1;
`;

/* Summary Row Styling setup */
const SummaryRow = styled.View`
  padding-horizontal: 24px;
  flex-direction: row;
  justify-content: space-between;
`;

const SummaryCard = styled.View`
  background-color: #ffffff;
  flex: 1;
  border-radius: 14px;
  padding: 14px 6px;
  align-items: center;
`;

const SummaryIconCircle = styled.View<{ color: string }>`
  width: 36px;
  height: 36px;
  border-radius: 18px;
  background-color: ${({ color }: { color: string }) => color};
  justify-content: center;
  align-items: center;
  margin-bottom: 12px;
`;

const SummaryCardLabel = styled.Text`
  font-size: 12px;
  color: #64748b;
  font-weight: 500;
`;

const SummaryPrimaryValue = styled.Text`
  font-size: 20px;
  font-weight: 700;
  color: #1e293b;
  margin-top: 4px;
`;

/* Actions Layout Row Updates */
const ActionsRow = styled.View`
  flex-direction: row;
  justify-content: space-between;
  padding: 0 24px;
  margin-top: 4px;
`;

const ActionItemContainer = styled.TouchableOpacity`
  align-items: center;
  width: 22%;
`;

const ActionIcon = styled.View<{ color: string }>`
  background-color: ${({ color }: { color: string }) => color};
  width: 56px;
  height: 56px;
  border-radius: 16px;
  justify-content: center;
  align-items: center;
`;

const ActionLabel = styled.Text`
  font-size: 11px;
  text-align: center;
  color: #334155;
  margin-top: 8px;
  font-weight: 600;
`;

const RemindersListContainer = styled.View`
  padding-horizontal: 24px;
  margin-top: 4px;
`;

const BottomSpacing = styled.View`
  height: 120px;
`;

const AnalysisCompleteBanner = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  background-color: #f0fdf4;
  border-width: 1px;
  border-color: #bbf7d0;
  border-radius: 16px;
  padding: 14px 16px;
`;

const AnalysisCompleteContent = styled.View`
  flex: 1;
  margin-right: 8px;
`;

const AnalysisCompleteTitle = styled.Text`
  font-size: 15px;
  font-weight: 700;
  color: #166534;
`;

const AnalysisCompleteSub = styled.Text`
  font-size: 13px;
  color: #15803d;
  margin-top: 2px;
`;

const AnalysisCompleteActions = styled.View`
  flex-direction: row;
  align-items: center;
`;

const ReviewNowBtn = styled.TouchableOpacity`
  background-color: #10b981;
  padding-vertical: 7px;
  padding-horizontal: 14px;
  border-radius: 8px;
`;

const ReviewNowBtnText = styled.Text`
  color: white;
  font-size: 13px;
  font-weight: 700;
`;

const CloseBannerBtn = styled.TouchableOpacity`
  padding: 4px;
  margin-left: 8px;
`;

const FloatingProgressPill = styled.TouchableOpacity`
  position: absolute;
  bottom: 110px;
  left: 20px;
  right: 20px;
  background-color: #ffffff;
  border-width: 1px;
  border-color: #e2e8f0;
  border-radius: 16px;
  padding: 14px 16px;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  elevation: 6;
  shadow-color: #000;
  shadow-offset: 0px 4px;
  shadow-opacity: 0.08;
  shadow-radius: 10px;
  z-index: 999;
`;

const PillIconBox = styled.View`
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background-color: #eff6ff;
  align-items: center;
  justify-content: center;
`;

const PillTitle = styled.Text`
  font-size: 14px;
  font-weight: 700;
  color: #1e293b;
`;

const PillSub = styled.Text`
  font-size: 11px;
  color: #64748b;
  margin-top: 2px;
`;

const HideButton = styled.TouchableOpacity`
  background-color: #f8fafc;
  border-width: 1px;
  border-color: #cbd5e1;
  border-radius: 20px;
  padding-vertical: 6px;
  padding-horizontal: 14px;
`;

const HideButtonText = styled.Text`
  font-size: 12px;
  font-weight: 700;
  color: #475569;
`;

const SheetContentWrapper = styled.View`
  padding-horizontal: 24px;
  padding-top: 8px;
  padding-bottom: 14px;
`;

const SheetHeaderRow = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
`;

const SheetHeaderTitle = styled.Text`
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
`;

const SheetHeaderBadge = styled.View`
  background-color: #f1f5f9;
  border-radius: 12px;
  padding-horizontal: 8px;
  padding-vertical: 3px;
  margin-left: 8px;
`;

const SheetHeaderBadgeText = styled.Text`
  font-size: 11px;
  font-weight: 600;
  color: #475569;
`;

const SheetDetailsText = styled.Text`
  font-size: 13px;
  font-weight: 600;
  color: #6366f1;
`;

const SheetProgressRow = styled.View`
  flex-direction: row;
  align-items: center;
  margin-bottom: 20px;
`;

const SheetProgressBarBg = styled.View`
  flex: 1;
  height: 8px;
  background-color: #e2e8f0;
  border-radius: 4px;
  overflow: hidden;
  margin-right: 12px;
`;

const SheetProgressBarFill = styled.View`
  height: 100%;
  background-color: #6366f1;
  border-radius: 4px;
`;

const SheetProgressPctText = styled.Text`
  font-size: 13px;
  font-weight: 700;
  color: #475569;
`;

const DocItemRow = styled.View`
  flex-direction: row;
  align-items: center;
  background-color: #f8fafc;
  border-width: 1px;
  border-color: #e2e8f0;
  border-radius: 12px;
  padding: 12px;
  margin-bottom: 10px;
`;

const DocItemIconBox = styled.View<{ isCompleted: boolean; isFailed: boolean }>`
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background-color: ${({ isCompleted, isFailed }: { isCompleted: boolean; isFailed: boolean }) =>
    isCompleted ? "#e8f7ee" : isFailed ? "#fef2f2" : "#eff6ff"};
  align-items: center;
  justify-content: center;
  margin-right: 12px;
`;

const DocItemInfo = styled.View`
  flex: 1;
  margin-right: 8px;
`;

const DocItemName = styled.Text`
  font-size: 14px;
  font-weight: 700;
  color: #1e293b;
`;

const DocItemStatus = styled.Text<{ isCompleted: boolean; isFailed: boolean }>`
  font-size: 12px;
  color: ${({ isCompleted, isFailed }: { isCompleted: boolean; isFailed: boolean }) =>
    isCompleted ? "#10b981" : isFailed ? "#ef4444" : "#6366f1"};
  margin-top: 2px;
  font-weight: 500;
`;

const DocProgressCircle = styled.View`
  width: 32px;
  height: 32px;
  border-radius: 16px;
  border-width: 2px;
  border-color: #6366f1;
  align-items: center;
  justify-content: center;
`;

const DocProgressCircleText = styled.Text`
  font-size: 9px;
  font-weight: 700;
  color: #475569;
`;

const SheetReviewNowBtn = styled.TouchableOpacity`
  background-color: #10b981;
  padding-vertical: 12px;
  border-radius: 10px;
  align-items: center;
  justify-content: center;
  margin-top: 16px;
  elevation: 2;
  shadow-color: #000;
  shadow-offset: 0px 2px;
  shadow-opacity: 0.1;
  shadow-radius: 3px;
`;

const SheetReviewNowBtnText = styled.Text`
  color: white;
  font-size: 14px;
  font-weight: 700;
`;

const ProcessingCard = styled.View`
  background-color: #ffffff;
  border-radius: 20px;
  padding: 20px;
  elevation: 2;
  shadow-color: #000;
  shadow-offset: 0px 2px;
  shadow-opacity: 0.05;
  shadow-radius: 4px;
`;
