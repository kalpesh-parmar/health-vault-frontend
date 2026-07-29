import React, { useEffect, useState } from "react";
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Share,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import styled from "styled-components/native";

import { useAppTheme } from "../../context/ThemeContext";
import { useWearablePermissions } from "../../hooks/useWearablePermissions";
import { syncDiagnosticsManager, DiagnosticsEntry } from "../../services/wearable/SyncDiagnosticsManager";
import { dashboardCacheManager } from "../../services/wearable/DashboardCacheManager";
import { syncWearables } from "../../services/wearable/wearableSyncService";

export function WearableSettingsScreen() {
  const navigation = useNavigation();
  const { isDark, theme } = useAppTheme();
  
  const {
    isAvailable,
    grantedPermissions,
    checkPermissions,
    requestPermissions,
    openSettings,
  } = useWearablePermissions();

  const [logs, setLogs] = useState<DiagnosticsEntry[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [clearing, setClearing] = useState(false);

  const fetchLogs = async () => {
    const list = await syncDiagnosticsManager.getDiagnosticsHistory();
    setLogs(list);
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await syncWearables();
      await syncDiagnosticsManager.logDiagnostics({
        source: "settings_manual",
        durationMs: 1200,
        samplesReceived: res.samplesReceived,
        samplesWritten: res.samplesWritten,
        duplicatesIgnored: res.samplesReceived - res.samplesWritten,
        status: res.ok ? "SUCCESS" : "FAILED",
        error: res.reason,
      });
      await fetchLogs();
      Alert.alert("Sync Complete", `Sync processed ${res.samplesWritten} new records.`);
    } catch (e: any) {
      Alert.alert("Sync Error", e.message || "Failed to trigger sync");
    } finally {
      setSyncing(false);
    }
  };

  const handleClearCache = async () => {
    setClearing(true);
    try {
      await dashboardCacheManager.clearCache();
      Alert.alert("Success", "Local dashboard metrics cache cleared successfully.");
    } catch {
      Alert.alert("Error", "Failed to clear local cache.");
    } finally {
      setClearing(false);
    }
  };

  const handleExportLogs = async () => {
    try {
      const logsText = await syncDiagnosticsManager.exportLogs();
      await Share.share({
        message: logsText,
        title: "Health Connect Sync Diagnostics",
      });
    } catch (e) {
      Alert.alert("Export Failed", "Unable to export diagnostics report.");
    }
  };

  return (
    <Container colors={isDark ? ["#0b1220", "#0f172a"] : ["#f5f3ff", "#ffffff"]}>
      <Header>
        <BackButton onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={isDark ? "#e2e8f0" : "#0f172a"} />
        </BackButton>
        <HeaderTitle>Integration Settings</HeaderTitle>
        <HeaderSpacer />
      </Header>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <SectionTitle>Status & Controls</SectionTitle>

        <SettingsCard>
          <Row>
            <Label>Health Connect Integration</Label>
            <Badge active={isAvailable}>
              <BadgeText active={isAvailable}>
                {isAvailable ? "Available" : "Unavailable"}
              </BadgeText>
            </Badge>
          </Row>
          <Subtext>
            Permissions granted: {grantedPermissions.length} core and advanced scopes
          </Subtext>

          <ButtonRow>
            <Button onPress={() => (navigation as any).navigate("HealthConnectPermissionDetails")}>
              <Ionicons name="settings-outline" size={16} color="#fff" style={{ marginRight: 6 }} />
              <ButtonText>Permissions Settings</ButtonText>
            </Button>
            <SecondaryButton onPress={handleSync} disabled={syncing}>
              {syncing ? (
                <ActivityIndicator size="small" color={isDark ? "#fff" : "#000"} />
              ) : (
                <>
                  <Ionicons name="sync-outline" size={16} color={isDark ? "#fff" : "#000"} style={{ marginRight: 6 }} />
                  <SecondaryButtonText>Sync Now</SecondaryButtonText>
                </>
              )}
            </SecondaryButton>
          </ButtonRow>
        </SettingsCard>

        <SectionTitle>Troubleshooting & Diagnostics</SectionTitle>

        <SettingsCard>
          <Row>
            <Label>Clear Local Cache</Label>
            <DangerButton onPress={handleClearCache} disabled={clearing}>
              <DangerText>Clear</DangerText>
            </DangerButton>
          </Row>
          <Subtext>
            Clears local device database query cache to force refreshing metrics.
          </Subtext>

          <Divider />

          <Row>
            <Label>Export Diagnostic Logs</Label>
            <SecondaryButton onPress={handleExportLogs}>
              <SecondaryButtonText>Export Logs</SecondaryButtonText>
            </SecondaryButton>
          </Row>
          <Subtext>
            Share sync records, duplicate drop counts, and runtime exceptions.
          </Subtext>
        </SettingsCard>

        <SectionTitle>Recent Sync History</SectionTitle>
        {logs.length === 0 ? (
          <EmptyCard>
            <Text style={{ color: isDark ? "#64748b" : "#94a3b8" }}>No sync history logged.</Text>
          </EmptyCard>
        ) : (
          logs.map((log, idx) => (
            <HistoryCard key={idx}>
              <Row>
                <LogSource>{log.source.replace("_", " ").toUpperCase()}</LogSource>
                <LogBadge success={log.status === "SUCCESS"}>
                  <LogBadgeText success={log.status === "SUCCESS"}>{log.status}</LogBadgeText>
                </LogBadge>
              </Row>
              <LogDetail>Time: {new Date(log.timestamp).toLocaleTimeString()}</LogDetail>
              <LogDetail>
                Imported: {log.samplesWritten} / Received: {log.samplesReceived} (Duplicates: {log.duplicatesIgnored})
              </LogDetail>
              {log.error && <LogDetail style={{ color: "#ef4444" }}>Error: {log.error}</LogDetail>}
            </HistoryCard>
          ))
        )}
      </ScrollView>
    </Container>
  );
}

