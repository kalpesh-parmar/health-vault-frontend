import React, { forwardRef, useState, useEffect, useCallback, useRef } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Platform,
  Alert,
  View,
  Text,
  TouchableOpacity,
  TextInput,
} from "react-native";
import styled from "styled-components/native";
import { BottomSheetModal, BottomSheetBackdrop, BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { Ionicons, Feather } from "@expo/vector-icons";
import { useAppTheme } from "../../context/ThemeContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { updateDocument } from "../../services/documentService";
import { queryClient } from "../../config/queryClient";
import { DOCUMENT_TYPE_OPTIONS } from "../../types/documentUpload";
import Toast from "react-native-toast-message";
import type { MedicalDocument } from "../../types";

export const BE_TO_UI_TYPE_MAP: Record<string, string> = {
  "prescription": "Prescription",
  "lab report": "Lab Report",
  "imaging report": "Imaging Report",
  "discharge summary": "Discharge Summary",
  "consultation report": "Consultation Report",
  "surgery procedure report": "Surgery Report",
  "vaccination record": "Vaccination Record",
  "medical certificate": "Medical Certificate",
  "family": "Family",
  "medical_document": "Medical Document",
  "medication": "Medication",
  "insurance": "Insurance",
  "other medical document": "Other Medical Document",
};

export const formatDocumentType = (type: string | undefined | null): string => {
  if (!type) return "Other";
  const normalized = type.toLowerCase();
  return BE_TO_UI_TYPE_MAP[normalized] || BE_TO_UI_TYPE_MAP[type] || type;
};

const getInitialType = (doc: any) => {
  if (!doc) return "Other Medical Document";
  const type = doc.documentType || "";
  return formatDocumentType(type);
};

const getFileNameAndExtension = (fileName: string) => {
  const dotIndex = fileName.lastIndexOf(".");
  if (dotIndex === -1) {
    return { name: fileName, extension: "" };
  }
  return {
    name: fileName.substring(0, dotIndex),
    extension: fileName.substring(dotIndex),
  };
};

interface EditDocumentBottomSheetProps {
  document: MedicalDocument | null;
  onSuccess: (updatedDoc: MedicalDocument) => void;
  onClose: () => void;
}

export const EditDocumentBottomSheet = forwardRef<any, EditDocumentBottomSheetProps>(
  ({ document, onSuccess, onClose }, ref: any) => {
    const { theme, isDark } = useAppTheme();
    const insets = useSafeAreaInsets();

    const initialFileInfo = document ? getFileNameAndExtension(document.fileName || "") : { name: "", extension: "" };
    const [formName, setFormName] = useState(initialFileInfo.name);
    const [fileExtension, setFileExtension] = useState(initialFileInfo.extension);
    const [formType, setFormType] = useState(getInitialType(document));
    const [nameError, setNameError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [apiError, setApiError] = useState<string | null>(null);
    const [showTypePicker, setShowTypePicker] = useState(false);

    const prevDocIdRef = useRef<string | null>(null);

    useEffect(() => {
      if (document && document.id !== prevDocIdRef.current) {
        prevDocIdRef.current = document.id;
        const { name, extension } = getFileNameAndExtension(document.fileName || "");
        setFormName(name);
        setFileExtension(extension);
        setFormType(getInitialType(document));
        setNameError(null);
        setApiError(null);
        setShowTypePicker(false);
      } else if (!document) {
        prevDocIdRef.current = null;
      }
    }, [document]);

    // Keyboard handling
    const [keyboardHeight, setKeyboardHeight] = useState(0);

    useEffect(() => {
      const showSub = Keyboard.addListener(
        Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
        (e) => {
          setKeyboardHeight(e.endCoordinates.height);
        }
      );
      const hideSub = Keyboard.addListener(
        Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
        () => {
          setKeyboardHeight(0);
        }
      );

      return () => {
        showSub.remove();
        hideSub.remove();
      };
    }, []);

    const isDirty =
      !document ||
      formName.trim() !== getFileNameAndExtension(document.fileName || "").name ||
      formType !== getInitialType(document);

    const isSaveDisabled =
      !formName.trim() ||
      !isDirty ||
      isSaving ||
      !!nameError ||
      !document;

    const handleNameChange = (text: string) => {
      const hasSpaces = /\s/.test(text);
      const sanitized = text.replace(/\s/g, "");
      setFormName(sanitized);

      if (hasSpaces) {
        setNameError("Spaces are not allowed in document name.");
      } else if (!sanitized) {
        setNameError("Document name cannot be empty.");
      } else {
        setNameError(null);
      }
    };

    const handleSave = async () => {
      if (isSaveDisabled || !document) return;
      setIsSaving(true);
      setApiError(null);

      try {
        const trimmedName = formName.trim();
        const finalFileName = fileExtension ? `${trimmedName}${fileExtension}` : trimmedName;
        const updatedData: Partial<MedicalDocument> = {
          id: document.id,
          fileName: finalFileName,
          documentType: formType,
          category: formType,
        };

        await updateDocument(updatedData);

        Toast.show({
          type: "success",
          text1: "Success",
          text2: "Document updated successfully",
        });

        // Invalidate lists in cache
        queryClient.invalidateQueries({ queryKey: ["documents"] });
        queryClient.invalidateQueries({ queryKey: ["allDocuments"] });
        queryClient.invalidateQueries({ queryKey: ["filteredDocuments"] });

        onSuccess({
          ...document,
          fileName: finalFileName,
          documentType: formType,
          category: formType,
        });
        
        onClose();
      } catch (err: any) {
        console.error("Failed to update document metadata:", err);
        setApiError(err?.message || "Failed to update document details.");
      } finally {
        setIsSaving(false);
      }
    };

    const handleCancelPress = () => {
      onClose();
    };

    const renderBackdrop = useCallback(
      (props: any) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          pressBehavior="close"
        />
      ),
      []
    );

    const baseBottomPadding = Math.max(insets.bottom, 16) + 8;
    const totalBottomPadding = keyboardHeight > 0
      ? keyboardHeight + 16
      : baseBottomPadding;

    return (
      <>
        <BottomSheetModal
          ref={ref}
          enablePanDownToClose={true}
          backdropComponent={renderBackdrop}
          keyboardBehavior="interactive"
          keyboardBlurBehavior="restore"
          android_keyboardInputMode="adjustResize"
          backgroundStyle={{
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            backgroundColor: theme.colors.surface,
          }}
          handleIndicatorStyle={{
            width: 40,
            height: 5,
            backgroundColor: theme.colors.bottomSheetBorder,
            borderRadius: 20,
          }}
        >
          <BottomSheetScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{
              paddingHorizontal: 20,
              paddingBottom: totalBottomPadding,
              paddingTop: 16,
            }}
          >
            {!showTypePicker ? (
              <>
                <HeaderSection>
                  <SheetTitle isDark={isDark}>Edit Document</SheetTitle>
                  <SheetSubtitle>Update your document details</SheetSubtitle>
                </HeaderSection>

                {/* Document Name input */}
                <InputContainer>
                  <LabelText>Document Name</LabelText>
                  <InputWrapper style={{ borderColor: nameError ? "#ef4444" : theme.colors.border }}>
                    <NameInput
                      value={formName}
                      onChangeText={handleNameChange}
                      placeholder="Enter document name"
                      placeholderTextColor={isDark ? "#64748b" : "#cbd5e1"}
                      isDark={isDark}
                      autoCapitalize="none"
                      autoCorrect={false}
                      accessibilityLabel="Document name input field"
                    />
                    {fileExtension ? (
                      <ExtensionText isDark={isDark}>{fileExtension}</ExtensionText>
                    ) : null}
                  </InputWrapper>
                  {nameError && <ErrorText>{nameError}</ErrorText>}
                </InputContainer>

                {/* Document Type selector */}
                <InputContainer style={{ marginTop: 16 }}>
                  <LabelText>Document Type</LabelText>
                  <SelectorButton
                    onPress={() => {
                      Keyboard.dismiss();
                      setShowTypePicker(true);
                    }}
                    isDark={isDark}
                    style={{ borderColor: theme.colors.border }}
                    accessibilityLabel="Select document type dropdown button"
                  >
                    <SelectorValueText isDark={isDark}>{formType}</SelectorValueText>
                    <Feather name="chevron-right" size={18} color={isDark ? "#94a3b8" : "#475569"} />
                  </SelectorButton>
                </InputContainer>

                {apiError && <ErrorText style={{ marginTop: 16 }}>{apiError}</ErrorText>}

                {/* Save and Cancel buttons */}
                <ButtonContainer>
                  <SaveButton
                    onPress={handleSave}
                    disabled={isSaveDisabled}
                    activeOpacity={0.8}
                    style={{
                      backgroundColor: theme.colors.primary,
                      opacity: isSaveDisabled ? 0.6 : 1,
                    }}
                    accessibilityLabel="Save document edits button"
                  >
                    {isSaving ? (
                      <ActivityIndicator color="white" size="small" />
                    ) : (
                      <SaveButtonText>Save Changes</SaveButtonText>
                    )}
                  </SaveButton>

                  <CancelButton onPress={handleCancelPress} activeOpacity={0.8}>
                    <CancelButtonText>Cancel</CancelButtonText>
                  </CancelButton>
                </ButtonContainer>
              </>
            ) : (
              <>
                <HeaderSection style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <View style={{ flex: 1, marginRight: 16 }}>
                    <SheetTitle isDark={isDark}>Document Type</SheetTitle>
                    <SheetSubtitle>Select the type of your document</SheetSubtitle>
                  </View>
                  <TouchableOpacity onPress={() => setShowTypePicker(false)}>
                    <Ionicons name="arrow-back-circle" size={32} color={theme.colors.primary} />
                  </TouchableOpacity>
                </HeaderSection>

                {DOCUMENT_TYPE_OPTIONS.map((type) => {
                  const isSelected = formType === type;
                  return (
                    <TypeOptionItem
                      key={type}
                      onPress={() => {
                        setFormType(type);
                        setShowTypePicker(false);
                      }}
                      isDark={isDark}
                      style={{ borderBottomColor: isDark ? "#334155" : "#f1f5f9" }}
                      accessibilityLabel={`Select document type ${type}`}
                    >
                      <TypeOptionText isDark={isDark} isSelected={isSelected}>
                        {type}
                      </TypeOptionText>
                      {isSelected && (
                        <Ionicons name="checkmark" size={20} color={theme.colors.primary} />
                      )}
                    </TypeOptionItem>
                  );
                })}
              </>
            )}
          </BottomSheetScrollView>
        </BottomSheetModal>
      </>
    );
  }
);

