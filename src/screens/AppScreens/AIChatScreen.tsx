import React, { useEffect, useMemo, useState } from "react";
import {
  Platform,
  ScrollView,
  TouchableOpacity,
  View,
  Keyboard,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import styled from "styled-components/native";
import { useAppTheme } from "../../context/ThemeContext";

type ChatMessage = {
  id: string;
  role: "ai" | "user";
  text: string;
};

const AIChatScreen = () => {
  const navigation = useNavigation();
  const { isDark, theme } = useAppTheme();
  const [input, setInput] = useState("");
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "ai",
      text: "Hi, I am Health Vault AI. Ask me about your saved health documents, medications, or reminders.",
    },
  ]);

  const gradientColors = useMemo(
    () =>
      isDark
        ? (["#082f49", "#0f766e", "#312e81"] as const)
        : (["#0f766e", "#0ea5e9", "#4f46e5"] as const),
    [isDark],
  );

  useEffect(() => {
    const showSubscription = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (e) => setKeyboardHeight(e.endCoordinates.height),
    );
    const hideSubscription = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setKeyboardHeight(0),
    );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const handleSend = () => {
    const trimmedInput = input.trim();
    if (!trimmedInput) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      text: trimmedInput,
    };
    const aiMessage: ChatMessage = {
      id: `ai-${Date.now()}`,
      role: "ai",
      text: "I can help organize your health vault, explain document details, and prepare medication questions. AI responses will appear here once connected.",
    };

    setMessages((prev) => [...prev, userMessage, aiMessage]);
    setInput("");
  };

  return (
    <Container>
      <Header
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <TopRow>
          <BackButton onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={26} color="#fff" />
          </BackButton>
          <HeaderCenter>
            <HeaderTitle>Health Vault AI</HeaderTitle>
            <HeaderSub>Private health assistant</HeaderSub>
          </HeaderCenter>
          <HeaderIcon>
            <Ionicons name="sparkles" size={20} color="#fff" />
          </HeaderIcon>
        </TopRow>
      </Header>

      <View style={{ flex: 1, paddingBottom: keyboardHeight }}>
        <MessagesScroll
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{paddingHorizontal: 15, paddingBottom: 18, paddingVertical: 10}}
        >
          <OutputPanel>
            <PanelHeader>
              <PanelIcon>
                <Ionicons
                  name="chatbubble-ellipses"
                  size={18}
                  color="#0f766e"
                />
              </PanelIcon>
              <PanelTitle>AI Output</PanelTitle>
            </PanelHeader>

            {messages.map((message) => (
              <MessageBubble key={message.id} role={message.role}>
                <MessageText role={message.role}>{message.text}</MessageText>
              </MessageBubble>
            ))}
          </OutputPanel>
        </MessagesScroll>

        <InputBar>
          <InputWrap>
            <Ionicons
              name="sparkles-outline"
              size={18}
              color={theme.colors.textMuted}
            />
            <ChatInput
              placeholder="Ask Health Vault AI..."
              placeholderTextColor={theme.colors.textMuted}
              value={input}
              onChangeText={setInput}
              multiline
            />
          </InputWrap>
          <SendButton onPress={handleSend}>
            <LinearGradient
              colors={gradientColors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="send" size={20} color="#fff" />
            </LinearGradient>
          </SendButton>
        </InputBar>
      </View>
    </Container>
  );
};

export default AIChatScreen;

const Container = styled.View`
  flex: 1;
  background-color: ${({ theme }: any) => theme.colors.background};
`;

const Header = styled(LinearGradient)`
  padding: 52px 20px 30px;
  border-bottom-left-radius: 30px;
  border-bottom-right-radius: 30px;
`;

const TopRow = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
`;

const BackButton = styled.TouchableOpacity`
  width: 40px;
  height: 40px;
  border-radius: 20px;
  align-items: center;
  justify-content: center;
  background-color: rgba(255, 255, 255, 0.16);
`;

const HeaderCenter = styled.View`
  flex: 1;
  align-items: center;
`;

const HeaderTitle = styled.Text`
  color: #ffffff;
  font-size: 23px;
  font-weight: 900;
`;

const HeaderSub = styled.Text`
  color: rgba(255, 255, 255, 0.82);
  font-size: 13px;
  font-weight: 600;
  margin-top: 4px;
`;

const HeaderIcon = styled.View`
  width: 40px;
  height: 40px;
  border-radius: 20px;
  align-items: center;
  justify-content: center;
  background-color: rgba(255, 255, 255, 0.16);
`;

const MessagesScroll = styled(ScrollView)`
  flex: 1;
`;

const OutputPanel = styled.View`
  width: 100%;
`;

const PanelHeader = styled.View`
  flex-direction: row;
  align-items: center;
  margin-bottom: 16px;
`;

const PanelIcon = styled.View`
  width: 34px;
  height: 34px;
  border-radius: 17px;
  align-items: center;
  justify-content: center;
  background-color: #ccfbf1;
  margin-right: 10px;
`;

const PanelTitle = styled.Text`
  color: ${({ theme }: any) => theme.colors.textPrimary};
  font-size: 17px;
  font-weight: 900;
`;

const MessageBubble = styled.View<{ role: ChatMessage["role"] }>`
  align-self: ${({ role }: { role: ChatMessage["role"] }) =>
    role === "user" ? "flex-end" : "flex-start"};
  max-width: 88%;
  padding: 13px 15px;
  border-radius: 18px;
  margin-bottom: 12px;
  background-color: ${({ role, theme }: any) =>
    role === "user" ? "#0f766e" : theme.colors.surfaceLight};
`;

const MessageText = styled.Text<{ role: ChatMessage["role"] }>`
  color: ${({ role, theme }: any) =>
    role === "user" ? "#ffffff" : theme.colors.textSecondary};
  font-size: 14px;
  line-height: 20px;
  font-weight: 600;
`;

const InputBar = styled.View`
  flex-direction: row;
  align-items: flex-end;
  padding: 12px 16px 22px;
  background-color: ${({ theme }: any) => theme.colors.background};
  border-top-width: 1px;
  border-top-color: ${({ theme }: any) => theme.colors.border};
`;

const InputWrap = styled.View`
  flex: 1;
  min-height: 48px;
  max-height: 110px;
  border-radius: 24px;
  padding: 0 14px;
  flex-direction: row;
  align-items: center;
  background-color: ${({ theme }: any) => theme.colors.card};
  border-width: 1px;
  border-color: ${({ theme }: any) => theme.colors.border};
`;

const ChatInput = styled.TextInput`
  flex: 1;
  padding: 12px 8px;
  color: ${({ theme }: any) => theme.colors.textPrimary};
  font-size: 14px;
  font-weight: 600;
`;

const SendButton = styled(TouchableOpacity)`
  margin-left: 10px;
`;
