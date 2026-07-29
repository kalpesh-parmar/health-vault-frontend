import React, { useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { widgetStyles as styles } from "./WidgetStyles";
import { useWearablePermissions } from "../../../hooks/useWearablePermissions";
import { syncWearables } from "../../../services/wearable/wearableSyncService";

export interface ConnectWearableCardProps {
  activeMsg: any;
  preferredLang: string;
  theme: any;
  isHistorical?: boolean;
  sendMessage: (userText: string, updatedState?: any, displayLabel?: string) => Promise<void> | void;
  state: any;
  setState: React.Dispatch<React.SetStateAction<any>>;
  chosenVal?: string | null;
  chosenLabel?: string | null;
}

export function ConnectWearableCard({
  activeMsg,
  preferredLang,
  theme,
  isHistorical,
  sendMessage,
  state,
  setState,
  chosenVal,
  chosenLabel,
}: ConnectWearableCardProps) {
  const { requestPermissions, openSettings } = useWearablePermissions();
  const [syncing, setSyncing] = useState(false);

  const yesOpt = (activeMsg?.options || []).find((o: any) => o.key === "YES") || {};
  const skipOpt = (activeMsg?.options || []).find((o: any) => o.key === "SKIP") || {};

  const yesLabel = yesOpt.label || "Connect Health Connect";
  const skipLabel = skipOpt.label || "Maybe Later";

  const isYesChosen = isHistorical && (
    chosenVal === "YES" ||
    (chosenLabel && String(chosenLabel).toLowerCase() === String(yesLabel).toLowerCase())
  );
  const isSkipChosen = isHistorical && (
    chosenVal === "SKIP" ||
    (chosenLabel && String(chosenLabel).toLowerCase() === String(skipLabel).toLowerCase())
  );

  const handleConnect = async () => {
    setSyncing(true);
    try {
      console.log("[ConnectWearableCard] Requesting core permissions...");
      const granted = await requestPermissions("core");
      if (granted) {
        console.log("[ConnectWearableCard] Core permissions granted! Triggering initial sync...");
        const syncResult = await syncWearables();
        console.log("[ConnectWearableCard] Sync completed:", syncResult);
        
        const newState = { ...state, wearableSyncEnabled: true };
        setState(newState);
        sendMessage("YES", newState, yesLabel);
      } else {
        Alert.alert(
          "Permissions Required",
          "Health Connect permissions are required to sync your metrics automatically. Would you like to open settings to grant them?",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Open Settings", onPress: () => openSettings() }
          ]
        );
      }
    } catch (e) {
      console.error("[ConnectWearableCard] Connection flow failed:", e);
      Alert.alert("Connection Failed", "Unable to establish connection to Health Connect. Please try again.");
    } finally {
      setSyncing(false);
    }
  };

  const handleSkip = () => {
    const newState = { ...state, wearableSyncEnabled: false };
    setState(newState);
    sendMessage("SKIP", newState, skipLabel);
  };

  const yesOpacity = isHistorical ? (isYesChosen ? 1 : 0.55) : 1;
  const skipOpacity = isHistorical ? (isSkipChosen ? 1 : 0.55) : 1;

  return (
    <View style={styles.optionContainer} pointerEvents={isHistorical || syncing ? "none" : "auto"}>
      <TouchableOpacity
        disabled={isHistorical || syncing}
        style={[
          styles.optionCard,
          {
            backgroundColor: isHistorical
              ? (isYesChosen ? theme.colors.primary + "15" : "rgba(100, 116, 139, 0.1)")
              : theme.colors.primary + "15",
            opacity: yesOpacity,
            borderWidth: isYesChosen ? 2 : 0,
            borderColor: isYesChosen ? theme.colors.primary : "transparent",
          },
        ]}
        onPress={handleConnect}
      >
        {isYesChosen && (
          <View style={{ position: "absolute", top: 8, right: 8, zIndex: 10 }}>
            <Ionicons name="checkmark-circle" size={18} color={theme.colors.primary} />
          </View>
        )}
        <View
          style={[
            styles.iconCircle,
            {
              backgroundColor: isHistorical
                ? (isYesChosen ? theme.colors.primary : "#64748b")
                : theme.colors.primary,
            },
          ]}
        >
          {syncing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="logo-android" size={24} color="#fff" />
          )}
        </View>
        <Text style={[styles.optionTitle, { color: theme.colors.textPrimary }]}>
          {yesLabel}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        disabled={isHistorical || syncing}
        style={[
          styles.optionCard,
          {
            backgroundColor: "rgba(100, 116, 139, 0.1)",
            opacity: skipOpacity,
            borderWidth: isSkipChosen ? 2 : 0,
            borderColor: isSkipChosen ? theme.colors.primary : "transparent",
          },
        ]}
        onPress={handleSkip}
      >
        {isSkipChosen && (
          <View style={{ position: "absolute", top: 8, right: 8, zIndex: 10 }}>
            <Ionicons name="checkmark-circle" size={18} color={theme.colors.primary} />
          </View>
        )}
        <View style={[styles.iconCircle, { backgroundColor: "#64748b" }]}>
          <Ionicons name="arrow-forward" size={24} color="#fff" />
        </View>
        <Text style={[styles.optionTitle, { color: theme.colors.textPrimary }]}>
          {skipLabel}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

export default ConnectWearableCard;
