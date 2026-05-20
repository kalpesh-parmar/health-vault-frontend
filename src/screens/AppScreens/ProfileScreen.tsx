import React, { useMemo, useRef, useState, useCallback } from "react";
import {
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  View,
} from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import styled from "styled-components/native";
import {
  Ionicons,
  MaterialCommunityIcons,
  FontAwesome5,
} from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/core";
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { LinearGradient } from "expo-linear-gradient";

// Components & Hooks
import ConfirmationModal from "../../components/shared/ConfirmationModal";
import BottomSheet from "../../components/shared/BottomSheet";
import DualButtons from "../../components/shared/Buttons/DualButtons";
import { getUser } from "../../services/userService";
import { useDocumentMedia } from "../../hooks/useDocumentMedia";
import { useAppTheme } from "../../context/ThemeContext";
import { ProfileStackParamList } from "../../navigation/types";

type NavigationProp = NativeStackNavigationProp<ProfileStackParamList>;

interface MenuItemData {
  icon: string;
  iconFamily: "Ionicons" | "MaterialCommunityIcons" | "FontAwesome5";
  label: string;
  iconBg: string;
  iconColor: string;
  onPress: () => void;
}

const ProfileScreen = () => {
  const refRBSheet = useRef<BottomSheetModal>(null);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [modalMode, setModalMode] = useState<"Log Out" | "Delete Account">(
    "Log Out",
  );
  const navigation = useNavigation<NavigationProp>();
  const queryClient = useQueryClient();
  const { isDark } = useAppTheme();
  const { handleGalleryPick } = useDocumentMedia();

  useFocusEffect(
    useCallback(() => {
      queryClient.invalidateQueries({ queryKey: ["userProfile"] });
    }, [queryClient]),
  );

  const { data: userData, isLoading } = useQuery({
    queryKey: ["userProfile"],
    queryFn: async () => {
      const response = await getUser();
      return response?.data || response;
    },
  });

  const username = userData?.userName ?? "";
  const email = userData?.email ?? "";
  const firstName = userData?.firstName ?? "";
  const lastName = userData?.lastName ?? "";
  const contact = userData?.phone ?? "";
  const age = userData?.age ?? 0;
  const gender = userData?.gender ?? "";
  const profileImage = userData?.profileImageKey ?? null;

  const formData = useMemo(
    () => ({
      profilePicture: profileImage
        ? {
            uri: profileImage,
            name: "profile.jpg",
            type: "image/jpeg",
          }
        : undefined,
      username,
      firstName,
      lastName,
      email,
      phone: contact,
      age,
      gender,
    }),
    [age, contact, email, firstName, gender, lastName, profileImage, username],
  );

  const menuItems: MenuItemData[] = [
    {
      icon: "person-outline",
      iconFamily: "Ionicons",
      label: "Edit Information",
      iconBg: "#EEF2FF",
      iconColor: "#6366F1",
      onPress: () => (navigation as any).navigate("EditProfile", { formData }),
    },
  ];

  const renderIcon = (item: MenuItemData, size = 22) => {
    if (item.iconFamily === "Ionicons")
      return (
        <Ionicons name={item.icon as any} size={size} color={item.iconColor} />
      );
    if (item.iconFamily === "MaterialCommunityIcons")
      return (
        <MaterialCommunityIcons
          name={item.icon as any}
          size={size}
          color={item.iconColor}
        />
      );
    return (
      <FontAwesome5
        name={item.icon as any}
        size={size}
        color={item.iconColor}
      />
    );
  };

  return (
    <Container>
      <HeaderGradient
        colors={
          isDark
            ? ["#064e3b", "#0369a1", "#312e81"]
            : ["#0f766e", "#0ea5e9", "#4f46e5"]
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Top Navigation Row */}
        <TopNavRow>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={28} color="white" />
          </TouchableOpacity>
        </TopNavRow>

        {/* Profile Glass Card */}
        <ProfileCard>
          <AvatarSection>
            <AvatarWrapper>
              <AvatarCircle
                source={profileImage ? { uri: profileImage } : undefined}
                imageStyle={{ borderRadius: 45 }}
              />
            </AvatarWrapper>

            <InfoWrapper>
              {isLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <View style={{ width: "100%" }}>
                  <UserName>{username}</UserName>
                  <UserEmail>{email}</UserEmail>
                  <UserPhone>{contact}</UserPhone>
                </View>
              )}
            </InfoWrapper>
          </AvatarSection>
        </ProfileCard>
      </HeaderGradient>

      <ScrollView showsVerticalScrollIndicator={false}>
        <MenuContainer>
          {menuItems.map((item, index) => (
            <React.Fragment key={item.label}>
              <MenuRow onPress={item.onPress} activeOpacity={0.75}>
                <MenuIconBox style={{ backgroundColor: item.iconBg }}>
                  {renderIcon(item)}
                </MenuIconBox>
                <MenuLabel>{item.label}</MenuLabel>
                <Ionicons name="chevron-forward" size={18} color="#C4C4C4" />
              </MenuRow>
              {index < menuItems.length - 1 && <RowDivider />}
            </React.Fragment>
          ))}
        </MenuContainer>

        <ActionsWrapper>
          <DualButtons
            secondaryBtnText="Delete Account"
            secondaryBtnColor="transparent"
            mainBtnColor="#4F78F1"
            mainBtnText="Log Out"
            onSecondaryPress={() => {
              setModalMode("Delete Account");
              setShowModal(true);
            }}
            onMainPress={() => {
              setModalMode("Log Out");
              setShowModal(true);
            }}
          />
        </ActionsWrapper>
      </ScrollView>

      <ConfirmationModal
        showModal={showModal}
        onClose={() => setShowModal(false)}
        mode={modalMode}
      />

      <BottomSheet ref={refRBSheet}>
        <SheetContentWrapper>
          <SheetTitle>Update Photo</SheetTitle>
          <SheetButtonsContainer>
            <SheetActionButton
              onPress={() =>
                handleGalleryPick(
                  () => refRBSheet.current?.dismiss(),
                  "Profile",
                )
              }
            >
              <SheetIconBox
                style={{ backgroundColor: isDark ? "#1e3a8a" : "#eff6ff" }}
              >
                <MaterialCommunityIcons
                  name="image-album"
                  size={28}
                  color="#3b82f6"
                />
              </SheetIconBox>
              <SheetActionButtonText>Gallery</SheetActionButtonText>
            </SheetActionButton>
          </SheetButtonsContainer>
        </SheetContentWrapper>
      </BottomSheet>
    </Container>
  );
};

