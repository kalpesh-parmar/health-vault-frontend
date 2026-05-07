import React, { useState } from "react";
import { ScrollView, Alert } from "react-native";
import styled from "styled-components/native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useMutation } from "@tanstack/react-query";
import Toast from "react-native-toast-message";
import { useFonts } from "expo-font";
import { Inter_400Regular, Inter_600SemiBold } from "@expo-google-fonts/inter";
import {
  Montserrat_600SemiBold,
  Montserrat_700Bold,
} from "@expo-google-fonts/montserrat";
import Loader from "../../../../components/shared/Loader";
import ScreenHeader from "../../../../components/shared/Header";
import { AppStackParamList } from "../../../../navigation/types";
type MedType = "Tablet" | "Capsule" | "Syrup" | "Drop" | "Injection";
type FoodTiming = "With food" | "Before food" | "After food" | "Empty stomach";
type FrequencyKey = "once" | "twice" | "thrice" | "as_needed";
type TimeOfDay = "Morning" | "Noon" | "Evening" | "Night";
type ColorTag =
  | "#2563eb"
  | "#10b981"
  | "#8b5cf6"
  | "#f59e0b"
  | "#ef4444"
  | "#ec4899";

interface MedicationFormData {
  name: string;
  type: MedType;
  prescribedBy: string;
  doseCount: number;
  frequency: FrequencyKey;
  timesOfDay: TimeOfDay[];
  foodTiming: FoodTiming;
  startDate: string;
  endDate: string;
  isOngoing: boolean;
  totalPills: string;
  remainingPills: string;
  reminderEnabled: boolean;
  refillAlertEnabled: boolean;
  notes: string;
}

const FREQUENCIES: { key: FrequencyKey; label: string; sub: string }[] = [
  { key: "once", label: "Once daily", sub: "Every 24 hrs" },
  { key: "twice", label: "Twice daily", sub: "Every 12 hrs" },
  { key: "thrice", label: "3× daily", sub: "Every 8 hrs" },
  { key: "as_needed", label: "As needed", sub: "No fixed time" },
];

const MED_TYPES: MedType[] = [
  "Tablet",
  "Capsule",
  "Syrup",
  "Drop",
  "Injection",
];
const FOOD_TIMINGS: FoodTiming[] = [
  "With food",
  "Before food",
  "After food",
  "Empty stomach",
];
const TIMES_OF_DAY: { key: TimeOfDay; emoji: string }[] = [
  { key: "Morning", emoji: "🌅" },
  { key: "Noon", emoji: "☀️" },
  { key: "Evening", emoji: "🌆" },
  { key: "Night", emoji: "🌙" },
];

import { useAppTheme } from "../../../../context/ThemeContext";

