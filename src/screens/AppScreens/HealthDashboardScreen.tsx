import { useCallback, useState } from "react"
import { RefreshControl, ScrollView, StyleSheet, View, Text, ActivityIndicator } from "react-native"
import { useFocusEffect, useNavigation } from "@react-navigation/native"
import styled from "styled-components/native"
import { LinearGradient } from "expo-linear-gradient"
import { Ionicons } from "@expo/vector-icons"

import { useAppTheme } from "../../context/ThemeContext"
import {
  ErrorScreen,
  LoadingScreen,
} from "../../components/shared/DefensiveStates"
import { syncWearables } from "../../services/wearable/wearableSyncService"
import type { WearableMetricType } from "../../services/wearable/types"
import { useWearablePermissions } from "../../hooks/useWearablePermissions"
import { useDirectHealthDashboard, MetricCardData } from "../../hooks/useDirectHealthDashboard"

type MetricKind = "sum" | "duration" | "rate"

interface MetricCardConfig {
  metric: WearableMetricType
  label: string
  icon: string
  kind: MetricKind
  accent: string
}

const METRIC_CARDS: MetricCardConfig[] = [
  { metric: "steps", label: "Steps", icon: "footsteps-outline", kind: "sum", accent: "#0f766e" },
  { metric: "distance", label: "Distance", icon: "navigate-outline", kind: "sum", accent: "#2563eb" },
  { metric: "active_energy", label: "Active Energy", icon: "flame-outline", kind: "sum", accent: "#ea580c" },
  { metric: "sleep", label: "Sleep", icon: "moon-outline", kind: "duration", accent: "#7c3aed" },
  { metric: "heart_rate", label: "Heart Rate", icon: "heart-outline", kind: "rate", accent: "#dc2626" },
  { metric: "resting_heart_rate", label: "Resting HR", icon: "pulse-outline", kind: "rate", accent: "#db2777" },
  { metric: "spo2", label: "Blood Oxygen", icon: "water-outline", kind: "rate", accent: "#0891b2" },
  { metric: "hrv", label: "Heart Rate Variability", icon: "analytics-outline", kind: "rate", accent: "#8b5cf6" },
  { metric: "body_temperature", label: "Body Temperature", icon: "thermometer-outline", kind: "rate", accent: "#f43f5e" },
  { metric: "respiratory_rate", label: "Respiratory Rate", icon: "medical-outline", kind: "rate", accent: "#ec4899" },
  { metric: "weight", label: "Weight", icon: "scale-outline", kind: "rate", accent: "#f59e0b" },
  { metric: "blood_pressure_systolic", label: "Systolic BP", icon: "heart-half-outline", kind: "rate", accent: "#10b981" },
  { metric: "blood_pressure_diastolic", label: "Diastolic BP", icon: "heart-dislike-outline", kind: "rate", accent: "#059669" },
  { metric: "blood_glucose", label: "Blood Glucose", icon: "eyedrop-outline", kind: "rate", accent: "#3b82f6" },
]

interface MetricCategory {
  title: string
  metrics: WearableMetricType[]
}

const CATEGORIES: MetricCategory[] = [
  { title: "Activity", metrics: ["steps", "distance", "active_energy"] },
  { title: "Vitals", metrics: ["heart_rate", "resting_heart_rate", "spo2", "hrv", "respiratory_rate"] },
  { title: "Body", metrics: ["weight", "body_temperature"] },
  { title: "Clinical", metrics: ["blood_pressure_systolic", "blood_pressure_diastolic", "blood_glucose"] },
  { title: "Recovery", metrics: ["sleep"] },
]

function formatSum(metric: WearableMetricType, total: number): string {
  if (metric === "distance") return `${(total / 1000).toFixed(2)} km`
  if (metric === "active_energy")
    return `${Math.round(total).toLocaleString()} kcal`
  return Math.round(total).toLocaleString()
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  return `${h}h ${m}m`
}

