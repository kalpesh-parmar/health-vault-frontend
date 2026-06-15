import React, { useRef, useState } from "react";
import styled from "styled-components/native";
import { SafeAreaView } from "react-native-safe-area-context";
import ScreenHeader from "../../components/shared/Header";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Toast from "react-native-toast-message";
import ConfirmationModal from "../../components/shared/ConfirmationModal";
import DualButtons from "../../components/shared/Buttons/DualButtons";
import { useNavigation } from "@react-navigation/native";
import { AppStackParamList } from "../../navigation/types";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useMutation } from "@tanstack/react-query";
import { updateDocument } from "../../services/documentService";
import type { MedicalDocument } from "../../types";
import BottomSheet from "../../components/shared/BottomSheet";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { useAppTheme } from "../../context/ThemeContext";
import { Keyboard } from "react-native";
import { queryClient } from "../../config/queryClient";
import Loader from "../../components/shared/Loader";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

type categoryItems = {
  label: string;
  value: string;
  icon: IconName;
  color: string;
  iconColor: string;
};

interface FocusProps {
  focused?: boolean;
  hasError?: boolean;
}
interface OpenProps {
  hasError?: boolean;
  hasValue?: boolean;
}
interface SelProps {
  selected: boolean;
}
interface BgProps {
  bgColor: string;
}
interface ColProps {
  color: string;
}

const CATEGORIES: categoryItems[] = [
  {
    label: "Family",
    value: "family",
    icon: "people-outline",
    color: "#dbeafe",
    iconColor: "#1d4ed8",
  },
  {
    label: "Medical Documents",
    value: "medical_document",
    icon: "reader-outline",
    color: "#ede9fe",
    iconColor: "#7c3aed",
  },
  {
    label: "Medication",
    value: "medication",
    icon: "bandage-outline",
    color: "#d1fae5",
    iconColor: "#059669",
  },
  {
    label: "Insurance",
    value: "insurance",
    icon: "briefcase-outline",
    color: "#fef3c7",
    iconColor: "#d97706",
  },
  {
    label: "Other",
    value: "other",
    icon: "apps-outline",
    color: "#f1f5f9",
    iconColor: "#475569",
  },
];

