import React, { useEffect, useRef, useState } from "react";
import { ScrollView, ActivityIndicator } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import styled from "styled-components/native";
import ScreenHeader from "../../components/shared/Header";
import {
  Ionicons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/core";
import DualButtons from "../../components/shared/Buttons/DualButtons";
import ConfirmationModal from "../../components/shared/ConfirmationModal";
import { getUser } from "../../services/userService";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ProfileStackParamList } from "../../navigation/types";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback } from "react";
import { useAppTheme } from "../../context/ThemeContext";
import BottomSheet from "../../components/shared/BottomSheet";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { useDocumentMedia } from "../../hooks/useDocumentMedia";
import { getProfileImage } from "../../services/mediaServices";

type Gender = "Male" | "Female" | "Other";

const ProfileScreen = () => {
  const refRBSheet = useRef<BottomSheetModal>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [firstName, setFirstName] = useState<string | null>(null);
  const [lastName, setLastName] = useState<string | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [modalMode, setModalMode] = useState<"Log Out" | "Delete Account">(
    "Log Out",
  );
  const navigation =
    useNavigation<NativeStackNavigationProp<ProfileStackParamList>>();
  const queryClient = useQueryClient();
  const { isDark, theme } = useAppTheme();
  const { handleGalleryPick } = useDocumentMedia();
  const [profileImage, setProfileImage] = useState<string | null>(null);

  const fetchProfileImage = async () => {
    const image = await getProfileImage();
    setProfileImage(image);
  };

  useFocusEffect(
    useCallback(() => {
      queryClient.invalidateQueries({ queryKey: ["userProfile"] });
      fetchProfileImage();
    }, []),
  );

  const formData = {
    username: username ?? "",
    firstName: firstName ?? "",
    lastName: lastName ?? "",
  };

  const { data: userData, isLoading } = useQuery({
    queryKey: ["userProfile"],
    queryFn: async () => {
      const response = await getUser();
      return response?.data || response;
    },
  });

  useEffect(() => {
    if (userData) {
      setUsername(userData?.userName || "Guest");
      setEmail(userData?.email || "No Email");
      setFirstName(userData?.firstName || "");
      setLastName(userData?.lastName || "");
    }
  }, [userData]);

  const triggerDeleteAccount = () => {
    setModalMode("Delete Account");
    setShowModal(true);
  };

  const triggerLogOut = () => {
    setModalMode("Log Out");
    setShowModal(true);
  };

  return (
    <Container>
      <ScreenHeader title="Profile" showBack={true} />

      <ScrollView showsVerticalScrollIndicator={false}>
        <Content>
          <HeroSection>
            <AvatarContainer>
              <AvatarCircle
                source={{ uri: profileImage }}
                imageStyle={{width: 100, height: 100, borderRadius: 50}}
              />
              <EditBadge onPress={() => refRBSheet.current?.present()}>
                <MaterialCommunityIcons
                  name="camera-outline"
                  size={16}
                  color={theme.colors.background}
                />
              </EditBadge>
            </AvatarContainer>

            {isLoading ? (
              <ActivityIndicator
                size="small"
                color={theme.colors.primary}
                style={{ marginTop: 15 }}
              />
            ) : (
              <IdentityWrapper>
                <EditNameWrapper>
                  <UserName>{username || "Guest User"}</UserName>
                </EditNameWrapper>

                <UserEmail>{email}</UserEmail>
              </IdentityWrapper>
            )}
          </HeroSection>

          <StatsRow>
            <StatBox>
              <StatValue>5</StatValue>
              <StatLabel>Document Uploads</StatLabel>
            </StatBox>
            <StatDivider />
          </StatsRow>

          <SectionLabel>General</SectionLabel>
          <MenuCard>
            <MenuItem
              onPress={() => navigation.navigate("Home" as never)}
            >
              <IconWrapper style={{ backgroundColor: theme.colors.surfaceLight }}>
                <Ionicons name="document-text" size={20} color={theme.colors.primary} />
              </IconWrapper>
              <MenuText>My Documents</MenuText>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} />
            </MenuItem>

            <MenuDivider />

            <MenuItem
              onPress={() => {
                if (!userData) return;
                navigation.navigate("EditProfile", { formData });
              }}
            >
              <IconWrapper style={{ backgroundColor: theme.colors.success + '20' }}>
                <Ionicons name="person-outline" size={20} color={theme.colors.success} />
              </IconWrapper>
              <MenuText>Edit Profile</MenuText>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} />
            </MenuItem>
          </MenuCard>

          <ActionsWrapper>
            <DualButtons
              secondaryBtnText="Delete Account"
              secondaryBtnColor="grey"
              mainBtnColor="red"
              mainBtnText="Log Out"
              onSecondaryPress={triggerDeleteAccount}
              onMainPress={triggerLogOut}
            />
          </ActionsWrapper>
        </Content>
      </ScrollView>

      <ConfirmationModal
        showModal={showModal}
        onClose={() => setShowModal(false)}
        mode={modalMode}
      />

      <BottomSheet ref={refRBSheet}>
          <SheetContentWrapper>
            <SheetTitle>Add Document</SheetTitle>
            <SheetSubtitle>
              Securely upload or capture your record
            </SheetSubtitle>

            <SheetButtonsContainer>
              <SheetActionButton
                onPress={() =>
                  handleGalleryPick(() => refRBSheet.current?.dismiss(), true)
                }
              >
                <IconWrapperr
                  style={{ backgroundColor: isDark ? "#1e3a8a" : "#eff6ff" }}
                >
                  <MaterialCommunityIcons
                    name="image-plus"
                    size={28}
                    color="#3b82f6"
                  />
                </IconWrapperr>
                <SheetActionButtonText>Gallery</SheetActionButtonText>
              </SheetActionButton>
            </SheetButtonsContainer>
          </SheetContentWrapper>
        </BottomSheet>
    </Container>
  );
};