const AddMedicationScreen = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const { theme } = useAppTheme();

  const [form, setForm] = useState<MedicationFormData>({
    name: "",
    type: "Tablet",
    prescribedBy: "",
    doseCount: 1,
    frequency: "once",
    timesOfDay: [],
    foodTiming: "With food",
    startDate: new Date().toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
    endDate: "",
    isOngoing: false,
    totalPills: "",
    remainingPills: "",
    reminderEnabled: true,
    refillAlertEnabled: true,
    notes: "",
  });

  const fontsLoaded = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
  });

  // Replace with your actual API call
  const { mutateAsync: saveMedication, isPending } = useMutation({
    mutationFn: async (data: MedicationFormData) => {
      // TODO: replace with your real API service call
      // e.g. return await medicationService.add(data);
      return data;
    },
    onSuccess: () => {
      Toast.show({
        type: "success",
        text1: "Medication Added",
        text2: "Your medication has been saved successfully.",
      });
      navigation.goBack();
    },
    onError: (error: any) => {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: error?.message ?? "Something went wrong.",
      });
    },
  });

  if (!fontsLoaded) return <Loader visible={true} />;

  const set = <K extends keyof MedicationFormData>(
    key: K,
    value: MedicationFormData[K],
  ) => setForm((prev) => ({ ...prev, [key]: value }));

  const toggleTimeOfDay = (t: TimeOfDay) => {
    setForm((prev) => ({
      ...prev,
      timesOfDay: prev.timesOfDay.includes(t)
        ? prev.timesOfDay.filter((x) => x !== t)
        : [...prev.timesOfDay, t],
    }));
  };

  const refillPercent =
    form.totalPills && form.remainingPills
      ? Math.min(
          100,
          Math.round(
            (parseInt(form.remainingPills) / parseInt(form.totalPills)) * 100,
          ),
        )
      : 65;

  const handleSave = async () => {
    if (
      !form.name.trim() ||
      !form.type ||
      !form.prescribedBy ||
      !form.totalPills ||
      !form.remainingPills
    ) {
      Toast.show({
        type: "error",
        text1: "Missing field",
        text2: "Please Fill All The Fields",
      });
      return;
    }
    await saveMedication(form);
  };

  const handleDiscard = () => {
    Alert.alert("Discard changes?", "All entered data will be lost.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Discard",
        style: "destructive",
        onPress: () => navigation.goBack(),
      },
    ]);
  };

  return (
    <>
      <StatusBar style="dark" />
      <Container>
        <ScreenHeader title="Add Medication" showBack={true} />

        {isPending && <Loader visible={true} />}

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 16, paddingBottom: 110, gap: 14 }}
        >
          <SectionLabel>Medication Info</SectionLabel>

          <Card>
            <Field>
              <FieldLabel>
                <LabelDot color="#2563eb" />
                <LabelText>Medication Name</LabelText>
              </FieldLabel>
              <InputBox
                placeholder="e.g. Metformin 500mg"
                placeholderTextColor="#94a3b8"
                value={form.name}
                onChangeText={(v: string) => set("name", v)}
              />
            </Field>

            <Field>
              <FieldLabel>
                <LabelDot color="#8b5cf6" />
                <LabelText>Type</LabelText>
              </FieldLabel>
              <PillRow>
                {MED_TYPES.map((t) => (
                  <Pill
                    key={t}
                    selected={form.type === t}
                    selectedColor="#8b5cf6"
                    onPress={() => set("type", t)}
                  >
                    <PillText selected={form.type === t}>{t}</PillText>
                  </Pill>
                ))}
              </PillRow>
            </Field>

            <Field>
              <FieldLabel>
                <LabelDot color="#f59e0b" />
                <LabelText>Prescribed By</LabelText>
              </FieldLabel>
              <InputBox
                placeholder="Dr. Name (optional)"
                placeholderTextColor="#94a3b8"
                value={form.prescribedBy}
                onChangeText={(v: string) => set("prescribedBy", v)}
              />
            </Field>
          </Card>

          <SectionLabel>Dosage & Schedule</SectionLabel>

          <Card>
            <Field>
              <FieldLabel>
                <LabelDot color="#10b981" />
                <LabelText>Dose Per Intake</LabelText>
              </FieldLabel>
              <Stepper>
                <StepBtn
                  onPress={() =>
                    set("doseCount", Math.max(1, form.doseCount - 1))
                  }
                >
                  <StepBtnText>−</StepBtnText>
                </StepBtn>
                <StepValue>
                  <StepValueText>{form.doseCount}</StepValueText>
                  <StepUnit>
                    {form.type === "Syrup"
                      ? "ml"
                      : form.type === "Drop"
                        ? "drop(s)"
                        : form.type === "Injection"
                          ? "unit(s)"
                          : "tablet(s)"}
                  </StepUnit>
                </StepValue>
                <StepBtn onPress={() => set("doseCount", form.doseCount + 1)}>
                  <StepBtnText>+</StepBtnText>
                </StepBtn>
              </Stepper>
            </Field>

            <Field>
              <FieldLabel>
                <LabelDot color="#10b981" />
                <LabelText>Frequency</LabelText>
              </FieldLabel>
              <FreqGrid>
                {FREQUENCIES.map((f) => (
                  <FreqItem
                    key={f.key}
                    selected={form.frequency === f.key}
                    onPress={() => set("frequency", f.key)}
                  >
                    <FreqTitle selected={form.frequency === f.key}>
                      {f.label}
                    </FreqTitle>
                    <FreqSub selected={form.frequency === f.key}>
                      {f.sub}
                    </FreqSub>
                  </FreqItem>
                ))}
              </FreqGrid>
            </Field>

            <Field>
              <FieldLabel>
                <LabelDot color="#f59e0b" />
                <LabelText>Best Taken</LabelText>
              </FieldLabel>
              <TimeChipRow>
                {TIMES_OF_DAY.map(({ key, emoji }) => (
                  <TimeChip
                    key={key}
                    selected={form.timesOfDay.includes(key)}
                    onPress={() => toggleTimeOfDay(key)}
                  >
                    <TimeEmoji>{emoji}</TimeEmoji>
                    <TimeLabel selected={form.timesOfDay.includes(key)}>
                      {key}
                    </TimeLabel>
                  </TimeChip>
                ))}
              </TimeChipRow>
            </Field>

            <InfoTip>
              <Ionicons
                name="information-circle-outline"
                size={16}
                color={theme.colors.primary}
                style={{ marginTop: 1 }}
              />
              <InfoTipText>
                Take with food or right after meals for best absorption and to
                reduce stomach irritation.
              </InfoTipText>
            </InfoTip>

            <Field>
              <FieldLabel>
                <LabelDot color="#2563eb" />
                <LabelText>With Food?</LabelText>
              </FieldLabel>
              <PillRow>
                {FOOD_TIMINGS.map((f) => (
                  <Pill
                    key={f}
                    selected={form.foodTiming === f}
                    selectedColor="#2563eb"
                    onPress={() => set("foodTiming", f)}
                  >
                    <PillText selected={form.foodTiming === f}>{f}</PillText>
                  </Pill>
                ))}
              </PillRow>
            </Field>
          </Card>

          <SectionLabel>Duration</SectionLabel>

          <Card>
            <TwoCol>
              <Field style={{ flex: 1 }}>
                <FieldLabel>
                  <LabelDot color="#2563eb" />
                  <LabelText>Start Date</LabelText>
                </FieldLabel>
                <InputBox
                  placeholder="DD Mon YYYY"
                  placeholderTextColor="#94a3b8"
                  value={form.startDate}
                  onChangeText={(v: string) => set("startDate", v)}
                />
              </Field>
              <Field style={{ flex: 1 }}>
                <FieldLabel>
                  <LabelDot color="#ef4444" />
                  <LabelText>End Date</LabelText>
                </FieldLabel>
                <InputBox
                  placeholder="Set End Date"
                  placeholderTextColor="#94a3b8"
                  value={form.endDate}
                  onChangeText={(v: string) => set("endDate", v)}
                  editable={!form.isOngoing}
                  style={{ opacity: form.isOngoing ? 0.45 : 1 }}
                />
              </Field>
            </TwoCol>

            <ToggleRow>
              <ToggleLeft>
                <ToggleIconBox bg="#fef3c7">
                  <MaterialCommunityIcons
                    name="infinity"
                    size={16}
                    color="#d97706"
                  />
                </ToggleIconBox>
                <ToggleTextGroup>
                  <ToggleTitle>Ongoing / Chronic</ToggleTitle>
                  <ToggleSub>No fixed end date</ToggleSub>
                </ToggleTextGroup>
              </ToggleLeft>
              <Toggle
                active={form.isOngoing}
                onPress={() => set("isOngoing", !form.isOngoing)}
              >
                <ToggleThumb active={form.isOngoing} />
              </Toggle>
            </ToggleRow>
          </Card>

          <SectionLabel>Supply & Reminders</SectionLabel>

          <Card>
            <Field>
              <FieldLabelRow>
                <FieldLabel>
                  <LabelDot color="#10b981" />
                  <LabelText>Pills remaining</LabelText>
                </FieldLabel>
                {form.totalPills && form.remainingPills ? (
                  <HintText>
                    {form.remainingPills} / {form.totalPills}
                  </HintText>
                ) : null}
              </FieldLabelRow>
              <ProgressBarWrap>
                <ProgressFill percent={refillPercent} />
              </ProgressBarWrap>
              <TwoCol>
                <InputBox
                  placeholder="Total pills in pack"
                  placeholderTextColor="#94a3b8"
                  keyboardType="numeric"
                  value={form.totalPills}
                  onChangeText={(v: string) => set("totalPills", v)}
                  style={{ flex: 1 }}
                />
                <InputBox
                  placeholder="Remaining"
                  placeholderTextColor="#94a3b8"
                  keyboardType="numeric"
                  value={form.remainingPills}
                  onChangeText={(v: string) => set("remainingPills", v)}
                  style={{ flex: 1 }}
                />
              </TwoCol>
            </Field>

            <Divider />

            <ToggleRow>
              <ToggleLeft>
                <ToggleIconBox bg="#fef3c7">
                  <Ionicons
                    name="notifications-outline"
                    size={16}
                    color="#d97706"
                  />
                </ToggleIconBox>
                <ToggleTextGroup>
                  <ToggleTitle>Dose reminders</ToggleTitle>
                  <ToggleSub>Get notified at intake times</ToggleSub>
                </ToggleTextGroup>
              </ToggleLeft>
              <Toggle
                active={form.reminderEnabled}
                onPress={() => set("reminderEnabled", !form.reminderEnabled)}
              >
                <ToggleThumb active={form.reminderEnabled} />
              </Toggle>
            </ToggleRow>

            <ToggleRow>
              <ToggleLeft>
                <ToggleIconBox bg="#fce7f3">
                  <MaterialCommunityIcons
                    name="pill"
                    size={16}
                    color="#db2777"
                  />
                </ToggleIconBox>
                <ToggleTextGroup>
                  <ToggleTitle>Refill alert</ToggleTitle>
                  <ToggleSub>When &lt;7 pills remain</ToggleSub>
                </ToggleTextGroup>
              </ToggleLeft>
              <Toggle
                active={form.refillAlertEnabled}
                onPress={() =>
                  set("refillAlertEnabled", !form.refillAlertEnabled)
                }
              >
                <ToggleThumb active={form.refillAlertEnabled} />
              </Toggle>
            </ToggleRow>
          </Card>

          <SectionLabel>Notes</SectionLabel>

          <Card>
            <NotesInput
              placeholder="Add any special instructions, side effects to watch, or doctor's notes…"
              placeholderTextColor="#94a3b8"
              multiline
              numberOfLines={4}
              value={form.notes}
              onChangeText={(v: string) => set("notes", v)}
              textAlignVertical="top"
            />
          </Card>
        </ScrollView>

        <SaveBar>
          <DiscardBtn onPress={handleDiscard}>
            <DiscardText>Discard</DiscardText>
          </DiscardBtn>
          <SaveBtn onPress={handleSave} disabled={isPending}>
            <Ionicons name="checkmark-circle-outline" size={20} color="white" />
            <SaveText>Save Medication</SaveText>
          </SaveBtn>
        </SaveBar>
      </Container>
    </>
  );
};

