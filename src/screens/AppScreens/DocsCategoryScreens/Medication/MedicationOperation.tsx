import React from "react";
import { TouchableOpacity, View } from "react-native";
import styled from "styled-components/native";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { RouteProp, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Toast from "react-native-toast-message";
import { useMutation } from "@tanstack/react-query";

import { AppStackParamList } from "../../../../navigation/types";
import { useAppTheme } from "../../../../context/ThemeContext";
import { addMedication } from "../../../../services/medicationservice";
import MedicationForm from "../../../../components/MedicationForm";
import { AddOrEditMedication } from "../../../../types";

type AddMedicationScreenRouteProp = RouteProp<
  AppStackParamList,
  "MedicationOperation"
>;

const MedicationOperation = ({
  route,
}: {
  route: AddMedicationScreenRouteProp;
  }) => {
  const navigation =
    useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const { isDark } = useAppTheme();
  const { operation, medication } = route.params;
  console.log("medication", medication);

  const { mutateAsync: addMedicationMutation, isPending: isLoading } =
    useMutation({
      mutationFn: addMedication,
      onSuccess: () => {
        Toast.show({
          type: "success",
          text1: `Medication ${operation === "add" ? "added" : "updated"} successfully`,
        });
        navigation.goBack();
      },
      onError: (error: any) => {
        Toast.show({
          type: "error",
          text1: error.message || "Something went wrong",
        });
      },
    });

  const handleSubmit = async (formData: AddOrEditMedication) => {
    console.log(formData?.startDate);
    console.log("Time :- ", formData?.medicationTime)
    await addMedicationMutation(formData);
  };

  return (
    <Container>
      <StatusBar style="light" />
      <HeaderGradient
        colors={isDark ? ["#312E81", "#4F46E5"] : ["#6366f1", "#a855f7"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <TopRow>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={28} color="#fff" />
          </TouchableOpacity>
          <HeaderTitle>
            {operation === "add" ? "New Prescription" : "Edit Prescription"}
          </HeaderTitle>
          <View style={{ width: 28 }} />
        </TopRow>
        <SummaryRow>
          <SummaryTitle>
            {operation === "add" ? "Add" : "Edit"} Medication
          </SummaryTitle>
          <SummarySub>Maintain your medical schedule</SummarySub>
        </SummaryRow>
      </HeaderGradient>

      {/* REUSABLE FORM COMPONENT 
          Passing initialData (null for add, object for edit) 
      */}
      <MedicationForm
        initialData={medication}
        onSubmit={handleSubmit}
        isLoading={isLoading}
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

const HeaderGradient = styled(LinearGradient)`
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

const SummaryRow = styled.View`
  margin-top: 25px;
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