function renderCardBody(card: MetricCardConfig, item: MetricCardData | undefined) {
  if (!item || item.status === "no_data") {
    const notRecordedNotice = item?.has30dData === false ? "Not recorded by device" : "No data yet for today";
    if (card.kind === "sum") {
      return (
        <>
          <BigValue>{formatSum(card.metric, 0)}</BigValue>
          <StatLbl>{notRecordedNotice}</StatLbl>
        </>
      )
    }
    if (card.kind === "duration") {
      return (
        <>
          <BigValue>{formatDuration(0)}</BigValue>
          <StatLbl>{notRecordedNotice}</StatLbl>
        </>
      )
    }
    return (
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <MutedValue>—</MutedValue>
        <StatLbl style={{ fontSize: 11, fontStyle: "italic" }}>{notRecordedNotice}</StatLbl>
      </View>
    )
  }

  if (item.status === "denied") {
    return <MutedValue style={{ color: "#ef4444" }}>Permission Denied</MutedValue>
  }

  if (item.status === "error") {
    return <MutedValue style={{ color: "#f43f5e" }}>Error loading data</MutedValue>
  }

  if (card.kind === "sum") {
    return (
      <>
        <BigValue>{formatSum(card.metric, item.sum ?? 0)}</BigValue>
        <StatLbl>Today</StatLbl>
      </>
    )
  }

  if (card.kind === "duration") {
    return (
      <>
        <BigValue>{formatDuration(item.sum ?? 0)}</BigValue>
        <StatLbl>Today</StatLbl>
      </>
    )
  }

  return (
    <StatRow>
      <StatCell>
        <StatNum>{Math.round(item.avg ?? 0)}</StatNum>
        <StatLbl>avg</StatLbl>
      </StatCell>

      <StatCell>
        <StatNum>{Math.round(item.min ?? 0)}</StatNum>
        <StatLbl>min</StatLbl>
      </StatCell>

      <StatCell>
        <StatNum>{Math.round(item.max ?? 0)}</StatNum>
        <StatLbl>max</StatLbl>
      </StatCell>
    </StatRow>
  )
}

