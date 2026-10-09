import React, { useState, useRef } from "react";
import { Animated, TouchableOpacity, View, Modal, ScrollView, ActivityIndicator } from "react-native";
import styled from "styled-components/native";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { RouteProp, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Toast from "react-native-toast-message";
import { useMutation } from "@tanstack/react-query";
import { useAppTheme } from "../../../../context/ThemeContext";
import {
  addMedication,
  addMedicationsBatch,
  updateMedication,
} from "../../../../services/medicationservice";
import MedicationForm from "../../../../components/MedicationForm";
import MedicationBatchReview from "./MedicationBatchReview";
import { AddOrEditMedication } from "../../../../types";
import { queryClient } from "../../../../config/queryClient";
import { MedicationStackParamList } from "../../../../types/navigation";
import {
  createMedicationReminder,
  createMedicationRemindersBatch,
} from "../../../../services/reminderService";
import { useAppConstants } from "../../../../utils/translationUtils";

type AddMedicationScreenRouteProp = RouteProp<
  MedicationStackParamList,
  "MedicationOperation"
>;

const formatMedicationForBatchApi = (med: AddOrEditMedication) => {
  const normType = String(med.medicationType || "TABLET").toUpperCase().trim();

  // Frequency mapping
  let normFreq = "ONCE_DAILY";
  const freqStr = String(med.frequency || "").toUpperCase().trim();
  if (freqStr.includes("TWICE") || freqStr.includes("2")) {
    normFreq = "TWICE_DAILY";
  } else if (freqStr.includes("THRICE") || freqStr.includes("3") || freqStr.includes("THREE")) {
    normFreq = "THRICE_DAILY";
  } else if (freqStr.includes("ONCE") || freqStr.includes("1")) {
    normFreq = "ONCE_DAILY";
  } else if (freqStr) {
    normFreq = freqStr.replace(/\s+/g, "_");
  }

  // Food frequency mapping
  let normFood = "AFTER_FOOD";
  const foodStr = String(med.foodFrequency || "").toUpperCase().trim().replace(/\s+/g, "_");
  if (foodStr.includes("BEFORE")) {
    normFood = "BEFORE_FOOD";
  } else if (foodStr.includes("AFTER")) {
    normFood = "AFTER_FOOD";
  } else if (foodStr.includes("WITH")) {
    normFood = "WITH_FOOD";
  } else if (foodStr) {
    normFood = foodStr;
  }

  // Schedule mapping: ensure object with HH:mm:ss format
  const scheduleObj: Record<string, string> = {};
  if (med.medicationSchedule && typeof med.medicationSchedule === "object" && !Array.isArray(med.medicationSchedule)) {
    Object.entries(med.medicationSchedule).forEach(([k, rawVal]) => {
      const v = rawVal as any;
      if (typeof v === "string") {
        const timeVal = v.length === 5 ? `${v}:00` : v;
        scheduleObj[k.toUpperCase()] = timeVal;
      } else if (Array.isArray(v) && v.length > 0) {
        const firstTime = String(v[0]);
        scheduleObj[k.toUpperCase()] = firstTime.length === 5 ? `${firstTime}:00` : firstTime;
      }
    });
  } else if (Array.isArray(med.medicationSchedule)) {
    const times = [...med.medicationSchedule].sort();
    times.forEach((t, i) => {
      const timeStr = String(t);
      const timeWithSec = timeStr.length === 5 ? `${timeStr}:00` : timeStr;
      let slotKey = i === 0 ? "MORNING" : i === 1 ? (times.length === 2 ? "NIGHT" : "NOON") : "NIGHT";
      if (timeStr.startsWith("08:") || timeStr.startsWith("09:")) slotKey = "MORNING";
      else if (timeStr.startsWith("13:") || timeStr.startsWith("14:") || timeStr.startsWith("15:")) slotKey = "NOON";
      else if (timeStr.startsWith("19:") || timeStr.startsWith("20:") || timeStr.startsWith("21:")) slotKey = "NIGHT";
      scheduleObj[slotKey] = timeWithSec;
    });
  }

  if (Object.keys(scheduleObj).length === 0) {
    if (normFreq === "TWICE_DAILY") {
      scheduleObj["MORNING"] = "08:00:00";
      scheduleObj["NIGHT"] = "20:00:00";
    } else if (normFreq === "THRICE_DAILY") {
      scheduleObj["MORNING"] = "08:00:00";
      scheduleObj["NOON"] = "14:00:00";
      scheduleObj["NIGHT"] = "20:00:00";
    } else {
      scheduleObj["MORNING"] = "08:00:00";
    }
  }

  let startDateStr = med.startDate;
  if (!startDateStr) {
    const d = new Date();
    startDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  } else if (startDateStr.includes("T")) {
    startDateStr = startDateStr.split("T")[0];
  }

  const payloadItem: any = {
    medicationName: (med.medicationName || "").trim(),
    medicationType: normType,
    frequency: normFreq,
    startDate: startDateStr,
    medicationSchedule: scheduleObj,
    foodFrequency: normFood,
    totalQuantity: typeof med.totalQuantity === "number" ? med.totalQuantity : parseInt(String(med.totalQuantity || 10), 10) || 10,
  };

  if (med.dosePerIntake !== undefined && med.dosePerIntake !== null) {
    payloadItem.dosePerIntake = typeof med.dosePerIntake === "number" ? med.dosePerIntake : parseFloat(String(med.dosePerIntake)) || 1;
  }
  if (med.unit) {
    payloadItem.unit = med.unit;
  }
  if (med.prescribedBy) {
    payloadItem.prescribedBy = med.prescribedBy.trim();
  }
  if (med.notes) {
    payloadItem.notes = med.notes.trim();
  }
  if (med.resolution) {
    payloadItem.resolution = med.resolution;
  }
  if (med.replaceMedicationId) {
    payloadItem.replaceMedicationId = med.replaceMedicationId;
  }

  return payloadItem;
};

const extractCreatedMedicationIds = (responseData: any): string[] => {
  if (!responseData) return [];
  const rawList = Array.isArray(responseData)
    ? responseData
    : Array.isArray(responseData.data)
      ? responseData.data
      : Array.isArray(responseData.items)
        ? responseData.items
        : Array.isArray(responseData.data?.items)
          ? responseData.data.items
          : Array.isArray(responseData.data?.medications)
            ? responseData.data.medications
            : Array.isArray(responseData.medications)
              ? responseData.medications
              : responseData.id || responseData.data?.id
                ? [responseData.id || responseData.data?.id]
                : [];

  return rawList
    .map((item: any) => (typeof item === "string" ? item : item?.id || item?._id || item?.medicationId))
    .filter(Boolean);
};

const MedicationOperation = ({
  route,
}: {
  route: AddMedicationScreenRouteProp;
}) => {
  const navigation =
    useNavigation<NativeStackNavigationProp<MedicationStackParamList>>();
  const { isDark } = useAppTheme();
  const constants = useAppConstants();
  const { operation, medication } = route.params;

  const [currentOperation, setCurrentOperation] = useState(operation);
  const [currentMedication, setCurrentMedication] = useState(medication);
  
  // Batch Add states
  const [mode, setMode] = useState<"form" | "review">("form");
  const [drafts, setDrafts] = useState<AddOrEditMedication[]>([]);
  const [currentDraftIndex, setCurrentDraftIndex] = useState<number>(0);
  const [isBatchSaving, setIsBatchSaving] = useState(false);

  // Duplicate conflict states
  const [duplicateConflict, setDuplicateConflict] = useState<any | null>(null);
  const [pendingFormData, setPendingFormData] = useState<AddOrEditMedication | null>(null);
  const [isReplacing, setIsReplacing] = useState(false);

  const medicationId = currentMedication?.id;
  const scrollY = useRef(new Animated.Value(0)).current;

  // Reset scrollY to 0 whenever draft index or mode changes so the header stays fully expanded
  React.useEffect(() => {
    scrollY.setValue(0);
  }, [currentDraftIndex, mode]);

  const headerTitle =
    currentOperation === "edit"
      ? (constants?.editMedication || "Edit Medication")
      : mode === "review"
        ? (constants?.reviewMedications || "Review Medications")
        : (constants?.addMedication || "Add Medication");

  const headerSubtitle =
    currentOperation === "edit"
      ? (constants?.maintainMedicalSchedule || "Maintain your medical schedule")
      : mode === "review"
        ? `${drafts.length} ${drafts.length > 1 ? (constants?.medications || "medications") : (constants?.medication || "medication")} ${constants?.readyToSave || "ready to save"}`
        : drafts.length > 0
          ? `${drafts.length} ${drafts.length > 1 ? (constants?.medicines || "medicines") : (constants?.medicine || "medicine")} ${constants?.addedAddAnother || "added · Add another or review"}`
          : (constants?.maintainMedicalSchedule || "Maintain your medical schedule");

  const headerPaddingTop = scrollY.interpolate({
    inputRange: [0, 90],
    outputRange: [50, 44],
    extrapolate: "clamp",
  });
  const headerPaddingBottom = scrollY.interpolate({
    inputRange: [0, 90],
    outputRange: [40, 14],
    extrapolate: "clamp",
  });
  const headerRadius = scrollY.interpolate({
    inputRange: [0, 90],
    outputRange: [30, 20],
    extrapolate: "clamp",
  });
  const summaryOpacity = scrollY.interpolate({
    inputRange: [0, 45, 90],
    outputRange: [1, 0.25, 0],
    extrapolate: "clamp",
  });
  const summaryTranslateY = scrollY.interpolate({
    inputRange: [0, 90],
    outputRange: [0, -28],
    extrapolate: "clamp",
  });
  const summaryHeight = scrollY.interpolate({
    inputRange: [0, 90],
    outputRange: [62, 0],
    extrapolate: "clamp",
  });
  const summaryMarginTop = scrollY.interpolate({
    inputRange: [0, 90],
    outputRange: [25, 0],
    extrapolate: "clamp",
  });

  const handleFormScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { useNativeDriver: false },
  );

  const { mutateAsync: addMedicationsBatchMutation, isPending: isLoading } =
    useMutation({
      mutationFn: addMedicationsBatch,
    });

  const { mutateAsync: editMedicationMutation, isPending: isEditingLoading } =
    useMutation({
      mutationFn: updateMedication,
    });

  const invalidateMedicationQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["medications"] }),
      queryClient.invalidateQueries({ queryKey: ["allMedications"] }),
      queryClient.invalidateQueries({ queryKey: ["filteredMedications"] }),
      queryClient.invalidateQueries({ queryKey: ["paginatedReminders"] }),
      queryClient.invalidateQueries({ queryKey: ["allRemindersCounts"] }),
      queryClient.invalidateQueries({ queryKey: ["todayReminders"] }),
      queryClient.invalidateQueries({ queryKey: ["allReminders"] }),
      queryClient.invalidateQueries({ queryKey: ["notificationCount"] }),
      queryClient.invalidateQueries({ queryKey: ["paginatedNotifications"] }),
      queryClient.invalidateQueries({ queryKey: ["todayOccurrencesCount"] }),
    ]);
  };

  // Form submission (saves via batch endpoint in array format)
  const handleSubmit = async (formData: AddOrEditMedication) => {
    try {
      if (currentOperation === "add") {
        let draftsToSave = [...drafts];
        if (currentDraftIndex < draftsToSave.length) {
          draftsToSave[currentDraftIndex] = formData;
        } else {
          draftsToSave.push(formData);
        }

        const batchPayload = draftsToSave.map(formatMedicationForBatchApi);
        const responseData = await addMedicationsBatchMutation(batchPayload);

        const createdIds = extractCreatedMedicationIds(responseData);
        if (createdIds.length > 0) {
          try {
            await createMedicationRemindersBatch(createdIds);
          } catch (error) {
            console.log("Failed to create reminders for added medications:", error);
          }
        }

        Toast.show({
          type: "success",
          text1: `${draftsToSave.length > 1 ? `${draftsToSave.length} Medications` : "Medication"} added successfully`,
        });
      } else {
        await editMedicationMutation({
          medicationId: medicationId || "",
          data: formData,
        });
        
        Toast.show({
          type: "success",
          text1: `Medication edited successfully`,
        });
      }

      await invalidateMedicationQueries();
      navigation.goBack();
    } catch (error: any) {
      if (error?.isDuplicate && error?.responseData?.details?.duplicateInfo) {
        setDuplicateConflict(error.responseData);
        setPendingFormData(formData);
      } else {
        Toast.show({
          type: "error",
          text1: error.message || "Something went wrong",
        });
      }
    }
  };

  // Add & Continue handler: adds to drafts and moves to next form with expanded header
  const handleAddAndContinue = (validMed: AddOrEditMedication) => {
    const updated = [...drafts];
    if (currentDraftIndex < updated.length) {
      updated[currentDraftIndex] = validMed;
    } else {
      updated.push(validMed);
    }
    setDrafts(updated);

    const nextIdx = updated.length;
    setCurrentDraftIndex(nextIdx);
    scrollY.setValue(0);

    Toast.show({
      type: "success",
      text1: `Added ${validMed.medicationName}`,
      text2: `Now add Medicine #${nextIdx + 1}`,
      visibilityTime: 1800,
    });
  };

  // Review handler: validates and saves current draft, then opens review mode
  const handleReview = (currentValidData?: AddOrEditMedication | null) => {
    let updated = [...drafts];
    if (currentValidData) {
      if (currentDraftIndex < updated.length) {
        updated[currentDraftIndex] = currentValidData;
      } else {
        updated.push(currentValidData);
      }
      setDrafts(updated);
    }

    if (updated.length > 0) {
      scrollY.setValue(0);
      setMode("review");
    } else {
      Toast.show({
        type: "info",
        text1: "No medications added yet",
        text2: "Please fill in the medication details first",
      });
    }
  };

  // Stepper navigation handler
  const handleNavigateDraft = (
    targetIndex: number,
    currentValidData?: AddOrEditMedication | null,
  ) => {
    if (currentValidData) {
      const updated = [...drafts];
      if (currentDraftIndex < updated.length) {
        updated[currentDraftIndex] = currentValidData;
      } else {
        updated.push(currentValidData);
      }
      setDrafts(updated);
    }
    setCurrentDraftIndex(targetIndex);
    scrollY.setValue(0);
  };

  // Edit from review screen
  const handleEditDraftFromReview = (index: number) => {
    setCurrentDraftIndex(index);
    scrollY.setValue(0);
    setMode("form");
  };

  // Delete from review screen
  const handleDeleteDraftFromReview = (index: number) => {
    const updated = drafts.filter((_, idx) => idx !== index);
    setDrafts(updated);
    scrollY.setValue(0);
    if (updated.length === 0) {
      setCurrentDraftIndex(0);
      setMode("form");
    } else if (currentDraftIndex >= updated.length) {
      setCurrentDraftIndex(updated.length - 1);
    }
  };

  // Add new from review screen
  const handleAddNewFromReview = () => {
    setCurrentDraftIndex(drafts.length);
    scrollY.setValue(0);
    setMode("form");
  };

  // Batch Save handler
  const handleConfirmBatchSave = async (selectedDrafts: AddOrEditMedication[]) => {
    if (selectedDrafts.length === 0) {
      Toast.show({
        type: "info",
        text1: "No medications selected",
        text2: "Please select at least one medication to save",
      });
      return;
    }

    setIsBatchSaving(true);
    try {
      const batchPayload = selectedDrafts.map(formatMedicationForBatchApi);
      const responseData = await addMedicationsBatchMutation(batchPayload);

      const createdIds = extractCreatedMedicationIds(responseData);
      if (createdIds.length > 0) {
        try {
          await createMedicationRemindersBatch(createdIds);
        } catch (remErr) {
          console.log("Failed to create reminders for batch:", remErr);
        }
      }

      await invalidateMedicationQueries();

      Toast.show({
        type: "success",
        text1: `${selectedDrafts.length} Medication${selectedDrafts.length > 1 ? "s" : ""} added successfully`,
      });
      navigation.goBack();
    } catch (error: any) {
      if (error?.isDuplicate && error?.responseData?.details?.duplicateInfo) {
        setDuplicateConflict(error.responseData);
        setPendingFormData(selectedDrafts[0]);
      } else {
        Toast.show({
          type: "error",
          text1: error?.message || "Something went wrong while saving medications",
        });
      }
    } finally {
      setIsBatchSaving(false);
    }
  };

  // Back button in header handler
  const handleHeaderBack = () => {
    if (mode === "review") {
      setMode("form");
    } else {
      navigation.goBack();
    }
  };

  const handleReplace = async (replaceMedId: string) => {
    if (!pendingFormData) return;
    setIsReplacing(true);
    try {
      const replacePayload = {
        ...pendingFormData,
        resolution: "REPLACE",
        replaceMedicationId: replaceMedId,
      };

      if (currentOperation === "add") {
        const batchPayload = [formatMedicationForBatchApi(replacePayload)];
        const responseData = await addMedicationsBatchMutation(batchPayload);
        const createdIds = extractCreatedMedicationIds(responseData);
        if (createdIds.length > 0) {
          try {
            await createMedicationRemindersBatch(createdIds);
          } catch (e) {
            console.log("Failed to create reminder for replaced medication:", e);
          }
        }
        Toast.show({
          type: "success",
          text1: "Medication replaced successfully",
        });
      } else {
        await editMedicationMutation({
          medicationId: medicationId || "",
          data: replacePayload,
        });
        Toast.show({
          type: "success",
          text1: "Medication replaced successfully",
        });
      }

      setDuplicateConflict(null);
      setPendingFormData(null);
      await invalidateMedicationQueries();
      navigation.goBack();
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: error.message || "Failed to replace medication",
      });
    } finally {
      setIsReplacing(false);
    }
  };

  const handleKeepExisting = () => {
    setDuplicateConflict(null);
    setPendingFormData(null);
    Toast.show({
      type: "info",
      text1: "Discarded incoming medication changes",
    });
    navigation.goBack();
  };

  const handleCancelModal = () => {
    setDuplicateConflict(null);
  };

  const formatMedicationSchedule = (schedule: any) => {
    if (!schedule) return "None";
    if (typeof schedule === "string") return schedule;
    if (Array.isArray(schedule)) return schedule.join(", ");
    if (typeof schedule === "object") {
      const times: string[] = [];
      Object.entries(schedule).forEach(([key, val]) => {
        if (Array.isArray(val)) {
          val.forEach((v) => times.push(String(v).slice(0, 5)));
        } else if (typeof val === "string") {
          times.push(val.slice(0, 5));
        }
      });
      if (times.length > 0) return times.join(", ");
      return JSON.stringify(schedule);
    }
    return "None";
  };

  const formatFoodFrequency = (food?: string) => {
    if (!food) return "None";
    const normalized = String(food).toUpperCase().replace(/\s+/g, "_");
    if (normalized === "BEFORE_FOOD" || normalized === "BEFORE") return "Before Food";
    if (normalized === "AFTER_FOOD" || normalized === "AFTER") return "After Food";
    return food;
  };

  const renderDuplicateConflictModal = () => {
    if (!duplicateConflict) return null;

    const dupInfo = duplicateConflict.details?.duplicateInfo;
    const existingMed = dupInfo?.matchedMedication || dupInfo?.matchedMedications?.[0];
    const actions = duplicateConflict.details?.suggestedActions || [];
    const hasKeepExisting = actions.some((a: any) => a.action === "KEEP EXISTING" || a.action === "REMOVE NEW");

    return (
      <Modal
        visible={!!duplicateConflict}
        transparent
        animationType="fade"
        onRequestClose={handleCancelModal}
      >
        <ModalBackdrop>
          <ModalContainer isDark={isDark}>
            {/* Header */}
            <ModalHeader>
              <WarningIconContainer>
                <Ionicons name="warning" size={32} color="#f97316" />
              </WarningIconContainer>
              <ModalTitle isDark={isDark}>{constants?.conflictDetected || "Conflict Detected"}</ModalTitle>
              <ModalSubtitle isDark={isDark}>
                {constants?.similarMedicationExists || "A similar medication already exists in your profile."}
              </ModalSubtitle>
            </ModalHeader>

            {/* Comparison Details */}
            <ScrollView
              style={{ maxHeight: 300, width: "100%" }}
              showsVerticalScrollIndicator={true}
              contentContainerStyle={{ paddingBottom: 10 }}
            >
              {/* Existing Card */}
              {existingMed && (
                <MedCard style={{ backgroundColor: isDark ? "#1e293b" : "#f1f5f9", borderColor: isDark ? "#334155" : "#cbd5e1", borderWidth: 1 }}>
                  <MedBadge style={{ backgroundColor: "#3b82f6" }}>
                    <MedBadgeText>{constants?.existingMedication || "Existing Medication"}</MedBadgeText>
                  </MedBadge>
                  <MedName isDark={isDark}>{existingMed.medicationName}</MedName>
                  <MedDetailRow>
                    <Ionicons name="layers-outline" size={14} color="#64748b" />
                    <MedDetailText isDark={isDark}>{constants?.type || "Type"}: {existingMed.medicationType}</MedDetailText>
                  </MedDetailRow>
                  {existingMed.prescribedBy ? (
                    <MedDetailRow>
                      <Ionicons name="person-outline" size={14} color="#64748b" />
                      <MedDetailText isDark={isDark}>{constants?.doctor || "Doctor"}: {existingMed.prescribedBy}</MedDetailText>
                    </MedDetailRow>
                  ) : null}
                  <MedDetailRow>
                    <Ionicons name="disc-outline" size={14} color="#64748b" />
                    <MedDetailText isDark={isDark}>
                      {constants?.dose || "Dose"}: {existingMed.dosePerIntake} {existingMed.unit || "unit(s)"}
                    </MedDetailText>
                  </MedDetailRow>
                  <MedDetailRow>
                    <Ionicons name="alarm-outline" size={14} color="#64748b" />
                    <MedDetailText isDark={isDark}>{constants?.frequency || "Frequency"}: {existingMed.frequency || "Once Daily"}</MedDetailText>
                  </MedDetailRow>
                  <MedDetailRow>
                    <Ionicons name="restaurant-outline" size={14} color="#64748b" />
                    <MedDetailText isDark={isDark}>
                      {constants?.timing || "Timing"}: {formatFoodFrequency(existingMed.foodFrequency)}
                    </MedDetailText>
                  </MedDetailRow>
                  <MedDetailRow>
                    <Ionicons name="time-outline" size={14} color="#64748b" />
                    <MedDetailText isDark={isDark}>
                      {constants?.schedule || "Schedule"}: {formatMedicationSchedule(existingMed.medicationSchedule)}
                    </MedDetailText>
                  </MedDetailRow>
                </MedCard>
              )}

              {/* Incoming Card */}
              {pendingFormData && (
                <MedCard style={{ backgroundColor: isDark ? "#064e3b20" : "#d1fae540", borderColor: "#10b981", borderWidth: 1.5, marginTop: 12 }}>
                  <MedBadge style={{ backgroundColor: "#10b981" }}>
                    <MedBadgeText>{constants?.incomingNewMedication || "Incoming New Medication"}</MedBadgeText>
                  </MedBadge>
                  <MedName isDark={isDark}>{pendingFormData.medicationName}</MedName>
                  <MedDetailRow>
                    <Ionicons name="layers-outline" size={14} color="#64748b" />
                    <MedDetailText isDark={isDark}>{constants?.type || "Type"}: {pendingFormData.medicationType}</MedDetailText>
                  </MedDetailRow>
                  {pendingFormData.prescribedBy ? (
                    <MedDetailRow>
                      <Ionicons name="person-outline" size={14} color="#64748b" />
                      <MedDetailText isDark={isDark}>{constants?.doctor || "Doctor"}: {pendingFormData.prescribedBy}</MedDetailText>
                    </MedDetailRow>
                  ) : null}
                  <MedDetailRow>
                    <Ionicons name="disc-outline" size={14} color="#64748b" />
                    <MedDetailText isDark={isDark}>
                      {constants?.dose || "Dose"}: {pendingFormData.dosePerIntake}
                    </MedDetailText>
                  </MedDetailRow>
                  <MedDetailRow>
                    <Ionicons name="alarm-outline" size={14} color="#64748b" />
                    <MedDetailText isDark={isDark}>{constants?.frequency || "Frequency"}: {pendingFormData.frequency || "Once Daily"}</MedDetailText>
                  </MedDetailRow>
                  <MedDetailRow>
                    <Ionicons name="restaurant-outline" size={14} color="#64748b" />
                    <MedDetailText isDark={isDark}>
                      {constants?.timing || "Timing"}: {formatFoodFrequency(pendingFormData.foodFrequency)}
                    </MedDetailText>
                  </MedDetailRow>
                  <MedDetailRow>
                    <Ionicons name="time-outline" size={14} color="#64748b" />
                    <MedDetailText isDark={isDark}>
                      {constants?.schedule || "Schedule"}: {formatMedicationSchedule(pendingFormData.medicationSchedule)}
                    </MedDetailText>
                  </MedDetailRow>
                </MedCard>
              )}
            </ScrollView>

            {/* Actions Footer */}
            <ModalFooter>
              {isReplacing ? (
                <ActivityIndicator size="large" color="#6366f1" style={{ marginVertical: 15 }} />
              ) : (
                <View style={{ width: "100%", gap: 8 }}>
                  {existingMed?.id && (
                    <ModalButton
                      style={{ backgroundColor: "#ef4444" }}
                      onPress={() => handleReplace(existingMed.id)}
                    >
                      <ModalButtonText>{constants?.replace || "Replace"}</ModalButtonText>
                    </ModalButton>
                  )}

                  {hasKeepExisting && (
                    <ModalButton
                      style={{ backgroundColor: "#64748b" }}
                      onPress={handleKeepExisting}
                    >
                      <ModalButtonText>{constants?.keepExisting || "Keep Existing"}</ModalButtonText>
                    </ModalButton>
                  )}
                </View>
              )}
            </ModalFooter>
          </ModalContainer>
        </ModalBackdrop>
      </Modal>
    );
  };

  // Determine active form data
  const activeFormData =
    currentOperation === "edit"
      ? currentMedication
      : currentDraftIndex < drafts.length
        ? drafts[currentDraftIndex]
        : undefined;

  return (
    <Container isDark={isDark}>
      <StatusBar style="light" />
      <HeaderGradient
        colors={
          isDark
            ? ["#1e1b4b", "#312e81", "#020617"]
            : ["#4f46e5", "#3730a3", "#1e1b4b"]
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 10,
          paddingTop: headerPaddingTop,
          paddingBottom: headerPaddingBottom,
          borderBottomLeftRadius: headerRadius,
          borderBottomRightRadius: headerRadius,
        }}
      >
        <TopRow>
          <TouchableOpacity onPress={handleHeaderBack}>
            <Ionicons name="chevron-back" size={28} color="#fff" />
          </TouchableOpacity>
          <HeaderTitle>{headerTitle}</HeaderTitle>
          <View style={{ width: 28 }} />
        </TopRow>
        <SummaryRow
          style={{
            height: summaryHeight,
            marginTop: summaryMarginTop,
            opacity: summaryOpacity,
            transform: [{ translateY: summaryTranslateY }],
          }}
        >
          <SummaryTitle>{headerTitle}</SummaryTitle>
          <SummarySub>{headerSubtitle}</SummarySub>
        </SummaryRow>
      </HeaderGradient>

      {mode === "form" ? (
        <MedicationForm
          key={
            currentOperation === "edit"
              ? currentMedication?.id || "edit"
              : `draft_${currentDraftIndex}_${drafts[currentDraftIndex]?.client_med_id || "new"}`
          }
          initialData={activeFormData}
          onSubmit={handleSubmit}
          isLoading={currentOperation === "add" ? isLoading : isEditingLoading}
          onScroll={handleFormScroll}
          operation={currentOperation}
          drafts={drafts}
          currentIndex={currentDraftIndex}
          onAddAndContinue={handleAddAndContinue}
          onReview={handleReview}
          onNavigateDraft={handleNavigateDraft}
          onCancel={() => navigation.goBack()}
        />
      ) : (
        <MedicationBatchReview
          drafts={drafts}
          onEditDraft={handleEditDraftFromReview}
          onDeleteDraft={handleDeleteDraftFromReview}
          onAddNew={handleAddNewFromReview}
          onConfirmSave={handleConfirmBatchSave}
          onCancel={() => navigation.goBack()}
          isSaving={isBatchSaving}
          onScroll={handleFormScroll}
        />
      )}

      {renderDuplicateConflictModal()}
    </Container>
  );
};

