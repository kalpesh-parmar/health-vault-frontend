import React, { useState, useEffect } from "react";
import {
  Switch,
  View,
  Platform,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { format, addDays } from "date-fns";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import styled from "styled-components/native";

type MedType = {
  key: "Tablet" | "Capsule" | "Syrup" | "Drop" | "Injection";
  value: "TABLET" | "CAPSULE" | "SYRUP" | "DROP" | "INJECTION";
};
type FoodTiming = {
  key: "With Food" | "Before Food" | "After Food" | "Empty Stomach";
  value: "WITH_FOOD" | "BEFORE_FOOD" | "AFTER_FOOD" | "EMPTY_STOMACH";
};
type Frequency = {
  key: "Once Daily" | "Twice Daily" | "3x Daily";
  value: "Once_Daily" | "Twice_Daily" | "3x_Daily";
};
type TimeOfDay = {
  key: "Morning" | "Noon" | "Evening" | "Night";
  value: "MORNING" | "NOON" | "EVENING" | "NIGHT";
};

const MED_TYPES: MedType[] = [
  { key: "Tablet", value: "TABLET" },
  { key: "Capsule", value: "CAPSULE" },
  { key: "Syrup", value: "SYRUP" },
  { key: "Drop", value: "DROP" },
  { key: "Injection", value: "INJECTION" },
];
const FREQUENCIES: Frequency[] = [
  { key: "Once Daily", value: "Once_Daily" },
  { key: "Twice Daily", value: "Twice_Daily" },
  { key: "3x Daily", value: "3x_Daily" },
];
const FOOD_TIMINGS: FoodTiming[] = [
  { key: "With Food", value: "WITH_FOOD" },
  { key: "Before Food", value: "BEFORE_FOOD" },
  { key: "After Food", value: "AFTER_FOOD" },
  { key: "Empty Stomach", value: "EMPTY_STOMACH" },
];
const TIMES_OF_DAY: TimeOfDay[] = [
  { key: "Morning", value: "MORNING" },
  { key: "Noon", value: "NOON" },
  { key: "Evening", value: "EVENING" },
  { key: "Night", value: "NIGHT" },
];

interface MedicationFormProps {
  initialData?: any;
  onSubmit: (data: any) => void;
  isLoading: boolean;
}

const MedicationForm = ({
  initialData,
  onSubmit,
  isLoading,
}: MedicationFormProps) => {
  const isValidDate = (d: any) => d instanceof Date && !isNaN(d.getTime());
  const [name, setName] = useState(
    initialData?.medicationName || initialData?.name || "",
  );
  const [type, setType] = useState<MedType>(() => {
    const found = MED_TYPES.find(
      (t) => t.value === (initialData?.medicationType || initialData?.type),
    );
    return found || MED_TYPES[0];
  });
  const [doctor, setDoctor] = useState(initialData?.prescribedBy || "");
  const [doseValue, setDoseValue] = useState<string>(
    initialData?.dosePerIntake?.toString() || "",
  );
  const [displayDose, setDisplayDose] = useState("");
  const [frequency, setFrequency] = useState<Frequency>(() => {
    const found = FREQUENCIES.find((f) => f.value === initialData?.frequency);
    return found || FREQUENCIES[0];
  });
  const [timesOfDay, setTimesOfDay] = useState<TimeOfDay[]>(() => {
    const rawBestTaken = initialData?.bestTaken || [];
    return TIMES_OF_DAY.filter((t) => rawBestTaken.includes(t.key));
  });
  const [foodTiming, setFoodTiming] = useState<FoodTiming>(() => {
    const rawMeal =
      initialData?.withFood || initialData?.mealContext || "WITH_FOOD";
    const found = FOOD_TIMINGS.find((f) => f.value === rawMeal);
    return found || FOOD_TIMINGS[0];
  });

  const parseInitialDate = (dateStr: any) => {
    if (!dateStr || dateStr === "Ongoing" || dateStr === "Auto") return null;
    const d = new Date(dateStr);
    return isValidDate(d) ? d : null;
  };

  const [startDate, setStartDate] = useState<Date>(
    parseInitialDate(initialData?.startDate) || new Date(),
  );
  const [endDate, setEndDate] = useState<Date | null>(
    parseInitialDate(initialData?.endDate),
  );

  const parseTime = (timeStr: string) => {
    if (!timeStr) return new Date();

    const [time, modifier] = timeStr.split(" ");
    let [hours, minutes] = time.split(":").map(Number);

    if (modifier === "PM" && hours < 12) hours += 12;
    if (modifier === "AM" && hours === 12) hours = 0;

    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  };

  const [preferredTime, setPreferredTime] = useState<Date>(
    parseTime(initialData?.medicationTime),
  );

  const [isOngoing, setIsOngoing] = useState(
    initialData
      ? initialData.ongoing !== undefined
        ? initialData.ongoing
        : initialData.endDate === "Ongoing"
      : true,
  );
  const [pillsRemaining, setPillsRemaining] = useState(
    initialData?.pillsRemaining?.toString() || "",
  );
  const [totalPills, setTotalPills] = useState(
    initialData?.totalPills?.toString() || "",
  );
  const [reminders, setReminders] = useState(
    initialData ? (initialData.doseReminders ?? true) : true,
  );
  const [refillAlert, setRefillAlert] = useState(
    initialData ? (initialData.refillAlert ?? true) : true,
  );
  const [notes, setNotes] = useState(initialData?.notes || "");

  const [picker, setPicker] = useState<{
    visible: boolean;
    type: "start" | "end" | "time";
  }>({ visible: false, type: "start" });

  const getUnitString = (val: string | number, medType: MedType) => {
    if (!val || isNaN(Number(val))) return "";
    const units: Record<MedType["key"], string> = {
      Tablet: "Tablets",
      Capsule: "Capsules",
      Syrup: "ml",
      Drop: "Drops",
      Injection: "Units",
    };
    return `${val} ${units[medType.key]}`;
  };

  useEffect(() => {
    setDisplayDose(getUnitString(doseValue, type));
  }, [type, doseValue]);

  useEffect(() => {
    const dose = Number(doseValue);
    const remaining = Number(pillsRemaining);
    if (
      !isNaN(dose) &&
      !isNaN(remaining) &&
      dose > 0 &&
      remaining > 0 &&
      isValidDate(startDate)
    ) {
      const dailyFreq =
        frequency.key === "Once Daily"
          ? 1
          : frequency.key === "Twice Daily"
            ? 2
            : 3;
      const totalDays = Math.ceil(remaining / (dose * dailyFreq));
      setEndDate(addDays(startDate, totalDays));
    }
  }, [pillsRemaining, doseValue, frequency, startDate]);

  const handleSubmit = () => {
    onSubmit({
      medicationName: name,
      medicationType: type.value,
      prescribedBy: doctor,
      dosePerIntake: Number(doseValue) || 0,
      frequency: frequency.value,
      bestTaken: timesOfDay.map((t) => t.value),
      withFood: foodTiming.value,
      startDate: format(startDate, "yyyy-MM-dd"),
      ongoing: isOngoing,
      medicationTime: format(preferredTime, "HH:mm"),
      totalPills: Number(totalPills),
      doseReminders: reminders,
      refillAlert,
      notes,
    });
  };

  return (
    <ScrollContent showsVerticalScrollIndicator={false}>
      <Card style={{ marginTop: 0 }}>
        <SectionHeaderRow>
          <MaterialCommunityIcons
            name="information-outline"
            size={20}
            color="#6366f1"
          />
          <SectionTitle>Basic Information</SectionTitle>
        </SectionHeaderRow>
        <InputLabel>Medication Name</InputLabel>
        <StyledInput
          placeholder="Enter Name"
          value={name}
          onChangeText={setName}
        />
        <InputLabel style={{ marginTop: 15 }}>Medication Type</InputLabel>
        <PillContainer>
          {MED_TYPES.map((t: MedType) => (
            <TypePill
              key={t.key}
              active={type.value === t.value}
              onPress={() => setType(t)}
            >
              <TypePillText active={type.value === t.value}>
                {t.key}
              </TypePillText>
            </TypePill>
          ))}
        </PillContainer>
        <InputLabel style={{ marginTop: 15 }}>Prescribed By</InputLabel>
        <StyledInput
          placeholder="Doctor Name"
          value={doctor}
          onChangeText={setDoctor}
        />
      </Card>

      {/* DOSAGE & TIMING */}
      <Card>
        <SectionHeaderRow>
          <MaterialCommunityIcons name="pill" size={20} color="#6366f1" />
          <SectionTitle>Dosage & Timing</SectionTitle>
        </SectionHeaderRow>
        <Row>
          <View style={{ flex: 1 }}>
            <InputLabel>Dose Per Intake</InputLabel>
            <StyledInput
              placeholder="0"
              keyboardType="numeric"
              value={doseValue}
              onChangeText={setDoseValue}
            />
          </View>
          <SpacerHorizontal width={12} />
          <View style={{ flex: 1 }}>
            <InputLabel>Dose with Unit</InputLabel>
            <StyledInput
              editable={false}
              value={displayDose}
              placeholder="--"
              style={{ backgroundColor: "#f8fafc" }}
            />
          </View>
        </Row>
        <InputLabel style={{ marginTop: 15 }}>Frequency</InputLabel>
        <PillContainer>
          {FREQUENCIES.map((f) => (
            <TypePill
              key={f.key}
              active={frequency.key === f.key}
              onPress={() => setFrequency(f)}
            >
              <TypePillText active={frequency.key === f.key}>
                {f.key}
              </TypePillText>
            </TypePill>
          ))}
        </PillContainer>
        <InputLabel style={{ marginTop: 15 }}>Best Taken</InputLabel>
        <TimeGrid>
          {TIMES_OF_DAY.map((item) => (
            <TimeBox
              key={item.key}
              active={timesOfDay.some((t) => t.key === item.key)}
              onPress={() =>
                setTimesOfDay((prev) =>
                  prev.some((t) => t.key === item.key)
                    ? prev.filter((t) => t.key !== item.key)
                    : [...prev, item],
                )
              }
            >
              <TimeText active={timesOfDay.some((t) => t.key === item.key)}>
                {item.key}
              </TimeText>
            </TimeBox>
          ))}
        </TimeGrid>

        <InputLabel style={{ marginTop: 15 }}>Food Context</InputLabel>
        <PillContainer>
          {FOOD_TIMINGS.map((f) => (
            <TypePill
              key={f.key}
              active={foodTiming.value === f.value}
              onPress={() => setFoodTiming(f)}
            >
              <TypePillText active={foodTiming.value === f.value}>
                {f.key}
              </TypePillText>
            </TypePill>
          ))}
        </PillContainer>
        <InputLabel style={{ marginTop: 15 }}>Preferred Intake Time</InputLabel>
        <DateBtn onPress={() => setPicker({ visible: true, type: "time" })}>
          <Ionicons name="time-outline" size={18} color="#6366f1" />
          <DateBtnText>
            {isValidDate(preferredTime)
              ? format(preferredTime, "hh:mm aa")
              : "Select Time"}
          </DateBtnText>
        </DateBtn>
      </Card>

      {/* SCHEDULE & SUPPLY */}
      <Card>
        <SectionHeaderRow>
          <MaterialCommunityIcons
            name="calendar-clock"
            size={20}
            color="#6366f1"
          />
          <SectionTitle>Schedule & Supply</SectionTitle>
        </SectionHeaderRow>
        <Row>
          <View style={{ flex: 1 }}>
            <InputLabel>Total Pills</InputLabel>
            <StyledInput
              placeholder="e.g. 30"
              keyboardType="numeric"
              value={totalPills}
              onChangeText={setTotalPills}
            />
          </View>
          <SpacerHorizontal width={12} />
          <View style={{ flex: 1 }}>
            <InputLabel>Pills Remaining</InputLabel>
            <StyledInput
              placeholder="e.g. 15"
              keyboardType="numeric"
              value={pillsRemaining}
              onChangeText={setPillsRemaining}
            />
          </View>
        </Row>
        <Row style={{ marginTop: 15 }}>
          <View style={{ flex: 1 }}>
            <InputLabel>Start Date</InputLabel>
            <DateBtn
              onPress={() => setPicker({ visible: true, type: "start" })}
            >
              <Ionicons name="calendar-outline" size={18} color="#6366f1" />
              <DateBtnText>
                {isValidDate(startDate)
                  ? format(startDate, "dd MMM yyyy")
                  : "Select Date"}
              </DateBtnText>
            </DateBtn>
          </View>
          <SpacerHorizontal width={12} />
          <View style={{ flex: 1 }}>
            <InputLabel>End Date</InputLabel>
            <DateBtn
              disabled={isOngoing}
              style={{ opacity: isOngoing ? 0.4 : 1 }}
            >
              <Ionicons name="flag-outline" size={18} color="#ef4444" />
              <DateBtnText>
                {isValidDate(endDate)
                  ? format(String(endDate), "dd MMM")
                  : "Auto"}
              </DateBtnText>
            </DateBtn>
          </View>
        </Row>
        <ToggleRow>
          <ToggleLeftSection>
            <ToggleIconBox>
              <MaterialCommunityIcons
                name="infinity"
                size={22}
                color="#6366f1"
              />
            </ToggleIconBox>
            <View>
              <ToggleTitle>Ongoing Medication</ToggleTitle>
              <ToggleSub>No fixed end date</ToggleSub>
            </View>
          </ToggleLeftSection>
          <Switch
            value={isOngoing}
            onValueChange={setIsOngoing}
            trackColor={{ false: "#cbd5e1", true: "#6366f1" }}
            thumbColor={Platform.OS === "ios" ? undefined : "#2b2dabff"}
          />
        </ToggleRow>
      </Card>

      {/* ALERTS */}
      <Card>
        <SectionHeaderRow>
          <MaterialCommunityIcons
            name="bell-outline"
            size={20}
            color="#6366f1"
          />
          <SectionTitle>Alerts & Extra Info</SectionTitle>
        </SectionHeaderRow>
        <ToggleRow style={{ borderTopWidth: 0, marginTop: 0 }}>
          <View style={{ flex: 1 }}>
            <ToggleTitle>Dose Reminders</ToggleTitle>
            <ToggleSub>Notify at preferred time</ToggleSub>
          </View>
          <Switch
            value={reminders}
            onValueChange={setReminders}
            trackColor={{ false: "#cbd5e1", true: "#6366f1" }}
            thumbColor={Platform.OS === "ios" ? undefined : "#2b2dabff"}
          />
        </ToggleRow>
        <ToggleRow>
          <View style={{ flex: 1 }}>
            <ToggleTitle>Refill Alert</ToggleTitle>
            <ToggleSub>Notify when stock is low</ToggleSub>
          </View>
          <Switch
            value={refillAlert}
            onValueChange={setRefillAlert}
            trackColor={{ false: "#cbd5e1", true: "#6366f1" }}
            thumbColor={Platform.OS === "ios" ? undefined : "#2b2dabff"}
          />
        </ToggleRow>
        <InputLabel style={{ marginTop: 20 }}>Notes</InputLabel>
        <StyledInput
          placeholder="Special instruction.."
          multiline
          value={notes}
          onChangeText={setNotes}
          style={{ height: 80, textAlignVertical: "top" }}
        />
      </Card>

      <Footer>
        <SaveButton onPress={handleSubmit} disabled={isLoading}>
          <SaveButtonText>
            {isLoading ? "Saving..." : "Save Medication"}
          </SaveButtonText>
        </SaveButton>
      </Footer>

      <DateTimePickerModal
        isVisible={picker.visible}
        mode={picker.type === "time" ? "time" : "date"}
        date={
          picker.type === "start"
            ? startDate
            : picker.type === "end"
              ? endDate || new Date()
              : preferredTime
        }
        onConfirm={(date) => {
          if (picker.type === "start") setStartDate(date);
          else if (picker.type === "end") setEndDate(date);
          else setPreferredTime(date);
          setPicker({ ...picker, visible: false });
        }}
        onCancel={() => setPicker({ ...picker, visible: false })}
      />
    </ScrollContent>
  );
};

export default MedicationForm;

const ScrollContent = styled.ScrollView`
  flex: 1;
  padding-horizontal: 20px;
  padding-top: 20px;
`;

export const Card = styled.View`
  background-color: white;
  border-radius: 24px;
  padding: 22px;
  margin-bottom: 20px;
  elevation: 5;
  shadow-opacity: 0.05;
  shadow-radius: 15px;
  shadow-color: #000;
`;

export const SectionHeaderRow = styled.View`
  flex-direction: row;
  align-items: center;
  margin-bottom: 18px;
  gap: 8px;
`;

export const SectionTitle = styled.Text`
  font-size: 16px;
  font-weight: 800;
  color: #1e293b;
`;

export const InputLabel = styled.Text`
  font-size: 11px;
  font-weight: 800;
  color: #94a3b8;
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

export const StyledInput = styled.TextInput`
  background-color: #f1f5f9;
  border-radius: 14px;
  padding: 14px 16px;
  font-size: 14px;
  color: #1e293b;
`;

export const PillContainer = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  gap: 8px;
`;

export const TypePill = styled.TouchableOpacity<{ active: boolean }>`
  padding: 10px 16px;
  border-radius: 12px;
  background-color: ${({ active }: { active: boolean }) =>
    active ? "#6366f1" : "#f1f5f9"};
`;

export const TypePillText = styled.Text<{ active: boolean }>`
  font-size: 12px;
  font-weight: 700;
  color: ${({ active }: { active: boolean }) => (active ? "white" : "#64748b")};
`;

export const Row = styled.View`
  flex-direction: row;
  align-items: center;
`;

export const SpacerHorizontal = styled.View<{ width: number }>`
  width: ${({ width }: { width: number }) => width}px;
`;

export const TimeGrid = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  gap: 8px;
`;

export const TimeBox = styled.TouchableOpacity<{ active: boolean }>`
  flex: 1;
  min-width: 45%;
  flex-direction: row;
  align-items: center;
  padding: 12px;
  border-radius: 12px;
  background-color: ${({ active }: { active: boolean }) =>
    active ? "#eef2ff" : "#f8fafc"};
  border-width: 1.5px;
  border-color: ${({ active }: { active: boolean }) =>
    active ? "#6366f1" : "#f1f5f9"};
`;

export const TimeText = styled.Text<{ active: boolean }>`
  margin-left: 8px;
  font-size: 13px;
  font-weight: 700;
  color: ${({ active }: { active: boolean }) =>
    active ? "#6366f1" : "#64748b"};
`;

export const DateBtn = styled.TouchableOpacity`
  flex-direction: row;
  align-items: center;
  background-color: #f1f5f9;
  padding: 14px;
  border-radius: 14px;
  height: 48px;
  flex: 1;
`;

export const DateBtnText = styled.Text`
  margin-left: 8px;
  font-size: 13px;
  font-weight: 700;
  color: #1e293b;
`;

export const ToggleRow = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  margin-top: 20px;
  padding-top: 20px;
  border-top-width: 1px;
  border-top-color: #f1f5f9;
`;

export const ToggleLeftSection = styled.View`
  flex-direction: row;
  align-items: center;
  flex: 1;
`;

export const ToggleIconBox = styled.View`
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background-color: #f5f3ff;
  justify-content: center;
  align-items: center;
  margin-right: 12px;
`;

export const ToggleTitle = styled.Text`
  font-size: 15px;
  font-weight: 700;
  color: #1e293b;
`;

export const ToggleSub = styled.Text`
  font-size: 12px;
  color: #94a3b8;
  font-weight: 500;
  margin-top: 2px;
`;

export const Footer = styled.View`
  padding: 25px 0px 40px;
`;

export const SaveButton = styled.TouchableOpacity`
  background-color: #6366f1;
  padding: 18px;
  border-radius: 18px;
  align-items: center;
  shadow-color: #6366f1;
  shadow-opacity: 0.3;
  elevation: 8;
`;

const SaveButtonText = styled.Text`
  color: white;
  font-size: 16px;
  font-weight: 800;
`;