const HealthDashboardScreen = () => {
  const navigation = useNavigation<any>()
  const { isDark } = useAppTheme()

  const { isAvailable, hasCorePermissions } = useWearablePermissions()
  const isConnected = isAvailable && hasCorePermissions

  const [syncing, setSyncing] = useState(false)

  const { data, isLoading, error, refetch, isRefetching } = useDirectHealthDashboard()

  const handleManualSync = async () => {
    setSyncing(true)
    try {
      await syncWearables()
      await refetch()
    } catch (e) {
      console.warn("[DashboardSync] Sync failed:", e)
    } finally {
      setSyncing(false)
    }
  }

  const handleConnect = () => {
    navigation.navigate("HealthConnectCompatibility")
  }

  useFocusEffect(
    useCallback(() => {
      refetch()
    }, [refetch]),
  )

  if (isLoading) {
    return <LoadingScreen />
  }

  if (error) {
    return (
      <ErrorScreen
        message={error}
        onRetry={() => {
          refetch()
        }}
      />
    )
  }

  const hasAnyData = METRIC_CARDS.some(
    (c) => data[c.metric]?.status === "success",
  )

  return (
    <Container
      colors={isDark ? ["#0b1220", "#0f172a"] : ["#f5f3ff", "#ffffff"]}
    >
      <Header>
        <BackButton
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons
            name="chevron-back"
            size={24}
            color={isDark ? "#e2e8f0" : "#0f172a"}
          />
        </BackButton>
        <HeaderTitle>Health</HeaderTitle>
        <HeaderSpacer />
      </Header>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={!!isRefetching || syncing}
            onRefresh={() => refetch()}
            tintColor={isDark ? "#e2e8f0" : "#0f172a"}
          />
        }
      >
        <ConnectionCard>
          <ConnectionStatusRow>
            <ConnectionTitle>Health Connect</ConnectionTitle>
            <StatusBadge active={isConnected}>
              <StatusText active={isConnected}>
                {isConnected ? "Connected" : "Disconnected"}
              </StatusText>
            </StatusBadge>
          </ConnectionStatusRow>
          <Text style={{ fontSize: 13, color: isDark ? "#94a3b8" : "#64748b" }}>
            {isConnected
              ? "Your smart watch logs steps, heart rate, and sleep data automatically via Health Connect."
              : "Link Health Connect to synchronize steps, heart rate, and sleep metrics from your companion apps."}
          </Text>
          <ConnectionButtonRow>
            {isConnected ? (
              <>
                <ActionButton onPress={handleManualSync} disabled={syncing}>
                  {syncing ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <ActionButtonText>Sync Now</ActionButtonText>
                  )}
                </ActionButton>
                <SecondaryButton onPress={() => navigation.navigate("WearableSettings")}>
                  <SecondaryButtonText style={{ color: isDark ? "#e2e8f0" : "#0f172a" }}>
                    Manage Settings
                  </SecondaryButtonText>
                </SecondaryButton>
              </>
            ) : (
              <ActionButton style={{ marginRight: 0 }} onPress={handleConnect} disabled={syncing}>
                {syncing ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <ActionButtonText>Connect Now</ActionButtonText>
                )}
              </ActionButton>
            )}
          </ConnectionButtonRow>
        </ConnectionCard>

        <RangeLabel>Today's Overview (Health Connect Direct)</RangeLabel>

        {!hasAnyData ? (
          <EmptyCard>
            <Ionicons
              name="fitness-outline"
              size={40}
              color={isDark ? "#64748b" : "#94a3b8"}
            />
            <EmptyTitle>No health data yet for today</EmptyTitle>
            <EmptyText>
              Grant Health Connect permissions and sync a device to see your
              steps, heart rate, sleep and more here.
            </EmptyText>
          </EmptyCard>
        ) : (
          CATEGORIES.map((category) => {
            const categoryMetrics = category.metrics
              .map((m) => METRIC_CARDS.find((c) => c.metric === m))
              .filter(Boolean) as MetricCardConfig[]
            return (
              <View key={category.title}>
                <CategoryHeader>{category.title}</CategoryHeader>
                {categoryMetrics.map((card) => {
                  const item = data[card.metric]
                  console.log(`item: ${JSON.stringify(item)}`);
                  return (
                    <MetricCardView key={card.metric}>
                      <CardHeaderRow>
                        <IconBadge bgColor={card.accent}>
                          <Ionicons
                            name={card.icon as any}
                            size={18}
                            color="#ffffff"
                          />
                        </IconBadge>
                        <CardLabel>{card.label}</CardLabel>
                      </CardHeaderRow>
                      {renderCardBody(card, item)}
                    </MetricCardView>
                  )
                })}
              </View>
            )
          })
        )}
      </ScrollView>
    </Container>
  )
}

export default HealthDashboardScreen

const styles = StyleSheet.create({
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
})

const Container = styled(LinearGradient)`
  flex: 1;
`

const Header = styled.View`
  flex-direction: row;
  align-items: center;
  padding: 12px 16px;
`

const BackButton = styled.TouchableOpacity`
  width: 32px;
  height: 32px;
  align-items: center;
  justify-content: center;
`

const HeaderTitle = styled.Text`
  flex: 1;
  text-align: center;
  font-size: 18px;
  font-weight: 700;
  color: ${({ theme }: any) => theme.colors.textPrimary};
`

const HeaderSpacer = styled.View`
  width: 32px;
`

const RangeLabel = styled.Text`
  font-size: 13px;
  margin-bottom: 12px;
  color: ${({ theme }: any) => theme.colors.textMuted};
`

