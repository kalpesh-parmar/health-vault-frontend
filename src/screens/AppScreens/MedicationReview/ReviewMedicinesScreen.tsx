import React, { useState, useEffect } from "react";
import { ScrollView, View, Text, TouchableOpacity, BackHandler, LayoutAnimation, Platform, UIManager } from "react-native";
import styled from "styled-components/native";
import { Ionicons } from "@expo/vector-icons";
import { useRoute, RouteProp, useIsFocused } from "@react-navigation/native";
import Toast from "react-native-toast-message";
import { useAppTheme } from "../../../context/ThemeContext";
import { useAppNavigation } from "../../../types/navigation";
import { useMedicationReview } from "../../../context/MedicationReviewContext";
import ReviewProgressHeader from "../../../components/MedicationReview/ReviewProgressHeader";
import DocumentMedicineCard from "../../../components/MedicationReview/DocumentMedicineCard";
import ExtractedMedicineCard from "../../../components/MedicationReview/ExtractedMedicineCard";
import ReviewLoadingState from "../../../components/MedicationReview/ReviewLoadingState";
import EmptyMedicineState from "../../../components/MedicationReview/EmptyMedicineState";
import { useBottomBarPadding } from "../../../hooks/useBottomBarPadding";
import { StatusBar } from "expo-status-bar";

type ReviewMedicinesRouteProp = RouteProp<
  {
    ReviewMedicines: {
      jobIds: string[];
      filesInfo?: { jobId: string; fileName: string; fileKey: string }[];
      fromScreen?: string;
    };
  },
  "ReviewMedicines"