export default MedicationOperation;

/** Styled Components for the Screen Wrapper */
const Container = styled.View<{ isDark: boolean }>`
  flex: 1;
  background-color: ${(props: any) => (props.isDark ? "#0f172a" : "#f8fafc")};
`;

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

const HeaderGradient = styled(AnimatedLinearGradient)`
  padding: 50px 20px 40px;
  border-bottom-left-radius: 30px;
  border-bottom-right-radius: 30px;
`;

const TopRow = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
`;

const HeaderTitle = styled.Text`
  color: white;
  font-size: 18px;
  font-weight: 700;
`;

const SummaryRow = styled(Animated.View)`
  margin-top: 25px;
  overflow: hidden;
`;

const SummaryTitle = styled.Text`
  color: white;
  font-size: 24px;
  font-weight: 800;
`;

const SummarySub = styled.Text`
  color: rgba(255, 255, 255, 0.8);
  font-size: 14px;
  margin-top: 4px;
`;

/* Styled Components for the Duplicate Conflict Modal */
const ModalBackdrop = styled.View`
  flex: 1;
  background-color: rgba(0, 0, 0, 0.6);
  justify-content: center;
  align-items: center;
  padding: 20px;
`;

const ModalContainer = styled.View<{ isDark: boolean }>`
  width: 100%;
  background-color: ${(props: any) => (props.isDark ? "#1e293b" : "#ffffff")};
  border-radius: 28px;
  padding: 24px;
  align-items: center;
  elevation: 10;
  shadow-opacity: 0.15;
  shadow-radius: 20px;
  shadow-color: #000;
