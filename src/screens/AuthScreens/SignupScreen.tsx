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

const SignupScreen = () => {
  const navigation = useNavigation();
  const isSubmitting = useRef(false);

  // ✅ STATES
  const [username, setUsername] = useState("");
  const [fullname, setFullname] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [gender, setGender] = useState<string | null>(null);
  const [date, setDate] = useState<Date>(new Date());
  const [showDate, setShowDate] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const genderOptions = ["male", "female", "other"];

  // ✅ VALIDATION
  const validate = () => {
    let newErrors: { [key: string]: string } = {};

    if (!username) newErrors.username = "Username is required";
    if (!fullname) newErrors.fullname = "Full name is required";

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

    if (!date) newErrors.dob = "Select date of birth";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  
  const registerMutation = useMutation({
    mutationFn: registerUser,
    onSuccess: async (result) => {
      const userId = result?.data?.[0]?.id;
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
      username,
      fullname,
      email,
      mobile,
      password,
      gender,
      date,
    };

    try {
      await registerMutation.mutateAsync(formData);
    } finally {
      isSubmitting.current = false;
    }
  };

  const formatDate = (date: Date) => {
    return date ? date.toISOString().split("T")[0] : "";
  };

  const onChangeDate = (_: any, selectedDate?: Date) => {
    setShowDate(false);
    if (selectedDate) setDate(selectedDate);
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
              {/* Username */}
              <InputGroup>
                <Label>Username</Label>
                <InputWrapper>
                  <Ionicons name="at-outline" size={20} color="#64748b" />
                  <StyledInput
                    value={username}
                    onChangeText={(text: string) => {
                      setUsername(text);
                      setErrors((prev) => ({ ...prev, username: "" }));
                    }}
                    placeholder="Enter Username"
                    placeholderTextColor="#acababff"
                  />
                </InputWrapper>
                {errors.username && <ErrorText>{errors.username}</ErrorText>}
              </InputGroup>

              {/* Fullname */}
              <InputGroup>
                <Label>Full Name</Label>
                <InputWrapper>
                  <Ionicons name="person-outline" size={20} color="#64748b" />
                  <StyledInput
                    value={fullname}
                    onChangeText={(text: string) => {
                      setFullname(text);
                      setErrors((prev) => ({ ...prev, fullname: "" }));
                    }}
                    placeholder="Name Middlename Surname"
                    placeholderTextColor="#acababff"
                  />
                </InputWrapper>
                {errors.fullname && <ErrorText>{errors.fullname}</ErrorText>}
              </InputGroup>

              {/* Email */}
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

              {/* Mobile */}
              <InputGroup>
                <Label>Mobile</Label>
                <InputWrapper>
                  <Ionicons name="call-outline" size={20} color="#64748b" />
                  <StyledInput
                    value={mobile}
                    onChangeText={(text: string) => {
                      setMobile(text);
                      setErrors((prev) => ({ ...prev, mobile: "" }));
                    }}
                    keyboardType="phone-pad"
                    maxLength={10}
                    placeholder="1234567890"
                    placeholderTextColor="#acababff"
                  />
                </InputWrapper>
                {errors.mobile && <ErrorText>{errors.mobile}</ErrorText>}
              </InputGroup>

              {/* Gender */}
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
                  {genderOptions.map((option) => (
                    <TouchableOpacity
                      key={option}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                      }}
                      onPress={() => {
                        setGender(option);
                        setErrors((prev) => ({ ...prev, gender: "" }));
                      }}
                    >
                      <RadioOuter>
                        {gender === option && <RadioInner />}
                      </RadioOuter>

                      <Text style={{ marginLeft: 8 }}>{option}</Text>
                    </TouchableOpacity>
                  ))}
                </InputWrapper>
                {errors.gender && <ErrorText>{errors.gender}</ErrorText>}
              </InputGroup>

              <InputGroup>
                <Label>Date of Birth</Label>
                <TouchableOpacity onPress={() => setShowDate(true)}>
                  <InputWrapper>
                    <Ionicons
                      name="calendar-outline"
                      size={20}
                      color="#64748b"
                    />
                    <Text style={{ marginLeft: 10 }}>{formatDate(date)}</Text>
                  </InputWrapper>
                </TouchableOpacity>

                {showDate && (
                  <DateTimePicker
                    value={date}
                    mode="date"
                    onChange={onChangeDate}
                    maximumDate={new Date()}
                  />
                )}

                {errors.dob && <ErrorText>{errors.dob}</ErrorText>}
              </InputGroup>

              {/* Password */}
              <InputGroup>
                <Label>Password</Label>
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

              {/* Confirm Password */}
              <InputGroup>
                <Label>Confirm Password</Label>
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
  font-size: 12px;
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
