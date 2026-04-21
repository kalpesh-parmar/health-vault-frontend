import React, { useEffect, useState } from "react";
import { ScrollView, ActivityIndicator } from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import styled from "styled-components/native";
import ScreenHeader from "../components/shared/Header";
import {
  Ionicons,
  MaterialCommunityIcons,
  MaterialIcons,
} from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/core";
import DualButtons from "../components/shared/Buttons/DualButtons";
import LogoutModal from "../components/Auth/LogoutModal";
import { getUserById, updateUser } from "../services/authService"; 
import * as SecureStore from 'expo-secure-store';
import Toast from "react-native-toast-message"; 

const ProfileScreen = () => {
  const [username, setUsername] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [modalMode, setModalMode] = useState<"Log Out" | "Delete Account">(
    "Log Out",
  );
  const [editedUsername, setEditedUsername] = useState<string>("");
  const [showInput, setShowInput] = useState<boolean>(false);
  const navigation = useNavigation();
  const queryClient = useQueryClient();

  const updateProfileMutation = useMutation({
    mutationFn: async (newUsername: string) => {
      const userId = await SecureStore.getItemAsync("userId");
      if (!userId) throw new Error("No user ID found in SecureStore.");
      return await updateUser(userId, { userName: newUsername });
    },
    onSuccess: () => {
      console.log("Profile Updated Successfully.");
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
      Toast.show({
        type: "success",
        text1: "Profile Updated",
        text2: "Username changed successfully.",
      });
    },
    onError: (error: any) => {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: error.message || "Could not update username.",
      });
    }
  });

  const { data: userData, isLoading } = useQuery({
    queryKey: ['userProfile'],
    queryFn: async () => {
      const userId = await SecureStore.getItemAsync("userId");
      if (!userId) throw new Error("No user ID found in SecureStore.");
      const response = await getUserById(userId);
      return response?.data || response;
    }
  });

  useEffect(() => {
    if (userData) {
      setUsername(userData?.userName || "Guest");
      setEmail(userData?.email || "No Email");
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

  const handleEditProfile = () => {
    setShowInput(true);
  };

  const handleSaveUsername = () => {
    if (editedUsername && editedUsername !== username) {
      updateProfileMutation.mutate(editedUsername);
      setUsername(editedUsername); 
    }
    setEditedUsername("");
    setShowInput(false);
  };

  return (
    <Container>
      <ScreenHeader title="Profile" showBack={true} />

      <ScrollView showsVerticalScrollIndicator={false}>
        <Content>
          <HeroSection>
            <AvatarContainer>
              <AvatarCircle>
                <Ionicons name="person" size={45} color="#2563eb" />
              </AvatarCircle>
              <EditBadge>
                <MaterialCommunityIcons
                  name="camera-outline"
                  size={16}
                  color="white"
                />
              </EditBadge>
            </AvatarContainer>

            {isLoading ? (
              <ActivityIndicator
                size="small"
                color="#2563eb"
                style={{ marginTop: 15 }}
              />
            ) : (
              <IdentityWrapper>
                <EditNameWrapper>
                  {showInput ? (
                    <UsernameInput
                      placeholder="New username"
                      onChangeText={setEditedUsername}
                      onBlur={handleSaveUsername} 
                      placeholderTextColor="grey"
                      autoFocus
                    />
                  ) : (
                    <UserName>{username || "Guest User"}</UserName>
                  )}
                  <EditIconWrapper onPress={showInput ? handleSaveUsername : handleEditProfile}>
                    {showInput ? (
                      <MaterialCommunityIcons
                        name="check"
                        size={16}
                        color="lightseagreen"
                      />
                    ) : (
                      <MaterialIcons name="edit" size={16} color="#2563eb" />
                    )}
                  </EditIconWrapper>
                </EditNameWrapper>

                <UserEmail>{email}</UserEmail>
              </IdentityWrapper>
            )}
          </HeroSection>

          <StatsRow>
            <StatBox>
              <StatValue>5</StatValue>
              <StatLabel>Uploads</StatLabel>
            </StatBox>
            <StatDivider />
            <StatBox>
              <StatValue>Pro</StatValue>
              <StatLabel>Plan</StatLabel>
            </StatBox>
          </StatsRow>

          <SectionLabel>General</SectionLabel>
          <MenuCard>
            <MenuItem onPress={() => navigation.navigate("Home" as never)}>
              <IconWrapper style={{ backgroundColor: "#eff6ff" }}>
                <Ionicons name="document-text" size={20} color="#2563eb" />
              </IconWrapper>
              <MenuText>My Documents</MenuText>
              <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
            </MenuItem>

            <MenuDivider />

            <MenuItem>
              <IconWrapper style={{ backgroundColor: "#f0fdf4" }}>
                <Ionicons name="shield-checkmark" size={20} color="#22c55e" />
              </IconWrapper>
              <MenuText>Security & Privacy</MenuText>
              <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
            </MenuItem>
          </MenuCard>

          <SectionLabel>Account Actions</SectionLabel>
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

      <LogoutModal
        showModal={showModal}
        onClose={() => setShowModal(false)}
        mode={modalMode}
      />
    </Container>
  );
};

export default ProfileScreen;

const Container = styled.SafeAreaView`
  flex: 1;
  background-color: #f8fafc;
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

const AvatarCircle = styled.View`
  width: 100px;
  height: 100px;
  border-radius: 50px;
  background-color: #ffffff;
  justify-content: center;
  align-items: center;
  border-width: 1px;
  border-color: #e2e8f0;
  shadow-color: #000;
  shadow-opacity: 0.1;
  shadow-radius: 10px;
  elevation: 5;
`;

const EditBadge = styled.TouchableOpacity`
  position: absolute;
  bottom: 0;
  right: 0;
  background-color: #2563eb;
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
  color: #0f172a;
`;

const UsernameInput = styled.TextInput`
  padding: 5px;
  width: 40%;
  border: 1px solid black;
  border-radius: 10px;
  color: black;
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
  color: #64748b;
  margin-top: 4px;
  font-weight: 600;
`;

const StatsRow = styled.View`
  flex-direction: row;
  background-color: #ffffff;
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
  color: #2563eb;
`;

const StatLabel = styled.Text`
  font-size: 12px;
  color: #94a3b8;
  margin-top: 2px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const StatDivider = styled.View`
  width: 1px;
  height: 30px;
  background-color: #f1f5f9;
`;

const SectionLabel = styled.Text`
  font-size: 13px;
  font-weight: 700;
  color: #94a3b8;
  margin-bottom: 5px;
  margin-left: 5px;
  text-transform: uppercase;
  letter-spacing: 1px;
`;

const MenuCard = styled.View`
  background-color: #ffffff;
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
  color: #1e293b;
`;

const MenuDivider = styled.View`
  height: 1px;
  background-color: #f8fafc;
  margin-left: 70px;
`;

const ActionsWrapper = styled.View`
  margin-top: 5px;
`;

const FooterText = styled.Text`
  text-align: center;
  font-size: 14px;
  font-weight: 700;
  color: #94a3b8;
  margin-top: 30px;
  margin-bottom: 20px;
`;