export default ProfileScreen;

const Container = styled.SafeAreaView`
  flex: 1;
  background-color: ${({ theme }: any) => theme.colors.background};
`;

const Content = styled.View`
  padding: 20px;
`;

const HeroSection = styled.View`
  align-items: center;
  margin-top: 10px;
  margin-bottom: 25px;
`;

const AvatarContainer = styled.View`
  position: relative;
`;

const AvatarCircle = styled.ImageBackground`
  width: 100px;
  height: 100px;
  border-radius: 50px;
  background-color: ${({ theme }: any) => theme.colors.surface};
  justify-content: center;
  align-items: center;
  border-width: 1px;
  border-color: ${({ theme }: any) => theme.colors.border};
  shadow-color: #000;
  shadow-opacity: 0.1;
  shadow-radius: 10px;
  elevation: 5;
`;

const EditBadge = styled.TouchableOpacity`
  position: absolute;
  bottom: 0;
  right: 0;
  background-color: ${({ theme }: any) => theme.colors.primary};
  width: 30px;
  height: 30px;
  border-radius: 15px;
  justify-content: center;
  align-items: center;
`;

const IdentityWrapper = styled.View`
  justify-content: center;
  align-items: center;
  margin-top: 15px;
`;

const EditNameWrapper = styled.View`
  flex-direction: row;
  align-items: center;
`;

const UserName = styled.Text`
  font-size: 20px;
  font-weight: 800;
  color: ${({ theme }: any) => theme.colors.textPrimary};
`;

const UsernameInput = styled.TextInput`
  padding: 5px;
  width: 40%;
  border: 1px solid ${({ theme }: any) => theme.colors.border};
  border-radius: 10px;
  color: ${({ theme }: any) => theme.colors.textPrimary};
  font-weight: 600;
`;

const EditIconWrapper = styled.TouchableOpacity`
  background-color: #cbe0fd;
  width: 30px;
  height: 30px;
  border-radius: 7px;
  justify-content: center;
  align-items: center;
  margin-left: 8px;
`;

const UserEmail = styled.Text`
  font-size: 15px;
  color: ${({ theme }: any) => theme.colors.textMuted};
  margin-top: 4px;
  font-weight: 600;
`;

const StatsRow = styled.View`
  flex-direction: row;
  background-color: ${({ theme }: any) => theme.colors.surface};
  border-radius: 20px;
  padding: 15px;
  margin-bottom: 30px;
  justify-content: space-around;
  align-items: center;
  shadow-color: #000;
  shadow-opacity: 0.03;
  elevation: 2;
`;

const StatBox = styled.View`
  align-items: center;
  flex: 1;
`;

const StatValue = styled.Text`
  font-size: 18px;
  font-weight: 800;
  color: ${({ theme }: any) => theme.colors.primary};
`;

const StatLabel = styled.Text`
  font-size: 12px;
  color: ${({ theme }: any) => theme.colors.textMuted};
  margin-top: 2px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const StatDivider = styled.View`
  width: 1px;
  height: 30px;
  background-color: ${({ theme }: any) => theme.colors.border};
`;

const SectionLabel = styled.Text`
  font-size: 13px;
  font-weight: 700;
  color: ${({ theme }: any) => theme.colors.textMuted};
  margin-bottom: 5px;
  margin-left: 5px;
  text-transform: uppercase;
  letter-spacing: 1px;
`;

const MenuCard = styled.View`
  background-color: ${({ theme }: any) => theme.colors.surface};
  border-radius: 24px;
  margin-bottom: 30px;
  overflow: hidden;
  shadow-color: #000;
  shadow-opacity: 0.03;
  elevation: 1;
`;

const MenuItem = styled.TouchableOpacity`
  flex-direction: row;
  align-items: center;
  padding: 16px;
`;

const IconWrapper = styled.View`
  width: 40px;
  height: 40px;
  border-radius: 12px;
  justify-content: center;
  align-items: center;
  margin-right: 15px;
`;

const MenuText = styled.Text`
  flex: 1;
  font-size: 16px;
  font-weight: 600;
  color: ${({ theme }: any) => theme.colors.textPrimary};
`;

const MenuDivider = styled.View`
  height: 1px;
  background-color: ${({ theme }: any) => theme.colors.border};
  margin-left: 70px;
`;

const ActionsWrapper = styled.View`
  margin-top: 100px;
`;

const SheetContentWrapper = styled.View`
  padding: 25px 20px;
  align-items: center;
`;

const SheetTitle = styled.Text`
  font-size: 22px;
  font-weight: 800;
  color: ${({ theme }: any) => theme.colors.textPrimary};
`;

const SheetSubtitle = styled.Text`
  font-size: 14px;
  color: ${({ theme }: any) => theme.colors.textMuted};
  margin-top: 6px;
  margin-bottom: 30px;
  text-align: center;
`;

const SheetButtonsContainer = styled.View`
  flex-direction: row;
  justify-content: space-evenly;
  width: 100%;
`;

const SheetActionButton = styled.TouchableOpacity`
  align-items: center;
  width: 100px;
  background-color: ${({ theme }: any) => theme.colors.surface};
  padding: 16px;
  border-radius: 20px;
  shadow-color: #000;
  shadow-opacity: 0.05;
  shadow-radius: 10px;
  elevation: 3;
`;

const IconWrapperr = styled.View`
  width: 30px;
  height: 30px;
  border-radius: 20px;
  justify-content: center;
  align-items: center;
  margin-bottom: 12px;
`;

const SheetActionButtonText = styled.Text`
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }: any) => theme.colors.textPrimary};
`;
