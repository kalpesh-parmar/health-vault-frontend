import React, { useState, useRef } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import styled from "styled-components/native";
import { useNavigation } from "@react-navigation/native";
import Toast from "react-native-toast-message";
import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "@tanstack/react-query";
import { registerUser } from "../../services/authService";
import * as SecureStore from "expo-secure-store";
import PasswordInfoModal from "../../components/PasswordInfo";
import PhoneInput from "react-native-phone-number-input";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import BottomSheet from "../../components/shared/BottomSheet";
import { useAppTheme } from "../../context/ThemeContext";

const SignupScreen = () => {
  const navigation = useNavigation();
  const isSubmitting = useRef(false);

  // ✅ STATES
  const [firstname, setFirstname] = useState<string>("");
  const [lastname, setLastname] = useState<string>("");
  const [userName, setUserName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [mobileNum, setMobileNum] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [gender, setGender] = useState<string | null>(null);
  const [age, setAge] = useState<string>("");
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [showPasswordInfo, setShowPasswordInfo] = useState<boolean>(false);
  const [formattedValue, setFormattedValue] = useState<string>("");
  const genderSheetRef = useRef<BottomSheetModal>(null);
  const { isDark, theme } = useAppTheme();

  const genderOptions = [
    { label: "Male", value: "male" },
    { label: "Female", value: "female" },
    { label: "Other", value: "other" },
  ];

  const openGenderSheet = () => {
    genderSheetRef.current?.present();
  };

  const validate = () => {
    let newErrors: { [key: string]: string } = {};

    if (!firstname) newErrors.firstname = "First name is required";
    if (!lastname) newErrors.lastname = "Last name is required";

    const emailReg = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w\w+)+$/;
    if (!email) newErrors.email = "Email is required";
    else if (!emailReg.test(email)) newErrors.email = "Invalid email";

    const cleanNumber = mobileNum.replace(/\D/g, "");

    if (!cleanNumber) newErrors.mobileNum = "Mobile number required";
    else if (cleanNumber.length !== 10)
      newErrors.mobileNum = "Enter valid 10-digit number";

    if (!password) newErrors.password = "Password required";
    else if (password.length < 6) newErrors.password = "Minimum 6 characters";

    if (!confirmPassword) newErrors.confirmPassword = "Confirm your password";
    else if (confirmPassword !== password)
      newErrors.confirmPassword = "Passwords do not match";

    if (!gender) newErrors.gender = "Select gender";

    if (!age) newErrors.age = "Select age";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const { mutateAsync: registerMutation, isPending: isLoading } = useMutation({
    mutationFn: registerUser,
    onSuccess: async (result) => {
      const userId = result?.patient?.id;
      await SecureStore.setItemAsync("userId", String(userId));
      Toast.show({
        type: "success",
        text1: "Registered Successfully 🎉",
      });
      navigation.navigate("Login" as never);
    },
    onError: (error: any) => {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: error.message,
      });
    },
  });

  const handleSignup = async () => {
    if (isSubmitting.current) return;

    if (!validate()) {
      Toast.show({
        type: "error",
        text1: "Fix form errors",
      });
      return;
    }

    isSubmitting.current = true;

    const payload = {
      userName: userName,
      firstName: firstname,
      lastName: lastname,
      email: email,
      password: password,
      gender: gender,
      age: age ? Number(age) : null,
      phone: mobileNum,
    };

    try {
      await registerMutation(payload as any);
    } finally {
      isSubmitting.current = false;
    }
  };

  return (
    <>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
          <InnerContainer>
            <Header>
              <LogoCircle>
                <LogoText>🩺</LogoText>
              </LogoCircle>
              <Title>Create Account</Title>
            </Header>

            <FormCard>
              <InputGroup>
                <Label>First Name</Label>
                <InputWrapper>
                  <Ionicons name="person-outline" size={20} color="#64748b" />
                  <StyledInput
                    value={firstname}
                    onChangeText={(text: string) => {
                      setFirstname(text);
                      setErrors((prev) => ({ ...prev, firstname: "" }));
                    }}
                    placeholder="Enter First Name"
                    placeholderTextColor="#acababff"
                  />
                </InputWrapper>
                {errors.firstname && <ErrorText>{errors.firstname}</ErrorText>}
              </InputGroup>

              <InputGroup>
                <Label>Last Name</Label>
                <InputWrapper>
                  <Ionicons name="person-outline" size={20} color="#64748b" />
                  <StyledInput
                    value={lastname}
                    onChangeText={(text: string) => {
                      setLastname(text);
                      setErrors((prev) => ({ ...prev, lastname: "" }));
                    }}
                    placeholder="Enter Last Name"
                    placeholderTextColor="#acababff"
                    onBlur={() => {
                      setUserName(
                        `${firstname}${lastname}`.toLowerCase() +
                          Math.floor(100 + Math.random() * 900),
                      );
                    }}
                  />
                </InputWrapper>
                {errors.lastname && <ErrorText>{errors.lastname}</ErrorText>}
              </InputGroup>

              {userName && (
                <Label
                  style={{
                    textAlign: "center",
                    color: "#3b82f6ff",
                    fontWeight: "500",
                  }}
                >{`Username :- ${userName}`}</Label>
              )}

              <InputGroup>
                <Label>Email</Label>
                <InputWrapper>
                  <Ionicons name="mail-outline" size={20} color="#64748b" />
                  <StyledInput
                    value={email}
                    onChangeText={(text: string) => {
                      setEmail(text);
                      setErrors((prev) => ({ ...prev, email: "" }));
                    }}
                    placeholder="abc@gmail.com"
                    placeholderTextColor="#acababff"
                    autoCapitalize="none"
                  />
                </InputWrapper>
                {errors.email && <ErrorText>{errors.email}</ErrorText>}
              </InputGroup>

              <InputGroup>
                <Label>Mobile</Label>
                <View
                  style={{
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                    borderRadius: 10,
                  }}
                >
                  <PhoneInput
                    value={mobileNum}
                    defaultCode="IN"
                    layout="second"
                    withDarkTheme={isDark}
                    placeholder="Phone Number"
                    withShadow={false}
                    onChangeText={(text) => {
                      setMobileNum(text);
                      setErrors((prev) => ({ ...prev, mobileNum: "" }));
                    }}
                    onChangeFormattedText={(text) => {
                      setFormattedValue(text);
                    }}
                    textInputProps={{
                      maxLength: 10,
                    }}
                    autoFocus={false}
                    containerStyle={{
                      width: "100%",
                      backgroundColor: theme.colors.surfaceLight,
                      borderRadius: 10,
                      height: 50,
                    }}
                    textContainerStyle={{
                      backgroundColor: "transparent",
                      borderTopRightRadius: 10,
                      borderBottomRightRadius: 10,
                      paddingVertical: 0,
                    }}
                    textInputStyle={{
                      fontSize: 16,
                      padding: 0,
                      margin: 0,
                    }}
                    codeTextStyle={{
                      fontSize: 16,
                      color: isDark ? "white" : "black",
                    }}
                    flagButtonStyle={{
                      borderRightWidth: 1,
                      borderRightColor: isDark ? "white" : "black",
                    }}
                  />
                </View>
                {errors.mobileNum && <ErrorText>{errors.mobileNum}</ErrorText>}
              </InputGroup>

              <InputGroup>
                <Label>Gender</Label>

                <TouchableOpacity
                  onPress={openGenderSheet}
                  style={{
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                    borderRadius: 10,
                    padding: 14,
                    backgroundColor: theme.colors.surfaceLight,
                  }}
                >
                  <Text style={{ color: gender ? theme.colors.textPrimary : theme.colors.textMuted }}>
                    {gender
                      ? genderOptions.find((g) => g.value === gender)?.label
                      : "Select Gender"}
                  </Text>
                </TouchableOpacity>

                {errors.gender && <ErrorText>{errors.gender}</ErrorText>}
              </InputGroup>

              <BottomSheet ref={genderSheetRef}>
                <View style={{ padding: 16 }}>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "600",
                      marginBottom: 12,
                      color: theme.colors.textPrimary,
                    }}
                  >
                    Select Gender
                  </Text>

                  {genderOptions.map((item) => {
                    const isSelected = gender === item.value;

                    return (
                      <TouchableOpacity
                        key={item.value}
                        onPress={() => {
                          setGender(item.value);
                          setErrors((prev) => ({ ...prev, gender: "" }));
                          genderSheetRef.current?.close();
                        }}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "space-between",
                          borderWidth: 1,
                          borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                          borderRadius: 10,
                          paddingVertical: 12,
                          paddingHorizontal: 10,
                          backgroundColor: isSelected ? (isDark ? "#1e3a8a" : "#f0f9ff") : theme.colors.surfaceLight,
                          marginVertical: 5,
                        }}
                      >
                        <View
                          style={{ flexDirection: "row", alignItems: "center" }}
                        >
                          <Text
                            style={{
                              fontSize: 15,
                              color: isSelected ? theme.colors.primary : theme.colors.textPrimary,
                            }}
                          >
                            {item.label}
                          </Text>
                        </View>

                        {isSelected && (
                          <Ionicons
                            name="checkmark"
                            size={20}
                            color={theme.colors.primary}
                          />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </BottomSheet>

              <InputGroup>
                <Label>Age</Label>
                <TouchableOpacity>
                  <InputWrapper>
                    <Ionicons
                      name="calendar-outline"
                      size={20}
                      color="#64748b"
                    />
                    <StyledInput
                      value={String(age)}
                      onChangeText={(text: any) => {
                        setAge(text as any);
                        setErrors((prev) => ({ ...prev, age: "" }));
                      }}
                      keyboardType="number-pad"
                      maxLength={3}
                      placeholder="Enter age"
                      placeholderTextColor="#acababff"
                    />
                  </InputWrapper>
                </TouchableOpacity>
                {errors.age && <ErrorText>{errors.age}</ErrorText>}
              </InputGroup>

              {/* Password */}
              <PasswordInfoModal
                visible={showPasswordInfo}
                onClose={() => setShowPasswordInfo(false)}
              />
              <InputGroup>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "flex-start",
                  }}
                >
                  <Label>Password &nbsp;</Label>
                  <TouchableOpacity
                    onPress={() => {
                      setShowPasswordInfo(true);
                    }}
                  >
                    <Ionicons
                      name="information-circle-outline"
                      size={20}
                      color="#64748b"
                    />
                  </TouchableOpacity>
                </View>
                <InputWrapper>
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color="#64748b"
                  />
                  <StyledInput
                    secureTextEntry
                    value={password}
                    onChangeText={(text: string) => {
                      setPassword(text);
                      setErrors((prev) => ({ ...prev, password: "" }));
                    }}
                    placeholder="••••••••"
                    placeholderTextColor="#acababff"
                  />
                </InputWrapper>
                {errors.password && <ErrorText>{errors.password}</ErrorText>}
              </InputGroup>

              <InputGroup>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "flex-start",
                  }}
                >
                  <Label>Confirm Password &nbsp;</Label>
                  <TouchableOpacity
                    onPress={() => {
                      setShowPasswordInfo(true);
                    }}
                  >
                    <Ionicons
                      name="information-circle-outline"
                      size={20}
                      color="#64748b"
                    />
                  </TouchableOpacity>
                </View>
                <InputWrapper>
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={20}
                    color="#64748b"
                  />
                  <StyledInput
                    secureTextEntry
                    value={confirmPassword}
                    onChangeText={(text: string) => {
                      setConfirmPassword(text);
                      setErrors((prev) => ({ ...prev, confirmPassword: "" }));
                    }}
                    placeholder="••••••••"
                    placeholderTextColor="#acababff"
                  />
                </InputWrapper>
                {errors.confirmPassword && (
                  <ErrorText>{errors.confirmPassword}</ErrorText>
                )}
              </InputGroup>

              <SignupButton onPress={handleSignup} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <ActivityIndicator color="#fff" />
                    <Text style={{ color: "#fff" }}>Creating Account...</Text>
                  </>
                ) : (
                  <ButtonText>Create Account</ButtonText>
                )}
              </SignupButton>
            </FormCard>

            <Footer>
              <FooterText>Already have an account?</FooterText>
              <LoginLink onPress={() => navigation.navigate("Login" as never)}>
                <LinkText> Log In</LinkText>
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
  background-color: ${({ theme }: any) => theme.colors.background};