/* Styled components */

const HeaderSection = styled.View`
  margin-bottom: 20px;
`;

const SheetTitle = styled.Text<{ isDark: boolean }>`
  font-size: 20px;
  font-weight: 800;
  color: ${({ isDark }: { isDark: boolean }) => (isDark ? "#f8fafc" : "#1e293b")};
`;

const SheetSubtitle = styled.Text`
  font-size: 13px;
  color: #64748b;
  margin-top: 4px;
`;

const InputContainer = styled.View`
  width: 100%;
`;

const LabelText = styled.Text`
  font-size: 11px;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  margin-bottom: 8px;
`;

const InputWrapper = styled.View`
  height: 48px;
  border-width: 1px;
  border-radius: 12px;
  padding-horizontal: 14px;
  flex-direction: row;
  align-items: center;
`;

const NameInput = styled.TextInput<{ isDark: boolean }>`
  flex: 1;
  font-size: 14px;
  color: ${({ isDark }: { isDark: boolean }) => (isDark ? "#cbd5e1" : "#1e293b")};
`;

const ExtensionText = styled.Text<{ isDark: boolean }>`
  font-size: 14px;
  color: ${({ isDark }: { isDark: boolean }) => (isDark ? "#64748b" : "#475569")};
  font-weight: 600;
  margin-left: 4px;
`;

