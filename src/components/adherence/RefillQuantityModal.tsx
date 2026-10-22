import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { RefillAlertMedication } from "../../types/adherence";
import { useAppTheme } from "../../context/ThemeContext";

interface RefillQuantityModalProps {
  visible: boolean;
  medication?: RefillAlertMedication | null;
  onClose: () => void;
  onConfirmRefill: (medicationId: string, quantity: number) => Promise<void>;
}

export const RefillQuantityModal: React.FC<RefillQuantityModalProps> = ({
  visible,
  medication,
  onClose,
  onConfirmRefill,
}) => {
  const { isDark, theme } = useAppTheme();
  const [quantity, setQuantity] = useState<string>("30");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!medication) return null;

  const handleQuickAdd = (amount: number) => {
    setQuantity(String(amount));
    setErrorMsg(null);
  };

  const handleConfirm = async () => {
    const parsed = parseInt(quantity, 10);
    if (!parsed || parsed <= 0) {
      setErrorMsg("Please enter a valid positive quantity");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);
      await onConfirmRefill(medication.medicationId, parsed);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to submit refill");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.keyboardView}
          >
            <TouchableWithoutFeedback>
              <View
                style={[
                  styles.modalCard,
                  {
                    backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
                    borderColor: isDark ? "#334155" : "#E2E8F0",
                  },
                ]}
              >
                {/* Header */}
                <View style={styles.header}>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.title,
                        { color: isDark ? "#F8FAFC" : "#0F172A" },
                      ]}
                    >
                      Record Refill / Restock
                    </Text>
                    <Text
                      style={[
                        styles.medSubtitle,
                        { color: isDark ? "#94A3B8" : "#64748B" },
                      ]}
                    >
                      {medication.medicationName} ({medication.unit})
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={onClose}
                    accessibilityRole="button"
                    accessibilityLabel="Cancel refill modal"
                  >
                    <Ionicons
                      name="close"
                      size={20}
                      color={isDark ? "#94A3B8" : "#64748B"}
                    />
                  </TouchableOpacity>
                </View>

                {/* Quick amount chips */}
                <Text
                  style={[
                    styles.sectionLabel,
                    { color: isDark ? "#CBD5E1" : "#475569" },
                  ]}
                >
                  Quick Select Added Quantity:
                </Text>
                <View style={styles.quickChipsRow}>
                  {[10, 15, 30, 60].map((amt) => {
                    const isSelected = quantity === String(amt);
                    return (
                      <TouchableOpacity
                        key={amt}
                        onPress={() => handleQuickAdd(amt)}
                        style={[
                          styles.chip,
                          {
                            backgroundColor: isSelected
                              ? theme.colors.primary
                              : isDark
                              ? "#334155"
                              : "#F1F5F9",
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            {
                              color: isSelected
                                ? "#FFFFFF"
                                : isDark
                                ? "#E2E8F0"
                                : "#334155",
                              fontWeight: isSelected ? "700" : "500",
                            },
                          ]}
                        >
                          +{amt}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Custom numeric input */}
                <Text
                  style={[
                    styles.sectionLabel,
                    { color: isDark ? "#CBD5E1" : "#475569", marginTop: 12 },
                  ]}
                >
                  Or Enter Specific Quantity:
                </Text>
                <TextInput
                  value={quantity}
                  onChangeText={(val) => {
                    setQuantity(val);
                    setErrorMsg(null);
                  }}
                  keyboardType="numeric"
                  placeholder="e.g. 30"
                  placeholderTextColor={isDark ? "#64748B" : "#94A3B8"}
                  style={[
                    styles.input,
                    {
                      backgroundColor: isDark ? "#0F172A" : "#F8FAFC",
                      borderColor: errorMsg
                        ? "#EF4444"
                        : isDark
                        ? "#334155"
                        : "#E2E8F0",
                      color: isDark ? "#F8FAFC" : "#0F172A",
                    },
                  ]}
                />

                {errorMsg && (
                  <Text style={styles.errorText}>{errorMsg}</Text>
                )}

                {/* Action buttons */}
                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    onPress={onClose}
                    style={[
                      styles.actionBtn,
                      {
                        backgroundColor: isDark ? "#334155" : "#F1F5F9",
                        flex: 1,
                        marginRight: 8,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.btnText,
                        { color: isDark ? "#CBD5E1" : "#475569" },
                      ]}
                    >
                      Cancel
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleConfirm}
                    disabled={isSubmitting}
                    style={[
                      styles.actionBtn,
                      {
                        backgroundColor: theme.colors.primary,
                        flex: 2,
                        opacity: isSubmitting ? 0.7 : 1,
                      },
                    ]}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={[styles.btnText, { color: "#FFFFFF" }]}>
                        Confirm Refill
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  keyboardView: {
    width: "100%",
    maxWidth: 360,
  },
  modalCard: {
    width: "100%",
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
  },
  medSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  sectionLabel: {
    fontSize: 12,
    marginBottom: 8,
  },
  quickChipsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  chip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  chipText: {
    fontSize: 13,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    fontWeight: "600",
  },
  errorText: {
    color: "#EF4444",
    fontSize: 12,
    marginTop: 4,
  },
  actionsRow: {
    flexDirection: "row",
    marginTop: 20,
  },
  actionBtn: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: {
    fontSize: 14,
    fontWeight: "700",
  },
});
