import React, { useRef, useState } from "react";
import { StatusBar, Platform, Keyboard } from "react-native";
import styled from "styled-components/native";
import DualButtons from "../../components/shared/Buttons/DualButtons";
import BottomSheet from "../../components/shared/BottomSheet";
import ScreenHeader from "../../components/shared/Header";
import { RouteProp, useNavigation } from "@react-navigation/native";
import { AppStackParamList } from "../../navigation/types";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { useSaveDocument } from "../../hooks/useSaveDocument";
import ModernLoader from "../../components/shared/Loader";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../../context/ThemeContext";

type categoryItems = {
  label: string;
  value: string;
  icon: IconName;
  color: string;
  iconColor: string;
};

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

type Props = {
  route: RouteProp<AppStackParamList, "SaveDocument">;
};

type IconName = React.ComponentProps<typeof Ionicons>["name"];

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

const SaveDocumentScreen = ({ route }: Props) => {
  const imageUri = route?.params?.images;
  const aiSummary =
    route?.params?.aiSummary ||
    "Patient presented with acute respiratory symptoms over a 3-day period. BP: 128/82 mmHg. Prescribed Amoxicillin 500mg twice daily for 7 days. Follow-up recommended in 2 weeks. No known allergies noted.";

  const { isDark } = useAppTheme();
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const [docName, setDocName] = useState("");
  const [category, setCategory] = useState("");
  const [docNameFocused, setDocNameFocused] = useState(false);
  const [errors, setErrors] = useState<{ docName?: string; category?: string }>(
    {},
  );
  const navigation =
    useNavigation<NativeStackNavigationProp<AppStackParamList>>();

  const selected = CATEGORIES.find((c) => c.value === category);

  const { handleSave: saveDocument, isSaving } = useSaveDocument(() =>
    navigation.navigate("DocumentStack", {
      screen: "DocumentList",
      params: { category: category },
    }),
  );

  const sanitizeFileName = (name: string) => {
    return name
      .trim()
      .replace(/\s+/g, "_")
      .replace(/[^\w.-]/g, "");
  };

  const handleSave = async () => {
    const e: { docName?: string; category?: string } = {};
    if (!docName.trim()) e.docName = "Document name is required.";
    if (!category) e.category = "Please select a category.";
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    await saveDocument({
      fileName: docName,
      documentType: category,
      images: imageUri,
    });
  };

  return (
    <>
      {isSaving && (
        <ModernLoader
          visible={isSaving}
          title="Saving Document..."
          subtitle="Please wait while we save your document."
        />
      )}
      <Screen>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <ScreenHeader title="Add Document" showBack={true} />

        <Header>
          <HGroup>
            <HSubtitle>Review & save your scan</HSubtitle>
          </HGroup>
        </Header>

        <Body showsVerticalScrollIndicator={false}>
          <BodyPadding>
            <MainCard>
              <Section>
                <SectionTitleRow>
                  <SectionDot bg="#2563eb" />
                  <SectionTitle>Document Details</SectionTitle>
                </SectionTitleRow>

                <FieldLabel>Document Name</FieldLabel>
                <InputRow focused={docNameFocused} hasError={!!errors.docName}>
                  <TInput
                    value={docName}
                    placeholder="e.g. Blood Test Report"
                    placeholderTextColor="#cbd5e1"
                    cursorColor="#2563eb"
                    onChangeText={(t: string) => {
                      setDocName(sanitizeFileName(t));
                      if (t.trim())
                        setErrors((e) => ({ ...e, docName: undefined }));
                    }}
                    onFocus={() => setDocNameFocused(true)}
                    onBlur={() => setDocNameFocused(false)}
                    returnKeyType="done"
                  />
                </InputRow>
                {errors.docName && <ErrText>{errors.docName}</ErrText>}

                <FieldLabel style={{ marginTop: 15 }}>
                  Document Category
                </FieldLabel>
                <CatBtn
                  hasError={!!errors.category}
                  hasValue={!!category}
                  onPress={() => {
                    Keyboard.dismiss();
                    bottomSheetRef.current?.present();
                  }}
                  activeOpacity={0.75}
                >
                  {selected ? (
                    <CatPill bgColor={selected.color}>
                      <CatLabel color={selected.iconColor} isDark={isDark}>
                        {selected.label}
                      </CatLabel>
                    </CatPill>
                  ) : (
                    <>
                      <CatPlaceholder>Select a category</CatPlaceholder>
                    </>
                  )}
                </CatBtn>
                {errors.category && <ErrText>{errors.category}</ErrText>}
              </Section>

              <InnerDivider />

              <AIHeader>
                <AIBadge>
                  <AISpark>✦</AISpark>
                  <AIBadgeTxt>AI</AIBadgeTxt>
                </AIBadge>
                <AIHTitle>Smart Summary</AIHTitle>
                <AIStarRight>✦</AIStarRight>
              </AIHeader>

              <AIBody>
                <AIText>{aiSummary}</AIText>
              </AIBody>

              <InnerDivider />

              <PreviewSectionHeader>
                <PreviewSectionLeft>
                  <PreviewSectionTitle>Document Preview</PreviewSectionTitle>
                  <PreviewSectionSub>Scanned just now</PreviewSectionSub>
                </PreviewSectionLeft>
                <PreviewRow>
                  <Thumb>
                    {imageUri ? (
                      <ThumbImg source={{ uri: imageUri }} resizeMode="cover" />
                    ) : (
                      <ThumbPH>
                        <ThumbPHTxt>Preview{"\n"}here</ThumbPHTxt>
                      </ThumbPH>
                    )}
                  </Thumb>
                </PreviewRow>
              </PreviewSectionHeader>
            </MainCard>
          </BodyPadding>
        </Body>

        <BottomBar>
          <DualButtons
            secondaryBtnText="Discard"
            secondaryBtnColor={`${({ isDark, theme }: any) => (isDark ? theme.colors.error : theme.colors.error)}`}
            mainBtnText="Save Document"
            mainBtnColor="#2563eb"
            onSecondaryPress={() => navigation?.goBack?.()}
            onMainPress={handleSave}
          />
        </BottomBar>

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
                  setErrors((e) => ({ ...e, category: undefined }));
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
      </Screen>
    </>
  );
};

