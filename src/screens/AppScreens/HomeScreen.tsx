import React, { useRef, useCallback, useMemo, useState, useEffect } from "react";
import styled from "styled-components/native";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import {
  DrawerActions,
  useNavigation,
  useIsFocused,
} from "@react-navigation/native";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { LinearGradient } from "expo-linear-gradient";
import { useDocumentUpload } from "../../context/DocumentUploadContext";

import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { AppStackParamList } from "../../navigation/types";
import { useAppTheme } from "../../context/ThemeContext";
import Toast from "react-native-toast-message";
import { DocumentUploadBottomSheet } from "../../components/document-upload/DocumentUploadBottomSheet";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getNotificationCount } from "../../services/notificationService";
import { getUser } from "../../services/userService";
import { getFileSource } from "../../services/fileService";
import { ActivityIndicator, View, TouchableOpacity, Text } from "react-native";
import ReminderCard from "../../components/shared/ReminderCard";
import {
  listTodayOccurrences,
  updateReminderOccurrenceStatus,
  listTodayOccurrencesCount,
  getOutstandingRemindersCount,
} from "../../services/reminderService";
import { listMedications, refillMedicationService } from "../../services/medicationservice";
import { getDocumentsSummary } from "../../services/documentService";
import { Reminder } from "../../types";
import { getInitials } from "../../utils/avatarUtils";
import {
  useWeeklyAdherence,
  useMonthlyAdherence,
  useDailyDetails,
  useRefillAlerts,
  useInvalidateAdherenceDashboard,
} from "../../hooks/useMedicationAdherence";
import { MedicationWeeklyCard } from "../../components/adherence/MedicationWeeklyCard";
import { MedicationMonthlyCard } from "../../components/adherence/MedicationMonthlyCard";
import { MedicationRefillSection } from "../../components/adherence/MedicationRefillSection";
import { MedicationDailyBreakdownModal } from "../../components/adherence/MedicationDailyBreakdownModal";
import { RefillQuantityModal } from "../../components/adherence/RefillQuantityModal";
import { RefillAlertMedication } from "../../types/adherence";
import { addDaysToDateStr } from "../../utils/adherenceChartHelpers";

interface ActionItemProps {
  onPress: () => void;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  iconColor: string;
  badgeCount?: number;
  accessibilityDescription?: string;
}

const ActionItem = React.memo(
  ({
    onPress,
    icon,
    label,
    color,
    iconColor,
    badgeCount,
    accessibilityDescription,
  }: ActionItemProps) => (
    <ActionItemContainer
      onPress={onPress}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={
        accessibilityDescription
          ? `${label}, ${accessibilityDescription}`
          : `${label}${badgeCount ? `, ${badgeCount} items` : ""}`
      }
    >
      <ActionIconWrapper>
        <ActionIcon color={color}>
          <Ionicons name={icon} size={26} color={iconColor} />
        </ActionIcon>
        {typeof badgeCount === "number" && badgeCount > 0 && (
          <ActionBadge>
            <ActionBadgeText>{badgeCount > 99 ? "99+" : badgeCount}</ActionBadgeText>
          </ActionBadge>
        )}
      </ActionIconWrapper>
      <ActionLabel numberOfLines={1}>{label}</ActionLabel>
    </ActionItemContainer>
  ),
);

