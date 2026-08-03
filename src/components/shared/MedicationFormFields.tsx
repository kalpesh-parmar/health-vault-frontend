import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { widgetStyles as styles } from "../chat/widgets/WidgetStyles";
import { I18N_ONBOARDING_UI } from "../chat/widgets/OnboardingI18n";
import { MedicineIcon, DoseVisual } from "../chat/widgets/MedicineHelpers";

// Custom Hook to manage state for all medication forms
export const useMedicationFormState = (initialMed: any, preferredLang: string = "english") => {
  const med = initialMed || {};
  
  // Normalize Medication Name
  const [formName, setFormName] = useState(
    med.name || med.medicationName || med.title || ""
  );

  // Normalize Medication Type
  const [formType, setFormType] = useState(() => {
    const rawType = (med.type || med.medicationType || "TABLET").toUpperCase();
    // Map backend type names to standard keys
    if (rawType === "TABLET" || rawType === "CAPSULE" || rawType === "SYRUP" || rawType === "INJECTION" || rawType === "DROPS" || rawType === "SPRAY" || rawType === "INHALER") {
      return rawType;
    }
    if (rawType === "DROP") return "DROPS";
    return "TABLET";
  });

  // Normalize Frequency
  const [formFreq, setFormFreq] = useState(() => {
    const freq = med.frequency || "ONCE";
    if (freq === "Once Daily" || freq === "ONCE_DAILY" || freq === "ONCE") return "ONCE";
    if (freq === "Twice Daily" || freq === "TWICE_DAILY" || freq === "TWICE") return "TWICE";
    if (freq === "3x Daily" || freq === "THREE_TIMES_DAILY" || freq === "THRICE") return "THRICE";
    return "ONCE";
  });

  // Notes
  const [formNotes, setFormNotes] = useState(med.notes || med.instructions || "");

  // Prescribed By Doctor
  const [formPrescribed, setFormPrescribed] = useState(
    med.prescribedBy || med.prescribed_by || ""
  );

  // Refill Alert Toggle
  const [formRefill, setFormRefill] = useState(
    med.refill_alert || med.refillAlert || false
  );

  // Total Quantity
  const [formQty, setFormQty] = useState(() => {
    const val = med.total_quantity !== undefined ? med.total_quantity : med.totalQuantity;
    return val !== undefined && val !== null ? String(val) : "10";
  });

  // Food Context / Timing
  const [formFoodFreq, setFormFoodFreq] = useState(() => {
    const context = med.foodContext || med.foodFrequency || (med.medicationSchedule && med.medicationSchedule.foodContext);
    if (context === "BEFORE_FOOD" || context === "Before Food") return "BEFORE_FOOD";
    return "AFTER_FOOD";
  });

  // Start Date
  const [startDate, setStartDate] = useState<Date | null>(() => {
    if (med.startDate) {
      const d = new Date(med.startDate);
      return isNaN(d.getTime()) ? new Date() : d;
    }
    return new Date();
  });

  // Stepper values parsing
  let initialCount = 1;
  let initialVal = 1;
  let initialUnit = "ml";

  if (med.dose) {
    if (med.dose.count !== undefined) initialCount = med.dose.count;
    if (med.dose.value !== undefined) initialVal = med.dose.value;
    if (med.dose.unit !== undefined) initialUnit = med.dose.unit;
  } else {
    const rawDosage = med.dosage || med.dosePerIntake;
    if (rawDosage !== undefined && rawDosage !== null) {
      const match = String(rawDosage).match(/^(\d+(?:\.\d+)?)\s*(.*)$/);
      if (match) {
        const numericVal = parseFloat(match[1]);
        const unitVal = match[2].trim().toLowerCase();
        if (!isNaN(numericVal)) {
          initialCount = numericVal;
          initialVal = numericVal;
        }
        if (unitVal) {
          if (unitVal.startsWith("tab")) {
            initialUnit = "tablet";
          } else if (unitVal.startsWith("cap")) {
            initialUnit = "capsule";
          } else {
            initialUnit = unitVal;
          }
        }
      } else {
        const numericVal = parseFloat(rawDosage);
        if (!isNaN(numericVal)) {
          initialCount = numericVal;
          initialVal = numericVal;
        }
      }
    }
  }

  const [formCount, setFormCount] = useState(initialCount);
  const [formVal, setFormVal] = useState(initialVal);
  const [formUnit, setFormUnit] = useState(initialUnit);

  // Time Slots / Reminder times parsing
  const [selectedSlots, setSelectedSlots] = useState<string[]>(() => {
    const scheduleInput = med.medicationSchedule || med.times || med.schedule;
    if (Array.isArray(scheduleInput)) {
      return scheduleInput.map(t => typeof t === "string" ? t.slice(0, 5) : t).filter(Boolean);
    }
    if (scheduleInput && typeof scheduleInput === "object") {
      const times: string[] = [];
      Object.values(scheduleInput).forEach((val: any) => {
        if (Array.isArray(val)) {
          val.forEach(v => {
            if (typeof v === "string") times.push(v.slice(0, 5));
          });
        } else if (typeof val === "string" && val.includes(":")) {
          times.push(val.slice(0, 5));
        }
      });
      if (times.length > 0) {
        return times;
      }
    }
    // Fallback based on frequency
    const f = med.frequency || "ONCE";
    if (f === "Once Daily" || f === "ONCE_DAILY" || f === "ONCE") return ["08:00"];
    if (f === "Twice Daily" || f === "TWICE_DAILY" || f === "TWICE") return ["08:00", "20:00"];
    return ["08:00", "14:00", "20:00"];
  });

  return {
    formName,
    setFormName,
    formType,
    setFormType,
    formFreq,
    setFormFreq,
    formNotes,
    setFormNotes,
    formPrescribed,
    setFormPrescribed,
    formRefill,
    setFormRefill,
    formQty,
    setFormQty,
    formFoodFreq,
    setFormFoodFreq,
    startDate,
    setStartDate,
    formCount,
    setFormCount,
    formVal,
    setFormVal,
    formUnit,
    setFormUnit,
    selectedSlots,
    setSelectedSlots,
  };
};

