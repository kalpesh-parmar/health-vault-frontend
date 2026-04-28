import React, { useState, useRef } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  View,
  Text,
  TouchableOpacity,
} from "react-native";
import styled from "styled-components/native";
import { useNavigation } from "@react-navigation/native";
import Toast from "react-native-toast-message";
import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "@tanstack/react-query";
import { registerUser } from "../../services/authService";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as SecureStore from "expo-secure-store";
import PasswordInfoModal from "../../components/PasswordInfo";
import PhoneInput from "react-native-phone-number-input";

const SignupScreen = () => {
  const navigation = useNavigation();
  const isSubmitting = useRef(false);

  // ✅ STATES
  const [username, setUsername] = useState("");
  const [firstname, setFirstname] = useState("");
  const [lastname, setLastname] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [gender, setGender] = useState<string | null>(null);
  const [age, setAge] = useState<Date>(new Date());
  const [showDate, setShowDate] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [showPasswordInfo, setShowPasswordInfo] = useState<boolean>(false);
  const [formattedValue, setFormattedValue] = useState("");

  type IconName = keyof typeof Ionicons.glyphMap;

  const genderConfig: Record<
    "male" | "female" | "other",
    { icon: IconName; label: string }
  > = {
    male: {
      icon: "man",
      label: "Male",
    },
    female: {
      icon: "woman",
      label: "Female",
    },
    other: {
      icon: "person",
      label: "Other",
    },
  };

  // ✅ VALIDATION
  const validate = () => {
    let newErrors: { [key: string]: string } = {};

    if (!firstname) newErrors.firstname = "First name is required";
    if (!lastname) newErrors.lastname = "Last name is required";

    const emailReg = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w\w+)+$/;
    if (!email) newErrors.email = "Email is required";
    else if (!emailReg.test(email)) newErrors.email = "Invalid email";

    if (!mobile) newErrors.mobile = "Mobile number required";
    else if (!/^\d{10}$/.test(mobile))
      newErrors.mobile = "Enter valid 10-digit number";

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

  const registerMutation = useMutation({
    mutationFn: registerUser,
    onSuccess: async (result) => {
      const userId = result?.data?.id;
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

    const formData = {
      firstname,
      lastname,
      email,
      mobile,
      password,
      gender,
      age: age,
    };

    try {
      await registerMutation.mutateAsync(formData as any);
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
                  />
                </InputWrapper>
                {errors.lastname && <ErrorText>{errors.lastname}</ErrorText>}
              </InputGroup>

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
                    borderColor: "#e2e8f0",
                    borderRadius: 10,
                  }}
                >
                  <PhoneInput
                    defaultValue={mobile}
                    defaultCode="IN"
                    layout="second"
                    onChangeText={(text) => {
                      setMobile(text);
                      setErrors((prev) => ({ ...prev, mobile: "" }));
                    }}
                    onChangeFormattedText={(text) => {
                      setFormattedValue(text);
                    }}
                    textInputProps={{
                      maxLength: 10,
                    }}
                    withShadow={false}
                    autoFocus={false}
                    containerStyle={{
                      width: "100%",
                      backgroundColor: "#fff",
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
                      fontSize: 14,
                      color: "#0f172a",
                      padding: 0,
                      margin: 0,
                    }}
                    codeTextStyle={{
                      fontSize: 14,
                      color: "#0f172a",
                    }}
                    flagButtonStyle={{
                      borderRightWidth: 1,
                      borderRightColor: "#e2e8f0",
                    }}
                  />
                </View>
                {errors.mobile && <ErrorText>{errors.mobile}</ErrorText>}
              </InputGroup>

              <InputGroup>
                <Label>Gender</Label>
                <InputWrapper
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-around",
                    borderWidth: 0,
                    backgroundColor: "transparent",
                  }}
                >
                  {Object.keys(genderConfig).map((key: string) => {
                    const item = genderConfig[key as keyof typeof genderConfig];
                    const isSelected = gender === key;

                    return (
                      <TouchableOpacity
                        key={key}
                        style={{
                          alignItems: "center",
                          marginRight: 20,
                        }}
                        onPress={() => {
                          setGender(key);
                          setErrors((prev) => ({ ...prev, gender: "" }));
                        }}
                      >
                        {/* Icon */}
                        <Ionicons
                          name={item.icon}
                          size={28}
                          color={isSelected ? "#2563eb" : "#64748b"}
                        />

                        {/* Label */}
                        <Text
                          style={{
                            marginTop: 4,
                            fontSize: 13,
                            color: isSelected ? "#2563eb" : "#334155",
                          }}
                        >
                          {item.label}
                        </Text>

                        {/* Radio */}
                        <RadioOuter style={{ marginTop: 6 }}>
                          {isSelected && <RadioInner />}
                        </RadioOuter>
                      </TouchableOpacity>
                    );
                  })}
                </InputWrapper>
                {errors.gender && <ErrorText>{errors.gender}</ErrorText>}
              </InputGroup>

              <InputGroup>
                <Label>Age</Label>
                <TouchableOpacity onPress={() => setShowDate(true)}>
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

              <SignupButton onPress={handleSignup}>
                <ButtonText>Create Account</ButtonText>
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
`;

const FormCard = styled.View`
  background: #fff;
  padding: 20px;
  border-radius: 20px;
`;

const InputGroup = styled.View`
  margin-bottom: 10px;
`;

const Label = styled.Text`
  font-weight: bold;
  margin-bottom: 5px;
`;

const InputWrapper = styled.View`
  flex-direction: row;
  align-items: center;
  background-color: #f8fafc;
  border-radius: 14px;
  padding: 5px 0 5px 8px;
  border: 1px solid #e2e8f0;
`;

const StyledInput = styled.TextInput`
  flex: 1;
  font-size: 14px;
  color: #0f172a;
`;

const SignupButton = styled.TouchableOpacity`
  background: black;
  padding: 15px;
  border-radius: 10px;
  align-items: center;
`;

const ButtonText = styled.Text`
  color: white;
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
  color: #64748b;
`;

const LinkText = styled.Text`
  color: #0f172a;
  font-weight: 700;
`;

const LoginLink = styled.TouchableOpacity``;