const SelectorButton = styled.TouchableOpacity<{ isDark: boolean }>`
  height: 48px;
  border-width: 1px;
  border-radius: 12px;
  padding-horizontal: 14px;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
`;

const SelectorValueText = styled.Text<{ isDark: boolean }>`
  font-size: 14px;
  color: ${({ isDark }: { isDark: boolean }) => (isDark ? "#cbd5e1" : "#1e293b")};
`;

const ErrorText = styled.Text`
  font-size: 12px;
  color: #ef4444;
  margin-top: 6px;
  font-weight: 500;
`;

const ButtonContainer = styled.View`
  margin-top: 24px;
  gap: 12px;
  width: 100%;
`;

const SaveButton = styled.TouchableOpacity`
  height: 50px;
  border-radius: 12px;
  justify-content: center;
  align-items: center;
`;

const SaveButtonText = styled.Text`
  color: white;
  font-size: 15px;
  font-weight: 700;
`;

const CancelButton = styled.TouchableOpacity`
  height: 50px;
  border-radius: 12px;
  justify-content: center;
  align-items: center;
  border-width: 1px;
  border-color: #cbd5e1;
`;

const CancelButtonText = styled.Text`
  color: #64748b;
  font-size: 15px;
  font-weight: 600;
`;

const TypeOptionItem = styled.TouchableOpacity<{ isDark: boolean }>`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding-vertical: 14px;
  border-bottom-width: 1px;
`;

const TypeOptionText = styled.Text<{ isDark: boolean; isSelected: boolean }>`
  font-size: 14px;
  font-weight: ${({ isSelected }: { isSelected: boolean }) => (isSelected ? "700" : "500")};
  color: ${({ isDark, isSelected }: { isDark: boolean; isSelected: boolean }) =>
    isSelected ? "#0d9488" : isDark ? "#cbd5e1" : "#475569"};
`;
