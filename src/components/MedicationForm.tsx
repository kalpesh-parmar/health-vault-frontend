import React, { useState, useEffect } from "react";
import { Animated, Switch, View, Platform } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { format, isEqual } from "date-fns";
import DatePicker from "react-native-date-picker";
import styled from "styled-components/native";
import Toast from "react-native-toast-message";
import { AddOrEditMedication } from "../types";
import ModernLoader from "./shared/Loader";

type MedType = {
  key: "Tablet" | "Capsule" | "Syrup" | "Drop" | "Injection";
  value: "TABLET" | "CAPSULE" | "SYRUP" | "DROP" | "INJECTION";
};
type FoodTiming = {
  key: "Before Food" | "After Food";
  value: "BEFORE_FOOD" | "AFTER_FOOD";
};
type Frequency = {
  key: "Once Daily" | "Twice Daily" | "3x Daily";
  value: "ONCE_DAILY" | "TWICE_DAILY" | "THREE_TIMES_DAILY";
};
type TimeOfDay = {
  key: "Morning" | "Noon" | "Night" | "Specific Time";
  value: "MORNING" | "NOON" | "NIGHT" | "SPECIFIC_TIME";
};

const ACCENT = "#0ea5e9";
const ACCENT_DARK = "#0f766e";
const ACCENT_SOFT = "#e0f2fe";

const MED_TYPES: MedType[] = [
  { key: "Tablet", value: "TABLET" },
  { key: "Capsule", value: "CAPSULE" },
  { key: "Syrup", value: "SYRUP" },
  { key: "Drop", value: "DROP" },
  { key: "Injection", value: "INJECTION" },
];
const FREQUENCIES: Frequency[] = [
  { key: "Once Daily", value: "ONCE_DAILY" },
  { key: "Twice Daily", value: "TWICE_DAILY" },
  { key: "3x Daily", value: "THREE_TIMES_DAILY" },
];
const FOOD_TIMINGS: FoodTiming[] = [
  { key: "Before Food", value: "BEFORE_FOOD" },
  { key: "After Food", value: "AFTER_FOOD" },
];
const TIMES_OF_DAY: TimeOfDay[] = [
  { key: "Morning", value: "MORNING" },
  { key: "Noon", value: "NOON" },
  { key: "Night", value: "NIGHT" },
  { key: "Specific Time", value: "SPECIFIC_TIME" },
];

interface MedicationFormProps {
  initialData?: AddOrEditMedication;
  onSubmit: (data: AddOrEditMedication) => void;
  isLoading: boolean;
  onScroll?: (...args: any[]) => void;
}