export default ProfileScreen;

// --- Styled Components ---

const Container = styled.SafeAreaView`
  flex: 1;
  background-color: #f4f6fb;
`;

const HeaderGradient = styled(LinearGradient)`
  padding: 20px 20px 40px 20px;
  border-bottom-left-radius: 30px;
  border-bottom-right-radius: 30px;
`;

const TopNavRow = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  margin-top: 20px;
`;

const ProfileCard = styled.View`
  background-color: rgba(255, 255, 255, 0.25);
  border-radius: 24px;
  padding: 20px;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  border-width: 1px;
  border-color: rgba(255, 255, 255, 0.3);
`;

const AvatarSection = styled.View`
  flex-direction: row;
  align-items: center;
`;

const AvatarWrapper = styled.View`
  position: relative;
`;

const AvatarCircle = styled.ImageBackground`
  width: 90px;
  height: 90px;
  border-radius: 45px;
  border-width: 3px;
  border-color: white;
  overflow: hidden;
`;

const InfoWrapper = styled.View`
  margin-left: 15px;
`;

const UserName = styled.Text`
  width: 90%;
  font-size: 14px;
  font-weight: bold;
  color: white;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const UserEmail = styled.Text`
  font-size: 10px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  margin-top: 2px;
`;

const UserPhone = styled.Text`
  font-size: 14px;
  color: rgba(255, 255, 255, 0.9);
  font-weight: 600;
  margin-top: 2px;
`;

const MenuContainer = styled.View`
  background-color: white;
  margin: 20px 16px;
  border-radius: 20px;
  padding: 10px 0;
  elevation: 3;
  shadow-color: #000;
  shadow-opacity: 0.1;
  shadow-radius: 10px;
`;

const MenuRow = styled.TouchableOpacity`
  flex-direction: row;
  align-items: center;
  padding: 15px 20px;
`;

const MenuIconBox = styled.View`
  width: 40px;
  height: 40px;
  border-radius: 12px;
  justify-content: center;
  align-items: center;
  margin-right: 15px;
`;

const MenuLabel = styled.Text`
  flex: 1;
  font-size: 16px;
  font-weight: 500;
  color: #333;
`;

const RowDivider = styled.View`
  height: 1px;
  background-color: #f0f0f0;
  margin-left: 75px;
`;

const ActionsWrapper = styled.View`
  padding: 0 16px 40px 16px;
`;

const SheetContentWrapper = styled.View`
  padding: 24px;
  align-items: center;
`;
const SheetTitle = styled.Text`
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 20px;
`;
const SheetButtonsContainer = styled.View`
  width: 100%;
`;
const SheetActionButton = styled.TouchableOpacity`
  align-items: center;
`;
const SheetIconBox = styled.View`
  width: 60px;
  height: 60px;
  border-radius: 30px;
  justify-content: center;
  align-items: center;
  margin-bottom: 10px;
`;
const SheetActionButtonText = styled.Text`
  font-weight: 600;
`;
