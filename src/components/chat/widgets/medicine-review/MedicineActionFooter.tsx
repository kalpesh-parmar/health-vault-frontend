import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface MedicineActionFooterProps {
  checkedCount: number;
  isConfirmDisabled: boolean;
  areActionsDisabled?: boolean;
  isDark: boolean;
  theme: any;
  onConfirm: () => void;
  onAddNew: () => void;
  onSkipAll: () => void;
  onCancel?: () => void;
  t: (key: string) => string;
  isConfirmChosen?: boolean;
  isAddNewChosen?: boolean;
  isSkipAllChosen?: boolean;
  confirmOpacity?: number;
  addNewOpacity?: number;
  skipAllOpacity?: number;
  warningText?: string;
  hasUnresolvedConflicts?: boolean;
  readOnly?: boolean;
}

export const MedicineActionFooter = (function MedicineActionFooter({
  checkedCount,
  isConfirmDisabled,
  areActionsDisabled,
  isDark,
  theme,
  onConfirm,
  onAddNew,
  onSkipAll,
  onCancel,
  t,
  isConfirmChosen,
  isAddNewChosen,
  isSkipAllChosen,
  confirmOpacity = 1,
  addNewOpacity = 1,
  skipAllOpacity = 1,
  warningText,
  hasUnresolvedConflicts,
  readOnly,
}: MedicineActionFooterProps) {
  return (
    <View style={styles.container}>
      {Boolean(warningText) && (
        <View
          style={[
            styles.warningBox,
            {
              backgroundColor: isDark ? "rgba(220, 38, 38, 0.2)" : "#fef2f2",
              borderColor: isDark ? "rgba(220, 38, 38, 0.4)" : "#fca5a5",
            },
          ]}
        >
          <Ionicons
            name="calendar-outline"
            size={18}
            color={isDark ? "#fca5a5" : "#ef4444"}
            style={{ marginRight: 8 }}
          />
          <Text
            style={[
              styles.warningText,
              { color: isDark ? "#fca5a5" : "#b91c1c" },
            ]}
          >
            {warningText}
          </Text>
        </View>
      )}

      {!readOnly && hasUnresolvedConflicts && (
        <View style={styles.conflictBanner}>
          <Text style={styles.conflictBannerText}>
            ⚠️ Please solve all duplicate conflicts to enable these actions.
          </Text>
        </View>
      )}

      {checkedCount === 0 ? (
        <View
          style={styles.actionRow}
          pointerEvents={readOnly ? "none" : "auto"}
        >
          <TouchableOpacity
            disabled={areActionsDisabled}
            style={[
              styles.btnSide,
              {
                backgroundColor: isDark ? "#334155" : "#e2e8f0",
                marginRight: 6,
                opacity: areActionsDisabled ? 0.55 : skipAllOpacity,
                borderWidth: isSkipAllChosen ? 2 : 0,
                borderColor: isSkipAllChosen ? (isDark ? "#ffffff" : "#475569") : "transparent",
              },
            ]}
            onPress={onSkipAll}
          >
            <View style={styles.btnContent}>
              {isSkipAllChosen && (
                <Ionicons name="checkmark" size={16} color={theme.colors.textPrimary} style={{ marginRight: 4 }} />
              )}
              <Text style={[styles.btnText, { color: theme.colors.textPrimary }]}>
                {t("skipAll")}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            disabled={areActionsDisabled}
            style={[
              styles.btnSide,
              {
                backgroundColor: theme.colors.primary,
                marginLeft: 6,
                opacity: areActionsDisabled ? 0.55 : addNewOpacity,
                borderWidth: isAddNewChosen ? 2 : 0,
                borderColor: isAddNewChosen ? "#ffffff" : "transparent",
              },
            ]}
            onPress={onAddNew}
          >
            <View style={styles.btnContent}>
              {isAddNewChosen && (
                <Ionicons name="checkmark" size={16} color="#ffffff" style={{ marginRight: 4 }} />
              )}
              <Text style={[styles.btnText, { color: "#ffffff" }]}>
                {t("addNew")}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      ) : (
        <View
          style={styles.actionRow}
          pointerEvents={readOnly ? "none" : "auto"}
        >
          <TouchableOpacity
            disabled={isConfirmDisabled}
            style={[
              styles.btnSide,
              {
                backgroundColor: isConfirmDisabled
                  ? isDark
                    ? "#334155"
                    : "#cbd5e1"
                  : theme.colors.primary,
                opacity: isConfirmDisabled ? 0.55 : confirmOpacity,
                flex: 1.4,
                marginRight: 6,
                borderWidth: isConfirmChosen ? 2 : 0,
                borderColor: isConfirmChosen ? "#ffffff" : "transparent",
              },
            ]}
            onPress={onConfirm}
          >
            <View style={styles.btnContent}>
              {isConfirmChosen && (
                <Ionicons name="checkmark" size={16} color="#ffffff" style={{ marginRight: 4 }} />
              )}
              <Text style={[styles.btnText, { color: isConfirmDisabled ? "#94a3b8" : "#ffffff" }]}>
                {t("confirmSelection") || "Confirm Selection"}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            disabled={areActionsDisabled}
            style={[
              styles.btnSide,
              {
                backgroundColor: isDark ? "#334155" : "#e2e8f0",
                flex: 1,
                marginLeft: 6,
                opacity: areActionsDisabled ? 0.55 : addNewOpacity,
                borderWidth: isAddNewChosen ? 2 : 0,
                borderColor: isAddNewChosen ? (isDark ? "#ffffff" : "#475569") : "transparent",
              },
            ]}
            onPress={onAddNew}
          >
            <View style={styles.btnContent}>
              {isAddNewChosen && (
                <Ionicons name="checkmark" size={16} color={theme.colors.textPrimary} style={{ marginRight: 4 }} />
              )}
              <Text style={[styles.btnText, { color: theme.colors.textPrimary }]}>
                {t("addNew")}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      )}

      {onCancel && (
        <TouchableOpacity
          disabled={areActionsDisabled}
          style={[
            styles.cancelBtn,
            {
              backgroundColor: isDark ? "#1e293b" : "#f1f5f9",
              borderColor: isDark ? "#475569" : "#cbd5e1",
              opacity: areActionsDisabled ? 0.55 : 1,
            },
          ]}
          onPress={onCancel}
        >
          <Text style={[styles.cancelText, { color: theme.colors.textSecondary }]}>
            {t("cancel")}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginTop: 4,
  },
  warningBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    marginTop: 4,
  },
  warningText: {
    fontSize: 12.5,
    fontWeight: "600",
    flex: 1,
    lineHeight: 17,
  },
  conflictBanner: {
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  conflictBannerText: {
    fontSize: 12,
    color: "#ef4444",
    fontWeight: "600",
    textAlign: "center",
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  btnSide: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  btnContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: {
    fontSize: 13,
    fontWeight: "700",
  },
  cancelBtn: {
    borderWidth: 1,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 8,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: {
    fontSize: 13,
    fontWeight: "600",
  },
});