`;

const ModalHeader = styled.View`
  align-items: center;
  margin-bottom: 16px;
  width: 100%;
`;

const WarningIconContainer = styled.View`
  width: 56px;
  height: 56px;
  border-radius: 28px;
  background-color: #ffedd5;
  justify-content: center;
  align-items: center;
  margin-bottom: 12px;
`;

const ModalTitle = styled.Text<{ isDark: boolean }>`
  font-size: 20px;
  font-weight: 800;
  color: ${(props: any) => (props.isDark ? "#f8fafc" : "#1e293b")};
  text-align: center;
`;

const ModalSubtitle = styled.Text<{ isDark: boolean }>`
  font-size: 13px;
  color: ${(props: any) => (props.isDark ? "#94a3b8" : "#64748b")};
  text-align: center;
  margin-top: 4px;
`;

const MedCard = styled.View`
  border-radius: 18px;
  padding: 14px;
  width: 100%;
  position: relative;
  overflow: hidden;
`;

const MedBadge = styled.View`
  position: absolute;
  top: 0;
  right: 0;
  padding-horizontal: 10px;
  padding-vertical: 4px;
  border-bottom-left-radius: 12px;
`;

const MedBadgeText = styled.Text`
  color: white;
  font-size: 10px;
  font-weight: 700;
`;

const MedName = styled.Text<{ isDark: boolean }>`
  font-size: 16px;
  font-weight: 700;
  color: ${(props: any) => (props.isDark ? "#f8fafc" : "#1e293b")};
  margin-bottom: 8px;
  margin-top: 6px;
`;

const MedDetailRow = styled.View`
  flex-direction: row;
  align-items: center;
  margin-bottom: 4px;
`;

const MedDetailText = styled.Text<{ isDark: boolean }>`
  font-size: 12px;
  color: ${(props: any) => (props.isDark ? "#cbd5e1" : "#475569")};
  margin-left: 6px;
`;

const ModalFooter = styled.View`
  width: 100%;
  margin-top: 16px;
`;

const ModalButton = styled.TouchableOpacity`
  padding: 14px;
  border-radius: 14px;
  align-items: center;
  justify-content: center;
  width: 100%;
`;

const ModalButtonText = styled.Text`
  color: white;
  font-size: 15px;
  font-weight: 700;
`;