>;

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export const ReviewMedicinesScreen: React.FC = () => {
  const route = useRoute<ReviewMedicinesRouteProp>();
  const navigation = useAppNavigation();
  const { theme, isDark } = useAppTheme();
  const isFocused = useIsFocused();

  const { jobIds = [], filesInfo = [], fromScreen } = route.params || {};

  const {
    documents,
    medicines,
    selectedMedicineIds,
    isLoading,
    error,
    duplicateGroups,
    conflicts,
    resolutions,
    initializeReview,
    toggleMedicineSelection,
    resolveConflict,
    clearReviewState,
  } = useMedicationReview();

  const [viewMode, setViewMode] = useState<"list" | "conflicts">("list");
  const [currentConflictIdx, setCurrentConflictIdx] = useState<number>(0);

  // Load extracted medicines from OCR results
  useEffect(() => {
    if (jobIds.length > 0) {
      initializeReview(jobIds, filesInfo);
    }
  }, [jobIds]);

  // Show any error via Toast
  useEffect(() => {
    if (error) {
      Toast.show({ type: "error", text1: "Error", text2: error });
    }
  }, [error]);

  useEffect(() => {
    if (!isFocused) return;

    const onBackPress = () => {
      if (viewMode === "conflicts") {
        setViewMode("list");
        return true;
      }
      handleBack();
      return true;
    };
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      onBackPress
    );
    return () => subscription.remove();
  }, [isFocused, fromScreen, navigation, viewMode]);

  const handleBack = () => {
    clearReviewState();
    if (fromScreen && fromScreen !== "MultiUpload") {
      navigation.navigate(fromScreen as any);
    } else {
      navigation.navigate("Home" as any);
    }
  };

  const handleContinue = () => {
    navigation.navigate("ConfirmMedicines" as any, { fromScreen });
  };

  const unresolvedConflicts = conflicts.filter((c) => resolutions[c.id] === undefined);
  const activeConflictList = unresolvedConflicts.length > 0 ? unresolvedConflicts : conflicts;
  const currentConflict = activeConflictList[currentConflictIdx] || activeConflictList[0];

  const autoAdvanceConflict = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const nextUnresolved = conflicts.filter((c) => resolutions[c.id] === undefined && c.id !== currentConflict?.id);
    if (nextUnresolved.length === 0) {
      setViewMode("list");
      setCurrentConflictIdx(0);
      Toast.show({
        type: "success",
        text1: "All Conflicts Resolved!",
        text2: "You can now review your final medicine list and confirm.",
      });
    } else {
      if (currentConflictIdx >= nextUnresolved.length) {
        setCurrentConflictIdx(Math.max(0, nextUnresolved.length - 1));
      }
    }
  };

  const handleKeepExisting = (conflict: any) => {
    resolveConflict(conflict.id, "REMOVE_NEW");
    Toast.show({
      type: "info",
      text1: "Kept Existing Medicine",
      text2: `${conflict.extractedMedicine.name} will not be added. Existing medicine preserved.`,
    });
    autoAdvanceConflict();
  };

  const handleReplaceExisting = (conflict: any) => {
    const existId = conflict.existingMedication?.id || conflict.existingMedication?._id;
    resolveConflict(conflict.id, "REPLACE", existId);
    Toast.show({
      type: "info",
      text1: "Marked for Replacement",
      text2: `Existing ${conflict.existingMedication?.medicationName || conflict.extractedMedicine.name} will be updated with new details.`,
    });
    autoAdvanceConflict();
  };

  const handleKeepBoth = (conflict: any) => {
    resolveConflict(conflict.id, "KEEP_NEW");
    Toast.show({
      type: "success",
      text1: "Kept Both Medicines",
      text2: `${conflict.extractedMedicine.name} will be added as a separate medicine.`,
    });
    autoAdvanceConflict();
  };

  const selectedCount = selectedMedicineIds.length;
  const docsWithMeds = documents.filter((doc) => doc.medicines.length > 0).length;
  const bottomPadding = useBottomBarPadding(16, 8);

  if (isLoading) {
    return (
      <SafeContainer edges={["top", "bottom"]} isDark={isDark}>
        <StatusBar style={isDark ? "light" : "dark"} />
        <ReviewProgressHeader title="Review Medicines" onBackPress={handleBack} />
        <ReviewLoadingState message="Loading extracted medicines & checking conflicts..." />
      </SafeContainer>
    );
  }

  const hasAnyMeds = medicines.length > 0;

  if (!hasAnyMeds && !isLoading) {
    return (
      <SafeContainer edges={["top", "bottom"]} isDark={isDark}>
        <StatusBar style={isDark ? "light" : "dark"} />
        <ReviewProgressHeader title="Review Medicines" onBackPress={handleBack} />
        <EmptyMedicineState onBackPress={handleBack} />
      </SafeContainer>
    );
  }

  // CONFLICT RESOLVER VIEW MODE
  if (viewMode === "conflicts" && currentConflict) {
    const med = currentConflict.extractedMedicine;
    const exist = currentConflict.existingMedication;
    const totalCount = activeConflictList.length;

    return (
      <SafeContainer edges={["top"]} isDark={isDark}>
        <StatusBar style={isDark ? "light" : "dark"} />
        <ReviewProgressHeader
          title="Resolve Conflicts"
          subtitle={`Conflict ${currentConflictIdx + 1} of ${totalCount}`}
          onBackPress={() => setViewMode("list")}
        />

        <ScrollWrapper contentContainerStyle={{ padding: 20, paddingBottom: bottomPadding + 100 }}>
          {/* Back to list pill */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Ionicons name="warning" size={18} color="#ea580c" />
              <Text style={{ fontSize: 14, fontWeight: "700", color: "#ea580c" }}>
                Conflict {currentConflictIdx + 1} of {totalCount}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setViewMode("list")}
              style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: isDark ? "#1e293b" : "#e2e8f0" }}
            >
              <Text style={{ fontSize: 12, fontWeight: "700", color: isDark ? "#93c5fd" : "#2563eb" }}>
                View Full List
              </Text>
            </TouchableOpacity>
          </View>

          {/* Medicine Title Header */}
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 20, fontWeight: "800", color: isDark ? "#f8fafc" : "#0f172a" }}>
              {med.name}
            </Text>
            <Text style={{ fontSize: 13, color: isDark ? "#94a3b8" : "#64748b", marginTop: 4 }}>
              {currentConflict.reason}
            </Text>
          </View>

          {/* Side by side comparison card */}
          <View style={{
            flexDirection: "row",
            gap: 12,
            marginBottom: 20,
          }}>
            {/* Left Card: Existing */}
            <View style={{
              flex: 1,
              backgroundColor: isDark ? "#1e293b" : "#f8fafc",
              borderRadius: 14,
              padding: 14,
              borderWidth: 1,
              borderColor: isDark ? "#334155" : "#e2e8f0",
            }}>
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8, gap: 4 }}>
                <Ionicons name="folder-outline" size={14} color="#64748b" />
                <Text style={{ fontSize: 11, fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>
                  In Profile
                </Text>
              </View>

              <Text numberOfLines={2} style={{ fontSize: 15, fontWeight: "700", color: isDark ? "#f8fafc" : "#1e293b", marginBottom: 8 }}>
                {exist?.medicationName || exist?.name || med.name}
              </Text>

              <View style={{ gap: 6 }}>
                <View>
                  <Text style={{ fontSize: 10, color: "#64748b", fontWeight: "600" }}>TYPE & DOSE</Text>
                  <Text style={{ fontSize: 13, fontWeight: "600", color: isDark ? "#cbd5e1" : "#334155" }}>
                    {exist?.medicationType || exist?.medicineType || "Tablet"} • {exist?.dosePerIntake || exist?.dosage || "1"} {exist?.dosageUnit || ""}
                  </Text>
                </View>

                <View>
                  <Text style={{ fontSize: 10, color: "#64748b", fontWeight: "600" }}>FREQUENCY</Text>
                  <Text style={{ fontSize: 13, fontWeight: "600", color: isDark ? "#cbd5e1" : "#334155" }}>
                    {exist?.frequency || "Once Daily"}
                  </Text>
                </View>

                <View>
                  <Text style={{ fontSize: 10, color: "#64748b", fontWeight: "600" }}>TIMING</Text>
                  <Text style={{ fontSize: 13, fontWeight: "600", color: isDark ? "#cbd5e1" : "#334155" }}>
                    {exist?.foodFrequency || exist?.timing || "After Food"}
                  </Text>
                </View>
              </View>
            </View>

            {/* Right Card: Newly Extracted */}
            <View style={{
              flex: 1,
              backgroundColor: isDark ? "#1e293b" : "#f0fdf4",
              borderRadius: 14,
              padding: 14,
              borderWidth: 1,
              borderColor: isDark ? "#065f46" : "#bbf7d0",
            }}>
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8, gap: 4 }}>
                <Ionicons name="document-text-outline" size={14} color="#059669" />
                <Text style={{ fontSize: 11, fontWeight: "700", color: "#059669", textTransform: "uppercase" }}>
                  Extracted
                </Text>
              </View>

              <Text numberOfLines={2} style={{ fontSize: 15, fontWeight: "700", color: isDark ? "#f8fafc" : "#1e293b", marginBottom: 8 }}>
                {med.name}
              </Text>

              <View style={{ gap: 6 }}>
                <View>
                  <Text style={{ fontSize: 10, color: "#059669", fontWeight: "600" }}>TYPE & DOSE</Text>
                  <Text style={{ fontSize: 13, fontWeight: "600", color: isDark ? "#cbd5e1" : "#334155" }}>
                    {med.medicineType || "Tablet"} • {med.dosage || "1"} {med.dosageUnit || ""}
                  </Text>
                </View>

                <View>
                  <Text style={{ fontSize: 10, color: "#059669", fontWeight: "600" }}>FREQUENCY</Text>
                  <Text style={{ fontSize: 13, fontWeight: "600", color: isDark ? "#cbd5e1" : "#334155" }}>
                    {med.frequency || "Once Daily"}
                  </Text>
                </View>

                <View>
                  <Text style={{ fontSize: 10, color: "#059669", fontWeight: "600" }}>TIMING</Text>
                  <Text style={{ fontSize: 13, fontWeight: "600", color: isDark ? "#cbd5e1" : "#334155" }}>
                    {med.foodFrequency || med.timing || "After Food"}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Action Options Title */}
          <Text style={{ fontSize: 14, fontWeight: "700", color: isDark ? "#cbd5e1" : "#1e293b", marginBottom: 12 }}>
            Choose how to resolve:
          </Text>

          {/* Action 1: Keep Existing */}
          <TouchableOpacity
            onPress={() => handleKeepExisting(currentConflict)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              padding: 14,
              borderRadius: 12,
              backgroundColor: isDark ? "#1e293b" : "#ffffff",
              borderWidth: 1,
              borderColor: isDark ? "#334155" : "#e2e8f0",
              marginBottom: 10,
            }}
          >
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#eff6ff", justifyContent: "center", alignItems: "center", marginRight: 12 }}>
              <Ionicons name="shield-checkmark" size={18} color="#2563eb" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: "700", color: isDark ? "#f8fafc" : "#1e293b" }}>
                Keep Existing Profile Medicine
              </Text>
              <Text style={{ fontSize: 12, color: isDark ? "#94a3b8" : "#64748b", marginTop: 2 }}>
                Ignore the extracted version and keep your existing medication as-is.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
          </TouchableOpacity>

          {/* Action 2: Replace Existing */}
          <TouchableOpacity
            onPress={() => handleReplaceExisting(currentConflict)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              padding: 14,
              borderRadius: 12,
              backgroundColor: isDark ? "#1e293b" : "#ffffff",
              borderWidth: 1,
              borderColor: isDark ? "#334155" : "#e2e8f0",
              marginBottom: 10,
            }}
          >
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#fef3c7", justifyContent: "center", alignItems: "center", marginRight: 12 }}>
              <Ionicons name="swap-horizontal" size={18} color="#d97706" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: "700", color: isDark ? "#f8fafc" : "#1e293b" }}>
                Replace Existing with New Details
              </Text>
              <Text style={{ fontSize: 12, color: isDark ? "#94a3b8" : "#64748b", marginTop: 2 }}>
                Update your existing medication with the newly extracted dosage & instructions.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
          </TouchableOpacity>

          {/* Action 3: Keep Both / Add as New */}
          <TouchableOpacity
            onPress={() => handleKeepBoth(currentConflict)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              padding: 14,
              borderRadius: 12,
              backgroundColor: isDark ? "#1e293b" : "#ffffff",
              borderWidth: 1,
              borderColor: isDark ? "#334155" : "#e2e8f0",
              marginBottom: 10,
            }}
          >
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#ecfdf5", justifyContent: "center", alignItems: "center", marginRight: 12 }}>
              <Ionicons name="add-circle" size={18} color="#059669" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: "700", color: isDark ? "#f8fafc" : "#1e293b" }}>
                Keep Both (Add as New)
              </Text>
              <Text style={{ fontSize: 12, color: isDark ? "#94a3b8" : "#64748b", marginTop: 2 }}>
                Save this medicine as an additional entry in your profile.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
          </TouchableOpacity>

          {/* Action 4: Edit Details */}
          <TouchableOpacity
            onPress={() => navigation.navigate("MedicineDetails" as any, { medicineId: med.id })}
            style={{
              flexDirection: "row",
              alignItems: "center",
              padding: 14,
              borderRadius: 12,
              backgroundColor: isDark ? "#1e293b" : "#ffffff",
              borderWidth: 1,
              borderColor: isDark ? "#334155" : "#e2e8f0",
              marginBottom: 10,
            }}
          >
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: isDark ? "#334155" : "#f1f5f9", justifyContent: "center", alignItems: "center", marginRight: 12 }}>
              <Ionicons name="pencil" size={18} color={isDark ? "#94a3b8" : "#475569"} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: "700", color: isDark ? "#f8fafc" : "#1e293b" }}>
                Edit Medicine Details
              </Text>
              <Text style={{ fontSize: 12, color: isDark ? "#94a3b8" : "#64748b", marginTop: 2 }}>
                Manually customize name, dosage, timing, or reminder times before saving.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
          </TouchableOpacity>

          {/* Navigation between conflicts */}
          {totalCount > 1 && (
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 16 }}>
              <TouchableOpacity
                onPress={() => setCurrentConflictIdx((prev) => Math.max(0, prev - 1))}
                disabled={currentConflictIdx === 0}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 8,
                  backgroundColor: isDark ? "#1e293b" : "#e2e8f0",
                  opacity: currentConflictIdx === 0 ? 0.4 : 1,
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: "600", color: isDark ? "#cbd5e1" : "#475569" }}>
                  ← Previous Conflict
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setCurrentConflictIdx((prev) => Math.min(totalCount - 1, prev + 1))}
                disabled={currentConflictIdx >= totalCount - 1}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 8,
                  backgroundColor: isDark ? "#1e293b" : "#e2e8f0",
                  opacity: currentConflictIdx >= totalCount - 1 ? 0.4 : 1,
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: "600", color: isDark ? "#cbd5e1" : "#475569" }}>
                  Next Conflict →
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollWrapper>
      </SafeContainer>
    );
  }

  // STANDARD LIST VIEW MODE
  return (
    <SafeContainer edges={["top"]} isDark={isDark}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <ReviewProgressHeader
        title="Review Medicines"
        subtitle={`We found medicines in ${docsWithMeds} document${docsWithMeds === 1 ? "" : "s"}`}
        onBackPress={handleBack}
      />

      <ScrollWrapper contentContainerStyle={{ padding: 20, paddingBottom: bottomPadding + 80 }}>
        {/* Conflict Alert Banner if there are unresolved conflicts */}
        {unresolvedConflicts.length > 0 && (
          <ConflictAlertBanner isDark={isDark}>
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#ffedd5", justifyContent: "center", alignItems: "center", marginRight: 12 }}>
              <Ionicons name="warning" size={20} color="#ea580c" />
            </View>
            <View style={{ flex: 1, marginRight: 8 }}>
              <ConflictAlertTitle isDark={isDark}>
                {unresolvedConflicts.length} Conflict{unresolvedConflicts.length > 1 ? "s" : ""} Detected
              </ConflictAlertTitle>
              <ConflictAlertSubtitle isDark={isDark}>
                Medications already exist in your profile. Resolve them before saving.
              </ConflictAlertSubtitle>
            </View>
            <ResolveButton
              onPress={() => {
                setCurrentConflictIdx(0);
                setViewMode("conflicts");
              }}
              activeOpacity={0.8}
            >
              <ResolveButtonText>Resolve</ResolveButtonText>
            </ResolveButton>
          </ConflictAlertBanner>
        )}

        {documents
          .filter((doc) => doc.medicines.length > 0)
          .map((doc) => (
            <DocumentMedicineCard key={doc.id} document={doc}>
              {doc.medicines.map((med) => {
                const dupGroup = duplicateGroups.find((g) => g.medicineIds.includes(med.id));
                const isDup = Boolean(dupGroup && dupGroup.medicineIds.length > 1);
                const dupHasDiff = dupGroup ? dupGroup.hasDifference : false;
                const isBackendDup = Boolean(med.isBackendDuplicate || med.duplicateInfo?.hasDuplicate || med.hasDuplicate);

                return (
                  <ExtractedMedicineCard
                    key={med.id}
                    medicine={med}
                    onPress={() => navigation.navigate("MedicineDetails" as any, { medicineId: med.id })}
                    onToggle={() => toggleMedicineSelection(med.id)}
                    isDuplicate={isDup}
                    duplicateHasDifference={dupHasDiff}
                    isBackendDuplicate={isBackendDup}
                    resolution={resolutions[med.id]}
                    onResolve={() => {
                      const idx = activeConflictList.findIndex((c) => c.id === med.id);
                      if (idx !== -1) {
                        setCurrentConflictIdx(idx);
                      } else {
                        setCurrentConflictIdx(0);
                      }
                      setViewMode("conflicts");
                    }}
                  />
                );
              })}
            </DocumentMedicineCard>
          ))}
      </ScrollWrapper>

      <StickyFooter isDark={isDark} style={{ paddingBottom: bottomPadding }}>
        <CTAButton
          onPress={handleContinue}
          disabled={selectedCount === 0}
          themeColor={theme.colors.primary}
          activeOpacity={0.8}
          selected={selectedCount > 0}
        >
          <CTAButtonText>Review Selected ({selectedCount})</CTAButtonText>
        </CTAButton>
      </StickyFooter>
    </SafeContainer>
  );
};

