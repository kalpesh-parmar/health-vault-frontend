import React, { useState, useEffect } from "react";
import {
  View,
  FlatList,
  ActivityIndicator,
  StatusBar,
  Platform,
} from "react-native";
import styled from "styled-components/native";
import { Ionicons } from "@expo/vector-icons";
import ScreenHeader from "../../../../components/shared/Header";

export interface Medication {
  id: string;
  name: string;
  time: string;
  mealContext: "Before Meal" | "After Meal";
  startDate: string;
  endDate: string;
}

const MOCK_MEDICATIONS: Medication[] = [
  {
    id: "1",
    name: "Amoxicillin",
    time: "09:00 AM",
    mealContext: "Before Meal",
    startDate: "12 Apr 2026",
    endDate: "19 Apr 2026",
  },
  {
    id: "2",
    name: "Metformin",
    time: "08:30 PM",
    mealContext: "After Meal",
    startDate: "01 Jan 2026",
    endDate: "Ongoing",
  },
];

const MedicationScreen = () => {
  const [loading, setLoading] = useState(true);
  const [meds, setMeds] = useState<Medication[]>([]);

  useEffect(() => {
    //API
    const timer = setTimeout(() => {
      setMeds(MOCK_MEDICATIONS);
      setLoading(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const renderMedicationCard = ({ item }: { item: Medication }) => (
    <Card>
      <CardHeader>
        <TitleSection>
          <IconWrapper>
            <Ionicons name="medkit-outline" size={20} color="#2563eb" />
          </IconWrapper>
          <MedName>{item.name}</MedName>
        </TitleSection>
        <IconButton activeOpacity={0.7}>
          <Ionicons name="create-outline" size={20} color="#64748b" />
        </IconButton>
      </CardHeader>

      <InfoGrid>
        <InfoItem>
          <Ionicons name="time-outline" size={16} color="#94a3b8" />
          <InfoText>{item.time}</InfoText>
          <Tag context={item.mealContext}>
            <TagText>{item.mealContext}</TagText>
          </Tag>
        </InfoItem>

        <InfoItem>
          <Ionicons name="calendar-outline" size={16} color="#94a3b8" />
          <DateText>
            {item.startDate} — {item.endDate}
          </DateText>
        </InfoItem>
      </InfoGrid>

      <DeleteButton activeOpacity={0.7}>
        <Ionicons name="trash-outline" size={18} color="#ef4444" />
        <DeleteText>Delete Medication</DeleteText>
      </DeleteButton>
    </Card>
  );

  return (
    <SafeContainer>
      <StatusBar barStyle="dark-content" />
      <ScreenHeader title="Medications" showBack={true} />
      <Header>
        <View>
          <HeaderTitle>Active Medications</HeaderTitle>
          <HeaderSubtitle>{meds.length} Active Prescriptions</HeaderSubtitle>
        </View>
        <AddButton activeOpacity={0.8}>
          <Ionicons name="add" size={28} color="#ffffff" />
        </AddButton>
      </Header>

      {loading ? (
        <LoadingContainer>
          <ActivityIndicator size="large" color="#2563eb" />
          <LoadingText>Syncing your schedule...</LoadingText>
        </LoadingContainer>
      ) : (
        <FlatList
          data={meds}
          keyExtractor={(item) => item.id}
          renderItem={renderMedicationCard}
          contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<EmptyText>No medications added yet.</EmptyText>}
        />
      )}
    </SafeContainer>
  );
};

export default MedicationScreen;

const SafeContainer = styled.SafeAreaView`
  flex: 1;
`;

const Header = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
`;

const HeaderTitle = styled.Text`
  font-size: 28px;
  font-weight: 800;
  color: #0f172a;
  letter-spacing: -0.5px;
`;

const HeaderSubtitle = styled.Text`
  font-size: 14px;
  color: #64748b;
  font-weight: 500;
`;

const AddButton = styled.TouchableOpacity`
  width: 52px;
  height: 52px;
  border-radius: 18px;
  background-color: #2563eb;
  justify-content: center;
  align-items: center;
  shadow-color: #2563eb;
  shadow-opacity: 0.35;
  shadow-radius: 10px;
  elevation: 6;
`;

const Card = styled.View`
  background-color: #ffffff;
  border-radius: 28px;
  padding: 20px;
  margin-bottom: 18px;
  border-width: 1px;
  border-color: #f1f5f9;
  ${Platform.select({
    ios: `
      shadow-color: #000;
      shadow-offset: 0px 4px;
      shadow-opacity: 0.05;
      shadow-radius: 12px;
    `,
    android: `elevation: 3;`,
  })}
`;

const CardHeader = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 18px;
`;

const TitleSection = styled.View`
  flex-direction: row;
  align-items: center;
`;

const IconWrapper = styled.View`
  width: 44px;
  height: 44px;
  border-radius: 14px;
  background-color: #f0f7ff;
  justify-content: center;
  align-items: center;
  margin-right: 14px;
`;

const MedName = styled.Text`
  font-size: 18px;
  font-weight: 700;
  color: #1e293b;
`;

const IconButton = styled.TouchableOpacity`
  padding: 10px;
  background-color: #f8fafc;
  border-radius: 12px;
`;

const InfoGrid = styled.View`
  border-top-width: 1px;
  border-top-color: #f8fafc;
  padding-top: 18px;
  gap: 14px;
`;

const InfoItem = styled.View`
  flex-direction: row;
  align-items: center;
`;

const InfoText = styled.Text`
  font-size: 15px;
  font-weight: 600;
  color: #334155;
  margin-left: 10px;
  margin-right: 12px;
`;

const DateText = styled.Text`
  font-size: 14px;
  color: #64748b;
  font-weight: 500;
  margin-left: 10px;
`;

const Tag = styled.View<{ context: string }>`
  background-color: ${(props: any) =>
    props.context === "Before Meal" ? "#fff7ed" : "#f0fdf4"};
  padding: 4px 12px;
  border-radius: 8px;
`;

const TagText = styled.Text`
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: ${(props: any) =>
    props.context === "Before Meal" ? "#9a3412" : "#166534"};
`;

const DeleteButton = styled.TouchableOpacity`
  flex-direction: row;
  align-items: center;
  justify-content: center;
  margin-top: 22px;
  padding-top: 18px;
  border-top-width: 1px;
  border-top-color: #f1f5f9;
`;

const DeleteText = styled.Text`
  font-size: 14px;
  font-weight: 700;
  color: #ef4444;
  margin-left: 8px;
`;

const LoadingContainer = styled.View`
  flex: 1;
  justify-content: center;
  align-items: center;
`;

const LoadingText = styled.Text`
  margin-top: 16px;
  color: #94a3b8;
  font-size: 15px;
  font-weight: 500;
`;

const EmptyText = styled.Text`
  text-align: center;
  color: #94a3b8;
  margin-top: 60px;
  font-size: 16px;
`;