export default SaveDocumentScreen;

const Screen = styled.View`
  flex: 1;
  background-color: ${({ theme }: any) => theme.colors.background};
`;

const Header = styled.View`
  flex-direction: row;
  padding: 5px;
`;

const HGroup = styled.View`
  flex: 1;
  align-items: center;
  justify-content: center;
  margin-top: 10px;
`;

const HSubtitle = styled.Text`
  font-size: 20px;
  color: ${({ theme }: any) => theme.colors.textPrimary};
  font-family: "Inter_600SemiBold";
`;

const Body = styled.ScrollView`
  flex: 1;
`;
const BodyPadding = styled.View`
  padding: 20px 16px 120px 16px;
`;

const MainCard = styled.View`
  background-color: ${({ theme }: any) => theme.colors.surface};
  border-radius: 24px;
  overflow: hidden;
  shadow-color: ${({ theme }: any) => theme.colors.primary};
  shadow-offset: 0px 4px;
  shadow-opacity: 0.08;
  shadow-radius: 20px;
  elevation: 5;
`;

const InnerDivider = styled.View`
  height: 1px;
  background-color: ${({ theme }: any) => theme.colors.border};
  margin: 0px 0px;
`;

const Section = styled.View`
  padding: 20px 20px;
`;

const SectionTitleRow = styled.View`
  flex-direction: row;
  align-items: center;
  margin-bottom: 16px;
`;
const SectionDot = styled.View<{ bg?: string }>`
  width: 7px;
  height: 7px;
  border-radius: 4px;
  background-color: ${({ bg }: { bg?: string }) => bg || "#2563eb"};
  margin-right: 8px;
`;
const SectionTitle = styled.Text`
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme }: any) => theme.colors.textMuted};
  letter-spacing: 1px;
  text-transform: uppercase;
`;

const FieldLabel = styled.Text`
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }: any) => theme.colors.textMuted};
  letter-spacing: 0.8px;
  text-transform: uppercase;
  margin-bottom: 7px;
`;

const InputRow = styled.View<FocusProps>`
  flex-direction: row;
  align-items: center;
  background-color: ${({ theme }: any) => theme.colors.surfaceLight};
  border-width: 1.5px;
  border-color: ${({
    focused,
    hasError,
    theme,
  }: FocusProps & { theme: any }) =>
    hasError
      ? "#ef4444"
      : focused
        ? theme.colors.primary
        : theme.colors.border};
  border-radius: 13px;
  padding: 0px 5px;
  height: 50px;
`;

const TInput = styled.TextInput`
  flex: 1;
  font-size: 14px;
  color: ${({ theme }: any) => theme.colors.textPrimary};
  font-weight: 700;
`;
const ErrText = styled.Text`
  font-size: 11px;
  color: #ef4444;
  margin-top: 4px;
  margin-left: 3px;
  font-weight: 500;
`;

