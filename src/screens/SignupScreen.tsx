import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
} from "react-native";
import styled from "styled-components/native";
import { useNavigation } from "@react-navigation/native";
import Toast from "react-native-toast-message";
import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "@tanstack/react-query";
import { registerUser } from "../services/authService";
import { useRef } from "react";

const SignupScreen = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<{ [key: string]: string | null }>({});
  const navigation = useNavigation();
  const isSubmitting = useRef(false);

  const validate = () => {
    let newErrors: { [key: string]: string | null } = {};

    if (!name) newErrors.name = "Full name is required";

    const emailReg = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w\w+)+$/;
    if (!email) newErrors.email = "Email is required";
    else if (!emailReg.test(email)) newErrors.email = "Invalid email format";

    if (!password) newErrors.password = "Password required";
    else if (password.length < 6) newErrors.password = "Min 6 characters";

    if (confirmPassword !== password)
      newErrors.confirm = "Passwords do not match";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const registerMutation = useMutation({
    mutationFn: registerUser,
    onSuccess: async (response) => {
      console.log("User Created Successfully.");
      if (response.data[0] !== null) {
        Toast.show({
          type: "success",
          text1: "Hurrahhh 🥳",
          text2: "Registered Successfully.",
        });
        navigation.navigate("Login" as never);
      }
    },
    onError: async (error) => {
      Toast.show({
        type: "error",
        text1: "OOPS!!! 😣",
        text2: `${error.message}`,
      });
    },
  });

  const handleSignup = async () => {
    if (isSubmitting.current) return;
    isSubmitting.current = true;

    const formData = {
      username: name,
      email: email,
      password: password,
    };

    if (!validate()) {
      Toast.show({
        type: "error",
        text1: "Please fix the errors",
        position: "top",
      });
      return;
    }

    try {
      await registerMutation.mutateAsync(formData);
    } catch (error) {
      // Handled.
    } finally {
      isSubmitting.current = false;
    }
  };

  return (
    <>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1 }}
        >
          <InnerContainer>
            <Header>
              <BackgroundBlob />

              <LogoCircle>
                <LogoText>🩺</LogoText>
              </LogoCircle>

              <Title>Create Account</Title>
              <Subtitle>Secure your health records</Subtitle>
            </Header>

            <CenterWrapper>
              <FormCard>
                <InputGroup>
                  <Label>Username</Label>
                  <InputWrapper>
                    <Ionicons name="person-outline" size={16} color="#64748b" />
                    <StyledInput
                      placeholder="username"
                      placeholderTextColor="#94a3b8"
                      value={name}
                      onChangeText={setName}
                      onChange={() => setErrors({})}
                    />
                  </InputWrapper>
                  {errors.name && <ErrorText>{errors.name}</ErrorText>}
                </InputGroup>

                <InputGroup>
                  <Label>Email</Label>
                  <InputWrapper>
                    <Ionicons name="mail-outline" size={16} color="#64748b" />
                    <StyledInput
                      placeholder="name@example.com"
                      placeholderTextColor="#94a3b8"
                      value={email}
                      onChangeText={setEmail}
                      autoCapitalize="none"
                    />
                  </InputWrapper>
                  {errors.email && <ErrorText>{errors.email}</ErrorText>}
                </InputGroup>

                <InputGroup>
                  <Label>Password</Label>
                  <InputWrapper>
                    <Ionicons
                      name="lock-closed-outline"
                      size={16}
                      color="#64748b"
                    />
                    <StyledInput
                      placeholder="••••••••"
                      placeholderTextColor="#94a3b8"
                      secureTextEntry
                      value={password}
                      onChangeText={setPassword}
                    />
                  </InputWrapper>
                  {errors.password && <ErrorText>{errors.password}</ErrorText>}
                </InputGroup>

                <InputGroup>
                  <Label>Confirm Password</Label>
                  <InputWrapper>
                    <Ionicons
                      name="shield-checkmark-outline"
                      size={16}
                      color="#64748b"
                    />
                    <StyledInput
                      placeholder="••••••••"
                      placeholderTextColor="#94a3b8"
                      secureTextEntry
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                    />
                  </InputWrapper>
                  {errors.confirm && <ErrorText>{errors.confirm}</ErrorText>}
                </InputGroup>

                <SignupButton
                  onPress={handleSignup}
                  activeOpacity={0.9}
                  disabled={registerMutation.isPending}
                >
                  <ButtonText>Create Account</ButtonText>
                </SignupButton>
              </FormCard>
            </CenterWrapper>

            <Footer>
              <FooterText>Already have an account?</FooterText>
              <LoginLink onPress={() => navigation.navigate("Login" as never)}>
                <LinkText> Sign In</LinkText>
              </LoginLink>
            </Footer>
          </InnerContainer>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
};

export default SignupScreen;

const InnerContainer = styled.View`
  flex: 1;
  padding: 24px;
`;

const Header = styled.View`
  align-items: center;
  margin-top: 40px;
`;

const BackgroundBlob = styled.View`
  position: absolute;
  width: 350px;
  height: 350px;
  border-radius: 175px;
  background-color: #eff6ff;
  top: -150px;
  right: -100px;
  z-index: -1;
`;

const LogoCircle = styled.View`
  width: 80px;
  height: 80px;
  border-radius: 24px;
  background-color: #ffffff;
  justify-content: center;
  align-items: center;
  margin-bottom: 12px;

  shadow-color: #3b82f6;
  shadow-offset: 0px 10px;
  shadow-opacity: 0.15;
  shadow-radius: 20px;
  elevation: 8;
`;

const LogoText = styled.Text`
  font-size: 36px;
`;

const Title = styled.Text`
  font-size: 30px;
  font-weight: 900;
  color: #0f172a;
`;

const Subtitle = styled.Text`
  font-size: 14px;
  color: #64748b;
`;

const CenterWrapper = styled.View`
  flex: 1;
  justify-content: center;
`;

const FormCard = styled.View`
  align-self: center;
  width: 92%;
  max-width: 380px;

  background-color: #ffffff;
  padding: 22px;
  border-radius: 24px;

  border-width: 1px;
  border-color: #f1f5f9;

  shadow-color: #000;
  shadow-offset: 0px 10px;
  shadow-opacity: 0.05;
  shadow-radius: 20px;
  elevation: 6;
`;

const InputGroup = styled.View`
  margin-bottom: 16px;
`;

const Label = styled.Text`
  font-size: 13px;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 6px;
`;

const InputWrapper = styled.View`
  flex-direction: row;
  align-items: center;

  background-color: #f8fafc;
  border-radius: 14px;
  padding: 12px 14px;

  border: 1px solid #e2e8f0;
`;

const StyledInput = styled.TextInput`
  flex: 1;
  margin-left: 10px;
  font-size: 14px;
  color: #0f172a;
`;

const SignupButton = styled.TouchableOpacity`
  background-color: #0f172a;
  padding: 16px;
  border-radius: 16px;
  align-items: center;

  margin-top: 8px;

  shadow-color: #0f172a;
  shadow-opacity: 0.25;
  shadow-radius: 10px;
`;

const ButtonText = styled.Text`
  color: #ffffff;
  font-size: 16px;
  font-weight: 800;
`;

const Footer = styled.View`
  flex-direction: row;
  justify-content: center;
  margin-top: 20px;
`;

const FooterText = styled.Text`
  color: #64748b;
`;

const LinkText = styled.Text`
  color: #0f172a;
  font-weight: 700;
`;

const LoginLink = styled.TouchableOpacity``;

const ErrorText = styled.Text`
  color: #ef4444;
  font-size: 12px;
  margin-top: 4px;
`;