const SafeContainer = styled.SafeAreaView<{ isDark: boolean }>`
  flex: 1;
  background-color: ${(props: any) => props.isDark ? "#0c0e17" : "#f7f8fc"};
`;

const ScrollWrapper = styled.ScrollView`
  flex: 1;
`;

const ConflictAlertBanner = styled.View<{ isDark: boolean }>`
  background-color: ${(props: any) => props.isDark ? "#291809" : "#fff7ed"};
  border-radius: 14px;
  padding: 14px;
  margin-bottom: 16px;
  border-width: 1px;
  border-color: #fdba74;
  flex-direction: row;
  align-items: center;
`;

const ConflictAlertTitle = styled.Text<{ isDark: boolean }>`
  font-size: 14px;
  font-weight: 700;
  color: ${(props: any) => props.isDark ? "#fed7aa" : "#9a3412"};
  margin-bottom: 2px;
`;

const ConflictAlertSubtitle = styled.Text<{ isDark: boolean }>`
  font-size: 11px;
  color: ${(props: any) => props.isDark ? "#fdba74" : "#c2410c"};
  line-height: 15px;
`;

const ResolveButton = styled.TouchableOpacity`
  background-color: #ea580c;
  padding-horizontal: 14px;
  padding-vertical: 8px;
  border-radius: 8px;
`;

const ResolveButtonText = styled.Text`
  color: #ffffff;
  font-size: 12px;
  font-weight: 700;
`;

const StickyFooter = styled.View<{ isDark: boolean }>`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding-horizontal: 20px;
  padding-top: 14px;
  padding-bottom: 24px;
  background-color: ${(props: any) => props.isDark ? "#121420" : "#ffffff"};
  border-top-width: 1px;
  border-top-color: ${(props: any) => props.isDark ? "#222538" : "#f1f5f9"};
`;

const CTAButton = styled.TouchableOpacity<{ selected: boolean; themeColor: string }>`
  background-color: ${(props: any) => props.selected ? props.themeColor : "#cbd5e1"};
  height: 50px;
  border-radius: 12px;
  justify-content: center;
  align-items: center;
  elevation: ${(props: any) => props.selected ? 3 : 0};
  shadow-color: #000;
  shadow-offset: 0px 4px;
  shadow-opacity: 0.10;
  shadow-radius: 6px;
`;

const CTAButtonText = styled.Text`
  color: #ffffff;
  font-size: 15px;
  font-weight: 700;
`;

export default ReviewMedicinesScreen;