interface MedicationFormFieldsProps {
  formState: ReturnType<typeof useMedicationFormState>;
  isDark: boolean;
  theme: any;
  preferredLang?: string;
  readOnly?: boolean;
}

export const MedicationFormFields: React.FC<MedicationFormFieldsProps> = ({
  formState,
  isDark,
  theme,
  preferredLang = "english",
  readOnly = false,
}) => {
  const {
    formName,
    setFormName,
    formType,
    setFormType,
    formFreq,
    setFormFreq,
    formNotes,
    setFormNotes,
    formPrescribed,
    setFormPrescribed,
    formRefill,
    setFormRefill,
    formQty,
    setFormQty,
    formFoodFreq,
    setFormFoodFreq,
    startDate,
    setStartDate,
    formCount,
    setFormCount,
    formVal,
    setFormVal,
    formUnit,
    setFormUnit,
    selectedSlots,
    setSelectedSlots,
  } = formState;

  const [isStartDatePickerVisible, setStartDatePickerVisible] = useState(false);
  const [isSlotPickerVisible, setSlotPickerVisible] = useState(false);
  const [editingCustomTimeVal, setEditingCustomTimeVal] = useState<string | null>(null);
  const [slotError, setSlotError] = useState("");
  const [isCustomMode, setIsCustomMode] = useState<boolean>(() => {
    return selectedSlots.some((t) => t !== "08:00" && t !== "14:00" && t !== "20:00");
  });

  const isFirstRenderFreq = useRef(true);
  const isFirstRenderType = useRef(true);

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

  const allowedUnitsMap: Record<string, string[]> = {
    SYRUP: ["ml", "tsp", "tbsp"],
    INJECTION: ["ml", "IU"],
    DROPS: ["drops", "ml"],
    SPRAY: ["puff"],
    INHALER: ["puff"],
  };

  const currentAllowedUnits = allowedUnitsMap[formType] || [];

  useEffect(() => {
    const units = allowedUnitsMap[formType];
    if (units && !units.includes(formUnit)) {
      setFormUnit(units[0]);
    }
  }, [formType]);

  // Adjust slots based on frequency
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

  // Sync integer/fraction limits in UI
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

  const N = formFreq === "ONCE" ? 1 : formFreq === "TWICE" ? 2 : 3;

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
              setFormCount((prev) => Math.max(0.25, Math.round((prev - 0.25) * 100) / 100))
            }
          >
            <Ionicons name="remove" size={20} color={theme.colors.textPrimary} />
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
            <Ionicons name="remove" size={20} color={theme.colors.textPrimary} />
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
            <Ionicons name="remove" size={20} color={theme.colors.textPrimary} />
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
            <Ionicons name="remove" size={20} color={theme.colors.textPrimary} />
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
                    color: formUnit === u ? "#ffffff" : theme.colors.textPrimary,
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
    <View style={{ width: "100%" }}>
      {/* Medicine Name */}
      <View style={styles.inputGroup}>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
          <Ionicons name="ellipse-outline" size={14} color={theme.colors.textSecondary} style={{ marginRight: 6 }} />
          <Text style={[styles.inputLabel, { color: theme.colors.textSecondary, marginBottom: 0 }]}>
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
          placeholder={t("placeholder.paracetamol")}
          placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
        />
      </View>

      {/* Medicine Type */}
      <View style={styles.inputGroup}>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
          <Ionicons name="grid-outline" size={14} color={theme.colors.textSecondary} style={{ marginRight: 6 }} />
          <Text style={[styles.inputLabel, { color: theme.colors.textSecondary, marginBottom: 0 }]}>
            {t("medicineType")}
          </Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: "row", marginVertical: 4 }}>
          {["TABLET", "CAPSULE", "SYRUP", "INJECTION", "DROPS", "SPRAY", "INHALER"].map((tItem) => {
            const isSelected = formType === tItem;
            const label = t(`medicineType.${tItem}`);
            return (
              <TouchableOpacity
                key={tItem}
                style={[
                  styles.typeChip,
                  {
                    backgroundColor: isSelected ? theme.colors.primary : isDark ? "#334155" : "#f1f5f9",
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
                  <MedicineIcon type={tItem} size={16} color={isSelected ? "#ffffff" : theme.colors.primary} />
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
                  <Ionicons name="checkmark-circle" size={14} color="#ffffff" style={{ marginLeft: 6 }} />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Dosage */}
      <View style={styles.inputGroup}>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
          <Ionicons name="flask-outline" size={14} color={theme.colors.textSecondary} style={{ marginRight: 6 }} />
          <Text style={[styles.inputLabel, { color: theme.colors.textSecondary, marginBottom: 0 }]}>
            {t("dose")}
          </Text>
        </View>
        {renderDoseInput()}
        <View style={{ marginTop: 12 }}>
          <View style={{ backgroundColor: isDark ? "#10b98115" : "#10b98110", padding: 12, borderRadius: 12 }}>
            <Text style={{ color: "#10b981", fontSize: 14, fontWeight: "bold", marginBottom: 8, lineHeight: 20 }}>
              ✓ {getDosePreviewText()}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <DoseVisual
                type={formType}
                value={formType === "TABLET" || formType === "CAPSULE" ? formCount : formVal}
                unit={formUnit}
                size={36}
                color="#10b981"
              />
            </View>
          </View>
        </View>
      </View>

      {/* Intake Frequency */}
      <View style={styles.inputGroup}>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
          <Ionicons name="time-outline" size={14} color={theme.colors.textSecondary} style={{ marginRight: 6 }} />
          <Text style={[styles.inputLabel, { color: theme.colors.textSecondary, marginBottom: 0 }]}>
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
                  backgroundColor: formFreq === f ? theme.colors.primary : isDark ? "#334155" : "#f1f5f9",
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
                    color: formFreq === f ? "#ffffff" : theme.colors.textPrimary,
                    fontWeight: "bold",
                  },
                ]}
              >
                {t("frequency." + f)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {renderTimeSlotPicker()}
      </View>

      {/* Food Context */}
      <View style={styles.inputGroup}>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
          <Ionicons name="restaurant-outline" size={14} color={theme.colors.textSecondary} style={{ marginRight: 6 }} />
          <Text style={[styles.inputLabel, { color: theme.colors.textSecondary, marginBottom: 0 }]}>
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
                    backgroundColor: formFoodFreq === f ? theme.colors.primary : isDark ? "#334155" : "#f1f5f9",
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
                      color: formFoodFreq === f ? "#ffffff" : theme.colors.textPrimary,
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

      {/* Refill Alert Switch */}
      <View style={[styles.inputGroup, { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }]}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Ionicons name="notifications-outline" size={14} color={theme.colors.textSecondary} style={{ marginRight: 6 }} />
          <Text style={[styles.inputLabel, { color: theme.colors.textSecondary, marginBottom: 0 }]}>
            {t("refillAlert")}
          </Text>
        </View>
        <TouchableOpacity
          disabled={readOnly}
          style={[
            styles.toggleButton,
            {
              backgroundColor: formRefill ? "#10b981" : isDark ? "#475569" : "#cbd5e1",
            },
          ]}
          onPress={() => setFormRefill(!formRefill)}
        >
          <Text style={{ color: "#ffffff", fontWeight: "bold", fontSize: 11 }}>
            {formRefill ? "ON" : "OFF"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Total Quantity */}
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
          keyboardType="numeric"
          placeholder={preferredLang === "gujarati" ? "દા.ત. 30" : "e.g. 30"}
          placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
        />
      </View>

      {/* Start Date */}
      <View style={styles.inputGroup}>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
          <Ionicons name="calendar-outline" size={14} color={theme.colors.textSecondary} style={{ marginRight: 6 }} />
          <Text style={[styles.inputLabel, { color: theme.colors.textSecondary, marginBottom: 0 }]}>
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
              color: startDate ? theme.colors.textPrimary : isDark ? "#64748b" : "#94a3b8",
            }}
          >
            {startDate ? format(startDate, "MMM dd, yyyy") : preferredLang === "gujarati" ? "તારીખ પસંદ કરો" : "Select Start Date"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Prescribed By */}
      <View style={styles.inputGroup}>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
          <Ionicons name="person-outline" size={14} color={theme.colors.textSecondary} style={{ marginRight: 6 }} />
          <Text style={[styles.inputLabel, { color: theme.colors.textSecondary, marginBottom: 0 }]}>
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
          placeholder={t("prescribedBy")}
          placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
        />
      </View>

      {/* Notes */}
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
          placeholder={t("placeholder.notes")}
          placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
          multiline
        />
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

      <DateTimePickerModal
        isVisible={isSlotPickerVisible}
        mode="time"
        onConfirm={(date) => {
          setSlotPickerVisible(false);
          const time24 = format(date, "HH:mm");
          if (editingCustomTimeVal !== null) {
            if (time24 === editingCustomTimeVal) return;
            if (selectedSlots.includes(time24)) {
              setSlotError(t("duplicate"));
              return;
            }
            setSelectedSlots((prev) => prev.map((t) => (t === editingCustomTimeVal ? time24 : t)));
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
};
