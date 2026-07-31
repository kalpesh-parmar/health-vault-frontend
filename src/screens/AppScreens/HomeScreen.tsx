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
import { ActivityIndicator, View, TouchableOpacity } from "react-native";
import ReminderCard from "../../components/shared/ReminderCard";
import {
  listTodayOccurrences,
  updateReminderOccurrenceStatus,
} from "../../services/reminderService";
import { listMedications } from "../../services/medicationservice";
import { listDocument } from "../../services/documentService";
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
  const processingSheetRef = useRef<BottomSheetModal>(null);
  const cameraRef = useRef<any>(null);

  const navigation =
    useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const { isDark } = useAppTheme();

  const {
    uploadingDocs,
    completedBatch,
    clearCompletedBatch,
    isPillHidden,
    setIsPillHidden,
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

  const { data: documentsData } = useQuery({
    queryKey: ["allDocuments"],
    queryFn: listDocument,
  });

  const medicationsCount = Array.isArray(medicationsData?.data) 
    ? medicationsData.data.length 
    : 0;

  const documentsCount = Array.isArray((documentsData?.data as any)?.items) 
    ? (documentsData?.data as any).items.length 
    : (Array.isArray(documentsData?.data) ? documentsData.data.length : 0);

  const pendingMedicinesCount = reminders.filter(
    (r: Reminder) => (r.status || "").toLowerCase() === "pending"
  ).length;

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
          <ProcessingCard style={{ marginHorizontal: 24, marginTop: 15 }}>
            <SheetHeaderRow style={{ flexWrap: "nowrap" }}>
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
                style={{ flexDirection: "row", alignItems: "center", flexShrink: 0 }}
              >
                <SheetDetailsText>View Details</SheetDetailsText>
                <Ionicons name="chevron-forward" size={14} color="#6366f1" style={{ marginLeft: 2 }} />
              </TouchableOpacity>
            </SheetHeaderRow>

            {/* Progress bar */}
            <SheetProgressRow>
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

            <View style={{ marginTop: 10 }}>
              {uploadingDocs.map((doc) => {
                const isCompleted = doc.status === "COMPLETED" || doc.status === "completed" || doc.status === "success";
                const isFailed = doc.status === "FAILED" || doc.status === "failed";
                const progress = doc.progress || 0;

                return (
                  <DocItemRow key={doc.id} style={{ backgroundColor: "#ffffff", borderWidth: 0, paddingVertical: 8, paddingHorizontal: 0, borderBottomWidth: 1, borderBottomColor: "#f1f5f9", borderRadius: 0 }}>
                    <DocItemIconBox isCompleted={isCompleted} isFailed={isFailed} style={{ width: 36, height: 36, borderRadius: 8 }}>
                      <MaterialCommunityIcons
                        name={doc.name.endsWith(".pdf") ? "file-pdf-box" : "file-image-outline"}
                        size={22}
                        color={isCompleted ? "#10b981" : isFailed ? "#ef4444" : "#6366f1"}
                      />
                    </DocItemIconBox>

                    <DocItemInfo>
                      <DocItemName numberOfLines={1} style={{ fontSize: 13 }}>{doc.name}</DocItemName>
                      <DocItemStatus isCompleted={isCompleted} isFailed={isFailed} style={{ fontSize: 11 }}>
                        {isCompleted
                          ? "Completed • Medicines found"
                          : isFailed
                            ? "Failed to process"
                            : `Processing • ${progress}%`}
                      </DocItemStatus>
                    </DocItemInfo>

                    {isCompleted ? (
                      <Ionicons name="checkmark-circle" size={22} color="#10b981" />
                    ) : isFailed ? (
                      <Ionicons name="alert-circle" size={22} color="#ef4444" />
                    ) : (
                      <DocProgressCircle style={{ width: 28, height: 28, borderRadius: 14 }}>
                        <DocProgressCircleText style={{ fontSize: 8 }}>{progress}%</DocProgressCircleText>
                      </DocProgressCircle>
                    )}
                  </DocItemRow>
                );
              })}
            </View>
          </ProcessingCard>
        )}

        {/* Analysis Complete Banner */}
        {completedBatch && !isBannerDismissed && (
          <AnalysisCompleteBanner style={{ marginHorizontal: 24, marginTop: 20 }}>
            <View style={{ flexDirection: "row", alignItems: "flex-start", flex: 1 }}>
              <Ionicons name="checkmark-circle" size={22} color="#10b981" style={{ marginRight: 10, marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap" }}>
                  <AnalysisCompleteTitle>Analysis Complete!</AnalysisCompleteTitle>
                  <AnalysisCompleteSub style={{ marginLeft: 6, marginTop: 0 }}>
                    We found {completedBatch.medicineCount} medicine{completedBatch.medicineCount === 1 ? "" : "s"} in your documents.
                  </AnalysisCompleteSub>
                </View>
                <ReviewNowBtn
                  onPress={() => {
                    navigation.navigate("DocumentProcessing", {
                      jobIds: completedBatch.jobIds,
                      filesInfo: completedBatch.filesInfo,
                    });
                  }}
                  activeOpacity={0.8}
                  style={{ alignSelf: "flex-start", marginTop: 8 }}
                >
                  <ReviewNowBtnText>Review Now</ReviewNowBtnText>
                </ReviewNowBtn>
              </View>
            </View>
            <CloseBannerBtn onPress={() => setIsBannerDismissed(true)} style={{ alignSelf: "flex-start", padding: 2 }}>
              <Ionicons name="close" size={20} color="#166534" />
            </CloseBannerBtn>
          </AnalysisCompleteBanner>
        )}

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

      {/* Floating Processing progress pill */}
      {uploadingDocs.length > 0 && !isPillHidden && (
        <FloatingProgressPill
          activeOpacity={0.9}
          onPress={() => processingSheetRef.current?.present()}
        >
          <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
            <PillIconBox>
              <MaterialCommunityIcons name="file-document-outline" size={22} color="#3b82f6" />
            </PillIconBox>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <PillTitle numberOfLines={1}>
                {uploadingDocs.length} document{uploadingDocs.length === 1 ? "" : "s"} are being processed
              </PillTitle>
              <PillSub numberOfLines={1}>
                You can hide this and we'll notify you when done.
              </PillSub>
            </View>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <HideButton
              onPress={(e: any) => {
                e.stopPropagation();
                setIsPillHidden(true);
              }}
              activeOpacity={0.7}
            >
              <HideButtonText>Hide</HideButtonText>
            </HideButton>
            <TouchableOpacity onPress={() => processingSheetRef.current?.present()} style={{ padding: 4, marginLeft: 8 }}>
              <Ionicons name="chevron-up" size={20} color="#64748b" />
            </TouchableOpacity>
          </View>
        </FloatingProgressPill>
      )}

      <DocumentUploadBottomSheet ref={refRBSheet} />

      <BottomSheetModal
        ref={processingSheetRef}
        snapPoints={["60%"]}
        index={0}
        backdropComponent={(props) => (
          <BottomSheetBackdrop
            {...props}
            disappearsOnIndex={-1}
            appearsOnIndex={0}
            pressBehavior="close"
          />
        )}
      >
        <SheetContentWrapper>
          <SheetHeaderRow style={{ flexWrap: "nowrap" }}>
            <View style={{ flexDirection: "row", alignItems: "center", flex: 1, marginRight: 8, flexShrink: 1 }}>
              <SheetHeaderTitle style={{ flexShrink: 1 }} numberOfLines={1}>Processing</SheetHeaderTitle>
              <SheetHeaderBadge style={{ marginLeft: 6 }}>
                <SheetHeaderBadgeText>
                  {uploadingDocs.filter(d => d.status === "COMPLETED" || d.status === "completed" || d.status === "success" || d.status === "FAILED" || d.status === "failed").length}/{uploadingDocs.length} Completed
                </SheetHeaderBadgeText>
              </SheetHeaderBadge>
            </View>
            <TouchableOpacity
              onPress={() => {
                processingSheetRef.current?.dismiss();
                navigation.navigate("DocumentProcessing", {
                  jobIds: uploadingDocs.map(d => d.id),
                  filesInfo: uploadingDocs.map(d => ({ jobId: d.id, fileName: d.name, fileKey: "" })),
                });
              }}
              style={{ flexDirection: "row", alignItems: "center", flexShrink: 0 }}
            >
              <SheetDetailsText>View Details</SheetDetailsText>
              <Ionicons name="chevron-forward" size={14} color="#6366f1" style={{ marginLeft: 2 }} />
            </TouchableOpacity>
          </SheetHeaderRow>

          {/* Progress bar */}
          <SheetProgressRow>
            <SheetProgressBarBg>
              <SheetProgressBarFill
                style={{
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

          <BottomSheetScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 40 }}
          >
            {uploadingDocs.map((doc) => {
              const isCompleted = doc.status === "COMPLETED" || doc.status === "completed" || doc.status === "success";
              const isFailed = doc.status === "FAILED" || doc.status === "failed";
              const progress = doc.progress || 0;

              return (
                <DocItemRow key={doc.id}>
                  <DocItemIconBox isCompleted={isCompleted} isFailed={isFailed}>
                    <MaterialCommunityIcons
                      name={doc.name.endsWith(".pdf") ? "file-pdf-box" : "file-image-outline"}
                      size={24}
                      color={isCompleted ? "#10b981" : isFailed ? "#ef4444" : "#6366f1"}
                    />
                  </DocItemIconBox>

                  <DocItemInfo>
                    <DocItemName numberOfLines={1}>{doc.name}</DocItemName>
                    <DocItemStatus isCompleted={isCompleted} isFailed={isFailed}>
                      {isCompleted
                        ? "Completed • Medicines found"
                        : isFailed
                          ? "Failed to process"
                          : `Processing • ${progress}%`}
                    </DocItemStatus>
                  </DocItemInfo>

                  {isCompleted ? (
                    <Ionicons name="checkmark-circle" size={24} color="#10b981" />
                  ) : isFailed ? (
                    <Ionicons name="alert-circle" size={24} color="#ef4444" />
                  ) : (
                    <DocProgressCircle>
                      <DocProgressCircleText>{progress}%</DocProgressCircleText>
                    </DocProgressCircle>
                  )}
                </DocItemRow>
              );
            })}

            {/* "Review Now" button (only shown when all are complete/terminal) */}
            {uploadingDocs.every(
              (d) => d.status === "COMPLETED" || d.status === "completed" || d.status === "success" || d.status === "FAILED" || d.status === "failed"
            ) && (
              <SheetReviewNowBtn
                onPress={() => {
                  processingSheetRef.current?.dismiss();
                  navigation.navigate("DocumentProcessing", {
                    jobIds: uploadingDocs.map(d => d.id),
                    filesInfo: uploadingDocs.map(d => ({ jobId: d.id, fileName: d.name, fileKey: "" })),
                  });
                }}
                activeOpacity={0.8}
              >
                <SheetReviewNowBtnText>Review Now</SheetReviewNowBtnText>
              </SheetReviewNowBtn>
            )}
          </BottomSheetScrollView>
        </SheetContentWrapper>
      </BottomSheetModal>

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
  flex: 1;
  padding-horizontal: 24px;
  padding-top: 8px;
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