const CatBtn = styled.TouchableOpacity<OpenProps>`
  flex-direction: row;
  align-items: center;
  background-color: ${({ theme }: any) => theme.colors.surfaceLight};
  border-width: 1.5px;
  border-color: ${({
    hasError,
    hasValue,
    theme,
  }: OpenProps & { theme: any }) =>
    hasError
      ? "#ef4444"
      : hasValue
        ? theme.colors.primary
        : theme.colors.border};
  border-radius: 13px;
  padding: 0px 5px;
  height: 50px;
`;
const CatPill = styled.View<BgProps>`
  flex-direction: row;
  align-items: center;
  border-radius: 20px;
  padding: 3px 9px;
  margin-right: 6px;
`;

const CatLabel = styled.Text<ColProps & { isDark?: boolean }>`
  font-size: 14px;
  font-weight: 700;
  color: ${({ isDark, theme }: any) =>
    isDark ? theme.colors.white : theme.colors.textPrimary};
`;
const CatPlaceholder = styled.Text`
  flex: 1;
  font-size: 14px;
  color: ${({ theme }: any) => theme.colors.textMuted};
`;

const AIHeader = styled.View<{
  isDark: boolean;
}>`
  background-color: ${({ theme, isDark }: any) =>
    isDark ? theme.colors.white : theme.colors.textPrimary};
  padding: 14px 20px;
  flex-direction: row;
  align-items: center;
`;

const AIBadge = styled.View`
  background-color: rgba(255, 255, 255, 0.16);
  border-radius: 20px;
  padding: 3px 9px;
  flex-direction: row;
  align-items: center;
  margin-right: 9px;
`;
const AIBadgeTxt = styled.Text`
  font-size: 10px;
  font-weight: 800;
  color: #ffffff;
  letter-spacing: 0.8px;
`;
const AISpark = styled.Text`
  font-size: 11px;
  margin-right: 3px;
`;
const AIHTitle = styled.Text`
  font-size: 14px;
  font-weight: 700;
  color: #ffffff;
  flex: 1;
`;
const AIStarRight = styled.Text`
  font-size: 13px;
  color: #93c5fd;
`;
const AIBody = styled.View`
  padding: 16px 20px;
`;
const AIText = styled.Text`
  font-size: 13px;
  line-height: 21px;
  color: ${({ theme }: any) => theme.colors.textPrimary};
  font-weight: 400;
`;

const PreviewSectionHeader = styled.View`
  flex-direction: row;
  align-items: center;
  padding: 14px 20px 12px 20px;
  border-bottom-width: 1px;
  border-bottom-color: ${({ theme }: any) => theme.colors.surfaceLight};
`;
const PreviewSectionLeft = styled.View`
  flex: 1;
`;
const PreviewSectionTitle = styled.Text`
  font-size: 13px;
  font-weight: 700;
  color: ${({ theme }: any) => theme.colors.textPrimary};
  letter-spacing: -0.1px;
`;
const PreviewSectionSub = styled.Text`
  font-size: 11px;
  color: ${({ theme }: any) => theme.colors.textMuted};
  margin-top: 1px;
`;

const PreviewRow = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: center;
`;

const Thumb = styled.View`
  width: 70px;
  height: 70px;
  border-radius: 7px;
  overflow: hidden;
  background-color: ${({ theme }: any) => theme.colors.surfaceLight};
  border-width: 1px;
  border-color: ${({ theme }: any) => theme.colors.border};
`;
const ThumbImg = styled.Image`
  width: 100%;
  height: 100%;
`;
const ThumbPH = styled.View`
  flex: 1;
  align-items: center;
  justify-content: center;
  background-color: ${({ theme }: any) => theme.colors.surfaceLight};
`;

const ThumbPHTxt = styled.Text`
  font-size: 10px;
  color: ${({ theme }: any) => theme.colors.textMuted};
  margin-top: 5px;
  text-align: center;
  font-weight: 500;
`;

const BottomBar = styled.View`
  background-color: ${({ theme }: any) => theme.colors.surface};
  padding: 14px 20px ${Platform.OS === "ios" ? "30px" : "18px"} 20px;
  border-top-width: 1px;
  border-top-color: ${({ theme }: any) => theme.colors.border};
  shadow-color: ${({ theme }: any) => theme.colors.primary};
  shadow-offset: 0px -3px;
  shadow-opacity: 0.06;
  shadow-radius: 10px;
  elevation: 8;
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
  color: ${({ theme }: any) => theme.colors.primary};
  font-weight: 700;
`;