export default WearableSettingsScreen;

const styles = StyleSheet.create({
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
});

const Container = styled(LinearGradient)`
  flex: 1;
`;

const Header = styled.View`
  flex-direction: row;
  align-items: center;
  padding: 12px 16px;
`;

const BackButton = styled.TouchableOpacity`
  width: 32px;
  height: 32px;
  align-items: center;
  justify-content: center;
`;

const HeaderTitle = styled.Text`
  flex: 1;
  text-align: center;
  font-size: 18px;
  font-weight: 700;
  color: ${({ theme }: any) => theme.colors.textPrimary};
`;

const HeaderSpacer = styled.View`
  width: 32px;
`;

const SectionTitle = styled.Text`
  font-size: 14px;
  font-weight: 700;
  margin-top: 18px;
  margin-bottom: 8px;
  color: ${({ theme }: any) => theme.colors.textMuted};
  text-transform: uppercase;
`;

const SettingsCard = styled.View`
  background-color: ${({ theme }: any) => theme.colors.surface};
  border-color: ${({ theme }: any) => theme.colors.border};
  border-width: 1px;
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 12px;
`;

const HistoryCard = styled.View`
  background-color: ${({ theme }: any) => theme.colors.surface};
  border-color: ${({ theme }: any) => theme.colors.border};
  border-width: 1px;
  border-radius: 12px;
  padding: 12px;
  margin-bottom: 8px;
`;

const Row = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
`;

const Label = styled.Text`
  font-size: 15px;
  font-weight: 600;
  color: ${({ theme }: any) => theme.colors.textPrimary};
`;

const Subtext = styled.Text`
  font-size: 12px;
  margin-top: 4px;
  color: ${({ theme }: any) => theme.colors.textMuted};
`;

const Badge = styled.View<{ active: boolean }>`
  padding: 4px 8px;
  border-radius: 8px;
  background-color: ${({ active }: any) => (active ? "#d1fae5" : "#fee2e2")};
`;

const BadgeText = styled.Text<{ active: boolean }>`
  font-size: 11px;
  font-weight: 600;
  color: ${({ active }: any) => (active ? "#065f46" : "#991b1b")};
`;

const ButtonRow = styled.View`
  flex-direction: row;
  margin-top: 14px;
  gap: 8px;
`;

const Button = styled.TouchableOpacity`
  flex: 1;
  flex-direction: row;
  background-color: ${({ theme }: any) => theme.colors.primary};
  padding: 10px;
  border-radius: 8px;
  align-items: center;
  justify-content: center;
`;

const ButtonText = styled.Text`
  color: #ffffff;
  font-size: 13px;
  font-weight: 600;
`;

const SecondaryButton = styled.TouchableOpacity`
  flex: 1;
  flex-direction: row;
  border-width: 1px;
  border-color: ${({ theme }: any) => theme.colors.border};
  padding: 10px;
  border-radius: 8px;
  align-items: center;
  justify-content: center;
`;

const SecondaryButtonText = styled.Text`
  color: ${({ theme }: any) => theme.colors.textPrimary};
  font-size: 13px;
  font-weight: 600;
`;

const DangerButton = styled.TouchableOpacity`
  border-width: 1px;
  border-color: #ef4444;
  padding: 6px 12px;
  border-radius: 6px;
`;

const DangerText = styled.Text`
  color: #ef4444;
  font-size: 12px;
  font-weight: 600;
`;

const Divider = styled.View`
  height: 1px;
  background-color: ${({ theme }: any) => theme.colors.border};
  margin: 12px 0;
`;

const LogSource = styled.Text`
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }: any) => theme.colors.textPrimary};
`;

const LogBadge = styled.View<{ success: boolean }>`
  padding: 2px 6px;
  border-radius: 4px;
  background-color: ${({ success }: any) => (success ? "#e6f4ea" : "#fce8e6")};
`;

const LogBadgeText = styled.Text<{ success: boolean }>`
  font-size: 10px;
  font-weight: 700;
  color: ${({ success }: any) => (success ? "#137333" : "#c5221f")};
`;

const LogDetail = styled.Text`
  font-size: 12px;
  margin-top: 4px;
  color: ${({ theme }: any) => theme.colors.textMuted};
`;

const EmptyCard = styled.View`
  align-items: center;
  justify-content: center;
  padding: 24px;
  background-color: ${({ theme }: any) => theme.colors.surface};
  border-color: ${({ theme }: any) => theme.colors.border};
  border-width: 1px;
  border-radius: 12px;
`;