const MetricCardView = styled.View`
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 12px;
  border-width: 1px;
  background-color: ${({ theme }: any) => theme.colors.surface};
  border-color: ${({ theme }: any) => theme.colors.border};
`

const CardHeaderRow = styled.View`
  flex-direction: row;
  align-items: center;
  margin-bottom: 10px;
`

const IconBadge = styled.View<{ bgColor: string }>`
  width: 32px;
  height: 32px;
  border-radius: 10px;
  align-items: center;
  justify-content: center;
  margin-right: 10px;
  background-color: ${({ bgColor }: any) => bgColor};
`

const CardLabel = styled.Text`
  font-size: 15px;
  font-weight: 600;
  color: ${({ theme }: any) => theme.colors.textPrimary};
`

const BigValue = styled.Text`
  font-size: 28px;
  font-weight: 700;
  color: ${({ theme }: any) => theme.colors.textPrimary};
`

const MutedValue = styled.Text`
  font-size: 15px;
  color: ${({ theme }: any) => theme.colors.textMuted};
`

const StatRow = styled.View`
  flex-direction: row;
  justify-content: space-between;
`

const StatCell = styled.View`
  flex: 1;
  align-items: center;
`

const StatNum = styled.Text`
  font-size: 22px;
  font-weight: 700;
  color: ${({ theme }: any) => theme.colors.textPrimary};
`

const StatLbl = styled.Text`
  font-size: 12px;
  margin-top: 2px;
  color: ${({ theme }: any) => theme.colors.textMuted};
`

const EmptyCard = styled.View`
  align-items: center;
  padding: 40px 24px;
`

const EmptyTitle = styled.Text`
  font-size: 17px;
  font-weight: 700;
  margin-top: 12px;
  color: ${({ theme }: any) => theme.colors.textPrimary};
`

const EmptyText = styled.Text`
  font-size: 14px;
  text-align: center;
  margin-top: 6px;
  color: ${({ theme }: any) => theme.colors.textMuted};
`

const CategoryHeader = styled.Text`
  font-size: 16px;
  font-weight: 700;
  margin-top: 16px;
  margin-bottom: 8px;
  color: ${({ theme }: any) => theme.colors.textPrimary};
`

const ConnectionCard = styled.View`
  background-color: ${({ theme }: any) => theme.colors.surface};
  border-color: ${({ theme }: any) => theme.colors.border};
  border-width: 1px;
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 16px;
`

const ConnectionStatusRow = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
`

const ConnectionTitle = styled.Text`
  font-size: 16px;
  font-weight: 600;
  color: ${({ theme }: any) => theme.colors.textPrimary};
`

const StatusBadge = styled.View<{ active: boolean }>`
  padding: 4px 8px;
  border-radius: 8px;
  background-color: ${({ active }: any) => (active ? "#d1fae5" : "#fee2e2")};
`

const StatusText = styled.Text<{ active: boolean }>`
  font-size: 12px;
  font-weight: 600;
  color: ${({ active }: any) => (active ? "#065f46" : "#991b1b")};
`

const ConnectionButtonRow = styled.View`
  flex-direction: row;
  justify-content: space-between;
  margin-top: 12px;
`

const ActionButton = styled.TouchableOpacity`
  flex: 1;
  background-color: ${({ theme }: any) => theme.colors.primary};
  padding: 10px;
  border-radius: 8px;
  align-items: center;
  justify-content: center;
  margin-right: 8px;
`

const ActionButtonText = styled.Text`
  color: #ffffff;
  font-size: 14px;
  font-weight: 600;
`

const SecondaryButton = styled.TouchableOpacity`
  flex: 1;
  border-width: 1px;
  border-color: ${({ theme }: any) => theme.colors.border};
  padding: 10px;
  border-radius: 8px;
  align-items: center;
  justify-content: center;
`

const SecondaryButtonText = styled.Text`
  color: ${({ theme }: any) => theme.colors.textPrimary};
  font-size: 14px;
  font-weight: 600;
`