const MedicationForm = ({
  initialData,
  onSubmit,
  isLoading,
  onScroll,
}: MedicationFormProps) => {
  const isValidDate = (d: any) => d instanceof Date && !isNaN(d.getTime());
  const [name, setName] = useState(initialData?.medicationName || "");
  const [type, setType] = useState<MedType>(() => {
    const found = MED_TYPES.find(
      (t) => t.value === initialData?.medicationType,
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
    const found = TIMES_OF_DAY.filter(
      (t) => rawBestTaken?.includes(t.value) || rawBestTaken?.includes(t.key),
    );
    return found.length > 0 ? found : [TIMES_OF_DAY[0]];
  });

  const [foodTiming, setFoodTiming] = useState<FoodTiming>(() => {
    const rawMeal = initialData?.withFood || "BEFORE_FOOD";
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

  const [preferredTimes, setPreferredTimes] = useState<Date[]>(() => {
    if (
      initialData?.medicationTime &&
      Array.isArray(initialData?.medicationTime)
    ) {
      return initialData?.medicationTime?.map(
        (t: { time: string; period: string }) => parseTime(t?.time),
      );
    }
    return [];
  });

  const [isOngoing, setIsOngoing] = useState(
    initialData
      ? initialData.ongoing !== undefined
        ? initialData.ongoing
        : true
      : true,
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
    type: "start" | "time";
  }>({ visible: false, type: "start" });

  useEffect(() => {
    const isSpecificTime = timesOfDay.some((t) => t.value === "SPECIFIC_TIME");
    const currentMax = isSpecificTime
      ? 5
      : frequency.key === "Once Daily"
        ? 1
        : frequency.key === "Twice Daily"
          ? 2
          : 3;
    if (preferredTimes.length > currentMax) {
      setPreferredTimes((prev) => prev.slice(0, currentMax));
    }
  }, [frequency, timesOfDay]);

  const getUnitString = (medType: MedType) => {
    const units: Record<MedType["key"], string> = {
      Tablet: "Tablets",
      Capsule: "Capsules",
      Syrup: "ml",
      Drop: "Drops",
      Injection: "Units",
    };
    return units[medType.key];
  };

  useEffect(() => {
    setDisplayDose(getUnitString(type));
  }, [type]);

  const handleSubmit = () => {
    if (preferredTimes.length !== maxTimes) {
      Toast.show({
        type: "error",
        text1: `${frequency.key} needs ${maxTimes} reminder ${maxTimes === 1 ? "time" : "times"}.`,
        text2: `Please add ${maxTimes - preferredTimes.length} more reminder timings.`,
      });
      return;
    }

    const reminderTimings = preferredTimes.map((t) =>
      format(t, "HH:mm").toString(),
    );
    const period = preferredTimes.map((t) => format(t, "a"));

    console.log("reminderTimings", reminderTimings);
    console.log("period", period);

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
      medicationTime: preferredTimes.map((t) => {
        return {
          time: format(t, "hh:mm"),
          period: format(t, "a"),
        };
      }),
      totalPills: Number(totalPills),
      doseReminders: reminders,
      refillAlert,
      notes,
    });
  };

  const maxTimes = timesOfDay.some((t) => t.value === "SPECIFIC_TIME")
    ? 5
    : frequency.key === "Once Daily"
      ? 1
      : frequency.key === "Twice Daily"
        ? 2
        : 3;

  return (
    <ScrollContent
      showsVerticalScrollIndicator={false}
      onScroll={onScroll}
      scrollEventThrottle={16}
    >
      <ModernLoader visible={isLoading} title="This May Take A While." />
      <Card style={{ marginTop: 0 }}>
        <SectionHeaderRow>
          <MaterialCommunityIcons
            name="information-outline"
            size={20}
            color={ACCENT}
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

      <Card>
        <SectionHeaderRow>
          <MaterialCommunityIcons name="pill" size={20} color={ACCENT} />
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
              onPress={() => {
                setFrequency(f);
                setTimesOfDay([timesOfDay[0]]);
              }}
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
              onPress={() => {
                setTimesOfDay((prev) => {
                  const isSelected = prev.some((t) => t.key === item.key);
                  const hasSpecificTime = prev.some(
                    (t) => t.value === "SPECIFIC_TIME",
                  );

                  if (frequency.value === "ONCE_DAILY") {
                    return isSelected ? prev : [item];
                  }

                  if (item.value === "SPECIFIC_TIME") {
                    return [item];
                  }

                  if (hasSpecificTime) {
                    return [item];
                  }

                  if (isSelected) {
                    if (prev.length > 1) {
                      return prev.filter((t) => t.key !== item.key);
                    }
                    return prev;
                  } else {
                    const limit =
                      frequency.value === "TWICE_DAILY"
                        ? 2
                        : frequency.value === "THREE_TIMES_DAILY"
                          ? 3
                          : Infinity;
                    if (prev.length < limit) {
                      return [...prev, item];
                    }
                    return prev;
                  }
                });
              }}
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

        <InputLabel style={{ marginTop: 15 }}>Reminder Timings</InputLabel>

        {preferredTimes.length > 0 && (
          <SelectedTimesContainer>
            {preferredTimes.map((timings, index) => (
              <TimeChip key={index}>
                <TimeChipText>{format(timings, "hh:mm a")}</TimeChipText>
                <RemoveTimeBtn
                  onPress={() => {
                    setPreferredTimes((prev) =>
                      prev.filter((_, i) => i !== index),
                    );
                  }}
                >
                  <Ionicons name="close" size={16} color="#fff" />
                </RemoveTimeBtn>
              </TimeChip>
            ))}
          </SelectedTimesContainer>
        )}

        {preferredTimes.length < maxTimes && (
          <DateBtn
            style={{ marginTop: preferredTimes.length > 0 ? 12 : 0 }}
            onPress={() => setPicker({ visible: true, type: "time" })}
          >
            <Ionicons name="add-circle-outline" size={18} color={ACCENT} />
            <DateBtnText>Add Reminder Timings</DateBtnText>
          </DateBtn>
        )}
      </Card>

      {/* SCHEDULE & SUPPLY */}
      <Card>
        <SectionHeaderRow>
          <MaterialCommunityIcons
            name="calendar-clock"
            size={20}
            color={ACCENT}
          />
          <SectionTitle>Schedule & Supply</SectionTitle>
        </SectionHeaderRow>
        <Row>
          <View style={{ flex: 1 }}>
            <InputLabel>Pills To Be Taken</InputLabel>
            <StyledInput
              placeholder="e.g. 30"
              keyboardType="numeric"
              value={totalPills}
              onChangeText={setTotalPills}
            />
          </View>
          <SpacerHorizontal width={12} />
          <View style={{ flex: 1 }}>
            <InputLabel>Start Date</InputLabel>
            <DateBtn
              onPress={() => setPicker({ visible: true, type: "start" })}
            >
              <Ionicons name="calendar-outline" size={18} color={ACCENT} />
              <DateBtnText>
                {isValidDate(startDate)
                  ? format(startDate, "dd MMM yyyy")
                  : "Select Date"}
              </DateBtnText>
            </DateBtn>
          </View>
        </Row>
        <Row style={{ marginTop: 15 }}></Row>
        <ToggleRow>
          <ToggleLeftSection>
            <ToggleIconBox>
              <MaterialCommunityIcons
                name="infinity"
                size={22}
                color={ACCENT}
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
            trackColor={{ false: "#cbd5e1", true: ACCENT }}
            thumbColor={Platform.OS === "ios" ? undefined : ACCENT_DARK}
          />
        </ToggleRow>
      </Card>

      {/* ALERTS */}
      <Card>
        <SectionHeaderRow>
          <MaterialCommunityIcons
            name="bell-outline"
            size={20}
            color={ACCENT}
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
            trackColor={{ false: "#cbd5e1", true: ACCENT }}
            thumbColor={Platform.OS === "ios" ? undefined : ACCENT_DARK}
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
            trackColor={{ false: "#cbd5e1", true: ACCENT }}
            thumbColor={Platform.OS === "ios" ? undefined : ACCENT_DARK}
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

      <DatePicker
        modal
        open={picker.visible}
        mode={picker.type === "time" ? "time" : "date"}
        date={picker.type === "start" ? startDate : new Date()}
        onConfirm={(date) => {
          if (picker.type === "start") setStartDate(date);
          else {
            if (preferredTimes.some((t) => isEqual(t, date))) {
              Toast.show({
                type: "error",
                text1: "Time already Selected.",
                text2: "Please select a different time.",
              });
              return;
            }
            setPreferredTimes((prev) => [...prev, date]);
          }
          setPicker({ ...picker, visible: false });
        }}
        onCancel={() => setPicker({ ...picker, visible: false })}
      />
    </ScrollContent>
  );
};

export default MedicationForm;

const ScrollContent = styled(Animated.ScrollView)`
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
    active ? ACCENT_DARK : "#f1f5f9"};
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
    active ? ACCENT_SOFT : "#f8fafc"};
  border-width: 1.5px;
  border-color: ${({ active }: { active: boolean }) =>
    active ? ACCENT : "#f1f5f9"};
`;

export const TimeText = styled.Text<{ active: boolean }>`
  margin-left: 8px;
  font-size: 13px;
  font-weight: 700;
  color: ${({ active }: { active: boolean }) =>
    active ? ACCENT_DARK : "#64748b"};
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
  shadow-color: ${ACCENT};
  shadow-opacity: 0.3;
  elevation: 8;
`;

const SaveButtonText = styled.Text`
  color: white;
  font-size: 16px;
  font-weight: 800;
`;

export const SelectedTimesContainer = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  gap: 8px;
`;

export const TimeChip = styled.View`
  flex-direction: row;
  align-items: center;
  border-width: 1.5px;
  border-color: ${ACCENT};
  padding: 8px;
  border-radius: 20px;
  gap: 6px;
`;

export const TimeChipText = styled.Text`
  color: ${ACCENT_DARK};
  font-size: 13px;
  font-weight: 700;
`;

export const RemoveTimeBtn = styled.TouchableOpacity`
  background-color: ${ACCENT_DARK};
  border-radius: 10px;
  padding: 2px;
`;
