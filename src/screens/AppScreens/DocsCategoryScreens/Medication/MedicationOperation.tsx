import React from "react";
import { Animated, TouchableOpacity, View } from "react-native";
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
  const { isDark } = useAppTheme();
  const { operation, medication } = route.params;
  const medicationId = medication?.id;
  const scrollY = React.useRef(new Animated.Value(0)).current;
  const headerTitle =
    operation === "add" ? "Add Medication" : "Edit Medication";

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

  const handleSubmit = async (formData: AddOrEditMedication) => {
    try {
      if (operation === "add") {
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

      queryClient.invalidateQueries({ queryKey: ["medications"] });
      queryClient.invalidateQueries({ queryKey: ["allMedications"] });
      queryClient.invalidateQueries({ queryKey: ["filteredMedications"] });
      queryClient.invalidateQueries({ queryKey: ["paginatedReminders"] });
      queryClient.invalidateQueries({ queryKey: ["allRemindersCounts"] });
      queryClient.invalidateQueries({ queryKey: ["todayReminders"] });
      queryClient.invalidateQueries({ queryKey: ["allReminders"] });
      queryClient.invalidateQueries({ queryKey: ["notificationCount"] });
      queryClient.invalidateQueries({ queryKey: ["paginatedNotifications"] });
      navigation.goBack();
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: error.message || "Something went wrong",
      });
    }
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
        initialData={medication}
        onSubmit={handleSubmit}
        isLoading={operation === "add" ? isLoading : isEditingLoading}
        onScroll={handleFormScroll}
        operation={operation}
      />
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