const EditScreen = ({ route }: any) => {
  const { document } = route.params;

  const [filename, setFilename] = useState(document?.fileName ?? "");
  const [category, setCategory] = useState(document?.documentType ?? "");
  const [notes, setNotes] = useState(document?.notes ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);
  const navigation =
    useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const { isDark } = useAppTheme();

  const selected = CATEGORIES.find((c) => c.value === category);

  const updateDocumentMutation = useMutation({
    mutationFn: updateDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["filteredDocuments"] });
      queryClient.invalidateQueries({ queryKey: ["allDocuments"] });
      Toast.show({
        type: "success",
        text1: "Document Updated Successfully.",
      });
      navigation.navigate("DocumentStack", {
        screen: "DocumentList",
        params: { category },
      });
    },
    onError: () => {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to update document",
      });
      setIsSaving(false);
    },
  });

  const handleSave = async () => {
    if (!filename.trim()) {
      setError("File name is required");
      return;
    }
    
    setIsSaving(true);

    const payload: Partial<MedicalDocument> = {
      id: document?.id || "",
      fileName: filename.trim() || "",
      notes: notes.trim() || "",
      category: category.trim() || "",
      createdAt: document.createdAt,
    };
    await updateDocumentMutation.mutateAsync(payload);
  };

  const handleDelete = () => {
    setShowModal(true);
  };

  return (
    <Container>
      <ConfirmationModal
        showModal={showModal}
        onClose={() => {
          setShowModal(false);
        }}
        mode="Delete Document"
        documentId={document?.id}
      />
      <ScreenHeader title="Edit Document" showBack={true} />

      <ScrollContent>
        <SectionLabel>DOCUMENT DETAILS</SectionLabel>

        <FormCard>
          <FieldBlock>
            <FieldRow>
              <FieldIconBadge>
                <Ionicons
                  name="document-text-outline"
                  size={14}
                  color={isDark ? "#60a5fa" : "#1246A8"}
                />
              </FieldIconBadge>
              <FieldMeta>
                <FieldLabel>File Name</FieldLabel>
              </FieldMeta>
            </FieldRow>
            <StyledInput
              value={filename}
              onChangeText={(text: string) => {
                setFilename(text);
                setError(null);
              }}
              placeholder="Enter document name"
              placeholderTextColor="#94A3B8"
              returnKeyType="done"
            />
            {error ? <FieldErrorText>{error}</FieldErrorText> : null}
          </FieldBlock>

          <Divider />

          <FieldBlock>
            <FieldRow>
              <FieldIconBadge>
                <Ionicons
                  name="pricetag-outline"
                  size={14}
                  color={isDark ? "#60a5fa" : "#1246A8"}
                />
              </FieldIconBadge>
              <FieldMeta>
                <FieldLabel>Category</FieldLabel>
              </FieldMeta>
            </FieldRow>
            <CatBtn
              onPress={() => {
                Keyboard.dismiss();
                bottomSheetRef.current?.present();
              }}
              activeOpacity={0.75}
            >
              {selected ? (
                <CatPill bgColor={selected.color}>
                  <CatLabel color={selected.iconColor}>
                    {selected.label}
                  </CatLabel>
                </CatPill>
              ) : (
                <>
                  <CatPlaceholder>Select a category</CatPlaceholder>
                </>
              )}
            </CatBtn>
          </FieldBlock>

          <Divider />

          <FieldBlock>
            <FieldRow>
              <FieldIconBadge>
                <Ionicons
                  name="create-outline"
                  size={14}
                  color={isDark ? "#60a5fa" : "#1246A8"}
                />
              </FieldIconBadge>
              <FieldMeta>
                <FieldLabel>Notes</FieldLabel>
              </FieldMeta>
            </FieldRow>
            <StyledTextArea
              value={notes}
              onChangeText={setNotes}
              placeholder="Add notes about this document…"
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </FieldBlock>

          <Divider />

          <FieldBlock style={{ marginBottom: 0 }}>
            <FieldRow>
              <FieldIconBadge>
                <Ionicons
                  name="calendar-outline"
                  size={14}
                  color={isDark ? "#60a5fa" : "#1246A8"}
                />
              </FieldIconBadge>
              <FieldMeta>
                <FieldLabel>Created On</FieldLabel>
              </FieldMeta>
            </FieldRow>
            <ReadOnlyText
              style={{ marginTop: 6, marginLeft: 40, fontSize: 14 }}
            >
              {(() => {
                if (!document?.createdAt) return "—";
                try {
                  const d = new Date(document.createdAt);
                  return isNaN(d.getTime()) ? "—" : d.toISOString().split("T")[0];
                } catch {
                  return "—";
                }
              })()}
            </ReadOnlyText>
          </FieldBlock>
        </FormCard>

        <DualButtons
          mainBtnText="Save Changes"
          mainBtnColor="blue"
          secondaryBtnText="Delete Document"
          secondaryBtnColor="red"
          onMainPress={handleSave}
          onSecondaryPress={handleDelete}
          isLoading={isSaving}
        />
        <BottomSpacer />
      </ScrollContent>

      <BottomSheet ref={bottomSheetRef} enablePanDownToClose={true}>
        <SheetContentWrapper>
          <BSTitle>Select Category</BSTitle>
          <BSSub>Choose the type of medical document</BSSub>
          {CATEGORIES.map((item, idx) => (
            <BSItem
              key={item.label}
              selected={category === item.value}
              onPress={() => {
                setCategory(item.value);
                bottomSheetRef.current?.dismiss();
              }}
              activeOpacity={0.7}
              style={
                idx === CATEGORIES.length - 1 ? { borderBottomWidth: 0 } : {}
              }
            >
              <BSIconBadge bgColor={item.color}>
                <Ionicons name={item.icon} size={20} color={item.iconColor} />
              </BSIconBadge>
              <BSLbl selected={category === item.value}>{item.label}</BSLbl>
              {category === item.value && <BSCheck>✓</BSCheck>}
            </BSItem>
          ))}
        </SheetContentWrapper>
      </BottomSheet>
    </Container>
  );
};

export default EditScreen;

