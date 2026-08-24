import React from "react";
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
  updateMedication,
} from "../../../../services/medicationservice";
import MedicationForm from "../../../../components/MedicationForm";
import { AddOrEditMedication } from "../../../../types";
import { queryClient } from "../../../../config/queryClient";
import { MedicationStackParamList } from "../../../../types/navigation";
import { createMedicationReminder } from "../../../../services/reminderService";

type AddMedicationScreenRouteProp = RouteProp<
  MedicationStackParamList,
  "MedicationOperation"
>;

const MedicationOperation = ({
  route,
}: {
  route: AddMedicationScreenRouteProp;
}) => {
  const navigation =
    useNavigation<NativeStackNavigationProp<MedicationStackParamList>>();
  const { theme, isDark } = useAppTheme();
  const { operation, medication } = route.params;

  const [currentOperation, setCurrentOperation] = React.useState(operation);
  const [currentMedication, setCurrentMedication] = React.useState(medication);
  const [duplicateConflict, setDuplicateConflict] = React.useState<any | null>(null);
  const [pendingFormData, setPendingFormData] = React.useState<AddOrEditMedication | null>(null);
  const [isReplacing, setIsReplacing] = React.useState(false);

  const medicationId = currentMedication?.id;
  const scrollY = React.useRef(new Animated.Value(0)).current;
  const headerTitle =
    currentOperation === "add" ? "Add Medication" : "Edit Medication";

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

  const { mutateAsync: addMedicationMutation, isPending: isLoading } =
    useMutation({
      mutationFn: addMedication,
    });

  const { mutateAsync: editMedicationMutation, isPending: isEditingLoading } =
    useMutation({
      mutationFn: updateMedication,
    });

  const invalidateMedicationQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["medications"] });
    queryClient.invalidateQueries({ queryKey: ["allMedications"] });
    queryClient.invalidateQueries({ queryKey: ["filteredMedications"] });
    queryClient.invalidateQueries({ queryKey: ["paginatedReminders"] });
    queryClient.invalidateQueries({ queryKey: ["allRemindersCounts"] });
    queryClient.invalidateQueries({ queryKey: ["todayReminders"] });
    queryClient.invalidateQueries({ queryKey: ["allReminders"] });
    queryClient.invalidateQueries({ queryKey: ["notificationCount"] });
    queryClient.invalidateQueries({ queryKey: ["paginatedNotifications"] });
  };

  const handleSubmit = async (formData: AddOrEditMedication) => {
    try {
      if (currentOperation === "add") {
        const responseData = await addMedicationMutation(formData);
        
        Toast.show({
          type: "success",
          text1: `Medication added successfully`,
        });

        if (responseData?.data?.id) {
          try {
            await createMedicationReminder({
              medicationId: responseData.data.id,
            });
          } catch (error) {
            console.log("Failed to create reminder:", error);
          }
        }
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

      invalidateMedicationQueries();
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
        const responseData = await addMedicationMutation(replacePayload);
        Toast.show({
          type: "success",
          text1: "Medication replaced successfully",
        });
        if (responseData?.data?.id) {
          try {
            await createMedicationReminder({
              medicationId: responseData.data.id,
            });
          } catch (e) {
            console.log("Failed to create reminder:", e);
          }
        }
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
      invalidateMedicationQueries();
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

  const handleEditPrevious = (existingMed: any) => {
    setDuplicateConflict(null);
    setPendingFormData(null);
    setCurrentOperation("edit");
    setCurrentMedication(existingMed);
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

    const hasReplace = actions.some((a: any) => a.action === "REPLACE");
    const hasEdit = actions.some((a: any) => a.action === "EDIT");
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
              <ModalTitle isDark={isDark}>Conflict Detected</ModalTitle>
              <ModalSubtitle isDark={isDark}>
                A similar medication already exists in your profile.
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
                    <MedBadgeText>Existing Medication</MedBadgeText>
                  </MedBadge>
                  <MedName isDark={isDark}>{existingMed.medicationName}</MedName>
                  <MedDetailRow>
                    <Ionicons name="layers-outline" size={14} color="#64748b" />
                    <MedDetailText isDark={isDark}>Type: {existingMed.medicationType}</MedDetailText>
                  </MedDetailRow>
                  {existingMed.prescribedBy ? (
                    <MedDetailRow>
                      <Ionicons name="person-outline" size={14} color="#64748b" />
                      <MedDetailText isDark={isDark}>Doctor: {existingMed.prescribedBy}</MedDetailText>
                    </MedDetailRow>
                  ) : null}
                  <MedDetailRow>
                    <Ionicons name="disc-outline" size={14} color="#64748b" />
                    <MedDetailText isDark={isDark}>
                      Dose: {existingMed.dosePerIntake} {existingMed.unit || "unit(s)"}
                    </MedDetailText>
                  </MedDetailRow>
                  <MedDetailRow>
                    <Ionicons name="alarm-outline" size={14} color="#64748b" />
                    <MedDetailText isDark={isDark}>Frequency: {existingMed.frequency || "Once Daily"}</MedDetailText>
                  </MedDetailRow>
                  <MedDetailRow>
                    <Ionicons name="restaurant-outline" size={14} color="#64748b" />
                    <MedDetailText isDark={isDark}>
                      Timing: {formatFoodFrequency(existingMed.foodFrequency)}
                    </MedDetailText>
                  </MedDetailRow>
                  <MedDetailRow>
                    <Ionicons name="time-outline" size={14} color="#64748b" />
                    <MedDetailText isDark={isDark}>
                      Schedule: {formatMedicationSchedule(existingMed.medicationSchedule)}
                    </MedDetailText>
                  </MedDetailRow>
                </MedCard>
              )}

              {/* Incoming Card */}
              {pendingFormData && (
                <MedCard style={{ backgroundColor: isDark ? "#064e3b20" : "#d1fae540", borderColor: "#10b981", borderWidth: 1.5, marginTop: 12 }}>
                  <MedBadge style={{ backgroundColor: "#10b981" }}>
                    <MedBadgeText>Incoming New Medication</MedBadgeText>
                  </MedBadge>
                  <MedName isDark={isDark}>{pendingFormData.medicationName}</MedName>
                  <MedDetailRow>
                    <Ionicons name="layers-outline" size={14} color="#64748b" />
                    <MedDetailText isDark={isDark}>Type: {pendingFormData.medicationType}</MedDetailText>
                  </MedDetailRow>
                  {pendingFormData.prescribedBy ? (
                    <MedDetailRow>
                      <Ionicons name="person-outline" size={14} color="#64748b" />
                      <MedDetailText isDark={isDark}>Doctor: {pendingFormData.prescribedBy}</MedDetailText>
                    </MedDetailRow>
                  ) : null}
                  <MedDetailRow>
                    <Ionicons name="disc-outline" size={14} color="#64748b" />
                    <MedDetailText isDark={isDark}>
                      Dose: {pendingFormData.dosePerIntake}
                    </MedDetailText>
                  </MedDetailRow>
                  <MedDetailRow>
                    <Ionicons name="alarm-outline" size={14} color="#64748b" />
                    <MedDetailText isDark={isDark}>Frequency: {pendingFormData.frequency || "Once Daily"}</MedDetailText>
                  </MedDetailRow>
                  <MedDetailRow>
                    <Ionicons name="restaurant-outline" size={14} color="#64748b" />
                    <MedDetailText isDark={isDark}>
                      Timing: {formatFoodFrequency(pendingFormData.foodFrequency)}
                    </MedDetailText>
                  </MedDetailRow>
                  <MedDetailRow>
                    <Ionicons name="time-outline" size={14} color="#64748b" />
                    <MedDetailText isDark={isDark}>
                      Schedule: {formatMedicationSchedule(pendingFormData.medicationSchedule)}
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
                  {hasReplace && existingMed?.id && (
                    <ModalButton
                      style={{ backgroundColor: "#ef4444" }}
                      onPress={() => handleReplace(existingMed.id)}
                    >
                      <ModalButtonText>Replace Existing Medication</ModalButtonText>
                    </ModalButton>
                  )}

                  {hasEdit && existingMed && (
                    <ModalButton
                      style={{ backgroundColor: "#3b82f6" }}
                      onPress={() => handleEditPrevious(existingMed)}
                    >
                      <ModalButtonText>Edit Existing Medication</ModalButtonText>
                    </ModalButton>
                  )}

                  {hasKeepExisting && (
                    <ModalButton
                      style={{ backgroundColor: "#64748b" }}
                      onPress={handleKeepExisting}
                    >
                      <ModalButtonText>Discard New & Keep Existing</ModalButtonText>
                    </ModalButton>
                  )}

                  <ModalButton
                    style={{ backgroundColor: "transparent", borderWidth: 1, borderColor: isDark ? "#334155" : "#cbd5e1" }}
                    onPress={handleCancelModal}
                  >
                    <ModalButtonText style={{ color: isDark ? "#cbd5e1" : "#475569" }}>
                      Cancel & Edit Form
                    </ModalButtonText>
                  </ModalButton>
                </View>
              )}
            </ModalFooter>
          </ModalContainer>
        </ModalBackdrop>
      </Modal>
    );
  };

  return (
    <Container>
      <StatusBar style="light" />
      <HeaderGradient
        colors={
          isDark
            ? ["#064e3b", "#0369a1", "#312e81"]
            : ["#0f766e", "#0ea5e9", "#4f46e5"]
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
          <TouchableOpacity onPress={() => navigation.goBack()}>
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
          <SummarySub>Maintain your medical schedule</SummarySub>
        </SummaryRow>
      </HeaderGradient>

      <MedicationForm
        key={currentMedication?.id || "new"}
        initialData={currentMedication}
        onSubmit={handleSubmit}
        isLoading={currentOperation === "add" ? isLoading : isEditingLoading}
        onScroll={handleFormScroll}
        operation={currentOperation}
      />

      {renderDuplicateConflictModal()}
    </Container>
  );
};

export default MedicationOperation;

/** Styled Components for the Screen Wrapper */
const Container = styled.View`
  flex: 1;
  background-color: #f8fafc;
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
  font-size: 9px;
  font-weight: 800;
  text-transform: uppercase;
`;

const MedName = styled.Text<{ isDark: boolean }>`
  font-size: 16px;
  font-weight: 700;
  color: ${(props: any) => (props.isDark ? "#cbd5e1" : "#1e293b")};
  margin-bottom: 8px;
  margin-right: 120px; /* Leave space for badge */
`;

const MedDetailRow = styled.View`
  flex-direction: row;
  align-items: center;
  margin-top: 4px;
  gap: 8px;
`;

const MedDetailText = styled.Text<{ isDark: boolean }>`
  font-size: 12px;
  color: ${(props: any) => (props.isDark ? "#94a3b8" : "#475569")};
`;

const ModalFooter = styled.View`
  margin-top: 20px;
  width: 100%;
  align-items: center;
`;

const ModalButton = styled.TouchableOpacity`
  width: 100%;
  padding-vertical: 14px;
  border-radius: 14px;
  align-items: center;
  justify-content: center;
`;

const ModalButtonText = styled.Text`
  color: white;
  font-size: 14px;
  font-weight: 700;
`;
