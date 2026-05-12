import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  FlatList,
  ActivityIndicator,
  Platform,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import styled from "styled-components/native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { AppStackParamList } from "../../../../navigation/types";
import { useAppTheme } from "../../../../context/ThemeContext";
import { useQuery } from "@tanstack/react-query";
import { getMedications } from "../../../../services/medicationservice";
import ConfirmationModal from "../../../../components/shared/ConfirmationModal";
import { AddOrEditMedication } from "../../../../types";

const MED_CATEGORIES = ["Tablet", "Capsule", "Syrup", "Drop", "Injection"];

const MOCK_MEDICATIONS: AddOrEditMedication[] = [
  {
    id: "mock-1",
    medicationName: "Paracetamol",
    medicationType: "Tablet",
    prescribedBy: "Dr.xyz",
    dosePerIntake: 1,
    frequency: "Once Daily",
    bestTaken: ["Morning"],
    medicationTime: "10:00 AM",
    withFood: "After Meal",
    startDate: "2022-01-01",
    ongoing: true,
    totalPills: 28,
    doseReminders: true,
    refillAlert: true,
    notes: "DAVA TIME EE PII LEVIII...",
  },
];

const MedicationScreen = () => {
  const [activeTab, setActiveTab] = useState("Tablet");
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const navigation =
    useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const { isDark } = useAppTheme();

  const { data: medicationList, isLoading } = useQuery({
    queryKey: ["medications", activeTab],
    queryFn: () => getMedications(activeTab),
  });

  const medicationData: AddOrEditMedication[] = (
    medicationList?.data ||
    MOCK_MEDICATIONS
  ).filter((item: AddOrEditMedication) => {
    return item.medicationType?.toUpperCase() === activeTab.toUpperCase();
  });
  console.log("medicationData", medicationData);

  const renderMedicationCard = ({ item }: { item: AddOrEditMedication }) => (
    <Card>
      <CardTopRow>
        <MedIconBox>
          <MaterialCommunityIcons
            name={
              item.medicationType?.toUpperCase() === "SYRUP"
                ? "cup-water"
                : "pill"
            }
            size={24}
            color="#6366f1"
          />
        </MedIconBox>
        <MedInfoMain>
          <MedName>{item.medicationName}</MedName>
          <MedTime>
            {item.medicationTime} •{" "}
            <MedTypeLabel>{item.medicationType}</MedTypeLabel>
          </MedTime>
        </MedInfoMain>
        <Tag context={item.withFood}>
          <TagText context={item.withFood}>{item.withFood}</TagText>
        </Tag>
      </CardTopRow>

      <Divider />

      <CardBottomRow>
        <DateWrapper>
          <Ionicons name="calendar-outline" size={14} color="#94a3b8" />
          <DateText>{item.startDate}</DateText>
        </DateWrapper>

        <ActionButtons>
          <IconButton
            onPress={() =>
              navigation.navigate("MedicationOperation", {
                operation: "edit",
                medication: item,
              } as never)
            }
          >
            <Ionicons name="create-outline" size={18} color="#64748b" />
          </IconButton>
          <IconButton
            style={{ marginLeft: 10 }}
            onPress={() => {
              setDocumentId(item.id || "");
              setShowDeleteModal(true);
            }}
          >
            <Ionicons name="trash-outline" size={18} color="#ef4444" />
          </IconButton>
        </ActionButtons>
      </CardBottomRow>
    </Card>
  );

  return (
    <Container>
      <StatusBar style="light" />

      <ConfirmationModal
        showModal={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        mode="Delete Medication"
        documentId={documentId}
      />

      <HeaderGradient
        colors={isDark ? ["#312E81", "#4F46E5"] : ["#6366f1", "#a855f7"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <TopRow>
          <BackButton onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={28} color="#fff" />
          </BackButton>
          <HeaderTitle>Medications</HeaderTitle>
          <AddButton
            onPress={() =>
              navigation.navigate("MedicationOperation", {
                operation: "add",
              })
            }
          >
            <Ionicons name="add" size={26} color="#fff" />
          </AddButton>
        </TopRow>
      </HeaderGradient>

      <FilterWrapper>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 15 }}
        >
          {MED_CATEGORIES.map((cat) => (
            <TabItem
              key={cat}
              active={activeTab === cat}
              onPress={() => setActiveTab(cat)}
            >
              <TabText active={activeTab === cat}>{cat}</TabText>
            </TabItem>
          ))}
        </ScrollView>
      </FilterWrapper>

      {isLoading ? (
        <LoadingContainer>
          <ActivityIndicator size="large" color="#6366f1" />
          <LoadingText>Fetching Medications...</LoadingText>
        </LoadingContainer>
      ) : (
        <ContentList
          data={medicationData}
          keyExtractor={(item: AddOrEditMedication) =>
            item.id || item.medicationName
          }
          renderItem={renderMedicationCard}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <EmptyText>
              No {activeTab.toLowerCase()} medications found.
            </EmptyText>
          }
          contentContainerStyle={{ paddingBottom: 40 }}
        />
      )}
    </Container>
  );
};