export default AddMedicationScreen;

const Container = styled.SafeAreaView`
  flex: 1;
  background-color: ${({ theme }: any) => theme.colors.background};
`;

const SectionLabel = styled.Text`
  font-family: "Inter_600SemiBold";
  font-size: 11px;
  color: ${({ theme }: any) => theme.colors.textMuted};
  letter-spacing: 0.8px;
  text-transform: uppercase;
  padding-left: 4px;
  margin-bottom: -4px;
`;

const Card = styled.View`
  background-color: ${({ theme }: any) => theme.colors.surface};
  border-radius: 18px;
  border-width: 0.5px;
  border-color: ${({ theme }: any) => theme.colors.border};
  padding: 16px;
  gap: 14px;
`;

const Field = styled.View`
  gap: 6px;
`;

const FieldLabel = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 6px;
`;

const FieldLabelRow = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
`;

const LabelDot = styled.View<{ color: string }>`
  width: 6px;
  height: 6px;
  border-radius: 3px;
  background-color: ${({ color }: any) => color};
`;

const LabelText = styled.Text`
  font-family: "Inter_600SemiBold";
  font-size: 12px;
  color: ${({ theme }: any) => theme.colors.textPrimary};
`;

const HintText = styled.Text`
  font-family: "Inter_400Regular";
  font-size: 11px;
  color: ${({ theme }: any) => theme.colors.textMuted};
`;