const BLUE = "#1246A8";
const BLUE_LIGHT = "#EEF3FD";
const BLUE_BORDER = "#C5D5F7";
const RED = "#E53535";
const RED_BORDER = "#FECACA";
const SLATE = "#94A3B8";

const Container = styled(SafeAreaView)`
  flex: 1;
  background-color: ${({ theme }: any) => theme.colors.background};
`;

const ScrollContent = styled.ScrollView.attrs({
  contentContainerStyle: { padding: 16, paddingBottom: 32 },
  showsVerticalScrollIndicator: false,
})`
  flex: 1;
  margin-top: 7px;
`;

const SectionLabel = styled.Text`
  font-size: 10px;
  font-weight: 700;
  color: ${({ theme }: any) => theme.colors.textMuted};
  letter-spacing: 1.4px;
  margin-bottom: 10px;
  margin-left: 4px;
`;

const FormCard = styled.View`
  background-color: ${({ theme }: any) => theme.colors.surface};
  border-radius: 20px;
  padding: 6px 16px;
  margin-bottom: 14px;
  border-width: 0.5px;
  border-color: ${({ theme }: any) => theme.colors.border};
  elevation: 4;
  shadow-color: ${({ theme }: any) => theme.colors.primary};
  shadow-opacity: 0.07;
  shadow-radius: 12px;
  shadow-offset: 0px 4px;
`;

const FieldBlock = styled.View`
  padding-vertical: 14px;
`;

const FieldRow = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
`;

const FieldIconBadge = styled.View`
  width: 30px;
  height: 30px;
  border-radius: 9px;
  background-color: ${({ theme }: any) => theme.colors.iconBox};
  border-width: 0.5px;
  border-color: ${({ theme }: any) => theme.colors.border};
  align-items: center;
  justify-content: center;
`;

const FieldMeta = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 8px;
  flex: 1;
`;

const FieldLabel = styled.Text`
  font-size: 13px;
  font-weight: 700;
  color: ${({ theme }: any) => theme.colors.textPrimary};
`;

const ReadOnlyPill = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 4px;
  background-color: #f1f5f9;
  border-radius: 20px;
  padding: 2px 8px;
  border-width: 0.5px;
  border-color: #e2e8f0;
`;

const ReadOnlyText = styled.Text`
  font-size: 10px;
  font-weight: 600;
  color: ${({ theme }: any) => theme.colors.textMuted};
`;

const StyledInput = styled.TextInput`
  background-color: ${({ theme }: any) => theme.colors.surfaceLight};
  border-radius: 12px;
  border-width: 1px;
  border-color: ${({ theme }: any) => theme.colors.border};
  padding: 12px 14px;
  font-size: 14px;
  color: ${({ theme }: any) => theme.colors.textPrimary};
  font-weight: 500;
`;

const FieldErrorText = styled.Text`
  color: #ef4444;
  font-size: 11px;
  margin-top: 6px;
`;

const CatBtn = styled.TouchableOpacity`
  flex-direction: row;
  align-items: center;
  background-color: ${({ theme }: any) => theme.colors.surfaceLight};
  border-radius: 12px;
  border-width: 1px;
  border-color: ${({ theme }: any) => theme.colors.border};
  padding: 0px 10px;
  height: 46px;
`;

const CatPill = styled.View<BgProps>`
  flex-direction: row;
  align-items: center;
  border-radius: 20px;
  padding: 4px 10px;
  margin-right: 6px;
  background-color: ${({ bgColor }: BgProps) => bgColor};
`;

const CatLabel = styled.Text<ColProps>`
  font-size: 14px;
  font-weight: 700;
  color: ${({ color }: ColProps) => color};
`;

const CatPlaceholder = styled.Text`
  flex: 1;
  font-size: 14px;
  color: #94a3b8;
  padding-left: 4px;
`;

const StyledTextArea = styled.TextInput`
  background-color: ${({ theme }: any) => theme.colors.surfaceLight};
  border-radius: 12px;
  border-width: 1px;
  border-color: ${({ theme }: any) => theme.colors.border};
  padding: 12px 14px;
  font-size: 14px;
  color: ${({ theme }: any) => theme.colors.textPrimary};
  font-weight: 500;
  min-height: 96px;
