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
import { Ionicons, AntDesign } from "@expo/vector-icons";
import { useMutation } from "@tanstack/react-query";
import { registerUser } from "../../services/authService";
import * as SecureStore from "expo-secure-store";
import PasswordInfoModal from "../../components/PasswordInfo";
import PhoneInput from "react-native-phone-number-input";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import BottomSheet from "../../components/shared/BottomSheet";
import { useAppTheme } from "../../context/ThemeContext";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle, Path } from "react-native-svg";

const SignupScreen = () => {
  const navigation = useNavigation();
  const isSubmitting = useRef(false);

  const [firstname, setFirstname] = useState<string>("");
  const [lastname, setLastname] = useState<string>("");
  const [userName, setUserName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [mobileNum, setMobileNum] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [gender, setGender] = useState<string | null>(null);
  const [age, setAge] = useState<string>("");
  const [errors, setErrors] = useState<{
    [key: string]: string;
  }>({});
  const [showPasswordInfo, setShowPasswordInfo] = useState<boolean>(false);
  const [secureText, setSecureText] = useState<boolean>(true);
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
      <StatusBar barStyle={isDark ? "light-content" : "light-content"} />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1, flexGrow: 1 }}
      >
        <GradientBackground
          colors={["#8B5CF6", "#EC4899", "#FF7A59"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <PatternContainer>
            <Svg width="100%" height="100%" viewBox="0 0 400 900">
              <Circle cx="50" cy="100" r="120" fill="rgba(255,255,255,0.08)" />

              <Circle cx="350" cy="80" r="90" fill="rgba(255,255,255,0.05)" />

              <Circle cx="320" cy="250" r="150" fill="rgba(255,255,255,0.04)" />

              <Path
                d="M0 250 Q120 180 220 260 T420 240"
                stroke="rgba(255,255,255,0.10)"
                strokeWidth="3"
                fill="transparent"
              />

              <Path
                d="M-20 340 Q130 270 260 350 T460 330"
                stroke="rgba(255,255,255,0.08)"
                strokeWidth="2"
                fill="transparent"
              />
            </Svg>
          </PatternContainer>

          <ScrollView
            contentContainerStyle={{
              flexGrow: 1,
            }}
            showsVerticalScrollIndicator={false}
          >
            <InnerContainer>
              <BackButton
                activeOpacity={0.7}
                onPress={() => navigation.goBack()}
              >
                <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
              </BackButton>

              <Header>
                <Title>Create Account</Title>

                <Subtitle>Let's get started with your details</Subtitle>
              </Header>

              <FormCard>
                <InputGroup>
                  <InputWrapper>
                    <Ionicons name="person-outline" size={20} color="#9CA3AF" />

                    <StyledInput
                      value={firstname}
                      onChangeText={(text: string) => {
                        setFirstname(text);

                        setErrors((prev) => ({
                          ...prev,
                          firstname: "",
                        }));
                      }}
                      placeholder="First Name"
                      placeholderTextColor="#9CA3AF"
                    />
                  </InputWrapper>

                  {errors.firstname && (
                    <ErrorText>{errors.firstname}</ErrorText>
                  )}
                </InputGroup>

                <InputGroup>
                  <InputWrapper>
                    <Ionicons name="person-outline" size={20} color="#9CA3AF" />

                    <StyledInput
                      value={lastname}
                      onChangeText={(text: string) => {
                        setLastname(text);

                        setErrors((prev) => ({
                          ...prev,
                          lastname: "",
                        }));
                      }}
                      placeholder="Last Name"
                      placeholderTextColor="#9CA3AF"
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

                <InputGroup>
                  <InputWrapper>
                    <Ionicons name="mail-outline" size={20} color="#9CA3AF" />

                    <StyledInput
                      value={email}
                      onChangeText={(text: string) => {
                        setEmail(text);

                        setErrors((prev) => ({
                          ...prev,
                          email: "",
                        }));
                      }}
                      placeholder="Email Address"
                      placeholderTextColor="#9CA3AF"
                      autoCapitalize="none"
                    />
                  </InputWrapper>

                  {errors.email && <ErrorText>{errors.email}</ErrorText>}
                </InputGroup>

                <InputGroup>
                  <PhoneContainer>
                    <PhoneInput
                      value={mobileNum}
                      defaultCode="IN"
                      layout="second"
                      withDarkTheme={false}
                      placeholder="Phone Number"
                      withShadow={false}
                      onChangeText={(text) => {
                        setMobileNum(text);

                        setErrors((prev) => ({
                          ...prev,
                          mobileNum: "",
                        }));
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
                        backgroundColor: "#FFFFFF",
                        borderRadius: 16,
                        height: 58,
                      }}
                      textContainerStyle={{
                        backgroundColor: "transparent",
                        borderTopRightRadius: 16,
                        borderBottomRightRadius: 16,
                        paddingVertical: 0,
                      }}
                      textInputStyle={{
                        fontSize: 15,
                        color: "#111827",
                      }}
                      codeTextStyle={{
                        fontSize: 15,
                        color: "#111827",
                      }}
                      flagButtonStyle={{
                        borderRightWidth: 1,
                        borderRightColor: "#E5E7EB",
                      }}
                    />
                  </PhoneContainer>

                  {errors.mobileNum && (
                    <ErrorText>{errors.mobileNum}</ErrorText>
                  )}
                </InputGroup>

                <InputGroup>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={openGenderSheet}
                  >
                    <GenderWrapper>
                      <Ionicons
                        name="male-female-outline"
                        size={20}
                        color="#9CA3AF"
                      />

                      <GenderText selected={!!gender}>
                        {gender
                          ? genderOptions.find((g) => g.value === gender)?.label
                          : "Select Gender"}
                      </GenderText>

                      <Ionicons name="chevron-down" size={18} color="#9CA3AF" />
                    </GenderWrapper>
                  </TouchableOpacity>

                  {errors.gender && <ErrorText>{errors.gender}</ErrorText>}
                </InputGroup>

                <BottomSheet ref={genderSheetRef}>
                  <View
                    style={{
                      padding: 20,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 18,
                        fontWeight: "700",
                        marginBottom: 16,
                        color: "#111827",
                      }}
                    >
                      Select Gender
                    </Text>

                    {genderOptions.map((item) => {
                      const isSelected = gender === item.value;

                      return (
                        <TouchableOpacity
                          key={item.value}
                          activeOpacity={0.8}
                          onPress={() => {
                            setGender(item.value);

                            setErrors((prev) => ({
                              ...prev,
                              gender: "",
                            }));

                            genderSheetRef.current?.close();
                          }}
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "space-between",
                            paddingVertical: 14,
                            paddingHorizontal: 14,
                            borderRadius: 14,
                            borderWidth: 1,
                            borderColor: isSelected ? "#EC4899" : "#E5E7EB",
                            marginBottom: 12,
                            backgroundColor: isSelected ? "#FDF2F8" : "#FFFFFF",
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 15,
                              color: "#111827",
                              fontWeight: "600",
                            }}
                          >
                            {item.label}
                          </Text>

                          {isSelected && (
                            <Ionicons
                              name="checkmark-circle"
                              size={22}
                              color="#EC4899"
                            />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </BottomSheet>

                <InputGroup>
                  <InputWrapper>
                    <Ionicons
                      name="calendar-outline"
                      size={20}
                      color="#9CA3AF"
                    />

                    <StyledInput
                      value={String(age)}
                      onChangeText={(text: any) => {
                        setAge(text as any);

                        setErrors((prev) => ({
                          ...prev,
                          age: "",
                        }));
                      }}
                      keyboardType="number-pad"
                      maxLength={3}
                      placeholder="Enter Age"
                      placeholderTextColor="#9CA3AF"
                    />
                  </InputWrapper>

                  {errors.age && <ErrorText>{errors.age}</ErrorText>}
                </InputGroup>

                <PasswordInfoModal
                  visible={showPasswordInfo}
                  onClose={() => setShowPasswordInfo(false)}
                />

                <InputGroup>
                  <InputWrapper>
                    <Ionicons
                      name="lock-closed-outline"
                      size={20}
                      color="#9CA3AF"
                    />

                    <StyledInput
                      secureTextEntry={secureText}
                      value={password}
                      onChangeText={(text: string) => {
                        setPassword(text);

                        setErrors((prev) => ({
                          ...prev,
                          password: "",
                        }));
                      }}
                      placeholder="Password"
                      placeholderTextColor="#9CA3AF"
                    />

                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => setSecureText(!secureText)}
                    >
                      <Ionicons
                        name={secureText ? "eye-off-outline" : "eye-outline"}
                        size={20}
                        color="#9CA3AF"
                      />
                    </TouchableOpacity>
                  </InputWrapper>

                  {errors.password && <ErrorText>{errors.password}</ErrorText>}
                </InputGroup>

                <InputGroup>
                  <InputWrapper>
                    <Ionicons
                      name="shield-checkmark-outline"
                      size={20}
                      color="#9CA3AF"
                    />

                    <StyledInput
                      secureTextEntry={secureText}
                      value={confirmPassword}
                      onChangeText={(text: string) => {
                        setConfirmPassword(text);

                        setErrors((prev) => ({
                          ...prev,
                          confirmPassword: "",
                        }));
                      }}
                      placeholder="Confirm Password"
                      placeholderTextColor="#9CA3AF"
                    />

                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => setSecureText(!secureText)}
                    >
                      <Ionicons
                        name={secureText ? "eye-off-outline" : "eye-outline"}
                        size={20}
                        color="#9CA3AF"
                      />
                    </TouchableOpacity>
                  </InputWrapper>

                  {errors.confirmPassword && (
                    <ErrorText>{errors.confirmPassword}</ErrorText>
                  )}
                </InputGroup>

                <TermsContainer>
                  <CheckBox />

                  <TermsText>
                    I agree to the{" "}
                    <TermsHighlight>Terms & Conditions</TermsHighlight>
                  </TermsText>
                </TermsContainer>

                <SignupButton
                  activeOpacity={0.9}
                  onPress={handleSignup}
                  disabled={isLoading}
                >
                  <SignupGradient
                    colors={["#FF4DA6", "#5B6CFF"]}
                    start={{
                      x: 0,
                      y: 0,
                    }}
                    end={{
                      x: 1,
                      y: 0,
                    }}
                  >
                    {isLoading ? (
                      <>
                        <ActivityIndicator color="#FFFFFF" />

                        <LoadingText>Creating Account...</LoadingText>
                      </>
                    ) : (
                      <ButtonText>Create Account</ButtonText>
                    )}
                  </SignupGradient>
                </SignupButton>

                <Footer>
                  <FooterText>Already have an account?</FooterText>

                  <LoginLink
                    activeOpacity={0.7}
                    onPress={() => navigation.navigate("Login" as never)}
                  >
                    <LinkText> Login</LinkText>
                  </LoginLink>
                </Footer>
              </FormCard>
            </InnerContainer>
          </ScrollView>
        </GradientBackground>
      </KeyboardAvoidingView>
    </>
  );
};

export default SignupScreen;

const GradientBackground = styled(LinearGradient)`
  flex: 1;
`;

const PatternContainer = styled.View`
  position: absolute;
  width: 100%;
  height: 100%;
`;

const InnerContainer = styled.View`
  flex: 1;
  padding-horizontal: 24px;
  padding-top: 60px;
  padding-bottom: 30px;
`;

const BackButton = styled.TouchableOpacity`
  width: 42px;
  height: 42px;
  border-radius: 21px;
  background-color: rgba(255, 255, 255, 0.18);
  justify-content: center;
  align-items: center;
  margin-bottom: 28px;
`;

const Header = styled.View`
  margin-bottom: 28px;
`;

const Title = styled.Text`
  font-size: 34px;
  font-weight: 800;
  color: #ffffff;
`;

const Subtitle = styled.Text`
  margin-top: 8px;
  font-size: 15px;
  color: rgba(255, 255, 255, 0.85);
`;

const FormCard = styled.View`
  background-color: #ffffff;
  border-radius: 34px;
  padding: 24px;
`;

const InputGroup = styled.View`
  margin-bottom: 16px;
`;

const InputWrapper = styled.View`
  height: 58px;
  border-width: 1px;
  border-color: #ececec;
  border-radius: 16px;
  background-color: #ffffff;
  flex-direction: row;
  align-items: center;
  padding-horizontal: 16px;
`;

const StyledInput = styled.TextInput`
  flex: 1;
  margin-left: 12px;
  font-size: 15px;
  color: #111827;
`;

const PhoneContainer = styled.View`
  border-width: 1px;
  border-color: #ececec;
  border-radius: 16px;
  overflow: hidden;
`;

const GenderWrapper = styled.View`
  height: 58px;
  border-width: 1px;
  border-color: #ececec;
  border-radius: 16px;
  background-color: #ffffff;
  flex-direction: row;
  align-items: center;
  padding-horizontal: 16px;
`;

const GenderText = styled.Text<{
  selected: boolean;
}>`
  flex: 1;
  margin-left: 12px;
  font-size: 15px;
  color: ${({ selected }: { selected: boolean }) =>
    selected ? "#111827" : "#9CA3AF"};
`;

const TermsContainer = styled.View`
  flex-direction: row;
  align-items: center;
  margin-top: 6px;
  margin-bottom: 26px;
`;

const CheckBox = styled.View`
  width: 18px;
  height: 18px;
  border-width: 1.5px;
  border-color: #d1d5db;
  border-radius: 5px;
  margin-right: 10px;
`;

const TermsText = styled.Text`
  font-size: 13px;
  color: #6b7280;
`;

const TermsHighlight = styled.Text`
  color: #ec4899;
  font-weight: 700;
`;

const SignupButton = styled.TouchableOpacity`
  width: 100%;
  border-radius: 18px;
  overflow: hidden;
`;

const SignupGradient = styled(LinearGradient)`
  height: 58px;
  justify-content: center;
  align-items: center;
  flex-direction: row;
`;

const ButtonText = styled.Text`
  font-size: 16px;
  font-weight: 700;
  color: #ffffff;
`;

const LoadingText = styled(Text)`
  color: #ffffff;
  margin-left: 10px;
  font-weight: 600;
`;

const Footer = styled.View`
  flex-direction: row;
  justify-content: center;
  align-items: center;
  margin-top: 28px;
`;

const FooterText = styled.Text`
  color: #6b7280;
  font-size: 14px;
`;

const LoginLink = styled.TouchableOpacity``;

const LinkText = styled.Text`
  color: #ec4899;
  font-size: 14px;
  font-weight: 700;
`;

const ErrorText = styled.Text`
  color: #ef4444;
  font-size: 12px;
  font-weight: 600;
  margin-top: 6px;
  margin-left: 4px;
`;