export default MedicationScreen;

/** * Styled Components */

const Container = styled.View`
  flex: 1;
  background-color: #f8fafc;
`;

const HeaderGradient = styled(LinearGradient)`
  padding: 50px 20px 30px;
  border-bottom-left-radius: 30px;
  border-bottom-right-radius: 30px;
`;

const TopRow = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
`;

const BackButton = styled.TouchableOpacity``;

const AddButton = styled.TouchableOpacity`
  background-color: rgba(255, 255, 255, 0.2);
  width: 40px;
  height: 40px;
  border-radius: 12px;
  justify-content: center;
  align-items: center;
`;

const HeaderTitle = styled.Text`
  color: white;
  font-size: 20px;
  font-weight: 700;
`;

const FilterWrapper = styled.View`
  background-color: transparent;
`;

const TabItem = styled.TouchableOpacity<{ active: boolean }>`
  padding-horizontal: 20px;
  padding-vertical: 8px;
  border-radius: 20px;
  background-color: ${({ active }: { active: boolean }) =>
    active ? "#6366f1" : "white"};
  margin-right: 10px;
  border-width: 1px;
  border-color: ${({ active }: { active: boolean }) =>
    active ? "#6366f1" : "#f1f5f9"};
  elevation: 3;
  shadow-color: #000;
  shadow-offset: 0px 2px;
  shadow-opacity: 0.1;
  shadow-radius: 3.84px;
`;

const TabText = styled.Text<{ active: boolean }>`
  font-size: 13px;
  font-weight: 600;
  color: ${({ active }: { active: boolean }) => (active ? "white" : "#64748b")};
`;

const ContentList = styled(FlatList as new () => FlatList<AddOrEditMedication>)`
  flex: 1;
  padding-horizontal: 16px;
`;

const Card = styled.View`
  background-color: white;
  border-radius: 20px;
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.05);
  elevation: 4;
`;

const CardTopRow = styled.View`
  flex-direction: row;
  align-items: center;
`;

const MedIconBox = styled.View`
  background-color: #f5f3ff;
  width: 50px;
  height: 50px;
  border-radius: 14px;
  justify-content: center;
  align-items: center;
`;

const MedInfoMain = styled.View`
  flex: 1;
  margin-left: 15px;
`;

const MedName = styled.Text`
  font-size: 17px;
  font-weight: 700;
  color: #1e293b;
`;

const MedTime = styled.Text`
  font-size: 13px;
  color: #64748b;
  font-weight: 500;
  margin-top: 2px;
`;

const MedTypeLabel = styled.Text`
  color: #6366f1;
  font-weight: 600;
`;

const Tag = styled.View<{ context: string }>`
  background-color: ${({ context }: { context: string }) =>
    context === "Before Meal" ? "#fff7ed" : "#f0fdf4"};
  padding: 4px 10px;
  border-radius: 8px;
`;

const TagText = styled.Text<{ context: string }>`
  font-size: 9px;
  font-weight: 800;
  color: ${({ context }: { context: string }) =>
    context === "Before Meal" ? "#9a3412" : "#166534"};
`;

const Divider = styled.View`
  height: 1px;
  background-color: #f1f5f9;
  margin-vertical: 14px;
`;

const CardBottomRow = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
`;

const DateWrapper = styled.View`
  flex-direction: row;
  align-items: center;
`;

const DateText = styled.Text`
  font-size: 12px;
  color: #94a3b8;
  margin-left: 6px;
  font-weight: 500;
`;

const ActionButtons = styled.View`
  flex-direction: row;
`;

const IconButton = styled.TouchableOpacity`
  background-color: #f8fafc;
  padding: 8px;
  border-radius: 10px;
`;

const LoadingContainer = styled.View`
  flex: 1;
  justify-content: center;
  align-items: center;
`;

const LoadingText = styled.Text`
  margin-top: 12px;
  color: #64748b;
  font-weight: 500;
`;

const EmptyText = styled.Text`
  text-align: center;
  color: #94a3b8;
  margin-top: 60px;
  font-size: 15px;
`;