`;

const Header = styled.View`
  align-items: center;
  margin-bottom: 20px;
`;

const LogoCircle = styled.View`
  width: 80px;
  height: 80px;
  border-radius: 20px;
  background: #fff;
  justify-content: center;
  align-items: center;
`;

const LogoText = styled.Text`
  font-size: 30px;
`;

const Title = styled.Text`
  font-size: 26px;
  font-weight: bold;
  color: ${({ theme }: any) => theme.colors.textPrimary};
`;

const FormCard = styled.View`
  background: ${({ theme }: any) => theme.colors.surface};
  padding: 20px;
  border-radius: 20px;
  border-width: 0.5px;
  border-color: ${({ theme }: any) => theme.colors.border};
`;

const InputGroup = styled.View`
  margin-bottom: 10px;
`;

const Label = styled.Text`
  font-weight: bold;
  margin-bottom: 5px;
  color: ${({ theme }: any) => theme.colors.textPrimary};
`;

const InputWrapper = styled.View`
  flex-direction: row;
  align-items: center;
  background-color: ${({ theme }: any) => theme.colors.surfaceLight};
  border-radius: 14px;
  padding: 5px 0 5px 8px;
  border: 1px solid ${({ theme }: any) => theme.colors.border};
`;

const StyledInput = styled.TextInput`
  flex: 1;
  font-size: 14px;
  color: ${({ theme }: any) => theme.colors.textPrimary};
`;

const SignupButton = styled.TouchableOpacity`
  background: ${({ theme }: any) => theme.colors.textPrimary};
  padding: 15px;
  border-radius: 10px;
  align-items: center;
`;

const ButtonText = styled.Text`
  color: ${({ theme }: any) => theme.colors.background};
  font-weight: bold;
`;

const ErrorText = styled.Text`
  color: red;
  font-size: 14px;
  font-weight: 400;
`;

const RadioOuter = styled.View`
  width: 18px;
  height: 18px;
  border-radius: 9px;
  border: 2px solid black;
  justify-content: center;
  align-items: center;
`;

const RadioInner = styled.View`
  width: 8px;
  height: 8px;
  border-radius: 4px;
  background: black;
`;

const Footer = styled.View`
  flex-direction: row;
  justify-content: center;
  margin: 20px 0;
`;

const FooterText = styled.Text`
  color: ${({ theme }: any) => theme.colors.textMuted};
`;

const LinkText = styled.Text`
  color: ${({ theme }: any) => theme.colors.textPrimary};
  font-weight: 700;
`;

const LoginLink = styled.TouchableOpacity``;