const InputBox = styled.TextInput`
  background-color: ${({ theme }: any) => theme.colors.surfaceLight};
  border-width: 1px;
  border-color: ${({ theme }: any) => theme.colors.border};
  border-radius: 12px;
  padding: 10px 13px;
  font-family: "Inter_400Regular";
  font-size: 14px;
  color: ${({ theme }: any) => theme.colors.textPrimary};
`;

const PillRow = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  gap: 7px;
`;

const Pill = styled.TouchableOpacity<{
  selected: boolean;
  selectedColor: string;
}>`
  background-color: ${({ selected, selectedColor, theme }: any) =>
    selected ? selectedColor : theme.colors.surfaceLight};
  border-width: 1px;
  border-color: ${({ selected, selectedColor, theme }: any) =>
    selected ? selectedColor : theme.colors.border};
  border-radius: 50px;
  padding: 6px 14px;
`;

const PillText = styled.Text<{ selected: boolean }>`
  font-family: "Inter_600SemiBold";
  font-size: 12px;
  color: ${({ selected, theme }: any) => (selected ? "#ffffff" : theme.colors.textPrimary)};
`;

const Stepper = styled.View`
  flex-direction: row;
  align-items: center;
  background-color: ${({ theme }: any) => theme.colors.surfaceLight};
  border-width: 1px;
  border-color: ${({ theme }: any) => theme.colors.border};
  border-radius: 12px;
  padding: 8px 13px;
  gap: 12px;
