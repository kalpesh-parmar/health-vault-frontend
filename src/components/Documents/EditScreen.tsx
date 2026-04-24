import React, { useState } from "react";
import styled from "styled-components/native";
import ScreenHeader from "../shared/Header";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Alert } from "react-native";
import Toast from "react-native-toast-message";
import LogoutModal from "../Auth/LogoutModal";

const EditScreen = ({ route }: any) => {
  const { document } = route.params;
  const [filename, setFilename] = useState(document?.title ?? "");
  const [category, setCategory] = useState(document?.category ?? "");
  const [notes, setNotes] = useState(document?.notes ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [showModal, setShowModal] = useState<boolean>(false);

  const handleSave = async () => {
    setIsSaving(true);
    const payload = {
      title: filename.trim(),
      notes: notes.trim(),
    };
    setIsSaving(false);
    Toast.show({
      type: "success",
      text1: "Hurrahhh!!! 🥳",
      text2: `Document Updated Successfully.`,
    });
  };

  const handleDelete = () => {
    setShowModal(true);
  };

  return ( 
    <Container>
      <LogoutModal showModal={showModal} onClose={() => {setShowModal(false)}} mode="Delete Document" />
      <ScreenHeader title="Edit Document" showBack={true} />

      <ScrollContent>
        <SectionLabel>DOCUMENT DETAILS</SectionLabel>

        <FormCard>
          <FieldBlock>
            <FieldRow>
              <FieldIconBadge>
                <Ionicons name="document-text-outline" size={14} color={BLUE} />
              </FieldIconBadge>
              <FieldMeta>
                <FieldLabel>File Name</FieldLabel>
              </FieldMeta>
            </FieldRow>
            <StyledInput
              value={filename}
              onChangeText={setFilename}
              placeholder="Enter document name"
              placeholderTextColor="#94A3B8"
              returnKeyType="done"
            />
          </FieldBlock>

          <Divider />

          <FieldBlock>
            <FieldRow>
              <FieldIconBadge>
                <Ionicons name="pricetag-outline" size={14} color={BLUE} />
              </FieldIconBadge>
              <FieldMeta>
                <FieldLabel>Category</FieldLabel>
              </FieldMeta>
            </FieldRow>
            <StyledInput
              value={category}
              onChangeText={setCategory}
              placeholder="Enter document category"
              placeholderTextColor="#94A3B8"
              returnKeyType="done"
            />
          </FieldBlock>

          <Divider />

          <FieldBlock>
            <FieldRow>
              <FieldIconBadge>
                <Ionicons name="create-outline" size={14} color={BLUE} />
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
                <Ionicons name="calendar-outline" size={14} color={BLUE} />
              </FieldIconBadge>
              <FieldMeta>
                <FieldLabel>Created On</FieldLabel>
                <ReadOnlyPill>
                  <Ionicons name="lock-closed" size={9} color={SLATE} />
                  <ReadOnlyText>Read only</ReadOnlyText>
                </ReadOnlyPill>
              </FieldMeta>
            </FieldRow>
            <ReadOnlyValue editable={false}>
              {document?.createdAt ?? "—"}
            </ReadOnlyValue>
          </FieldBlock>
        </FormCard>

        <SaveButton
          onPress={handleSave}
          disabled={isSaving}
          activeOpacity={0.85}
        >
          <SaveGradient
            colors={["#1A56CC", "#1246A8"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {isSaving ? (
              <SaveButtonText>Saving...</SaveButtonText>
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={18} color="#fff" />
                <SaveButtonText>Save Changes</SaveButtonText>
              </>
            )}
          </SaveGradient>
        </SaveButton>

        <DangerCard>
          <DangerGradient
            colors={["#FFF5F5", "#FEF2F2"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <DangerHeader>
              <DangerIconBadge>
                <Ionicons name="warning" size={14} color="#fff" />
              </DangerIconBadge>
              <DangerTitle>Delete Document</DangerTitle>
            </DangerHeader>

            <DangerBody>
              <DangerBullet>
                <Ionicons name="close-circle" size={14} color={RED} />
                <DangerBulletText>
                  This document will be permanently removed from your records.
                </DangerBulletText>
              </DangerBullet>
            </DangerBody>

            <DeleteButton onPress={handleDelete} activeOpacity={0.85}>
              <Ionicons name="trash" size={16} color="#fff" />
              <DeleteButtonText>Delete This Document</DeleteButtonText>
            </DeleteButton>
          </DangerGradient>
        </DangerCard>

        <BottomSpacer />
      </ScrollContent>
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

const Container = styled.SafeAreaView`
  flex: 1;
  background-color: #f8fafc;
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
  color: ${SLATE};
  letter-spacing: 1.4px;
  margin-bottom: 10px;
  margin-left: 4px;
`;

const FormCard = styled.View`
  background-color: #ffffff;
  border-radius: 20px;
  padding: 6px 16px;
  margin-bottom: 14px;
  border-width: 0.5px;
  border-color: #e2e8f0;
  elevation: 4;
  shadow-color: ${BLUE};
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
  background-color: ${BLUE_LIGHT};
  border-width: 0.5px;
  border-color: ${BLUE_BORDER};
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
  color: #0f172a;
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
  color: ${SLATE};
`;

const StyledInput = styled.TextInput`
  background-color: ${BLUE_LIGHT};
  border-radius: 12px;
  border-width: 1px;
  border-color: ${BLUE_BORDER};
  padding: 12px 14px;
  font-size: 14px;
  color: #0f172a;
  font-weight: 500;
`;

const StyledTextArea = styled.TextInput`
  background-color: ${BLUE_LIGHT};
  border-radius: 12px;
  border-width: 1px;
  border-color: ${BLUE_BORDER};
  padding: 12px 14px;
  font-size: 14px;
  color: #0f172a;
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
  background-color: #f1f5f9;
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
  margin-top: 24px;
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
