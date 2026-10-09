import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Animated,
  ActivityIndicator,
} from "react-native";
import styled from "styled-components/native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useAppTheme } from "../../../../context/ThemeContext";
import { AddOrEditMedication } from "../../../../types";
import { useAppConstants } from "../../../../utils/translationUtils";

interface MedicationBatchReviewProps {
  drafts: AddOrEditMedication[];
  onEditDraft: (index: number) => void;
  onDeleteDraft: (index: number) => void;
  onAddNew: () => void;
  onConfirmSave: (selectedDrafts: AddOrEditMedication[]) => void;
  onCancel: () => void;
  isSaving: boolean;
  onScroll?: (...args: any[]) => void;
}

const MedicationBatchReview: React.FC<MedicationBatchReviewProps> = ({
  drafts,
  onEditDraft,
  onDeleteDraft,
  onAddNew,
  onConfirmSave,
  onCancel,
  isSaving,
  onScroll,
}) => {
  const { theme, isDark } = useAppTheme();
  const constants = useAppConstants();
  
  // Track selected IDs/keys for inclusion
  const [selectedKeys, setSelectedKeys] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    drafts.forEach((d, idx) => {
      const key = d.client_med_id || d.id || `draft_${idx}`;
      initial[key] = true;
    });
    return initial;
  });

  const [expandedKeys, setExpandedKeys] = useState<Record<string, boolean>>({});

  const toggleSelect = (key: string) => {
    setSelectedKeys((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const toggleExpand = (key: string) => {
    setExpandedKeys((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const allKeys = drafts.map((d, idx) => d.client_med_id || d.id || `draft_${idx}`);
  const selectedCount = allKeys.filter((k) => selectedKeys[k]).length;
  const isAllSelected = selectedCount === drafts.length && drafts.length > 0;

  const handleSelectAllToggle = () => {
    if (isAllSelected) {
      setSelectedKeys({});
    } else {
      const newSel: Record<string, boolean> = {};
      allKeys.forEach((k) => {
        newSel[k] = true;
      });
      setSelectedKeys(newSel);
    }
  };

  const handleSave = () => {
    const selectedDrafts = drafts.filter((d, idx) => {
      const key = d.client_med_id || d.id || `draft_${idx}`;
      return selectedKeys[key];
    });
    onConfirmSave(selectedDrafts);
  };

  const formatFoodFrequency = (food?: string) => {
    if (!food) return constants?.afterFood || "After Food";
    const normalized = String(food).toUpperCase().replace(/\s+/g, "_");
    if (normalized === "BEFORE_FOOD" || normalized === "BEFORE") return constants?.beforeFood || "Before Food";
    if (normalized === "AFTER_FOOD" || normalized === "AFTER") return constants?.afterFood || "After Food";
    return food;
  };

  const formatSchedule = (schedule: any) => {
    if (!schedule) return constants?.none || "None";
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
    }
    return constants?.none || "None";
  };

  const getTypeColor = (type?: string) => {
    const upper = String(type || "TABLET").toUpperCase();
    switch (upper) {
      case "TABLET":
        return { bg: isDark ? "#1e3a8a30" : "#dbeafe", text: isDark ? "#93c5fd" : "#1e40af" };
      case "CAPSULE":
        return { bg: isDark ? "#581c8730" : "#f3e8ff", text: isDark ? "#d8b4fe" : "#6b21a8" };
      case "SYRUP":
        return { bg: isDark ? "#83184330" : "#fce7f3", text: isDark ? "#f472b6" : "#9d174d" };
      case "INJECTION":
        return { bg: isDark ? "#14532d30" : "#dcfce7", text: isDark ? "#86efac" : "#166534" };
      case "DROPS":
      case "DROP":
        return { bg: isDark ? "#08334430" : "#cffafe", text: isDark ? "#67e8f9" : "#155e75" };
      default:
        return { bg: isDark ? "#334155" : "#f1f5f9", text: isDark ? "#cbd5e1" : "#475569" };
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollContent
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        bounces={false}
        overScrollMode="never"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingTop: 220,
          paddingBottom: 60,
        }}
      >
        {/* Review Summary Card */}
        <SummaryBanner isDark={isDark}>
          <SummaryBannerRow>
            <SummaryBannerContent>
              <Ionicons
                name="checkmark-done-circle"
                size={22}
                color={isDark ? "#818cf8" : "#4f46e5"}
                style={{ marginRight: 8 }}
              />
              <SummaryBannerText>
                <SummaryBannerTitle isDark={isDark} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
                  {drafts.length} {drafts.length > 1 ? (constants?.medications || "Medications") : (constants?.medication || "Medication")} {constants?.added || "Added"}
                </SummaryBannerTitle>
                <SummaryBannerSubtitle isDark={isDark} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
                  {selectedCount} {constants?.selectedForSaving || "selected for saving"}
                </SummaryBannerSubtitle>
              </SummaryBannerText>
            </SummaryBannerContent>

            <SelectAllBtn onPress={handleSelectAllToggle} activeOpacity={0.7} isDark={isDark}>
              <MaterialCommunityIcons
                name={isAllSelected ? "checkbox-marked" : "checkbox-blank-outline"}
                size={18}
                color={isAllSelected ? (isDark ? "#818cf8" : "#4f46e5") : isDark ? "#94a3b8" : "#64748b"}
              />
              <SelectAllText isDark={isDark}>
                {isAllSelected ? (constants?.deselectAll || "Deselect All") : (constants?.selectAll || "Select All")}
              </SelectAllText>
            </SelectAllBtn>
          </SummaryBannerRow>
        </SummaryBanner>

        {/* List of Medication Review Cards */}
        {drafts.map((draft, index) => {
          const key = draft.client_med_id || draft.id || `draft_${index}`;
          const isSelected = !!selectedKeys[key];
          const isExpanded = !!expandedKeys[key];
          const typeColors = getTypeColor(draft.medicationType);

          return (
            <MedReviewCard key={key} isDark={isDark} isSelected={isSelected}>
              {/* Card Header Row */}
              <CardHeaderRow>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => toggleSelect(key)}
                  style={{ flexDirection: "row", alignItems: "center", flex: 1 }}
                >
                  <Ionicons
                    name={isSelected ? "checkbox" : "square-outline"}
                    size={22}
                    color={isSelected ? (isDark ? "#818cf8" : "#4f46e5") : isDark ? "#64748b" : "#94a3b8"}
                    style={{ marginRight: 10 }}
                  />
                  <View style={{ flex: 1 }}>
                    <MedNameText
                      isDark={isDark}
                      style={{ textDecorationLine: isSelected ? "none" : "line-through", opacity: isSelected ? 1 : 0.6 }}
                    >
                      {draft.medicationName}
                    </MedNameText>
                    <Text style={{ fontSize: 12, color: isDark ? "#94a3b8" : "#64748b", marginTop: 2 }}>
                      {constants?.medicine || "Medicine"} #{index + 1}
                    </Text>
                  </View>
                </TouchableOpacity>

                <TypePill style={{ backgroundColor: typeColors.bg }}>
                  <TypeText style={{ color: typeColors.text }}>
                    {draft.medicationType || "Tablet"}
                  </TypeText>
                </TypePill>
              </CardHeaderRow>

              <Divider isDark={isDark} />

              {/* Quick Info Grid */}
              <InfoGrid>
                <InfoItem>
                  <Ionicons name="disc-outline" size={14} color={isDark ? "#94a3b8" : "#64748b"} />
                  <InfoText isDark={isDark}>
                    {constants?.dose || "Dose"}: <BoldText isDark={isDark}>{draft.dosePerIntake}</BoldText>
                  </InfoText>
                </InfoItem>

                <InfoItem>
                  <Ionicons name="alarm-outline" size={14} color={isDark ? "#94a3b8" : "#64748b"} />
                  <InfoText isDark={isDark}>
                    {draft.frequency || "Once Daily"}
                  </InfoText>
                </InfoItem>

                <InfoItem>
                  <Ionicons name="restaurant-outline" size={14} color={isDark ? "#94a3b8" : "#64748b"} />
                  <InfoText isDark={isDark}>
                    {formatFoodFrequency(draft.foodFrequency)}
                  </InfoText>
                </InfoItem>

                <InfoItem>
                  <Ionicons name="time-outline" size={14} color={isDark ? "#94a3b8" : "#64748b"} />
                  <InfoText isDark={isDark}>
                    {formatSchedule(draft.medicationSchedule)}
                  </InfoText>
                </InfoItem>

                <InfoItem>
                  <Ionicons name="calendar-outline" size={14} color={isDark ? "#94a3b8" : "#64748b"} />
                  <InfoText isDark={isDark}>
                    {constants?.start || "Start"}: {draft.startDate || (constants?.today || "Today")}
                  </InfoText>
                </InfoItem>

                <InfoItem>
                  <Ionicons name="cube-outline" size={14} color={isDark ? "#94a3b8" : "#64748b"} />
                  <InfoText isDark={isDark}>
                    {constants?.qty || "Qty"}: {draft.totalQuantity || 1}
                  </InfoText>
                </InfoItem>
              </InfoGrid>

              {/* Expanded details (doctor / notes) */}
              {isExpanded && (
                <ExpandedSection isDark={isDark}>
                  {draft.prescribedBy ? (
                    <DetailRow>
                      <Ionicons name="person-outline" size={14} color={isDark ? "#94a3b8" : "#64748b"} />
                      <DetailText isDark={isDark}>{constants?.doctor || "Doctor"}: {draft.prescribedBy}</DetailText>
                    </DetailRow>
                  ) : null}
                  {draft.notes ? (
                    <DetailRow>
                      <Ionicons name="document-text-outline" size={14} color={isDark ? "#94a3b8" : "#64748b"} />
                      <DetailText isDark={isDark}>{constants?.notes || "Notes"}: {draft.notes}</DetailText>
                    </DetailRow>
                  ) : null}
                </ExpandedSection>
              )}

              {(draft.prescribedBy || draft.notes) && (
                <TouchableOpacity
                  onPress={() => toggleExpand(key)}
                  style={{ alignSelf: "center", paddingVertical: 4 }}
                >
                  <Text style={{ fontSize: 12, color: isDark ? "#818cf8" : "#4f46e5", fontWeight: "600" }}>
                    {isExpanded ? (constants?.hideDetails || "Hide Details") : (constants?.viewMoreDetails || "View More Details")}
                  </Text>
                </TouchableOpacity>
              )}

              <Divider isDark={isDark} />

              {/* Card Actions: Edit & Delete */}
              <CardActionsRow>
                <ActionButton
                  onPress={() => onEditDraft(index)}
                  activeOpacity={0.7}
                  isDark={isDark}
                >
                  <Ionicons name="pencil-outline" size={16} color={isDark ? "#818cf8" : "#4f46e5"} />
                  <ActionBtnText style={{ color: isDark ? "#818cf8" : "#4f46e5" }}>
                    {constants?.edit || "Edit"}
                  </ActionBtnText>
                </ActionButton>

                <ActionButton
                  onPress={() => onDeleteDraft(index)}
                  activeOpacity={0.7}
                  isDark={isDark}
                >
                  <Ionicons name="trash-outline" size={16} color="#ef4444" />
                  <ActionBtnText style={{ color: "#ef4444" }}>
                    {constants?.remove || "Remove"}
                  </ActionBtnText>
                </ActionButton>
              </CardActionsRow>
            </MedReviewCard>
          );
        })}

        {/* Footer Actions */}
        <FooterContainer>
          {/* Add Another Medicine Button */}
          <AddAnotherBtn onPress={onAddNew} disabled={isSaving} isDark={isDark}>
            <Ionicons name="add" size={20} color={isDark ? "#818cf8" : "#4f46e5"} style={{ marginRight: 6 }} />
            <AddAnotherText isDark={isDark}>+ {constants?.addAnotherMedicine || "Add Another Medicine"}</AddAnotherText>
          </AddAnotherBtn>

          {/* Confirm & Save Button */}
          <SaveAllBtn
            onPress={handleSave}
            disabled={isSaving || selectedCount === 0}
            style={{ opacity: selectedCount === 0 ? 0.5 : 1 }}
          >
            {isSaving ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <ActivityIndicator color="#ffffff" />
                <SaveAllText>{constants?.savingMedications || "Saving Medications"}</SaveAllText>
              </View>
            ) : (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Ionicons name="checkmark-circle" size={20} color="#ffffff" />
                <SaveAllText>
                  {constants?.save || "Save"} {selectedCount} {selectedCount > 1 ? (constants?.medications || "Medications") : (constants?.medication || "Medication")}
                </SaveAllText>
              </View>
            )}
          </SaveAllBtn>

          {/* Cancel */}
          <CancelBtn onPress={onCancel} disabled={isSaving} isDark={isDark}>
            <CancelText isDark={isDark}>{constants?.cancel || "Cancel"}</CancelText>
          </CancelBtn>
        </FooterContainer>
      </ScrollContent>
    </View>
  );
};

export default MedicationBatchReview;

const ScrollContent = styled(Animated.ScrollView)`
  flex: 1;
  padding-horizontal: 20px;
`;

const SummaryBanner = styled.View<{ isDark: boolean }>`
  background-color: ${(props: any) =>
    props.isDark ? "rgba(99, 102, 241, 0.15)" : "#eef2ff"};
  border-radius: 16px;
  padding: 14px 16px;
  margin-bottom: 16px;
  border-width: 1px;
  border-color: ${(props: any) =>
    props.isDark ? "rgba(99, 102, 241, 0.3)" : "#c7d2fe"};
`;

const SummaryBannerRow = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
`;

const SummaryBannerContent = styled.View`
  flex: 1;
  flex-direction: row;
  align-items: center;
  min-width: 0;
`;

const SummaryBannerText = styled.View`
  flex: 1;
  min-width: 0;
`;

const SummaryBannerTitle = styled.Text<{ isDark: boolean }>`
  font-size: 15px;
  font-weight: 700;
  color: ${(props: any) => (props.isDark ? "#c7d2fe" : "#3730a3")};
`;

const SummaryBannerSubtitle = styled.Text<{ isDark: boolean }>`
  font-size: 12px;
  color: ${(props: any) => (props.isDark ? "#94a3b8" : "#6b7280")};
  margin-top: 2px;
`;

const SelectAllBtn = styled.TouchableOpacity<{ isDark: boolean }>`
  flex-direction: row;
  align-items: center;
  flex-shrink: 0;
  margin-left: 8px;
  padding: 6px 10px;
  border-radius: 8px;
  background-color: ${(props: any) => (props.isDark ? "#1e293b" : "#ffffff")};
  border-width: 1px;
  border-color: ${(props: any) => (props.isDark ? "#334155" : "#e2e8f0")};
`;

const SelectAllText = styled.Text<{ isDark: boolean }>`
  font-size: 12px;
  font-weight: 600;
  margin-left: 4px;
  color: ${(props: any) => (props.isDark ? "#cbd5e1" : "#475569")};
`;

const MedReviewCard = styled.View<{ isDark: boolean; isSelected: boolean }>`
  background-color: ${(props: any) => (props.isDark ? "#1e293b" : "#ffffff")};
  border-radius: 20px;
  padding: 10px;
  margin-bottom: 14px;
  elevation: 3;
  shadow-opacity: 0.06;
  shadow-radius: 10px;
  shadow-color: #000;
  border-width: 1.5px;
  border-color: ${(props: any) =>
    props.isSelected
      ? props.isDark
        ? "#4f46e5"
        : "#6366f1"
      : props.isDark
        ? "#334155"
        : "#e2e8f0"};
`;

const CardHeaderRow = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
`;

const MedNameText = styled.Text<{ isDark: boolean }>`
  font-size: 15px;
  font-weight: 700;
  color: ${(props: any) => (props.isDark ? "#f8fafc" : "#1e293b")};
`;

const TypePill = styled.View`
  padding-horizontal: 10px;
  padding-vertical: 4px;
  border-radius: 12px;
`;

const TypeText = styled.Text`
  font-size: 12px;
  font-weight: 700;
`;

const Divider = styled.View<{ isDark: boolean }>`
  height: 1px;
  background-color: ${(props: any) => (props.isDark ? "#334155" : "#f1f5f9")};
  margin-vertical: 10px;
`;

const InfoGrid = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  gap: 8px;
`;

const InfoItem = styled.View`
  flex-direction: row;
  align-items: center;
  width: 48%;
  gap: 6px;
`;

const InfoText = styled.Text<{ isDark: boolean }>`
  font-size: 12px;
  color: ${(props: any) => (props.isDark ? "#cbd5e1" : "#475569")};
  flex: 1;
`;

const BoldText = styled.Text<{ isDark: boolean }>`
  font-weight: 700;
  color: ${(props: any) => (props.isDark ? "#f8fafc" : "#1e293b")};
`;

const ExpandedSection = styled.View<{ isDark: boolean }>`
  background-color: ${(props: any) => (props.isDark ? "#0f172a" : "#f8fafc")};
  border-radius: 10px;
  padding: 10px;
  margin-top: 8px;
  gap: 6px;
`;

const DetailRow = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 6px;
`;

const DetailText = styled.Text<{ isDark: boolean }>`
  font-size: 12px;
  color: ${(props: any) => (props.isDark ? "#94a3b8" : "#64748b")};
  flex: 1;
`;

const CardActionsRow = styled.View`
  flex-direction: row;
  justify-content: flex-end;
  gap: 12px;
`;

const ActionButton = styled.TouchableOpacity<{ isDark: boolean }>`
  flex-direction: row;
  align-items: center;
  padding: 6px 12px;
  border-radius: 8px;
  background-color: ${(props: any) => (props.isDark ? "#0f172a" : "#f8fafc")};
  border-width: 1px;
  border-color: ${(props: any) => (props.isDark ? "#334155" : "#e2e8f0")};
  gap: 4px;
`;

const ActionBtnText = styled.Text`
  font-size: 13px;
  font-weight: 600;
`;

const FooterContainer = styled.View`
  margin-top: 10px;
  gap: 10px;
  padding-bottom: 29px;
`;

const AddAnotherBtn = styled.TouchableOpacity<{ isDark: boolean }>`
  flex-direction: row;
  align-items: center;
  justify-content: center;
  padding: 10px;
  border-radius: 18px;
  background-color: ${(props: any) =>
    props.isDark ? "rgba(99, 102, 241, 0.15)" : "#eef2ff"};
  border-width: 1.5px;
  border-color: ${(props: any) =>
    props.isDark ? "rgba(99, 102, 241, 0.4)" : "#818cf8"};
`;

const AddAnotherText = styled.Text<{ isDark: boolean }>`
  font-size: 15px;
  font-weight: 700;
  color: ${(props: any) => (props.isDark ? "#a5b4fc" : "#4f46e5")};
`;

const SaveAllBtn = styled.TouchableOpacity`
  background-color: #6366f1;
  padding: 10px;
  border-radius: 18px;
  align-items: center;
  justify-content: center;
  shadow-color: #6366f1;
  shadow-opacity: 0.3;
  elevation: 8;
`;

const SaveAllText = styled.Text`
  color: white;
  font-size: 16px;
  font-weight: 800;
`;

const CancelBtn = styled.TouchableOpacity<{ isDark: boolean }>`
  padding: 10px;
  border-radius: 16px;
  align-items: center;
  background-color: ${(props: any) => (props.isDark ? "#1e293b" : "#f1f5f9")};
  border-width: 1px;
  border-color: ${(props: any) => (props.isDark ? "#334155" : "#cbd5e1")};
`;

const CancelText = styled.Text<{ isDark: boolean }>`
  font-size: 12px;
  font-weight: 600;
  color: ${(props: any) => (props.isDark ? "#94a3b8" : "#64748b")};
`;