`;

const StepBtn = styled.TouchableOpacity`
  width: 32px;
  height: 32px;
  background-color: ${({ theme }: any) => theme.colors.border};
  border-radius: 9px;
  justify-content: center;
  align-items: center;
`;

const StepBtnText = styled.Text`
  font-size: 20px;
  font-weight: 600;
  color: ${({ theme }: any) => theme.colors.textPrimary};
  line-height: 24px;
`;

const StepValue = styled.View`
  flex: 1;
  flex-direction: row;
  align-items: baseline;
  justify-content: center;
  gap: 4px;
`;

const StepValueText = styled.Text`
  font-family: "Montserrat_700Bold";
  font-size: 20px;
  color: ${({ theme }: any) => theme.colors.textPrimary};
`;

const StepUnit = styled.Text`
  font-family: "Inter_400Regular";
  font-size: 11px;
  color: ${({ theme }: any) => theme.colors.textMuted};
`;

const FreqGrid = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  gap: 8px;
`;

const FreqItem = styled.TouchableOpacity<{ selected: boolean }>`
  flex-basis: 48%;
  background-color: ${({ selected, theme }: any) =>
    selected ? (theme.colors.primary + '1A') : theme.colors.surfaceLight};
  border-width: 1px;
  border-color: ${({ selected, theme }: any) => (selected ? theme.colors.primary : theme.colors.border)};
  border-radius: 12px;
  padding: 10px 12px;
`;

const FreqTitle = styled.Text<{ selected: boolean }>`
  font-family: "Montserrat_600SemiBold";
  font-size: 13px;
  color: ${({ selected, theme }: any) => (selected ? theme.colors.primary : theme.colors.textPrimary)};
`;

const FreqSub = styled.Text<{ selected: boolean }>`
  font-family: "Inter_400Regular";
  font-size: 10px;
  color: ${({ selected, theme }: any) => (selected ? theme.colors.primary : theme.colors.textMuted)};
  margin-top: 2px;
`;

const TimeChipRow = styled.View`
  flex-direction: row;
  gap: 7px;
`;

const TimeChip = styled.TouchableOpacity<{ selected: boolean }>`
  flex: 1;
  background-color: ${({ selected, theme }: any) =>
    selected ? (theme.colors.primary + '1A') : theme.colors.surfaceLight};
  border-width: 1px;
  border-color: ${({ selected, theme }: any) => (selected ? theme.colors.primary : theme.colors.border)};
  border-radius: 11px;
  padding: 9px 4px;
  align-items: center;
  gap: 3px;
`;

const TimeEmoji = styled.Text`
  font-size: 16px;
`;

const TimeLabel = styled.Text<{ selected: boolean }>`
  font-family: "Inter_600SemiBold";
  font-size: 10px;
  color: ${({ selected, theme }: any) => (selected ? theme.colors.primary : theme.colors.textMuted)};
`;

