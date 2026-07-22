import React, { useState, useEffect, useRef } from "react";
import { View, Text, TextInput, ScrollView, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { widgetStyles as styles } from "./WidgetStyles";
import { I18N_ONBOARDING_UI } from "./OnboardingI18n";
import { MedicineIcon, DoseVisual, parseChosenJson } from "./MedicineHelpers";
import { setActiveFormDictationCallback } from "../ChatInput";

export interface AddMedicineCardProps {
  med: any;
  isEditingLocal: boolean;
  preferredLang?: string;
  isDark: boolean;
  theme: any;
  currentClientMedId?: string | null;
  setCurrentClientMedId: (id: string | null) => void;
  onSave: (med: any) => void;
  onCancel?: () => void;
  readOnly?: boolean;
  chosenVal?: string | null;
  chosenLabel?: string | null;
}

export function AddMedicineCard({
  med,
  isEditingLocal,
  preferredLang,
  isDark,
  theme,
  currentClientMedId,
  setCurrentClientMedId,
  onSave,
  onCancel,
  readOnly,
  chosenVal,
  chosenLabel,
}: AddMedicineCardProps) {
  const [formName, setFormName] = useState(
    med.name || med.medicationName || "",
  );
  const [formType, setFormType] = useState(
    med.type || med.medicationType || "TABLET",
  );
  const [formFreq, setFormFreq] = useState(med.frequency || "ONCE");
  const [formNotes, setFormNotes] = useState(med.notes || "");
  const [formPrescribed, setFormPrescribed] = useState(
    med.prescribedBy || med.prescribed_by || "",
  );
  const [formRefill, setFormRefill] = useState(
    med.refill_alert || med.refillAlert || false,
  );
  const [formQty, setFormQty] = useState(
    med.total_quantity !== undefined
      ? String(med.total_quantity ?? "1")
      : String(med.totalQuantity ?? "1"),
  );
  const [formFoodFreq, setFormFoodFreq] = useState(
    med.foodContext || med.medicationSchedule?.foodContext || "AFTER_FOOD",
  );
  const [startDate, setStartDate] = useState<Date | null>(
    med.startDate ? new Date(med.startDate) : new Date(),
  );
  const [isStartDatePickerVisible, setStartDatePickerVisible] = useState(false);

  let initialCount = 1;
  let initialVal = 1;
  let initialUnit = "ml";

  if (med.dose) {
    if (med.dose.count !== undefined) initialCount = med.dose.count;
    if (med.dose.value !== undefined) initialVal = med.dose.value;
    if (med.dose.unit !== undefined) initialUnit = med.dose.unit;
  }

  const [formCount, setFormCount] = useState(initialCount);
  const [formVal, setFormVal] = useState(initialVal);
  const [formUnit, setFormUnit] = useState(initialUnit);
  const [localErrors, setLocalErrors] = useState<string[]>([]);

  // Time slots selection
  const [timeSlots, setTimeSlots] = useState<string[]>(() => {
    const schedule = med.medicationSchedule || {};
    const times = schedule.times || schedule.reminderTimes;
    if (Array.isArray(times) && times.length > 0) {
      return times;
    }
    if (formFreq === "ONCE") return ["08:00"];
    if (formFreq === "TWICE") return ["08:00", "20:00"];
    return ["08:00", "14:00", "20:00"];
  });

  const [selectedSlots, setSelectedSlots] = useState<string[]>(timeSlots);
  const [isCustomMode, setIsCustomMode] = useState<boolean>(() => {
    return timeSlots.some(
      (t) => t !== "08:00" && t !== "14:00" && t !== "20:00",
    );
  });
  const [slotError, setSlotError] = useState("");
  const [isSlotPickerVisible, setSlotPickerVisible] = useState(false);
  const [editingCustomTimeVal, setEditingCustomTimeVal] = useState<
    string | null
  >(null);

  const isFirstRenderType = useRef(true);
  const isFirstRenderFreq = useRef(true);

  useEffect(() => {
    if (!isEditingLocal && !currentClientMedId) {
      const newId =
        med.client_med_id ||
        med.id ||
        `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setCurrentClientMedId(newId);
    }
  }, [med]);

  const allowedUnitsMap: Record<string, string[]> = {
    SYRUP: ["ml", "tsp", "tbsp"],
    INJECTION: ["ml", "IU"],
    DROPS: ["drops", "ml"],
    SPRAY: ["puff"],
    INHALER: ["puff"],
  };

  const currentAllowedUnits = allowedUnitsMap[formType] || [];

  const t = (key: string, replacements?: Record<string, string | number>) => {
    const lang = preferredLang || "english";
    const dict = I18N_ONBOARDING_UI[lang] || I18N_ONBOARDING_UI.english;
    let str = dict[key] || I18N_ONBOARDING_UI.english[key] || key;
    if (replacements) {
      Object.entries(replacements).forEach(([k, v]) => {
        str = str.split(`{${k}}`).join(String(v));
      });
    }
    return str;
  };

  useEffect(() => {
    const units = allowedUnitsMap[formType];
    if (units && !units.includes(formUnit)) {
      setFormUnit(units[0]);
    }
  }, [formType]);

  // Adjust slots based on frequency with prefill guard
  useEffect(() => {
    if (isFirstRenderFreq.current) {
      isFirstRenderFreq.current = false;
      return;
    }
    setIsCustomMode(false);
    if (formFreq === "ONCE") {
      setSelectedSlots(["08:00"]);
    } else if (formFreq === "TWICE") {
      setSelectedSlots(["08:00", "20:00"]);
    } else {
      setSelectedSlots(["08:00", "14:00", "20:00"]);
    }
    setSlotError("");
  }, [formFreq]);

  // Sync integer/fraction limits in UI with prefill guard
  useEffect(() => {
    if (isFirstRenderType.current) {
      isFirstRenderType.current = false;
      return;
    }
    if (formType === "TABLET" || formType === "CAPSULE") {
      setFormCount(1);
    } else if (formType === "SYRUP") {
      setFormVal(5);
      setFormUnit("ml");
    } else if (formType === "INJECTION") {
      setFormVal(1);
      setFormUnit("ml");
    } else if (formType === "DROPS") {
      setFormVal(1);
      setFormUnit("drops");
    } else if (formType === "SPRAY" || formType === "INHALER") {
      setFormVal(1);
      setFormUnit("puff");
    }
  }, [formType]);

  const togglePresetSlot = (timeStr: string) => {
    const N = formFreq === "ONCE" ? 1 : formFreq === "TWICE" ? 2 : 3;
    if (selectedSlots.includes(timeStr)) {
      setSelectedSlots((prev) => prev.filter((t) => t !== timeStr));
      setSlotError("");
    } else {
      if (selectedSlots.length < N) {
        setSelectedSlots((prev) => [...prev, timeStr]);
        setSlotError("");
      }
    }
  };

  const handleExitCustomMode = (timeStr: string) => {
    setIsCustomMode(false);
    setSelectedSlots([timeStr]);
    setSlotError("");
  };

  const format12h = (time24: string) => {
    const parts = time24.split(":");
    if (parts.length !== 2) return time24;
    let hour = parseInt(parts[0], 10);
    const minute = parts[1];
    const ampm = hour >= 12 ? "PM" : "AM";
    hour = hour % 12;
    if (hour === 0) hour = 12;
    return `${hour}:${minute} ${ampm}`;
  };

  const formatTabletDose = (count: number) => {
    const whole = Math.floor(count);
    const remainder = count - whole;
    let frac = "";
    if (remainder === 0.25) frac = "¼";
    else if (remainder === 0.5) frac = "½";
    else if (remainder === 0.75) frac = "¾";
    if (whole === 0) return frac || "0";
    return frac ? `${whole} ${frac}` : `${whole}`;
  };

  const handleSave = () => {
    const errors: string[] = [];
    if (!formName.trim()) {
      errors.push(t("nameRequired"));
    }
    if (formType !== "TABLET" && formType !== "CAPSULE") {
      if (!formUnit) {
        errors.push(t("unitRequired"));
      }
    }
    const N = formFreq === "ONCE" ? 1 : formFreq === "TWICE" ? 2 : 3;
    if (selectedSlots.length !== N) {
      setSlotError(t("saveGateError", { required: N }));
      errors.push(t("saveGateError", { required: N }));
    }

    const parsedQty = parseInt(formQty.trim(), 10);
    if (!formQty.trim() || isNaN(parsedQty) || parsedQty <= 0) {
      errors.push(
        preferredLang === "gujarati"
          ? "કુલ જથ્થો જરૂરી છે"
          : "Total Quantity is required",
      );
    }

    if (errors.length > 0) {
      setLocalErrors(errors);
      return;
    }

    const dose =
      formType === "TABLET" || formType === "CAPSULE"
        ? { count: formCount }
        : { value: formVal, unit: formUnit };

    const qtyVal = parsedQty;

    const sortedTimes = [...selectedSlots].sort((a, b) => {
      const [ha, ma] = a.split(":").map(Number);
      const [hb, mb] = b.split(":").map(Number);
      if (ha !== hb) return ha - hb;
      return ma - mb;
    });

    const updatedMed = {
      name: formName.trim(),
      medicationName: formName.trim(),
      type: formType,
      medicationType: formType,
      dose,
      dosePerIntake:
        formType === "TABLET" || formType === "CAPSULE"
          ? String(formCount)
          : `${formVal} ${formUnit}`,
      frequency: formFreq,
      notes: formNotes.trim(),
      prescribed_by: formPrescribed.trim() || null,
      refill_alert: formRefill,
      total_quantity: qtyVal,
      startDate,
      client_med_id: isEditingLocal
        ? med.client_med_id || med.id
        : currentClientMedId,
      id: med.id,
      source: med.source || "MANUAL",
      medicationSchedule: sortedTimes,
      foodFrequency: formFoodFreq,
      refillAlert: formRefill,
    };

    onSave(updatedMed);
  };

  const getDosePreviewText = () => {
    if (formType === "TABLET") {
      const fracLabel = formatTabletDose(formCount);
      return t("dosePreview.tablet").replace("{count}", fracLabel);
    }
    if (formType === "CAPSULE") {
      return t("dosePreview.capsule").replace("{count}", String(formCount));
    }
    if (formType === "SPRAY" || formType === "INHALER") {
      return t("dosePreview.puff").replace("{count}", String(formVal));
    }
    return t("dosePreview.other")
      .replace("{count}", String(formVal))
      .replace("{unit}", formUnit);
  };

  const renderDoseInput = () => {
    if (formType === "TABLET") {
      return (
        <View style={styles.stepperContainer}>
          <TouchableOpacity
            style={[
              styles.stepperButton,
              { backgroundColor: isDark ? "#334155" : "#cbd5e1" },
            ]}
            onPress={() =>
              setFormCount((prev) => {
                const next = Math.max(
                  0.25,
                  Math.round((prev - 0.25) * 100) / 100,
                );
                return next;
              })
            }
          >
            <Ionicons
              name="remove"
              size={20}
              color={theme.colors.textPrimary}
            />
          </TouchableOpacity>
          <Text
            style={[
              styles.stepperValue,
              {
                color: theme.colors.textPrimary,
                minWidth: 50,
                textAlign: "center",
              },
            ]}
          >
            {formatTabletDose(formCount)}
          </Text>
          <TouchableOpacity
            style={[
              styles.stepperButton,
              { backgroundColor: isDark ? "#334155" : "#cbd5e1" },
            ]}
            onPress={() =>
              setFormCount((prev) => Math.round((prev + 0.25) * 100) / 100)
            }
          >
            <Ionicons name="add" size={20} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={{ marginLeft: 8, color: theme.colors.textSecondary }}>
            tablet(s)
          </Text>
        </View>
      );
    }

    if (formType === "CAPSULE") {
      return (
        <View style={styles.stepperContainer}>
          <TouchableOpacity
            style={[
              styles.stepperButton,
              { backgroundColor: isDark ? "#334155" : "#cbd5e1" },
            ]}
            onPress={() =>
              setFormCount((prev) => Math.max(1, Math.round(prev - 1)))
            }
          >
            <Ionicons
              name="remove"
              size={20}
              color={theme.colors.textPrimary}
            />
          </TouchableOpacity>
          <Text
            style={[
              styles.stepperValue,
              {
                color: theme.colors.textPrimary,
                minWidth: 40,
                textAlign: "center",
              },
            ]}
          >
            {Math.max(1, Math.round(formCount))}
          </Text>
          <TouchableOpacity
            style={[
              styles.stepperButton,
              { backgroundColor: isDark ? "#334155" : "#cbd5e1" },
            ]}
            onPress={() => setFormCount((prev) => Math.round(prev + 1))}
          >
            <Ionicons name="add" size={20} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={{ marginLeft: 8, color: theme.colors.textSecondary }}>
            capsule(s)
          </Text>
        </View>
      );
    }

    if (formType === "INHALER") {
      return (
        <View style={styles.stepperContainer}>
          <TouchableOpacity
            style={[
              styles.stepperButton,
              { backgroundColor: isDark ? "#334155" : "#cbd5e1" },
            ]}
            onPress={() =>
              setFormVal((prev) => Math.max(1, Math.round(prev - 1)))
            }
          >
            <Ionicons
              name="remove"
              size={20}
              color={theme.colors.textPrimary}
            />
          </TouchableOpacity>
          <Text
            style={[
              styles.stepperValue,
              {
                color: theme.colors.textPrimary,
                minWidth: 40,
                textAlign: "center",
              },
            ]}
          >
            {Math.max(1, Math.round(formVal))}
          </Text>
          <TouchableOpacity
            style={[
              styles.stepperButton,
              { backgroundColor: isDark ? "#334155" : "#cbd5e1" },
            ]}
            onPress={() => setFormVal((prev) => Math.round(prev + 1))}
          >
            <Ionicons name="add" size={20} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={{ marginLeft: 8, color: theme.colors.textSecondary }}>
            puff(s)
          </Text>
        </View>
      );
    }

    if (formType === "SPRAY") {
      return (
        <View style={styles.stepperContainer}>
          <TouchableOpacity
            style={[
              styles.stepperButton,
              { backgroundColor: isDark ? "#334155" : "#cbd5e1" },
            ]}
            onPress={() =>
              setFormVal((prev) => Math.max(1, Math.round(prev - 1)))
            }
          >
            <Ionicons
              name="remove"
              size={20}
              color={theme.colors.textPrimary}
            />
          </TouchableOpacity>
          <Text
            style={[
              styles.stepperValue,
              {
                color: theme.colors.textPrimary,
                minWidth: 40,
                textAlign: "center",
              },
            ]}
          >
            {Math.max(1, Math.round(formVal))}
          </Text>
          <TouchableOpacity
            style={[
              styles.stepperButton,
              { backgroundColor: isDark ? "#334155" : "#cbd5e1" },
            ]}
            onPress={() => setFormVal((prev) => Math.round(prev + 1))}
          >
            <Ionicons name="add" size={20} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={{ marginLeft: 8, color: theme.colors.textSecondary }}>
            puff(s)
          </Text>
        </View>
      );
    }

    return (
      <View style={{ flex: 1, flexDirection: "row", alignItems: "center" }}>
        <TextInput
          editable={!readOnly}
          style={[
            styles.textInput,
            {
              flex: 0.4,
              marginRight: 8,
              color: theme.colors.textPrimary,
              borderColor: isDark ? "#475569" : "#cbd5e1",
              backgroundColor: isDark ? "#0f172a" : "#f8fafc",
            },
          ]}
          value={String(formVal)}
          onChangeText={(val) => setFormVal(parseFloat(val) || 0)}
          onFocus={() => {
            setActiveFormDictationCallback((transcript) => {
              const num = parseFloat(transcript.replace(/\D/g, ""));
              if (!isNaN(num)) setFormVal(num);
            });
          }}
          keyboardType="numeric"
          placeholder="1"
          placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
        />
        <View
          style={[
            styles.unitContainer,
            { flex: 0.6, flexDirection: "row", flexWrap: "wrap" },
          ]}
        >
          {currentAllowedUnits.map((u) => (
            <TouchableOpacity
              key={u}
              style={[
                styles.unitChip,
                {
                  backgroundColor:
                    formUnit === u
                      ? theme.colors.primary
                      : isDark
                        ? "#334155"
                        : "#f1f5f9",
                },
              ]}
              onPress={() => setFormUnit(u)}
            >
              <Text
                style={[
                  styles.unitChipText,
                  {
                    color:
                      formUnit === u ? "#ffffff" : theme.colors.textPrimary,
                  },
                ]}
              >
                {u}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const N = formFreq === "ONCE" ? 1 : formFreq === "TWICE" ? 2 : 3;

  const renderTimeSlotPicker = () => {
    const isMorningActive = !isCustomMode && selectedSlots.includes("08:00");
    const isNoonActive = !isCustomMode && selectedSlots.includes("14:00");
    const isNightActive = !isCustomMode && selectedSlots.includes("20:00");

    const isMaxReached = selectedSlots.length >= N;

    const customChips = isCustomMode ? selectedSlots : [];

    return (
      <View style={{ marginTop: 8 }}>
        <Text
          style={[
            styles.inputLabel,
            {
              color: theme.colors.textSecondary,
              fontSize: 11,
              marginBottom: 6,
            },
          ]}
        >
          {t("counter", { required: N, selected: selectedSlots.length })}
        </Text>

        <View style={styles.chipRow}>
          <TouchableOpacity
            disabled={!isCustomMode && isMaxReached && !isMorningActive}
            style={[
              styles.unitChip,
              {
                backgroundColor: isMorningActive
                  ? theme.colors.primary
                  : isDark
                    ? "#334155"
                    : "#f1f5f9",
                opacity:
                  !isCustomMode && isMaxReached && !isMorningActive ? 0.4 : 1,
                justifyContent: "center",
                alignItems: "center",
                height: 38,
                paddingHorizontal: 12,
              },
            ]}
            onPress={() => {
              if (isCustomMode) {
                handleExitCustomMode("08:00");
              } else {
                togglePresetSlot("08:00");
              }
            }}
          >
            <Text
              style={[
                styles.unitChipText,
                {
                  color: isMorningActive ? "#ffffff" : theme.colors.textPrimary,
                  fontSize: 13,
                  fontWeight: "600",
                },
              ]}
            >
              {t("morning")}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            disabled={!isCustomMode && isMaxReached && !isNoonActive}
            style={[
              styles.unitChip,
              {
                backgroundColor: isNoonActive
                  ? theme.colors.primary
                  : isDark
                    ? "#334155"
                    : "#f1f5f9",
                opacity:
                  !isCustomMode && isMaxReached && !isNoonActive ? 0.4 : 1,
                justifyContent: "center",
                alignItems: "center",
                height: 38,
                paddingHorizontal: 12,
              },
            ]}
            onPress={() => {
              if (isCustomMode) {
                handleExitCustomMode("14:00");
              } else {
                togglePresetSlot("14:00");
              }
            }}
          >
            <Text
              style={[
                styles.unitChipText,
                {
                  color: isNoonActive ? "#ffffff" : theme.colors.textPrimary,
                  fontSize: 13,
                  fontWeight: "600",
                },
              ]}
            >
              {t("noon")}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            disabled={!isCustomMode && isMaxReached && !isNightActive}
            style={[
              styles.unitChip,
              {
                backgroundColor: isNightActive
                  ? theme.colors.primary
                  : isDark
                    ? "#334155"
                    : "#f1f5f9",
                opacity:
                  !isCustomMode && isMaxReached && !isNightActive ? 0.4 : 1,
                justifyContent: "center",
                alignItems: "center",
                height: 38,
                paddingHorizontal: 12,
              },
            ]}
            onPress={() => {
              if (isCustomMode) {
                handleExitCustomMode("20:00");
              } else {
                togglePresetSlot("20:00");
              }
            }}
          >
            <Text
              style={[
                styles.unitChipText,
                {
                  color: isNightActive ? "#ffffff" : theme.colors.textPrimary,
                  fontSize: 13,
                  fontWeight: "600",
                },
              ]}
            >
              {t("night")}
            </Text>
          </TouchableOpacity>

          {isCustomMode &&
            customChips.map((time) => (
              <TouchableOpacity
                key={`custom-${time}`}
                style={[
                  styles.unitChip,
                  {
                    backgroundColor: theme.colors.primary,
                    flexDirection: "row",
                    alignItems: "center",
                    height: 38,
                    paddingHorizontal: 10,
                  },
                ]}
                onPress={() => {
                  setEditingCustomTimeVal(time);
                  setSlotPickerVisible(true);
                }}
              >
                <Text
                  style={[
                    styles.unitChipText,
                    {
                      color: "#ffffff",
                      fontSize: 13,
                      fontWeight: "600",
                      marginRight: 6,
                    },
                  ]}
                >
                  {format12h(time)}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setSelectedSlots((prev) => prev.filter((t) => t !== time));
                    setSlotError("");
                  }}
                >
                  <Ionicons name="close-circle" size={16} color="#ffffff" />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}

          <TouchableOpacity
            disabled={isCustomMode && isMaxReached}
            style={[
              styles.unitChip,
              {
                backgroundColor: isCustomMode
                  ? theme.colors.primary
                  : isDark
                    ? "#334155"
                    : "#f1f5f9",
                opacity: isCustomMode && isMaxReached ? 0.4 : 1,
                borderWidth: isCustomMode ? 0 : 1,
                borderColor: theme.colors.primary,
                borderStyle: "dashed",
                flexDirection: "row",
                alignItems: "center",
                height: 38,
                paddingHorizontal: 12,
              },
            ]}
            onPress={() => {
              if (!isCustomMode) {
                setIsCustomMode(true);
                setSelectedSlots([]);
                setSlotError("");
                setEditingCustomTimeVal(null);
                setSlotPickerVisible(true);
              } else {
                setEditingCustomTimeVal(null);
                setSlotPickerVisible(true);
              }
            }}
          >
            <Ionicons
              name={isCustomMode ? "add" : "time-outline"}
              size={16}
              color={isCustomMode ? "#ffffff" : theme.colors.primary}
              style={{ marginRight: 4 }}
            />
            <Text
              style={[
                styles.unitChipText,
                {
                  color: isCustomMode ? "#ffffff" : theme.colors.textPrimary,
                  fontSize: 13,
                  fontWeight: "600",
                },
              ]}
            >
              {t("custom")}
            </Text>
          </TouchableOpacity>
        </View>

        {slotError ? (
          <Text
            style={{
              color: "#ef4444",
              fontSize: 12,
              marginTop: 4,
              fontWeight: "600",
            }}
          >
            {slotError}
          </Text>
        ) : null}
      </View>
    );
  };

  return (
    <View
      pointerEvents={readOnly ? "none" : "auto"}
      style={[
        styles.medEditCard,
        {
          backgroundColor: isDark ? "#1e293b" : "#ffffff",
          borderColor: isDark ? "#334155" : "#e2e8f0",
          opacity: readOnly ? 0.6 : 1,
        },
      ]}
    >
      <Text style={[styles.medCardTitle, { color: theme.colors.textPrimary }]}>
        {isEditingLocal ? t("editMedicine") : t("addMedicine")}
      </Text>

      <View style={styles.inputGroup}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 6,
          }}
        >
          <Ionicons
            name="ellipse-outline"
            size={14}
            color={theme.colors.textSecondary}
            style={{ marginRight: 6 }}
          />
          <Text
            style={[
              styles.inputLabel,
              { color: theme.colors.textSecondary, marginBottom: 0 },
            ]}
          >
            {t("medicineName")}
          </Text>
        </View>
        <TextInput
          editable={!readOnly}
          style={[
            styles.textInput,
            {
              color: theme.colors.textPrimary,
              borderColor: isDark ? "#475569" : "#cbd5e1",
              backgroundColor: isDark ? "#0f172a" : "#f8fafc",
            },
          ]}
          value={formName}
          onChangeText={setFormName}
          onFocus={() => {
            setActiveFormDictationCallback((transcript) => {
              setFormName((prev: string) => (prev ? prev + " " + transcript : transcript));
            });
          }}
          placeholder={t("placeholder.paracetamol")}
          placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
        />
      </View>

      <View style={styles.inputGroup}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 6,
          }}
        >
          <Ionicons
            name="grid-outline"
            size={14}
            color={theme.colors.textSecondary}
            style={{ marginRight: 6 }}
          />
          <Text
            style={[
              styles.inputLabel,
              { color: theme.colors.textSecondary, marginBottom: 0 },
            ]}
          >
            {t("medicineType")}
          </Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexDirection: "row", marginVertical: 4 }}
        >
          {[
            "TABLET",
            "CAPSULE",
            "SYRUP",
            "INJECTION",
            "DROPS",
            "SPRAY",
            "INHALER",
          ].map((tItem) => {
            const isSelected = formType === tItem;
            const label = t(`medicineType.${tItem}`);
            return (
              <TouchableOpacity
                key={tItem}
                style={[
                  styles.typeChip,
                  {
                    backgroundColor: isSelected
                      ? theme.colors.primary
                      : isDark
                        ? "#334155"
                        : "#f1f5f9",
                    flexDirection: "row",
                    alignItems: "center",
                    paddingHorizontal: 12,
                    height: 40,
                    borderRadius: 10,
                    marginRight: 8,
                  },
                ]}
                onPress={() => setFormType(tItem)}
              >
                <View style={{ marginRight: 6 }}>
                  <MedicineIcon
                    type={tItem}
                    size={16}
                    color={isSelected ? "#ffffff" : theme.colors.primary}
                  />
                </View>
                <Text
                  style={[
                    styles.typeChipText,
                    {
                      color: isSelected ? "#ffffff" : theme.colors.textPrimary,
                      fontSize: 13,
                      fontWeight: "600",
                    },
                  ]}
                >
                  {label}
                </Text>
                {isSelected && (
                  <Ionicons
                    name="checkmark-circle"
                    size={14}
                    color="#ffffff"
                    style={{ marginLeft: 6 }}
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.inputGroup}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 6,
          }}
        >
          <Ionicons
            name="flask-outline"
            size={14}
            color={theme.colors.textSecondary}
            style={{ marginRight: 6 }}
          />
          <Text
            style={[
              styles.inputLabel,
              { color: theme.colors.textSecondary, marginBottom: 0 },
            ]}
          >
            {t("dose")}
          </Text>
        </View>
        {renderDoseInput()}

        {/* Responsive, independent two-row layout for DoseVisual and live text preview */}
        <View style={{ marginTop: 12 }}>
          <View
            style={{
              backgroundColor: isDark ? "#10b98115" : "#10b98110",
              padding: 12,
              borderRadius: 12,
            }}
          >
            {/* Row 1: Full-width Preview Text */}
            <Text
              style={{
                color: "#10b981",
                fontSize: 14,
                fontWeight: "bold",
                marginBottom: 8,
                lineHeight: 20,
              }}
            >
              ✓ {getDosePreviewText()}
            </Text>
            {/* Row 2: Visual icons row below, left-aligned */}
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <DoseVisual
                type={formType}
                value={
                  formType === "TABLET" || formType === "CAPSULE"
                    ? formCount
                    : formVal
                }
                unit={formUnit}
                size={36}
                color="#10b981"
              />
            </View>
          </View>
        </View>
      </View>

      <View style={styles.inputGroup}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 6,
          }}
        >
          <Ionicons
            name="time-outline"
            size={14}
            color={theme.colors.textSecondary}
            style={{ marginRight: 6 }}
          />
          <Text
            style={[
              styles.inputLabel,
              { color: theme.colors.textSecondary, marginBottom: 0 },
            ]}
          >
            {t("frequency")}
          </Text>
        </View>
        <View style={styles.chipRow}>
          {["ONCE", "TWICE", "THRICE"].map((f) => (
            <TouchableOpacity
              key={f}
              style={[
                styles.freqChip,
                {
                  backgroundColor:
                    formFreq === f
                      ? theme.colors.primary
                      : isDark
                        ? "#334155"
                        : "#f1f5f9",
                  paddingVertical: 8,
                  paddingHorizontal: 16,
                  borderRadius: 10,
                  marginRight: 8,
                  marginBottom: 8,
                },
              ]}
              onPress={() => setFormFreq(f)}
            >
              <Text
                style={[
                  styles.freqChipText,
                  {
                    color:
                      formFreq === f ? "#ffffff" : theme.colors.textPrimary,
                    fontWeight: "bold",
                  },
                ]}
              >
                {f}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {renderTimeSlotPicker()}
      </View>

      <View style={styles.inputGroup}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 6,
          }}
        >
          <Ionicons
            name="restaurant-outline"
            size={14}
            color={theme.colors.textSecondary}
            style={{ marginRight: 6 }}
          />
          <Text
            style={[
              styles.inputLabel,
              { color: theme.colors.textSecondary, marginBottom: 0 },
            ]}
          >
            {preferredLang === "gujarati" ? "ભોજન સાથેનો સમય" : "Food Frequency"}
          </Text>
        </View>
        <View style={styles.chipRow}>
          {["BEFORE_FOOD", "AFTER_FOOD"].map((f) => {
            const label =
              f === "BEFORE_FOOD"
                ? preferredLang === "gujarati"
                  ? "જમ્યા પહેલા"
                  : "Before Food"
                : preferredLang === "gujarati"
                  ? "જમ્યા પછી"
                  : "After Food";
            return (
              <TouchableOpacity
                key={f}
                style={[
                  styles.freqChip,
                  {
                    backgroundColor:
                      formFoodFreq === f
                        ? theme.colors.primary
                        : isDark
                          ? "#334155"
                          : "#f1f5f9",
                    paddingVertical: 8,
                    paddingHorizontal: 16,
                    borderRadius: 10,
                    marginRight: 8,
                    marginBottom: 8,
                  },
                ]}
                onPress={() => setFormFoodFreq(f)}
              >
                <Text
                  style={[
                    styles.freqChipText,
                    {
                      color:
                        formFoodFreq === f
                          ? "#ffffff"
                          : theme.colors.textPrimary,
                      fontWeight: "bold",
                    },
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View
        style={[
          styles.inputGroup,
          {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          },
        ]}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Ionicons
            name="notifications-outline"
            size={14}
            color={theme.colors.textSecondary}
            style={{ marginRight: 6 }}
          />
          <Text
            style={[
              styles.inputLabel,
              { color: theme.colors.textSecondary, marginBottom: 0 },
            ]}
          >
            {t("refillAlert")}
          </Text>
        </View>
        <TouchableOpacity
          disabled={readOnly}
          style={[
            styles.toggleButton,
            {
              backgroundColor: formRefill
                ? "#10b981"
                : isDark
                  ? "#475569"
                  : "#cbd5e1",
            },
          ]}
          onPress={() => setFormRefill(!formRefill)}
        >
          <Text style={{ color: "#ffffff", fontWeight: "bold", fontSize: 11 }}>
            {formRefill ? "ON" : "OFF"}
          </Text>
        </TouchableOpacity>
      </View>

      {formRefill && (
        <View style={styles.inputGroup}>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
            <Ionicons name="cube-outline" size={14} color={theme.colors.textSecondary} style={{ marginRight: 6 }} />
            <Text style={[styles.inputLabel, { color: theme.colors.textSecondary, marginBottom: 0 }]}>
              {t("totalQuantity")}
            </Text>
          </View>
          <TextInput
            editable={!readOnly}
            style={[
              styles.textInput,
              {
                color: theme.colors.textPrimary,
                borderColor: isDark ? "#475569" : "#cbd5e1",
                backgroundColor: isDark ? "#0f172a" : "#f8fafc",
              },
            ]}
            value={formQty}
            onChangeText={setFormQty}
            onFocus={() => {
              setActiveFormDictationCallback((transcript) => {
                const num = parseFloat(transcript.replace(/\D/g, ""));
                if (!isNaN(num)) setFormQty(num.toString());
              });
            }}
            keyboardType="numeric"
            placeholder={preferredLang === "gujarati" ? "દા.ત. 30" : "e.g. 30"}
            placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
          />
        </View>
      )}

      {/* Start Date */}
      <View style={styles.inputGroup}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 6,
          }}
        >
          <Ionicons
            name="calendar-outline"
            size={14}
            color={theme.colors.textSecondary}
            style={{ marginRight: 6 }}
          />
          <Text
            style={[
              styles.inputLabel,
              { color: theme.colors.textSecondary, marginBottom: 0 },
            ]}
          >
            {preferredLang === "gujarati" ? "શરૂઆતની તારીખ" : "Start Date"}
          </Text>
        </View>
        <TouchableOpacity
          disabled={readOnly}
          style={[
            styles.textInput,
            {
              borderColor: isDark ? "#475569" : "#cbd5e1",
              backgroundColor: isDark ? "#0f172a" : "#f8fafc",
              justifyContent: "center",
            },
          ]}
          onPress={() => setStartDatePickerVisible(true)}
        >
          <Text
            style={{
              color: startDate
                ? theme.colors.textPrimary
                : isDark
                  ? "#64748b"
                  : "#94a3b8",
            }}
          >
            {startDate
              ? format(startDate, "MMM dd, yyyy")
              : preferredLang === "gujarati"
                ? "તારીખ પસંદ કરો"
                : "Select Start Date"}
          </Text>
        </TouchableOpacity>
      </View>

      <DateTimePickerModal
        isVisible={isStartDatePickerVisible}
        mode="date"
        onConfirm={(date: Date) => {
          setStartDatePickerVisible(false);
          setStartDate(date);
        }}
        onCancel={() => setStartDatePickerVisible(false)}
      />

      <View style={styles.inputGroup}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 6,
          }}
        >
          <Ionicons
            name="person-outline"
            size={14}
            color={theme.colors.textSecondary}
            style={{ marginRight: 6 }}
          />
          <Text
            style={[
              styles.inputLabel,
              { color: theme.colors.textSecondary, marginBottom: 0 },
            ]}
          >
            {t("prescribedBy")}
          </Text>
        </View>
        <TextInput
          editable={!readOnly}
          style={[
            styles.textInput,
            {
              color: theme.colors.textPrimary,
              borderColor: isDark ? "#475569" : "#cbd5e1",
              backgroundColor: isDark ? "#0f172a" : "#f8fafc",
            },
          ]}
          value={formPrescribed}
          onChangeText={setFormPrescribed}
          onFocus={() => {
            setActiveFormDictationCallback((transcript: string) => {
              setFormPrescribed((prev: string) => (prev ? prev + " " + transcript : transcript));
            });
          }}
          placeholder={t("prescribedBy")}
          placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
        />
      </View>

      <View style={styles.inputGroup}>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
          <Ionicons name="document-text-outline" size={14} color={theme.colors.textSecondary} style={{ marginRight: 6 }} />
          <Text style={[styles.inputLabel, { color: theme.colors.textSecondary, marginBottom: 0 }]}>
            {t("notes")}
          </Text>
        </View>
        <TextInput
          editable={!readOnly}
          style={[
            styles.textInput,
            {
              height: 60,
              color: theme.colors.textPrimary,
              borderColor: isDark ? "#475569" : "#cbd5e1",
              backgroundColor: isDark ? "#0f172a" : "#f8fafc",
            },
          ]}
          value={formNotes}
          onChangeText={setFormNotes}
          onFocus={() => {
            setActiveFormDictationCallback((transcript) => {
              setFormNotes((prev: any) => (prev ? prev + " " + transcript : transcript));
            });
          }}
          placeholder={t("placeholder.notes")}
          placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
          multiline
        />
      </View>

      {localErrors.length > 0 && (
        <View style={{ marginBottom: 12 }}>
          {localErrors.map((err, i) => (
            <Text key={i} style={{ color: "#ef4444", fontSize: 12 }}>
              • {err}
            </Text>
          ))}
        </View>
      )}

      {(() => {
        const parsed = parseChosenJson(chosenVal);
        const isSaved = readOnly && parsed?.medicine !== undefined;
        const isCancelled = readOnly && (chosenVal === "cancel" || (chosenLabel && String(chosenLabel).toLowerCase() === "cancel"));
        const saveOpacity = readOnly ? (isSaved ? 1 : 0.55) : 1;
        const cancelOpacity = readOnly ? (isCancelled ? 1 : 0.55) : 1;

        return (
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginTop: 12,
            }}
            pointerEvents={readOnly ? "none" : "auto"}
          >
            <TouchableOpacity
              disabled={selectedSlots.length !== N || readOnly}
              style={[
                styles.bigActionButtonSide,
                {
                  backgroundColor:
                    selectedSlots.length !== N
                      ? isDark
                        ? "#475569"
                        : "#cbd5e1"
                      : theme.colors.primary,
                  flex: 1,
                  marginRight: 8,
                  opacity: saveOpacity,
                  borderWidth: isSaved ? 2 : 0,
                  borderColor: isSaved ? "#ffffff" : "transparent",
                },
              ]}
              onPress={handleSave}
            >
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
                {isSaved && <Ionicons name="checkmark" size={16} color="#fff" style={{ marginRight: 4 }} />}
                <Text style={[styles.bigActionButtonTextSide, { color: selectedSlots.length !== N ? (isDark ? "#94a3b8" : "#64748b") : "#ffffff" }]}>
                  {t("saveMedicine")}
                </Text>
              </View>
            </TouchableOpacity>
            {(isEditingLocal || readOnly) && (onCancel || readOnly) && (
              <TouchableOpacity
                disabled={readOnly}
                style={[
                  styles.bigActionButtonSide,
                  {
                    backgroundColor: isDark ? "#334155" : "#e2e8f0",
                    flex: 0.4,
                    opacity: cancelOpacity,
                    borderWidth: isCancelled ? 2 : 0,
                    borderColor: isCancelled ? (isDark ? "#ffffff" : "#475569") : "transparent",
                  },
                ]}
                onPress={onCancel}
              >
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
                  {isCancelled && <Ionicons name="checkmark" size={16} color={theme.colors.textPrimary} style={{ marginRight: 4 }} />}
                  <Text style={[styles.bigActionButtonTextSide, { color: theme.colors.textPrimary }]}>
                    {t("cancel")}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          </View>
        );
      })()}

      <DateTimePickerModal
        isVisible={isSlotPickerVisible}
        mode="time"
        onConfirm={(date) => {
          setSlotPickerVisible(false);
          const time24 = format(date, "HH:mm");
          if (editingCustomTimeVal !== null) {
            if (time24 === editingCustomTimeVal) {
              return;
            }
            if (selectedSlots.includes(time24)) {
              setSlotError(t("duplicate"));
              return;
            }
            setSelectedSlots((prev) =>
              prev.map((t) => (t === editingCustomTimeVal ? time24 : t)),
            );
            setSlotError("");
          } else {
            if (selectedSlots.includes(time24)) {
              setSlotError(t("duplicate"));
              return;
            }
            if (selectedSlots.length < N) {
              setSelectedSlots((prev) => [...prev, time24]);
              setSlotError("");
            }
          }
        }}
        onCancel={() => setSlotPickerVisible(false)}
      />
    </View>
  );
}