`;

const ReadOnlyValue = styled.TextInput`
  font-size: 14px;
  font-weight: 500;
  color: #64748b;
  background-color: #f8fafc;
  border-radius: 12px;
  border-width: 1px;
  border-color: #e2e8f0;
  padding: 12px 14px;
`;

const Divider = styled.View`
  height: 0.5px;
  background-color: ${({ theme }: any) => theme.colors.border};
  margin-horizontal: -16px;
`;

const SaveButton = styled.TouchableOpacity<{ disabled?: boolean }>`
  border-radius: 18px;
  overflow: hidden;
  opacity: ${({ disabled }: any) => (disabled ? 0.6 : 1)};
  elevation: 6;
  shadow-color: ${BLUE};
  shadow-opacity: 0.28;
  shadow-radius: 14px;
  shadow-offset: 0px 6px;
`;

const SaveGradient = styled(LinearGradient)`
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 17px;
`;

const SaveButtonText = styled.Text`
  font-size: 15px;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: 0.3px;
`;

const DangerCard = styled.View`
  margin-top: 14px;
  border-radius: 20px;
  overflow: hidden;
  border-width: 0.5px;
  border-color: ${RED_BORDER};
  elevation: 4;
  shadow-color: ${RED};
  shadow-opacity: 0.08;
  shadow-radius: 12px;
  shadow-offset: 0px 4px;
`;

const DangerGradient = styled(LinearGradient)`
  padding: 18px;
`;

const DangerHeader = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
`;

const DangerIconBadge = styled.View`
  width: 30px;
  height: 30px;
  border-radius: 9px;
  background-color: ${RED};
  align-items: center;
  justify-content: center;
`;

const DangerTitle = styled.Text`
  font-size: 15px;
  font-weight: 700;
  color: ${RED};
`;

const DangerBody = styled.View`
  gap: 8px;
  margin-bottom: 18px;
`;

const DangerBullet = styled.View`
  flex-direction: row;
  align-items: flex-start;
  gap: 8px;
`;

const DangerBulletText = styled.Text`
  font-size: 13px;
  color: #64748b;
  line-height: 20px;
  flex: 1;
`;

const DeleteButton = styled.TouchableOpacity`
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background-color: ${RED};
  border-radius: 14px;
  padding: 14px;
  elevation: 4;
  shadow-color: ${RED};
  shadow-opacity: 0.3;
  shadow-radius: 10px;
  shadow-offset: 0px 4px;
`;

const DeleteButtonText = styled.Text`
  font-size: 14px;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: 0.2px;
`;

const BottomSpacer = styled.View`
  height: 70px;
`;

const SheetContentWrapper = styled.View`
  padding: 25px 20px;
  padding-bottom: 50px;
  align-items: center;
`;

const BSTitle = styled.Text`
  font-size: 17px;
  font-weight: 800;
  color: ${({ theme }: any) => theme.colors.textPrimary};
  margin-bottom: 3px;
  letter-spacing: -0.3px;
`;
const BSSub = styled.Text`
  font-size: 12px;
  color: ${({ theme }: any) => theme.colors.textMuted};
  margin-bottom: 18px;
`;
const BSItem = styled.TouchableOpacity<SelProps>`
  flex-direction: row;
  align-items: center;
  padding: 12px 0px;
  border-bottom-width: 1px;
  border-bottom-color: ${({ theme }: any) => theme.colors.border};
`;
const BSIconBadge = styled.View<BgProps>`
  width: 38px;
  height: 38px;
  border-radius: 11px;
  background-color: ${({ bgColor }: BgProps) => bgColor};
  align-items: center;
  justify-content: center;
  margin-right: 13px;
`;
const BSIconTxt = styled.Text`
  font-size: 17px;
`;
const BSLbl = styled.Text<SelProps>`
  flex: 1;
  font-size: 14px;
  font-weight: ${({ selected }: SelProps) => (selected ? "700" : "400")};
  color: ${({ selected, theme }: any) =>
    selected ? theme.colors.primary : theme.colors.textPrimary};
`;
const BSCheck = styled.Text`
  font-size: 15px;
  color: #2563eb;
  font-weight: 700;
`;