const InfoTip = styled.View`
  background-color: ${({ theme }: any) => theme.colors.primary + '1A'};
  border-width: 1px;
  border-color: ${({ theme }: any) => theme.colors.primary + '4D'};
  border-radius: 10px;
  padding: 10px 12px;
  flex-direction: row;
  align-items: flex-start;
  gap: 8px;
`;

const InfoTipText = styled.Text`
  font-family: "Inter_400Regular";
  font-size: 11px;
  color: ${({ theme }: any) => theme.colors.primary};
  line-height: 17px;
  flex: 1;
`;

const TwoCol = styled.View`
  flex-direction: row;
  gap: 10px;
`;

const ProgressBarWrap = styled.View`
  background-color: ${({ theme }: any) => theme.colors.surfaceLight};
  border-radius: 50px;
  height: 6px;
`;

const ProgressFill = styled.View<{ percent: number }>`
  height: 6px;
  border-radius: 50px;
  background-color: ${({ theme }: any) => theme.colors.primary};
  width: ${({ percent }: any) => `${percent}%`};
`;

const Divider = styled.View`
  height: 0.5px;
  background-color: ${({ theme }: any) => theme.colors.border};
`;

const ToggleRow = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
`;

const ToggleLeft = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 10px;
`;

const ToggleIconBox = styled.View<{ bg: string }>`
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background-color: ${({ bg }: any) => bg};
  justify-content: center;
  align-items: center;
`;

const ToggleTextGroup = styled.View`
  gap: 2px;
`;

const ToggleTitle = styled.Text`
  font-family: "Montserrat_600SemiBold";
  font-size: 13px;
  color: ${({ theme }: any) => theme.colors.textPrimary};
`;

const ToggleSub = styled.Text`
  font-family: "Inter_400Regular";
  font-size: 11px;
  color: ${({ theme }: any) => theme.colors.textMuted};
`;

const Toggle = styled.TouchableOpacity<{ active: boolean }>`
  width: 44px;
  height: 26px;
  border-radius: 13px;
  background-color: ${({ active, theme }: any) => (active ? theme.colors.primary : theme.colors.surfaceLight)};
  justify-content: center;
  padding-horizontal: 3px;
`;

const ToggleThumb = styled.View<{ active: boolean }>`
  width: 20px;
  height: 20px;
  border-radius: 10px;
  background-color: #ffffff;
  shadow-color: #000;
  shadow-opacity: 0.15;
  elevation: 2;
  align-self: ${({ active }: any) => (active ? "flex-end" : "flex-start")};
`;

const NotesInput = styled.TextInput`
  background-color: ${({ theme }: any) => theme.colors.surfaceLight};
  border-radius: 12px;
  padding: 12px 13px;
  font-family: "Inter_400Regular";
  font-size: 13px;
  color: ${({ theme }: any) => theme.colors.textPrimary};
  min-height: 80px;
`;

const SaveBar = styled.View`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: ${({ theme }: any) => theme.colors.surface};
  border-top-width: 0.5px;
  border-top-color: ${({ theme }: any) => theme.colors.border};
  padding: 14px 16px 32px;
  flex-direction: row;
  gap: 10px;
`;

const DiscardBtn = styled.TouchableOpacity`
  background-color: ${({ theme }: any) => theme.colors.surfaceLight};
  border-width: 1px;
  border-color: ${({ theme }: any) => theme.colors.border};
  border-radius: 14px;
  padding: 14px 18px;
  justify-content: center;
  align-items: center;
`;

const DiscardText = styled.Text`
  font-family: "Inter_600SemiBold";
  font-size: 14px;
  color: ${({ theme }: any) => theme.colors.textPrimary};
`;

const SaveBtn = styled.TouchableOpacity`
  flex: 1;
  background-color: ${({ theme }: any) => theme.colors.primary};
  border-radius: 14px;
  padding: 14px;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  gap: 8px;
  shadow-color: ${({ theme }: any) => theme.colors.primary};
  shadow-opacity: 0.35;
  shadow-radius: 12px;
  elevation: 8;
`;

const SaveText = styled.Text`
  font-family: "Montserrat_700Bold";
  font-size: 15px;
  color: #ffffff;
  letter-spacing: -0.2px;
`;