const HomeScreen = () => {
  const isFocused = useIsFocused();
  const queryClient = useQueryClient();
  const refRBSheet = useRef<BottomSheetModal>(null);

  const navigation =
    useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const { isDark } = useAppTheme();

  const {
    uploadingDocs,
    processingError,
    clearProcessingError,
  } = useDocumentUpload();

  const activeHomeUploadingDocs = useMemo(() => {
    return uploadingDocs.filter((doc) => doc.fromScreen !== "Onboarding");
  }, [uploadingDocs]);

  const avgProgress = useMemo(() => {
    if (activeHomeUploadingDocs.length === 0) return 0;
    const totalProgress = activeHomeUploadingDocs.reduce(
      (acc, doc) => acc + (doc.progress || 0),
      0,
    );
    return Math.round(totalProgress / activeHomeUploadingDocs.length);
  }, [activeHomeUploadingDocs]);

  const hasActiveUploads = useMemo(() => {
    return activeHomeUploadingDocs.some((doc) => {
      const status = (doc.status || "").toUpperCase();
      return (
        !["COMPLETED", "FAILED", "REJECTED", "CANCELLED", "SUCCESS", "ERROR"].includes(
          status,
        ) &&
        doc.progress !== 100 &&
        doc.progress !== -1
      );
    });
  }, [activeHomeUploadingDocs]);

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

  const [profileImageSource, setProfileImageSource] = useState<any>(null);

  useEffect(() => {
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

  const { data: notificationData } = useQuery({
    queryKey: ["notificationCount"],
    queryFn: getNotificationCount,
  });

  const { data: remindersData, isLoading: isLoadingReminders, refetch: refetchReminders } = useQuery({
    queryKey: ["todayReminders"],
    queryFn: listTodayOccurrences,
  });

  const reminders = useMemo(() => {
    const rawReminders =
      remindersData?.data?.occurrences ||
      remindersData?.data ||
      remindersData ||
      [];
    return Array.isArray(rawReminders) ? rawReminders : [];
  }, [remindersData]);

  const { data: medicationsData, refetch: refetchMedications } = useQuery({
    queryKey: ["allMedications"],
    queryFn: listMedications,
  });

  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);

  const { data: todayOccurrencesCountData, refetch: refetchOccurrences } = useQuery({
    queryKey: ["todayOccurrencesCount", todayStr],
    queryFn: () => listTodayOccurrencesCount({ startDate: todayStr, endDate: todayStr }),
  });

  const { data: outstandingCountData, refetch: refetchOutstandingCount } = useQuery({
    queryKey: ["outstandingRemindersCount"],
    queryFn: getOutstandingRemindersCount,
  });

  const { data: documentsSummaryData, refetch: refetchDocuments } = useQuery({
    queryKey: ["documentsSummary"],
    queryFn: getDocumentsSummary,
  });

  const { invalidateAll } = useInvalidateAdherenceDashboard();
  const [selectedDateForBreakdown, setSelectedDateForBreakdown] = useState<string | null>(null);
  const now = new Date();
  const [selectedMonthlyMonth, setSelectedMonthlyMonth] = useState<number>(now.getMonth() + 1);
  const [selectedMonthlyYear, setSelectedMonthlyYear] = useState<number>(now.getFullYear());
  const [refillTargetMed, setRefillTargetMed] = useState<RefillAlertMedication | null>(null);

  // Weekly period stepper offset (0 = current week, -1 = 1 week ago, etc.)
  const [weeklyOffsetWeeks, setWeeklyOffsetWeeks] = useState(0);

  const weeklyDates = useMemo(() => {
    const end = addDaysToDateStr(todayStr, weeklyOffsetWeeks * 7);
    const start = addDaysToDateStr(end, -6);
    return { startDate: start, endDate: end };
  }, [todayStr, weeklyOffsetWeeks]);

  const isCurrentPeriod = weeklyOffsetWeeks === 0;

  const handlePrevWeek = useCallback(() => {
    setWeeklyOffsetWeeks((prev) => prev - 1);
  }, []);

  const handleNextWeek = useCallback(() => {
    setWeeklyOffsetWeeks((prev) => Math.min(0, prev + 1));
  }, []);

  const handleTodayWeek = useCallback(() => {
    setWeeklyOffsetWeeks(0);
  }, []);

  const userTimezone =
    data?.timezone ||
    Intl.DateTimeFormat().resolvedOptions().timeZone ||
    "Asia/Kolkata";

  const {
    data: weeklyAdherenceData,
    isLoading: isLoadingWeekly,
    isError: isErrorWeekly,
    refetch: refetchWeekly,
  } = useWeeklyAdherence({
    timezone: userTimezone,
    startDate: weeklyDates.startDate,
    endDate: weeklyDates.endDate,
  });

  const {
    data: monthlyAdherenceData,
    isLoading: isLoadingMonthly,
    isError: isErrorMonthly,
    refetch: refetchMonthly,
  } = useMonthlyAdherence({
    month: selectedMonthlyMonth,
    year: selectedMonthlyYear,
    timezone: userTimezone,
  });

  const {
    data: dailyDetailsData,
    isLoading: isLoadingDaily,
    isError: isErrorDaily,
  } = useDailyDetails(
    { date: selectedDateForBreakdown || "", timezone: userTimezone },
    { enabled: Boolean(selectedDateForBreakdown) },
  );

  const {
    data: refillAlertsData,
    isLoading: isLoadingRefills,
    refetch: refetchRefills,
  } = useRefillAlerts({ timezone: userTimezone });

  useEffect(() => {
    if (isFocused) {
      refetchMedications();
      refetchOccurrences();
      refetchDocuments();
      refetchWeekly();
      refetchMonthly();
      refetchRefills();
      refetchReminders();
      refetchOutstandingCount();
    }
  }, [
    isFocused,
    refetchMedications,
    refetchOccurrences,
    refetchDocuments,
    refetchWeekly,
    refetchMonthly,
    refetchRefills,
    refetchReminders,
    refetchOutstandingCount,
  ]);

  const medicationsCount = Array.isArray(medicationsData?.data)
    ? medicationsData.data.length
    : 0;

  const documentsCount = documentsSummaryData?.data?.total || 0;

  // Total outstanding reminder occurrences across all active medication schedules (Pending + Overdue)
  const outstandingRemindersCount = useMemo(() => {
    const totalOut = outstandingCountData?.data?.totalOutstanding;
    if (typeof totalOut === "number") {
      return totalOut;
    }
    const pending = Number(outstandingCountData?.data?.pending || 0);
    const overdue = Number(outstandingCountData?.data?.overdue || 0);
    return pending + overdue;
  }, [outstandingCountData?.data]);

  // All medication reminder occurrences scheduled for current patient-local day, sorted by scheduled time
  const todayReminders = useMemo(() => {
    return [...reminders].sort((a: any, b: any) => {
      const timeA = new Date(a.actualMedicationTime).getTime();
      const timeB = new Date(b.actualMedicationTime).getTime();
      return timeA - timeB;
    });
  }, [reminders]);

  const todaySummary = useMemo(() => {
    const total = todayReminders.length;
    let completed = 0;
    let pending = 0;
    let overdue = 0;
    let skipped = 0;
    let missed = 0;

    for (const r of todayReminders) {
      const st = (r.status || "").toUpperCase();
      if (st === "COMPLETED") {
        completed++;
      } else if (st === "SKIPPED") {
        skipped++;
      } else if (st === "MISSED") {
        missed++;
      } else if (st === "PENDING") {
        if (r.isOverdue) {
          overdue++;
        } else {
          pending++;
        }
      }
    }

    const allCompleted = total > 0 && completed === total;
    return {
      total,
      completed,
      pending,
      overdue,
      skipped,
      missed,
      allCompleted,
    };
  }, [todayReminders]);

  const updateStatusMutation = useMutation({
    mutationFn: updateReminderOccurrenceStatus,
    onSuccess: () => {
      invalidateAll();
      queryClient.invalidateQueries({ queryKey: ["todayReminders"] });
      queryClient.invalidateQueries({ queryKey: ["outstandingRemindersCount"] });
      queryClient.invalidateQueries({ queryKey: ["todayOccurrencesCount"] });
      queryClient.invalidateQueries({ queryKey: ["allRemindersCounts"] });
      refetchReminders();
      refetchOutstandingCount();
      refetchOccurrences();
    },
  });

  const handleToggleStatus = async (item: Reminder) => {
    if (item.status === "completed") return;

    await updateStatusMutation.mutateAsync({
      occurrenceId: item.id!,
      status: "COMPLETED",
    });
  };

  const handleConfirmRefill = async (medicationId: string, quantity: number) => {
    await refillMedicationService({ medicationId, quantity });
    Toast.show({
      type: "success",
      text1: "Medication Refilled",
      text2: `Successfully added ${quantity} units to inventory.`,
    });
    await invalidateAll();
  };

  const notificationBadgeCount = notificationData?.data?.count ?? 0;

  const headerColors = useMemo(
    () =>
      isDark
        ? ["#1e1b4b", "#312e81", "#0f172a"]
        : ["#4f46e5", "#3730a3", "#1e1b4b"],
    [isDark],
  );

  return (
    <Container isDark={isDark}>
      <StatusBar style="light" />

      {/* --- 1. RESTORED ORIGINAL PURPLE GRADIENT GREETING HEADER --- */}
      <HeaderGradient
        colors={headerColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <TopRow>
          <IconButton
            onPress={handleOpenDrawer}
            accessibilityRole="button"
            accessibilityLabel="Open navigation menu"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="menu-outline" size={28} color="#fff" />
          </IconButton>
          <NotificationWrapper
            onPress={() => navigation.navigate("Notifications")}
            accessibilityRole="button"
            accessibilityLabel="View notifications"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
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

      {/* --- DASHBOARD SCROLL CONTENT --- */}
      <ScrollContent
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 52 }}
      >
        {/* --- 2. LAST 7 DAYS MEDICATION ADHERENCE CHART (WITH PERIOD STEPPER) --- */}
        <SectionContainer>
          <MedicationWeeklyCard
            data={weeklyAdherenceData}
            isLoading={isLoadingWeekly}
            isError={isErrorWeekly}
            onRetry={refetchWeekly}
            onSelectDay={(date) => setSelectedDateForBreakdown(date)}
            onViewDetails={() => navigation.navigate("Reminders")}
            selectedDate={selectedDateForBreakdown || undefined}
            onPrevPeriod={handlePrevWeek}
            onNextPeriod={handleNextWeek}
            onTodayPeriod={handleTodayWeek}
            isCurrentPeriod={isCurrentPeriod}
          />
        </SectionContainer>

        {/* --- 3. MONTHLY SUMMARY CHART --- */}
        <SectionContainer>
          <MedicationMonthlyCard
            data={monthlyAdherenceData}
            isLoading={isLoadingMonthly}
            isError={isErrorMonthly}
            onRetry={refetchMonthly}
            selectedMonth={selectedMonthlyMonth}
            selectedYear={selectedMonthlyYear}
            onChangeMonthYear={(m, y) => {
              setSelectedMonthlyMonth(m);
              setSelectedMonthlyYear(y);
            }}
          />
        </SectionContainer>

        {/* --- 4. QUICK ACTIONS (WITH BADGE COUNTS ON ICONS) --- */}
        <SectionHeader style={{ marginTop: 14 }}>
          <SectionTitle isDark={isDark}>Quick Actions</SectionTitle>
        </SectionHeader>

        <ActionsRow>
          <ActionItem
            onPress={() => {
              if (hasActiveUploads) {
                Toast.show({
                  type: "info",
                  position: "top",
                  text1: "Processing in Progress",
                  text2: "A document is currently being processed. Please wait for it to complete.",
                });
                return;
              }
              refRBSheet?.current?.present();
            }}
            icon="add"
            label="Add Docs"
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
            label="My Docs"
            color="#eff6ff"
            iconColor="#2563eb"
            badgeCount={documentsCount}
          />
          <ActionItem
            onPress={() => navigation.navigate("Reminders")}
            icon="calendar-outline"
            label="Reminders"
            color="#f5f3ff"
            iconColor="#8b5cf6"
            badgeCount={outstandingRemindersCount}
            accessibilityDescription={`${outstandingRemindersCount} outstanding medication reminders`}
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
            badgeCount={medicationsCount}
          />
        </ActionsRow>

        {/* Inline Processing Documents Card */}
        {uploadingDocs.length > 0 && hasActiveUploads && (
          <ProcessingCard style={{ marginHorizontal: 18, marginTop: 12, paddingBottom: 14 }}>
            <SheetHeaderRow style={{ flexWrap: "nowrap", marginBottom: 10 }}>
              <View style={{ flexDirection: "row", alignItems: "center", flex: 1, marginRight: 8, flexShrink: 1 }}>
                <SheetHeaderTitle style={{ color: "#4f46e5", flexShrink: 1 }} numberOfLines={1}>
                  Processing
                </SheetHeaderTitle>
                <SheetHeaderBadge style={{ backgroundColor: "#e0e7ff", marginLeft: 6 }}>
                  <SheetHeaderBadgeText style={{ color: "#4f46e5" }}>
                    {uploadingDocs.filter(d => d.status === "COMPLETED" || d.status === "completed" || d.status === "success" || d.status === "FAILED" || d.status === "failed").length}/{uploadingDocs.length} Completed
                  </SheetHeaderBadgeText>
                </SheetHeaderBadge>
              </View>
              <TouchableOpacity
                onPress={() => {
                  const processingDocs = uploadingDocs.map((doc) => {
                    const jobId = doc.jobId || doc.id;
                    const fileKey = doc.fileKey || jobId;
                    return {
                      jobId,
                      fileName: doc.name,
                      fileKey,
                    };
                  });

                  navigation.navigate("DocumentProcessing", {
                    jobIds: processingDocs.map((doc) => doc.jobId),
                    filesInfo: processingDocs,
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

            <SheetProgressRow style={{ marginBottom: 0 }}>
              <SheetProgressBarBg>
                <SheetProgressBarFill
                  style={{
                    backgroundColor: "#6366f1",
                    width: `${avgProgress}%`,
                  }}
                />
              </SheetProgressBarBg>
              <SheetProgressPctText>{avgProgress}%</SheetProgressPctText>
            </SheetProgressRow>
          </ProcessingCard>
        )}

        {/* Processing Error Warning Banner */}
        {!hasActiveUploads && processingError !== null && (
          <AnalysisCompleteBanner
            style={{
              marginHorizontal: 18,
              marginTop: 12,
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
                  Processing Interrupted
                </AnalysisCompleteTitle>
                <AnalysisCompleteSub style={{ color: isDark ? "#cbd5e1" : "#78350f", marginTop: 4, marginLeft: 0 }}>
                  {processingError.type === "cancelled"
                    ? "Document processing was stopped or interrupted."
                    : "The document analysis failed. Please verify the medical document."}
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

        {/* --- 5. REFILL REMINDERS (Strictly shown only when alerts exist) --- */}
        {Boolean(refillAlertsData?.hasRefillAlerts && refillAlertsData?.medications?.length) && (
          <SectionContainer style={{ marginTop: 6 }}>
            <MedicationRefillSection
              data={refillAlertsData}
              isLoading={isLoadingRefills}
              onRefillPress={(med) => setRefillTargetMed(med)}
              onViewAll={() =>
                navigation.navigate("MedicationStack", {
                  screen: "MedicationList",
                })
              }
            />
          </SectionContainer>
        )}

        {/* --- 6. TODAY'S REMINDERS --- */}
        <SectionHeader style={{ marginTop: 14 }}>
          <SectionTitle isDark={isDark}>Today's Reminders</SectionTitle>
          <ViewAllButton
            onPress={() => navigation.navigate("Reminders")}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <ViewAllText>View All →</ViewAllText>
          </ViewAllButton>
        </SectionHeader>

        {todaySummary.total > 0 && (
          <TodaySummaryScroll
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 18, gap: 8, paddingBottom: 10 }}
          >
            <TodaySummaryChip isDark={isDark}>
              <TodaySummaryLabel isDark={isDark}>Today's Doses:</TodaySummaryLabel>
              <TodaySummaryValue color="#6366f1">{todaySummary.total}</TodaySummaryValue>
            </TodaySummaryChip>
            <TodaySummaryChip isDark={isDark}>
              <TodaySummaryDot color="#10b981" />
              <TodaySummaryLabel isDark={isDark}>Completed:</TodaySummaryLabel>
              <TodaySummaryValue color="#10b981">{todaySummary.completed}</TodaySummaryValue>
            </TodaySummaryChip>
            {todaySummary.pending > 0 && (
              <TodaySummaryChip isDark={isDark}>
                <TodaySummaryDot color="#f97316" />
                <TodaySummaryLabel isDark={isDark}>Pending:</TodaySummaryLabel>
                <TodaySummaryValue color="#f97316">{todaySummary.pending}</TodaySummaryValue>
              </TodaySummaryChip>
            )}
            {todaySummary.overdue > 0 && (
              <TodaySummaryChip isDark={isDark}>
                <TodaySummaryDot color="#ef4444" />
                <TodaySummaryLabel isDark={isDark}>Overdue:</TodaySummaryLabel>
                <TodaySummaryValue color="#ef4444">{todaySummary.overdue}</TodaySummaryValue>
              </TodaySummaryChip>
            )}
            {todaySummary.skipped > 0 && (
              <TodaySummaryChip isDark={isDark}>
                <TodaySummaryDot color="#64748b" />
                <TodaySummaryLabel isDark={isDark}>Skipped:</TodaySummaryLabel>
                <TodaySummaryValue color="#64748b">{todaySummary.skipped}</TodaySummaryValue>
              </TodaySummaryChip>
            )}
            {todaySummary.missed > 0 && (
              <TodaySummaryChip isDark={isDark}>
                <TodaySummaryDot color="#f59e0b" />
                <TodaySummaryLabel isDark={isDark}>Missed:</TodaySummaryLabel>
                <TodaySummaryValue color="#f59e0b">{todaySummary.missed}</TodaySummaryValue>
              </TodaySummaryChip>
            )}
          </TodaySummaryScroll>
        )}

        <RemindersListContainer>
          {isLoadingReminders ? (
            <ActivityIndicator
              size="large"
              color="#6366f1"
              style={{ marginVertical: 20 }}
            />
          ) : todayReminders.length === 0 ? (
            <EmptyReminderBox isDark={isDark}>
              <Ionicons
                name="calendar-outline"
                size={32}
                color="#94a3b8"
                style={{ marginBottom: 6 }}
              />
              <EmptyReminderText isDark={isDark}>
                No medications scheduled for today.
              </EmptyReminderText>
            </EmptyReminderBox>
          ) : (
            <>
              {todaySummary.allCompleted && (
                <AllCompletedCard isDark={isDark}>
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color="#10b981"
                    style={{ marginRight: 8 }}
                  />
                  <AllCompletedText isDark={isDark}>
                    All scheduled doses completed today!
                  </AllCompletedText>
                </AllCompletedCard>
              )}
              {todayReminders.map((reminder: Reminder, index: number) => (
                <ReminderCard
                  key={reminder.id}
                  item={reminder}
                  index={index}
                  isDark={isDark}
                  onActionPress={() => handleToggleStatus(reminder)}
                />
              ))}
            </>
          )}
        </RemindersListContainer>

        {/* Senior-friendly buffer space ensuring bottom tab bar never covers content */}
        <BottomSpacing />
      </ScrollContent>

      <DocumentUploadBottomSheet ref={refRBSheet} />

      <MedicationDailyBreakdownModal
        visible={Boolean(selectedDateForBreakdown)}
        dateStr={selectedDateForBreakdown || undefined}
        data={dailyDetailsData}
        isLoading={isLoadingDaily}
        isError={isErrorDaily}
        onClose={() => setSelectedDateForBreakdown(null)}
      />

      <RefillQuantityModal
        visible={Boolean(refillTargetMed)}
        medication={refillTargetMed}
        onClose={() => setRefillTargetMed(null)}
        onConfirmRefill={handleConfirmRefill}
      />
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
  padding: 44px 20px 60px;
  border-bottom-left-radius: 40px;
  border-bottom-right-radius: 40px;
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
  margin-top: 14px;
`;

const UserAvatarFallback = styled.View`
  width: 50px;
  height: 50px;
  border-radius: 25px;
  border-width: 2px;
  border-color: rgba(255, 255, 255, 0.4);
  background-color: rgba(255, 255, 255, 0.2);
  justify-content: center;
  align-items: center;
`;

const UserAvatarFallbackText = styled.Text`
  color: white;
  font-size: 22px;
  font-weight: bold;
`;

const Avatar = styled.Image`
  width: 50px;
  height: 50px;
  border-radius: 25px;
  border-width: 2px;
  border-color: rgba(255, 255, 255, 0.4);
`;

const UserTextContent = styled.View`
  margin-left: 12px;
  flex: 1;
`;

const GreetingText = styled.Text`
  color: white;
  font-size: 20px;
  font-weight: 700;
  letter-spacing: -0.3px;
`;

const SubGreetingText = styled.Text`
  color: rgba(255, 255, 255, 0.85);
  font-size: 13px;
  margin-top: 2px;
`;

/* Restored Floating White Health Overview Card */
const FixedOverviewCard = styled.View`
  position: absolute;
  top: 152px;
  left: 18px;
  right: 18px;
  background-color: ${({ isDark }: { isDark: boolean }) =>
    isDark ? "#1e293b" : "#ffffff"};
  border-radius: 20px;
  padding: 18px 20px;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  border-width: 1px;
  border-color: ${({ isDark }: { isDark: boolean }) =>
    isDark ? "#334155" : "#e2e8f0"};
  z-index: 10;
`;

const OverviewTextContainer = styled.View`
  flex: 1;
`;

const OverviewTitle = styled.Text<{ isDark: boolean }>`
  font-size: 17px;
  font-weight: 700;
  color: ${({ isDark }: { isDark: boolean }) =>
    isDark ? "#f8fafc" : "#1e293b"};
`;

const OverviewSubtitle = styled.Text<{ isDark: boolean }>`
  font-size: 13px;
  color: ${({ isDark }: { isDark: boolean }) =>
    isDark ? "#94a3b8" : "#64748b"};
  margin-top: 3px;
`;

const ScrollContent = styled.ScrollView`
  flex: 1;
`;

const SectionContainer = styled.View`
  padding-horizontal: 18px;
  margin-top: 4px;
`;

const SectionHeader = styled.View`
  flex-direction: row;
  justify-content: space-between;
  padding: 8px 18px 4px;
  align-items: center;
`;

const SectionTitle = styled.Text<{ isDark: boolean }>`
  font-size: 18px;
  font-weight: 700;
  color: ${({ isDark }: { isDark: boolean }) => (isDark ? "#f8fafc" : "#0f172a")};
  letter-spacing: -0.2px;
`;

const ViewAllButton = styled.TouchableOpacity`
  padding: 4px;
`;

const ViewAllText = styled.Text`
  font-size: 13px;
  font-weight: 700;
  color: #6366f1;
`;

/* Actions Layout Row Updates with Badges */
const ActionsRow = styled.View`
  flex-direction: row;
  justify-content: space-between;
  padding: 0 18px;
  margin-top: 6px;
`;

const ActionItemContainer = styled.TouchableOpacity`
  align-items: center;
  width: 22%;
`;

const ActionIconWrapper = styled.View`
  position: relative;
`;

const ActionIcon = styled.View<{ color: string }>`
  background-color: ${({ color }: { color: string }) => color};
  width: 58px;
  height: 58px;
  border-radius: 18px;
  justify-content: center;
  align-items: center;
  elevation: 2;
  shadow-color: #000;
  shadow-offset: 0px 2px;
  shadow-opacity: 0.05;
  shadow-radius: 4px;
`;

const ActionBadge = styled.View`
  position: absolute;
  top: -4px;
  right: -4px;
  background-color: #4f46e5;
  min-width: 19px;
  height: 19px;
  border-radius: 9.5px;
  padding-horizontal: 4px;
  justify-content: center;
  align-items: center;
  border-width: 2px;
  border-color: #ffffff;
  elevation: 3;
`;

const ActionBadgeText = styled.Text`
  color: white;
  font-size: 9px;
  font-weight: 800;
`;

const ActionLabel = styled.Text`
  font-size: 12px;
  text-align: center;
  color: #334155;
  margin-top: 8px;
  font-weight: 600;
`;

const RemindersListContainer = styled.View`
  padding-horizontal: 18px;
  margin-top: 6px;
`;

const EmptyReminderBox = styled.View<{ isDark: boolean }>`
  align-items: center;
  justify-content: center;
  padding: 24px 16px;
  background-color: ${({ isDark }: { isDark: boolean }) =>
    isDark ? "#1e293b" : "#ffffff"};
  border-radius: 16px;
  border-width: 1px;
  border-color: ${({ isDark }: { isDark: boolean }) =>
    isDark ? "#334155" : "#e2e8f0"};
  margin-top: 4px;
`;

const EmptyReminderText = styled.Text<{ isDark: boolean }>`
  font-size: 14px;
  font-weight: 600;
  color: ${({ isDark }: { isDark: boolean }) =>
    isDark ? "#94a3b8" : "#64748b"};
`;

const TodaySummaryScroll = styled.ScrollView`
  margin-top: 4px;
`;

const TodaySummaryChip = styled.View<{ isDark: boolean }>`
  flex-direction: row;
  align-items: center;
  padding-horizontal: 10px;
  padding-vertical: 6px;
  border-radius: 12px;
  background-color: ${({ isDark }: { isDark: boolean }) =>
    isDark ? "#1e293b" : "#f1f5f9"};
  border-width: 1px;
  border-color: ${({ isDark }: { isDark: boolean }) =>
    isDark ? "#334155" : "#e2e8f0"};
`;

const TodaySummaryDot = styled.View<{ color: string }>`
  width: 6px;
  height: 6px;
  border-radius: 3px;
  background-color: ${({ color }: { color: string }) => color};
  margin-right: 5px;
`;

const TodaySummaryLabel = styled.Text<{ isDark: boolean }>`
  font-size: 12px;
  font-weight: 500;
  color: ${({ isDark }: { isDark: boolean }) =>
    isDark ? "#94a3b8" : "#64748b"};
  margin-right: 4px;
`;

const TodaySummaryValue = styled.Text<{ color?: string; isDark?: boolean }>`
  font-size: 12px;
  font-weight: 700;
  color: ${({ color, isDark }: { color?: string; isDark?: boolean }) =>
    color || (isDark ? "#f8fafc" : "#0f172a")};
`;

const AllCompletedCard = styled.View<{ isDark: boolean }>`
  flex-direction: row;
  align-items: center;
  padding: 12px 16px;
  border-radius: 14px;
  background-color: ${({ isDark }: { isDark: boolean }) =>
    isDark ? "#064e3b25" : "#ecfdf5"};
  border-width: 1px;
  border-color: ${({ isDark }: { isDark: boolean }) =>
    isDark ? "#065f46" : "#a7f3d0"};
  margin-bottom: 12px;
`;

const AllCompletedText = styled.Text<{ isDark: boolean }>`
  font-size: 13px;
  font-weight: 600;
  color: ${({ isDark }: { isDark: boolean }) =>
    isDark ? "#34d399" : "#065f46"};
`;

const BottomSpacing = styled.View`
  height: 130px;
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

const CloseBannerBtn = styled.TouchableOpacity`
  padding: 4px;
  margin-left: 8px;
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

const ProcessingCard = styled.View`
  background-color: #ffffff;
  border-radius: 20px;
  padding: 16px;
  elevation: 2;
  shadow-color: #000;
  shadow-offset: 0px 2px;
  shadow-opacity: 0.05;
  shadow-radius: 4px;
`;
