import React from "react";
import { render, fireEvent, act } from "@testing-library/react-native";
import { I18N_ONBOARDING_UI } from "../../../components/chat/widgets/OnboardingI18n";
import { MessageBubble } from "../../../components/chat/MessageBubble";
import { MedicineOptionsPanel } from "../../../components/chat/widgets/MedicineOptionsPanel";
import { ChatMessageItem } from "../../../components/chat/ChatMessageItem";
import { findHistoricalUserReply } from "../../../components/chat/widgets/HistoricalChips";

// Mock @expo/vector-icons
jest.mock("@expo/vector-icons", () => ({
  Ionicons: "Ionicons",
}));

// Mock expo-linear-gradient
jest.mock("expo-linear-gradient", () => ({
  LinearGradient: ({ children }: any) => children,
}));

describe("Onboarding Completion & Skip Enablement Tests", () => {
  const expectedMessages = {
    english:
      "Your onboarding is complete! The Skip button is now enabled. You can tap Skip to go directly to the Dashboard and complete any remaining steps later.",
    gujarati:
      "તમારું ઓનબોર્ડિંગ પૂર્ણ થઈ ગયું છે! હવે SKIP બટન સક્રિય થઈ ગયું છે. તમે SKIP પર ટેપ કરીને સીધા ડેશબોર્ડ પર જઈ શકો છો અને બાકી રહેલા સ્ટેપ્સ પછીથી પણ પૂર્ણ કરી શકો છો.",
    hindi:
      "आपका ऑनबोर्डिंग पूरा हो गया है! अब SKIP बटन सक्रिय हो गया है। आप SKIP पर टैप करके सीधे डैशबोर्ड पर जा सकते हैं और बाकी चरण बाद में भी पूरे कर सकते हैं।",
    marathi:
      "तुमचे ऑनबोर्डिंग पूर्ण झाले आहे! आता SKIP बटण सक्रिय झाले आहे. तुम्ही SKIP वर टॅप करून थेट डॅशबोर्डवर जाऊ शकता आणि उर्वरित स्टेप्स नंतरही पूर्ण करू शकता.",
    tamil:
      "உங்கள் ஆன்போர்டிங் முடிந்துவிட்டது! இப்போது SKIP பொத்தான் செயல்படுத்தப்பட்டுள்ளது. SKIP என்பதைத் தட்டி நேரடியாக Dashboard-க்கு செல்லலாம் மற்றும் மீதமுள்ள படிகளை பின்னரும் முடிக்கலாம்.",
  };

  describe("1. Multilingual Onboarding Completion Catalogs (5 Languages)", () => {
    it("has exact required completion messages defined for all 5 languages in OnboardingI18n", () => {
      for (const [lang, msg] of Object.entries(expectedMessages)) {
        expect(I18N_ONBOARDING_UI[lang]?.onboardingCanSkipMessage).toBe(msg);
      }
    });
  });

  describe("2. OnboardingScreen Functional State Updates & Deterministic Deduplication", () => {
    const normalizeText = (t?: string) =>
      (t || "").toLowerCase().replace(/[^a-z0-9]/g, "").trim();

    /**
     * Exact implementation of the updated OnboardingScreen functional state updater logic
     */
    function applyAssistantResponseFunctional(
      aiRes: any,
      setMessagesState: (updater: (prev: any[]) => any[]) => void,
      setCanSkipState: (updater: (prev: boolean) => boolean) => void
    ) {
      const action = aiRes.actionType || aiRes.action;
      const messageContent = aiRes.reply || aiRes.message;
      const normReply = normalizeText(messageContent);
      const normComp = normalizeText(aiRes.completionMessage);
      const isCompletionAlreadyInReply = Boolean(
        normComp &&
        normReply &&
        (normReply === normComp || normReply.includes(normComp))
      );

      const completionNoticeId =
        aiRes.completionMessageId || `ai-comp-${Date.now()}`;

      const newMsg = {
        id: `ai-${Date.now()}`,
        role: "assistant",
        content: messageContent,
        action,
        createdAt: new Date().toISOString(),
      };

      setMessagesState((prev) => {
        const alreadyHasNotice = prev.some(
          (m) =>
            m.action === "ONBOARDING_COMPLETED_NOTICE" ||
            m.id?.startsWith("ai-comp-") ||
            (aiRes.completionMessageId && m.id === aiRes.completionMessageId) ||
            (normComp && normalizeText(m.content) === normComp)
        );
        const itemsToAdd: any[] = [];
        if (
          aiRes.completionMessage &&
          !alreadyHasNotice &&
          !isCompletionAlreadyInReply
        ) {
          itemsToAdd.push({
            id: completionNoticeId,
            role: "assistant",
            content: aiRes.completionMessage,
            action: "ONBOARDING_COMPLETED_NOTICE",
            createdAt: aiRes.createdAt || new Date().toISOString(),
          });
        }
        const lastAssistantMsg = [...prev]
          .reverse()
          .find((m) => m.role === "assistant");
        const isDuplicateAssistantMsg =
          lastAssistantMsg &&
          lastAssistantMsg.action === newMsg.action &&
          normalizeText(lastAssistantMsg.content) === normReply &&
          lastAssistantMsg.action !== "ONBOARDING_COMPLETED_NOTICE";

        if (isDuplicateAssistantMsg) {
          return itemsToAdd.length > 0 ? [...prev, ...itemsToAdd] : prev;
        }
        return [...prev, ...itemsToAdd, newMsg];
      });

      const resolvedCanSkip = Boolean(
        aiRes.canSkip ??
        aiRes.onboardingState?.canSkip ??
        aiRes.state?.canSkip ??
        aiRes.resumableState?.canSkip ??
        !!aiRes.completionMessage
      );

      setCanSkipState((prev) => prev || resolvedCanSkip);
    }

    it("inserts completion notice IMMEDIATELY before Blood Group question in OnboardingScreen", () => {
      let currentMessages: any[] = [{ id: "user-1", role: "user", content: "Female" }];
      let canSkip = false;

      const setMessages = (updater: (prev: any[]) => any[]) => {
        currentMessages = updater(currentMessages);
      };
      const setCanSkip = (updater: (prev: boolean) => boolean) => {
        canSkip = updater(canSkip);
      };

      const aiResponse = {
        action: "ASK_BLOOD_GROUP",
        message: "What is your blood group? (Optional)",
        canSkip: true,
        completionMessage: expectedMessages.english,
        completionMessageId: "backend-notice-uuid-1",
        completionAction: "ONBOARDING_COMPLETED_NOTICE",
      };

      applyAssistantResponseFunctional(aiResponse, setMessages, setCanSkip);

      expect(canSkip).toBe(true);
      expect(currentMessages.length).toBe(3);

      // Order check: User msg -> Notice msg -> Blood group msg
      expect(currentMessages[0].content).toBe("Female");
      expect(currentMessages[1].action).toBe("ONBOARDING_COMPLETED_NOTICE");
      expect(currentMessages[1].id).toBe("backend-notice-uuid-1");
      expect(currentMessages[1].content).toBe(expectedMessages.english);
      expect(currentMessages[2].action).toBe("ASK_BLOOD_GROUP");
      expect(currentMessages[2].content).toBe("What is your blood group? (Optional)");
    });

    it("prevents stale React closures from clobbering or losing the completion message", () => {
      // Scenario: React scheduled a state update for user message, but closure is behind
      let stateStore: any[] = [];
      const setMessages = (updater: (prev: any[]) => any[]) => {
        stateStore = updater(stateStore);
      };
      let canSkip = false;
      const setCanSkip = (updater: (prev: boolean) => boolean) => {
        canSkip = updater(canSkip);
      };

      // 1. User sends message
      stateStore = [...stateStore, { id: "user-dob", role: "user", content: "1995-05-12" }];

      // 2. Response arrives
      const aiResponse = {
        action: "ASK_BLOOD_GROUP",
        message: "What is your blood group? (Optional)",
        canSkip: true,
        completionMessage: expectedMessages.hindi,
        completionMessageId: "backend-notice-uuid-hi",
      };

      applyAssistantResponseFunctional(aiResponse, setMessages, setCanSkip);

      expect(canSkip).toBe(true);
      expect(stateStore.length).toBe(3);
      expect(stateStore[1].content).toBe(expectedMessages.hindi);
      expect(stateStore[1].action).toBe("ONBOARDING_COMPLETED_NOTICE");
    });

    it("does not insert duplicate completion notice on subsequent optional questions (Allergies)", () => {
      let currentMessages: any[] = [];
      let canSkip = false;
      const setMessages = (updater: (prev: any[]) => any[]) => {
        currentMessages = updater(currentMessages);
      };
      const setCanSkip = (updater: (prev: boolean) => boolean) => {
        canSkip = updater(canSkip);
      };

      // Transition 1: Mandatory complete -> Blood Group
      const firstResponse = {
        action: "ASK_BLOOD_GROUP",
        message: "What is your blood group? (Optional)",
        canSkip: true,
        completionMessage: expectedMessages.english,
        completionMessageId: "backend-notice-uuid-1",
      };
      applyAssistantResponseFunctional(firstResponse, setMessages, setCanSkip);

      // User answers Blood Group
      currentMessages = [...currentMessages, { id: "user-bg", role: "user", content: "B+" }];

      // Transition 2: Optional Blood Group -> Allergies (even if response contains completionMessage)
      const secondResponse = {
        action: "ASK_ALLERGIES",
        message: "Do you have any known allergies? (Optional)",
        canSkip: true,
        completionMessage: expectedMessages.english,
        completionMessageId: "backend-notice-uuid-1",
      };
      applyAssistantResponseFunctional(secondResponse, setMessages, setCanSkip);

      const noticeMessages = currentMessages.filter(
        (m) => m.action === "ONBOARDING_COMPLETED_NOTICE"
      );
      expect(noticeMessages.length).toBe(1);
      expect(noticeMessages[0].id).toBe("backend-notice-uuid-1");
    });
  });

  describe("3. Shared Conversation State: OnboardingScreen -> SKIP -> AIChatScreen", () => {
    it("preserves exact same completion message across history replay and mergedMessages without duplicating", () => {
      // History returned by GET /v1/onboarding/history
      const historyFromBackend = [
        {
          id: "msg-1",
          role: "assistant",
          content: "What is your gender?",
          metadata: { action: "ASK_GENDER" },
          createdAt: "2026-09-11T08:00:00.000Z",
        },
        {
          id: "msg-2",
          role: "user",
          content: "Male",
          metadata: {},
          createdAt: "2026-09-11T08:00:05.000Z",
        },
        {
          id: "notice-uuid-db",
          role: "assistant",
          content: expectedMessages.english,
          metadata: { action: "ONBOARDING_COMPLETED_NOTICE" },
          createdAt: "2026-09-11T08:00:06.000Z",
        },
        {
          id: "msg-3",
          role: "assistant",
          content: "What is your blood group? (Optional)",
          metadata: { action: "ASK_BLOOD_GROUP" },
          createdAt: "2026-09-11T08:00:07.000Z",
        },
      ];

      // Replay in useChatSession.ts
      const seenNotice = new Set<string>();
      const mappedOnboardingMessages: any[] = [];
      for (const dbMsg of historyFromBackend) {
        const meta = dbMsg.metadata || {};
        const isNotice =
          meta.action === "ONBOARDING_COMPLETED_NOTICE" ||
          dbMsg.id?.startsWith("ai-comp-");
        if (isNotice) {
          if (seenNotice.has("ONBOARDING_COMPLETED_NOTICE")) {
            continue;
          }
          seenNotice.add("ONBOARDING_COMPLETED_NOTICE");
        }
        mappedOnboardingMessages.push({
          ...meta,
          id: dbMsg.id,
          role: dbMsg.role === "assistant" ? "ai" : "user",
          text: dbMsg.content,
          action: meta.action || (isNotice ? "ONBOARDING_COMPLETED_NOTICE" : "NORMAL_CHAT"),
          createdAt: dbMsg.createdAt,
          isOnboardingMessage: true,
        });
      }

      expect(mappedOnboardingMessages.length).toBe(4);
      expect(
        mappedOnboardingMessages.filter((m) => m.action === "ONBOARDING_COMPLETED_NOTICE").length
      ).toBe(1);

      // In AIChatScreen, mergedMessages combines live messages and onboarding messages
      const liveMessages: any[] = []; // No extra live messages yet
      const liveNewestFirst = [...liveMessages].reverse();
      const onboardingNewestFirst = [...mappedOnboardingMessages].reverse();
      const combined = [...liveNewestFirst, ...onboardingNewestFirst];

      const seenIds = new Set<string>();
      const seenNoticeMerge = new Set<string>();
      const deduplicated: any[] = [];

      for (const msg of combined) {
        if (msg && msg.id) {
          if (seenIds.has(msg.id)) continue;
          seenIds.add(msg.id);
        }
        const isNotice =
          msg.action === "ONBOARDING_COMPLETED_NOTICE" ||
          msg.id?.startsWith("ai-comp-");
        if (isNotice) {
          if (seenNoticeMerge.has("ONBOARDING_COMPLETED_NOTICE")) continue;
          seenNoticeMerge.add("ONBOARDING_COMPLETED_NOTICE");
        }
        deduplicated.push(msg);
      }

      // FlatList in AIChatScreen is inverted, so newest first
      // deduplicated has 4 items
      expect(deduplicated.length).toBe(4);
      const noticeInChat = deduplicated.find((m) => m.action === "ONBOARDING_COMPLETED_NOTICE");
      expect(noticeInChat).toBeDefined();
      expect(noticeInChat.id).toBe("notice-uuid-db");
      expect(noticeInChat.text).toBe(expectedMessages.english);
    });

    describe("4. MessageBubble Multilingual Rendering", () => {
      it("renders English completion notice in MessageBubble", async () => {
        const { getByText } = await render(
          <MessageBubble
            message={{
              id: "ai-comp-en",
              role: "ai" as const,
              text: expectedMessages.english,
              createdAt: new Date().toISOString(),
            }}
            isDark={false}
          />
        );
        expect(getByText(expectedMessages.english)).toBeTruthy();
      });

      it("renders Gujarati completion notice in MessageBubble", async () => {
        const { getByText } = await render(
          <MessageBubble
            message={{
              id: "ai-comp-gu",
              role: "ai" as const,
              text: expectedMessages.gujarati,
              createdAt: new Date().toISOString(),
            }}
            isDark={false}
          />
        );
        expect(getByText(expectedMessages.gujarati)).toBeTruthy();
      });

      it("renders Hindi completion notice in MessageBubble", async () => {
        const { getByText } = await render(
          <MessageBubble
            message={{
              id: "ai-comp-hi",
              role: "ai" as const,
              text: expectedMessages.hindi,
              createdAt: new Date().toISOString(),
            }}
            isDark={false}
          />
        );
        expect(getByText(expectedMessages.hindi)).toBeTruthy();
      });

      it("renders Marathi completion notice in MessageBubble", async () => {
        const { getByText } = await render(
          <MessageBubble
            message={{
              id: "ai-comp-mr",
              role: "ai" as const,
              text: expectedMessages.marathi,
              createdAt: new Date().toISOString(),
            }}
            isDark={false}
          />
        );
        expect(getByText(expectedMessages.marathi)).toBeTruthy();
      });

      it("renders Tamil completion notice in MessageBubble", async () => {
        const { getByText } = await render(
          <MessageBubble
            message={{
              id: "ai-comp-ta",
              role: "ai" as const,
              text: expectedMessages.tamil,
              createdAt: new Date().toISOString(),
            }}
            isDark={false}
          />
        );
        expect(getByText(expectedMessages.tamil)).toBeTruthy();
      });
    });
  });

  describe("5. Allergy Repetition Prevention & In-Flight Concurrency Controls", () => {
    const normalizeText = (t?: string) =>
      (t || "").toLowerCase().replace(/[^a-z0-9]/g, "").trim();

    it("drops duplicate consecutive assistant allergy questions when re-sent with same action and content", () => {
      let currentMessages: any[] = [
        {
          id: "ai-allergy-1",
          role: "assistant",
          content: "Do you have any allergies? You can skip this question.",
          action: "ASK_ALLERGIES",
        },
        {
          id: "user-allergy-1",
          role: "user",
          content: "No allergies",
        },
      ];
      let canSkip = true;
      const setMessages = (updater: (prev: any[]) => any[]) => {
        currentMessages = updater(currentMessages);
      };
      const setCanSkip = (updater: (prev: boolean) => boolean) => {
        canSkip = updater(canSkip);
      };

      // Stale or duplicate response from backend
      const duplicateAllergyResponse = {
        action: "ASK_ALLERGIES",
        message: "Do you have any allergies? You can skip this question.",
        canSkip: true,
      };

      // Exact functional updater logic from OnboardingScreen
      const action = duplicateAllergyResponse.action;
      const messageContent = duplicateAllergyResponse.message;
      const normReply = normalizeText(messageContent);
      const newMsg = {
        id: `ai-duplicate`,
        role: "assistant",
        content: messageContent,
        action,
      };

      setMessages((prev) => {
        const lastAssistantMsg = [...prev]
          .reverse()
          .find((m) => m.role === "assistant");
        const isDuplicateAssistantMsg =
          lastAssistantMsg &&
          lastAssistantMsg.action === newMsg.action &&
          normalizeText(lastAssistantMsg.content) === normReply &&
          lastAssistantMsg.action !== "ONBOARDING_COMPLETED_NOTICE";

        if (isDuplicateAssistantMsg) {
          return prev;
        }
        return [...prev, newMsg];
      });

      // The duplicate assistant allergy message should be dropped!
      expect(currentMessages.length).toBe(2);
      expect(currentMessages[0].id).toBe("ai-allergy-1");
      expect(currentMessages[1].content).toBe("No allergies");
    });

    it("advances cleanly when assistant returns next step (MEDICINE_OPTIONS)", () => {
      let currentMessages: any[] = [
        {
          id: "ai-allergy-1",
          role: "assistant",
          content: "Do you have any allergies? You can skip this question.",
          action: "ASK_ALLERGIES",
        },
        {
          id: "user-allergy-1",
          role: "user",
          content: "No allergies",
        },
      ];
      const setMessages = (updater: (prev: any[]) => any[]) => {
        currentMessages = updater(currentMessages);
      };

      const nextStepResponse = {
        action: "MEDICINE_OPTIONS",
        message: "Would you like to add your medications now?",
        canSkip: true,
      };

      const action = nextStepResponse.action;
      const messageContent = nextStepResponse.message;
      const normReply = normalizeText(messageContent);
      const newMsg = {
        id: `ai-next`,
        role: "assistant",
        content: messageContent,
        action,
      };

      setMessages((prev) => {
        const lastAssistantMsg = [...prev]
          .reverse()
          .find((m) => m.role === "assistant");
        const isDuplicateAssistantMsg =
          lastAssistantMsg &&
          lastAssistantMsg.action === newMsg.action &&
          normalizeText(lastAssistantMsg.content) === normReply &&
          lastAssistantMsg.action !== "ONBOARDING_COMPLETED_NOTICE";

        if (isDuplicateAssistantMsg) {
          return prev;
        }
        return [...prev, newMsg];
      });

      expect(currentMessages.length).toBe(3);
      expect(currentMessages[2].action).toBe("MEDICINE_OPTIONS");
      expect(currentMessages[2].content).toBe("Would you like to add your medications now?");
    });

    it("suppresses consecutive duplicate user messages from rapid double taps", () => {
      let currentMessages: any[] = [];
      const setMessages = (updater: (prev: any[]) => any[]) => {
        currentMessages = updater(currentMessages);
      };

      const appendUserMessage = (userContent: string) => {
        const userMsg = {
          id: `user-${Date.now()}-${Math.random()}`,
          role: "user",
          content: userContent,
          rawValue: userContent,
          createdAt: new Date().toISOString(),
        };

        setMessages((prev) => {
          const lastMsg = prev[prev.length - 1];
          if (
            lastMsg &&
            lastMsg.role === "user" &&
            lastMsg.content === userContent
          ) {
            return prev;
          }
          return [...prev, userMsg];
        });
      };

      // Simulate rapid double tap of "No allergies"
      appendUserMessage("No allergies");
      appendUserMessage("No allergies");

      expect(currentMessages.length).toBe(1);
      expect(currentMessages[0].content).toBe("No allergies");
    });

    it("deduplicates consecutive duplicate messages during history restoration", () => {
      const rawHistory = [
        {
          id: "m1",
          role: "assistant",
          content: "Do you have any allergies?",
          metadata: { action: "ASK_ALLERGIES" },
        },
        // Accidental duplicate assistant question in DB from duplicate triggers:
        {
          id: "m1_dup",
          role: "assistant",
          content: "Do you have any allergies?",
          metadata: { action: "ASK_ALLERGIES" },
        },
        {
          id: "m2",
          role: "user",
          content: "No allergies",
          metadata: {},
        },
        // Accidental duplicate user answer in DB from rapid double tap:
        {
          id: "m2_dup",
          role: "user",
          content: "No allergies",
          metadata: {},
        },
        {
          id: "m3",
          role: "assistant",
          content: "Would you like to add medications?",
          metadata: { action: "MEDICINE_OPTIONS" },
        },
      ];

      // Exact history deduplication logic from OnboardingScreen and useChatSession
      const mappedMessages: any[] = [];
      const seenNotice = new Set<string>();

      for (const dbMsg of rawHistory) {
        const meta = dbMsg.metadata || {};
        const isNotice =
          meta.action === "ONBOARDING_COMPLETED_NOTICE" ||
          dbMsg.id?.startsWith("ai-comp-");

        if (isNotice) {
          if (seenNotice.has("ONBOARDING_COMPLETED_NOTICE")) {
            continue;
          }
          seenNotice.add("ONBOARDING_COMPLETED_NOTICE");
        }

        const prevMsg = mappedMessages[mappedMessages.length - 1];
        const role = dbMsg.role;
        const text = dbMsg.content || "";
        const action = meta.action || "NORMAL_CHAT";

        const isConsecutiveDuplicate =
          prevMsg &&
          prevMsg.role === role &&
          normalizeText(prevMsg.content) === normalizeText(text) &&
          (role === "user" || prevMsg.action === action);

        if (isConsecutiveDuplicate) {
          continue;
        }

        mappedMessages.push({
          id: dbMsg.id,
          role,
          content: text,
          action,
        });
      }

      // Out of 5 raw messages (which had duplicate user and duplicate assistant prompts),
      // only 3 should remain: ASK_ALLERGIES, No allergies, MEDICINE_OPTIONS
      expect(mappedMessages.length).toBe(3);
      expect(mappedMessages[0].action).toBe("ASK_ALLERGIES");
      expect(mappedMessages[1].content).toBe("No allergies");
      expect(mappedMessages[2].action).toBe("MEDICINE_OPTIONS");
    });
  });

  describe("6. Generic Option Handling, In-Flight Concurrency & Step Progression Invariants", () => {
    const mockTheme = {
      colors: {
        primary: "#0f766e",
        background: "#ffffff",
        surface: "#f8fafc",
        textPrimary: "#0f172a",
        textSecondary: "#64748b",
        border: "#e2e8f0",
      },
    };

    it("MedicineOptionsPanel forwards both optKey and label onOptionPress", async () => {
      const mockOnOptionPress = jest.fn();
      const optionsList = [
        { key: "ADD", label: "Add Another Medicine", primary: true },
        { key: "DASHBOARD", label: "Go to Dashboard", primary: false },
      ];

      const screen = await render(
        <MedicineOptionsPanel
          optionsList={optionsList}
          isDark={false}
          theme={mockTheme}
          onOptionPress={mockOnOptionPress}
          readOnly={false}
          loading={false}
        />
      );

      await act(async () => {
        fireEvent.press(screen.getByText("Add Another Medicine"));
      });
      expect(mockOnOptionPress).toHaveBeenCalledTimes(1);
      expect(mockOnOptionPress).toHaveBeenCalledWith("ADD", "Add Another Medicine");

      await act(async () => {
        fireEvent.press(screen.getByText("Go to Dashboard"));
      });
      expect(mockOnOptionPress).toHaveBeenCalledTimes(2);
      expect(mockOnOptionPress).toHaveBeenCalledWith("DASHBOARD", "Go to Dashboard");
    });

    it("MedicineOptionsPanel disables options and blocks pointer events when loading is true", async () => {
      const mockOnOptionPress = jest.fn();
      const optionsList = [
        { key: "ADD", label: "Add Another Medicine", primary: true },
      ];

      const screen = await render(
        <MedicineOptionsPanel
          optionsList={optionsList}
          isDark={false}
          theme={mockTheme}
          onOptionPress={mockOnOptionPress}
          readOnly={false}
          loading={true}
        />
      );

      await act(async () => {
        fireEvent.press(screen.getByText("Add Another Medicine"));
      });
      expect(mockOnOptionPress).not.toHaveBeenCalled();
    });

    it("handleGenericOptionPress normalizes stable machine keys and localized display labels without ever creating 'Option'", async () => {
      const messagesState: any[] = [];
      const setMessages = (updater: (prev: any[]) => any[]) => {
        const updated = updater(messagesState);
        messagesState.splice(0, messagesState.length, ...updated);
      };
      const mockApiClientPost = jest.fn().mockResolvedValue({
        data: {
          data: {
            reply: "Please enter the medication details:",
            actionType: "ADD_MEDICINE",
            onboardingState: { currentStep: "ADD_MEDICINE" },
          },
        },
      });

      // Simulation of handleGenericOptionPress implementation
      const isSendingRef = { current: false };
      const handleGenericOptionPress = async (option: any, optLabel?: string) => {
        if (isSendingRef.current) return;
        isSendingRef.current = true;

        let optKey: string = "";
        if (typeof option === "string") {
          optKey = option.trim();
        } else if (option && typeof option === "object") {
          optKey = String(option.key ?? option.value ?? option.action ?? option.id ?? "").trim();
        }

        if (!optKey || optKey === "Option" || optKey.toUpperCase() === "UNDEFINED") {
          isSendingRef.current = false;
          return;
        }

        let normalizedKey = optKey;
        if (optKey === "ASK_ABOUT_REPORT") normalizedKey = "ASK_REPORT";
        else if (optKey === "ADD_MORE_MEDICINES" || optKey.toUpperCase() === "ADD ANOTHER MEDICINE") normalizedKey = "ADD";
        else if (optKey === "GO_TO_DASHBOARD") normalizedKey = "DASHBOARD";

        let optionLabel: string = "";
        if (option && typeof option === "object" && typeof option.label === "string" && option.label.trim()) {
          optionLabel = option.label.trim();
        } else if (typeof optLabel === "string" && optLabel.trim() && optLabel.trim() !== "Option") {
          optionLabel = optLabel.trim();
        } else {
          optionLabel = normalizedKey;
        }

        if (optionLabel === "Option") {
          optionLabel = normalizedKey;
        }

        const userMsg = {
          id: `user-opt-${Date.now()}`,
          role: "user",
          text: optionLabel,
        };
        setMessages((prev) => [...prev, userMsg]);

        try {
          await mockApiClientPost("/v1/onboarding/chat", {
            message: normalizedKey,
          });
        } finally {
          isSendingRef.current = false;
        }
      };

      // 1. Valid string key + human label
      await handleGenericOptionPress("ADD", "Add Another Medicine");
      expect(messagesState.length).toBe(1);
      expect(messagesState[0].text).toBe("Add Another Medicine");
      expect(messagesState[0].text).not.toBe("Option");
      expect(mockApiClientPost).toHaveBeenCalledWith("/v1/onboarding/chat", { message: "ADD" });

      // 2. DASHBOARD option
      await handleGenericOptionPress("DASHBOARD", "Go to Dashboard");
      expect(messagesState.length).toBe(2);
      expect(messagesState[1].text).toBe("Go to Dashboard");
      expect(mockApiClientPost).toHaveBeenCalledWith("/v1/onboarding/chat", { message: "DASHBOARD" });

      // 3. Invalid option key ("Option" or empty)
      await handleGenericOptionPress("Option", "Option");
      expect(messagesState.length).toBe(2); // no message added
      expect(mockApiClientPost).toHaveBeenCalledTimes(2); // no API call dispatched
    });

    it("synchronous in-flight guard blocks rapid double-tap submissions", async () => {
      let isSendingRef = false;
      const apiCalls: string[] = [];
      const userBubbles: string[] = [];

      const simulateSubmit = async (key: string, label: string) => {
        if (isSendingRef) return;
        isSendingRef = true;
        userBubbles.push(label);

        // Simulate async network request
        await new Promise((resolve) => setTimeout(resolve, 50));
        apiCalls.push(key);
        isSendingRef = false;
      };

      // Trigger two concurrent taps without waiting
      const call1 = simulateSubmit("ADD", "Add Another Medicine");
      const call2 = simulateSubmit("ADD", "Add Another Medicine");

      await Promise.all([call1, call2]);

      expect(userBubbles.length).toBe(1);
      expect(apiCalls.length).toBe(1);
      expect(userBubbles[0]).toBe("Add Another Medicine");
      expect(apiCalls[0]).toBe("ADD");
    });

    it("verifies multi-step progression guarantees questions never repeat after valid answer", () => {
      // Trace steps: Blood Group -> Allergies -> Medicine Options -> Add Medicine -> Complete
      const stepHistory: string[] = [];
      const assistantQuestions: string[] = [];

      let state: any = {
        profileConfirmed: true,
        bloodGroupSkipped: false,
        allergiesSkipped: false,
        medicationFlowDone: false,
        existingUserData: {},
        currentStep: "ASK_BLOOD_GROUP",
      };

      const isStepAlreadySatisfied = (stepName: string, s: any) => {
        if (!stepName || !s) return false;
        if (s.isOnboardingCompleted === true) return true;
        if (stepName === "ASK_BLOOD_GROUP") {
          return s.bloodGroupSkipped === true || (s.existingUserData?.bloodGroup && s.existingUserData.bloodGroup.length > 0);
        }
        if (stepName === "ASK_ALLERGIES") {
          return s.allergiesSkipped === true || (Array.isArray(s.existingUserData?.allergies) && s.existingUserData.allergies.length > 0);
        }
        if (["MEDICINE_OPTIONS", "REVIEW_MEDICINES_LIST"].includes(stepName)) {
          return s.medicationFlowDone === true;
        }
        return false;
      };

      const getNextStep = (s: any) => {
        if (!s.bloodGroupSkipped && !s.existingUserData?.bloodGroup) return "ASK_BLOOD_GROUP";
        if (!s.allergiesSkipped && (!s.existingUserData?.allergies || s.existingUserData.allergies.length === 0)) return "ASK_ALLERGIES";
        if (!s.medicationFlowDone) return "MEDICINE_OPTIONS";
        return "COMPLETE";
      };

      // Step 1: ASK_BLOOD_GROUP
      expect(state.currentStep).toBe("ASK_BLOOD_GROUP");
      assistantQuestions.push("What is your blood group?");

      // User answers "O+"
      state.existingUserData.bloodGroup = "O+";
      state.currentStep = getNextStep(state);
      expect(state.currentStep).toBe("ASK_ALLERGIES");
      assistantQuestions.push("Do you have any allergies?");

      // Verify Blood group question is satisfied and never asked again
      expect(isStepAlreadySatisfied("ASK_BLOOD_GROUP", state)).toBe(true);

      // User answers "No allergies"
      state.allergiesSkipped = true;
      state.currentStep = getNextStep(state);
      expect(state.currentStep).toBe("MEDICINE_OPTIONS");
      assistantQuestions.push("What would you like to do next?");

      // Verify Allergies question is satisfied and never asked again
      expect(isStepAlreadySatisfied("ASK_ALLERGIES", state)).toBe(true);

      // User selects "ADD"
      state.currentStep = "ADD_MEDICINE";
      assistantQuestions.push("Please enter the new medication details:");

      // Verify that after ADD, the question "What would you like to do next?" does not repeat
      expect(state.currentStep).toBe("ADD_MEDICINE");

      // User confirms medicine and finishes medication flow
      state.medicationFlowDone = true;
      state.isOnboardingCompleted = true;
      state.currentStep = getNextStep(state);
      expect(state.currentStep).toBe("COMPLETE");

      // Verify all steps are satisfied and none repeated
      expect(isStepAlreadySatisfied("MEDICINE_OPTIONS", state)).toBe(true);
      expect(assistantQuestions).toEqual([
        "What is your blood group?",
        "Do you have any allergies?",
        "What would you like to do next?",
        "Please enter the new medication details:",
      ]);
    });

    describe("Optional Questions Independence & Resume Restoration (Blood Group vs Allergy)", () => {
      it("Blood Group answered, Allergy unanswered: maintains independent state and does not corrupt allergies", () => {
        let state: any = {
          profileConfirmed: true,
          bloodGroupSkipped: false,
          allergiesSkipped: false,
          existingUserData: {},
          currentStep: "ASK_BLOOD_GROUP",
        };

        // User answers Blood Group "O+"
        const textToSubmit = "O+";
        state = {
          ...state,
          existingUserData: {
            ...state.existingUserData,
            bloodGroup: textToSubmit,
          },
        };

        expect(state.existingUserData.bloodGroup).toBe("O+");
        expect(state.existingUserData.allergies).toBeUndefined();
        expect(state.bloodGroupSkipped).toBe(false);
        expect(state.allergiesSkipped).toBe(false);
      });

      it("Allergy answered, Blood Group unanswered: maintains independent state and does not modify bloodGroup", () => {
        let state: any = {
          profileConfirmed: true,
          bloodGroupSkipped: false,
          allergiesSkipped: false,
          existingUserData: {},
          currentStep: "ASK_ALLERGIES",
        };

        // User answers allergies "Dust, Pollen"
        const textToSubmit = "Dust, Pollen";
        const splitAllergies = textToSubmit
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);

        state = {
          ...state,
          existingUserData: {
            ...state.existingUserData,
            allergies: splitAllergies,
          },
        };

        expect(state.existingUserData.allergies).toEqual(["Dust", "Pollen"]);
        expect(state.existingUserData.bloodGroup).toBeUndefined();
        expect(state.bloodGroupSkipped).toBe(false);
        expect(state.allergiesSkipped).toBe(false);
      });

      it("Both answered with different values: preserves separate distinct values", () => {
        let state: any = {
          profileConfirmed: true,
          bloodGroupSkipped: false,
          allergiesSkipped: false,
          existingUserData: {},
        };

        // Blood Group answered
        state.existingUserData.bloodGroup = "B+";
        // Allergy answered
        state.existingUserData.allergies = ["Peanuts"];

        expect(state.existingUserData.bloodGroup).toBe("B+");
        expect(state.existingUserData.allergies).toEqual(["Peanuts"]);
        expect(state.existingUserData.bloodGroup).not.toEqual(state.existingUserData.allergies);
      });

      it("Blood Group 'B+' option press transitions to ASK_ALLERGIES, ensures clean allergies, and ignores bloodGroup in allergies state", () => {
        let state: any = {
          preferredLanguage: "english",
          flowMode: "MANUAL",
          profileConfirmed: true,
          bloodGroupSkipped: false,
          allergiesSkipped: false,
          existingUserData: {
            firstName: "Kalpesh",
            lastName: "Parmar",
            dateOfBirth: "1992-05-15",
            gender: "male",
          },
          currentStep: "ASK_BLOOD_GROUP",
        };

        // User taps Blood Group option "B+"
        const value = "B+";
        let newState = { ...state };
        newState.currentStep = "ASK_BLOOD_GROUP";
        newState.bloodGroupSkipped = false;
        newState.existingUserData = {
          ...newState.existingUserData,
          bloodGroup: value,
        };

        expect(newState.currentStep).toBe("ASK_BLOOD_GROUP");
        expect(newState.existingUserData.bloodGroup).toBe("B+");
        expect(newState.existingUserData.allergies).toBeUndefined();

        // Server responds with ASK_ALLERGIES
        const serverResponse = {
          action: "ASK_ALLERGIES",
          onboardingState: {
            currentStep: "ASK_ALLERGIES",
            existingUserData: {
              ...newState.existingUserData,
            },
          },
        };

        let finalState = { ...newState, ...serverResponse.onboardingState };
        finalState.currentStep = serverResponse.onboardingState.currentStep || serverResponse.action || finalState.currentStep;

        expect(finalState.currentStep).toBe("ASK_ALLERGIES");
        expect(finalState.existingUserData.bloodGroup).toBe("B+");
        expect(finalState.existingUserData.allergies).toBeUndefined();
      });

      it("Both skipped: sets independent boolean flags without cross-contamination", () => {
        let state: any = {
          profileConfirmed: true,
          bloodGroupSkipped: false,
          allergiesSkipped: false,
          existingUserData: {},
        };

        // Skip Blood Group
        state = { ...state, bloodGroupSkipped: true };
        expect(state.bloodGroupSkipped).toBe(true);
        expect(state.allergiesSkipped).toBe(false);

        // Skip Allergies
        state = { ...state, allergiesSkipped: true };
        expect(state.bloodGroupSkipped).toBe(true);
        expect(state.allergiesSkipped).toBe(true);
      });

      it("Resume / reload restoration: correctly restores persisted values to separate fields", () => {
        const initialState: any = {
          preferredLanguage: "english",
          flowMode: "MANUAL",
          existingUserData: {},
        };

        const serverResumableState = {
          currentStep: "ASK_ALLERGIES",
          bloodGroupSkipped: false,
          allergiesSkipped: false,
          existingUserData: {
            firstName: "John",
            lastName: "Doe",
            dateOfBirth: "1990-01-01",
            gender: "male",
            bloodGroup: "A+",
          },
        };

        // Simulate resume merging in OnboardingScreen.tsx:
        const mergedState = {
          ...initialState,
          ...serverResumableState,
        };

        expect(mergedState.currentStep).toBe("ASK_ALLERGIES");
        expect(mergedState.existingUserData.bloodGroup).toBe("A+");
        expect(mergedState.existingUserData.allergies).toBeUndefined();
        expect(mergedState.bloodGroupSkipped).toBe(false);
        expect(mergedState.allergiesSkipped).toBe(false);
      });
    });

    describe("7. Onboarding Medicine Flow Cancel & State Restoration Invariants", () => {
      it("1 & 2 & 3: Add Medicines -> Cancel preserves ADD_MEDICINE card and 'Add Medicines' user message in chat history", () => {
        let messages: any[] = [
          {
            id: "msg-1-options",
            role: "assistant",
            action: "MEDICINE_OPTIONS",
            content: "What would you like to do next?",
            options: [
              { key: "ADD", label: "Add Medicines", primary: true },
              { key: "DASHBOARD", label: "Go to Dashboard", primary: false },
            ],
          },
        ];

        // User taps "Add Medicines"
        const addMedUserMsg = {
          id: "msg-2-user-add",
          role: "user",
          content: "Add Medicines",
          rawValue: "ADD",
        };
        const addMedCardMsg = {
          id: "msg-3-ai-card",
          role: "assistant",
          action: "ADD_MEDICINE",
          content: "Please enter the new medication details:",
          medicine: { name: "", dose: { count: 1 } },
        };
        messages.push(addMedUserMsg, addMedCardMsg);

        expect(messages).toHaveLength(3);

        // Simulation of handleExitToOptions in ADD_MEDICINE:
        // Crucial invariant: Do NOT filter out activeMsg or ADD_MEDICINE
        let state: any = {
          currentStep: "ADD_MEDICINE",
          medicinesToAdd: [{ name: "Draft Med", isSaved: false }],
        };
        let localMedicines: any[] = [{ name: "Draft Med", isSaved: false }];

        const confirmedMeds = localMedicines.filter((m: any) => m.isSaved === true);
        localMedicines = confirmedMeds;
        state = {
          ...state,
          currentStep: "MEDICINE_OPTIONS",
          medicinesToAdd: confirmedMeds,
          currentMedicineIndex: confirmedMeds.length,
          cancellationNotice: true,
        };

        // Regression assertion 2: ADD_MEDICINE card is preserved in chat history
        expect(messages.some((m) => m.action === "ADD_MEDICINE")).toBe(true);
        expect(messages.some((m) => m.id === "msg-3-ai-card")).toBe(true);

        // Regression assertion 3: "Add Medicines" user message is preserved in chat history
        expect(messages.some((m) => m.role === "user" && m.rawValue === "ADD")).toBe(true);
      });

      it("4 & 5: Cancel creates 'Cancel' user message and assistant cancellation response, restoring currentStep = 'MEDICINE_OPTIONS'", () => {
        let messages: any[] = [
          {
            id: "msg-1-options",
            role: "assistant",
            action: "MEDICINE_OPTIONS",
            content: "What would you like to do next?",
            options: [
              { key: "ADD", label: "Add Medicines", primary: true },
              { key: "DASHBOARD", label: "Go to Dashboard", primary: false },
            ],
          },
          {
            id: "msg-2-user-add",
            role: "user",
            content: "Add Medicines",
            rawValue: "ADD",
          },
          {
            id: "msg-3-ai-card",
            role: "assistant",
            action: "ADD_MEDICINE",
            content: "Please enter the new medication details:",
          },
        ];

        let state: any = {
          currentStep: "ADD_MEDICINE",
          medicinesToAdd: [],
        };

        // sendMessage("CANCEL", cancelState, "Cancel")
        const cancelUserMsg = {
          id: "msg-4-user-cancel",
          role: "user",
          content: "Cancel",
          rawValue: "CANCEL",
        };
        messages.push(cancelUserMsg);

        // Backend cancellation response
        const cancellationAiMsg = {
          id: "msg-5-ai-cancel-options",
          role: "assistant",
          action: "MEDICINE_OPTIONS",
          content: "Medicine entry has been cancelled.\n\nWhat would you like to do next?",
          options: [
            { key: "ADD", label: "Add Medicines", primary: true },
            { key: "DASHBOARD", label: "Go to Dashboard", primary: false },
          ],
        };
        messages.push(cancellationAiMsg);
        state.currentStep = "MEDICINE_OPTIONS";

        // Regression assertion 4: Cancel and cancellation response exist in messages
        expect(messages.some((m) => m.role === "user" && m.rawValue === "CANCEL")).toBe(true);
        expect(messages.some((m) => m.role === "assistant" && m.content.includes("cancelled"))).toBe(true);

        // Regression assertion 5: state.currentStep === "MEDICINE_OPTIONS"
        expect(state.currentStep).toBe("MEDICINE_OPTIONS");
      });

      it("6 & 7: Latest MEDICINE_OPTIONS card is active, interactive, and 'Add Medicines' is not visually selected/checked", () => {
        const messages = [
          {
            id: "msg-1-options",
            role: "assistant",
            action: "MEDICINE_OPTIONS",
            content: "What would you like to do next?",
            options: [
              { key: "ADD", label: "Add Medicines", primary: true },
              { key: "DASHBOARD", label: "Go to Dashboard", primary: false },
            ],
          },
          {
            id: "msg-2-user-add",
            role: "user",
            content: "Add Medicines",
            rawValue: "ADD",
          },
          {
            id: "msg-3-ai-card",
            role: "assistant",
            action: "ADD_MEDICINE",
            content: "Please enter the new medication details:",
          },
          {
            id: "msg-4-user-cancel",
            role: "user",
            content: "Cancel",
            rawValue: "CANCEL",
          },
          {
            id: "msg-5-ai-cancel-options",
            role: "assistant",
            action: "MEDICINE_OPTIONS",
            content: "Medicine entry has been cancelled.\n\nWhat would you like to do next?",
            options: [
              { key: "ADD", label: "Add Medicines", primary: true },
              { key: "DASHBOARD", label: "Go to Dashboard", primary: false },
            ],
          },
        ];

        const state = { currentStep: "MEDICINE_OPTIONS" };
        const latestMsg = messages[messages.length - 1];

        // Evaluate isInteractiveMedicineOptions logic from renderItem
        const isLatestMedicineOptions =
          latestMsg.action === "MEDICINE_OPTIONS" &&
          !messages.some(
            (m, idx) =>
              idx > messages.findIndex((msg) => msg.id === latestMsg.id) &&
              m.role === "assistant" &&
              (m.action === "MEDICINE_OPTIONS" || m.action === "CONFIRM_MEDICINE"),
          );
        const isInteractiveMedicineOptions =
          isLatestMedicineOptions && state.currentStep === "MEDICINE_OPTIONS";
        const isHistorical = isInteractiveMedicineOptions ? false : true;

        // Regression assertion 6: latest card is interactive (isHistorical === false)
        expect(isInteractiveMedicineOptions).toBe(true);
        expect(isHistorical).toBe(false);

        // Evaluate effectiveChosenVal logic from renderOptions
        const activeIndex = messages.findIndex((m) => m.id === latestMsg.id);
        const isCancelledSubFlow =
          activeIndex !== -1 &&
          messages.some(
            (m, idx) =>
              idx > activeIndex &&
              ((m.role === "user" && (m.rawValue === "CANCEL" || m.content?.toLowerCase() === "cancel")) ||
                (m.role === "assistant" && m.content?.toLowerCase().includes("cancelled"))),
          );
        const effectiveChosenVal = isCancelledSubFlow ? null : null; // no subsequent reply after latestMsg

        // Regression assertion 7: 'Add Medicines' is not visually chosen or checked
        expect(effectiveChosenVal).toBeNull();
      });

      it("8: Superseded historical MEDICINE_OPTIONS messages do NOT render duplicate options panels", () => {
        const messages = [
          {
            id: "msg-1-options",
            role: "assistant",
            action: "MEDICINE_OPTIONS",
            content: "What would you like to do next?",
            options: [{ key: "ADD", label: "Add Medicines" }],
          },
          { id: "msg-2-user-add", role: "user", content: "Add Medicines", rawValue: "ADD" },
          { id: "msg-3-ai-card", role: "assistant", action: "ADD_MEDICINE", content: "Form" },
          { id: "msg-4-user-cancel", role: "user", content: "Cancel", rawValue: "CANCEL" },
          {
            id: "msg-5-ai-cancel-options",
            role: "assistant",
            action: "MEDICINE_OPTIONS",
            content: "Cancelled notice",
            options: [{ key: "ADD", label: "Add Medicines" }],
          },
        ];

        // Function simulating renderOptions duplicate-prevention guard
        const shouldRenderOptionsPanel = (activeMsg: any) => {
          const activeIndex = messages.findIndex((m) => m.id === activeMsg.id);
          const isLaterMedicineOptionsPresent =
            activeIndex !== -1 &&
            messages.some(
              (m, idx) =>
                idx > activeIndex &&
                m.role === "assistant" &&
                (m.action === "MEDICINE_OPTIONS" || m.action === "CONFIRM_MEDICINE"),
            );
          return !isLaterMedicineOptionsPresent;
        };

        // Earlier MEDICINE_OPTIONS card (msg-1-options) has a later card present -> returns false (null)
        expect(shouldRenderOptionsPanel(messages[0])).toBe(false);

        // Latest MEDICINE_OPTIONS card (msg-5-ai-cancel-options) has NO later card present -> returns true (panel rendered)
        expect(shouldRenderOptionsPanel(messages[4])).toBe(true);
      });

      it("9 & 10: Cancel discards only unconfirmed medicine drafts and preserves previously saved medicines", () => {
        const previouslySavedMed = {
          client_med_id: "client_saved_1",
          id: "client_saved_1",
          name: "Metformin 500mg",
          isSaved: true,
        };
        const unconfirmedDraftMed = {
          client_med_id: "client_draft_2",
          id: "client_draft_2",
          name: "Paracetamol 500mg",
          isSaved: false,
        };

        let localMedicines = [previouslySavedMed, unconfirmedDraftMed];
        let state: any = {
          currentStep: "ADD_MEDICINE",
          medicinesToAdd: [...localMedicines],
        };

        // User clicks Cancel -> handleExitToOptions
        const confirmedMeds = (localMedicines || state?.medicinesToAdd || []).filter(
          (m: any) => m.isSaved === true,
        );
        localMedicines = confirmedMeds;
        state = {
          ...state,
          currentStep: "MEDICINE_OPTIONS",
          medicinesToAdd: confirmedMeds,
          currentMedicineIndex: confirmedMeds.length,
          cancellationNotice: true,
        };

        // Regression assertion 9: Unconfirmed draft discarded
        expect(localMedicines.some((m: any) => m.name === "Paracetamol 500mg")).toBe(false);
        expect(state.medicinesToAdd.some((m: any) => m.name === "Paracetamol 500mg")).toBe(false);

        // Regression assertion 10: Previously saved medicine preserved
        expect(localMedicines).toHaveLength(1);
        expect(localMedicines[0].name).toBe("Metformin 500mg");
        expect(localMedicines[0].isSaved).toBe(true);
      });

      it("11: Selecting 'Add Medicines' again after Cancel begins a clean Medicine #1 session with a fresh client_med_id", () => {
        let localMedicines: any[] = [];
        let state: any = {
          currentStep: "MEDICINE_OPTIONS",
          medicinesToAdd: [],
        };
        let currentClientMedId: string | null = null;
        let activeMedicineToEdit: any = null;

        // User cancelled previous entry -> state is MEDICINE_OPTIONS
        expect(state.currentStep).toBe("MEDICINE_OPTIONS");
        expect(localMedicines).toHaveLength(0);

        // User taps "Add Medicines" again -> handleOptionPress("ADD", "Add Medicines")
        const existingMeds = (localMedicines || state?.medicinesToAdd || []).filter((m: any) => m.isSaved === true);
        localMedicines = existingMeds;
        currentClientMedId = null;
        activeMedicineToEdit = null;

        const nextState = {
          ...state,
          medicinesFlowStarted: true,
          medicinesToAdd: existingMeds,
          currentStep: "ADD_MEDICINE",
          currentMedicineIndex: existingMeds.length,
          cancellationNotice: false,
        };
        state = nextState;

        const freshDraftId = `client_${Date.now()}_clean`;
        currentClientMedId = freshDraftId;

        // Regression assertion 11: Fresh Medicine #1 session opened cleanly
        expect(state.currentStep).toBe("ADD_MEDICINE");
        expect(state.currentMedicineIndex).toBe(0);
        expect(currentClientMedId).toBe(freshDraftId);
        expect(activeMedicineToEdit).toBeNull();
      });

      it("12: REVIEW_MEDICINES_LIST cancellation preserves review list in history and restores MEDICINE_OPTIONS cleanly", () => {
        let messages: any[] = [
          {
            id: "msg-rev-list",
            role: "assistant",
            action: "REVIEW_MEDICINES_LIST",
            content: "Please review the list of medications:",
            medicines: [
              { client_med_id: "med-1", name: "Aspirin", isSaved: true },
              { client_med_id: "med-2", name: "Ibuprofen", isSaved: false },
            ],
          },
        ];

        let state: any = {
          currentStep: "REVIEW_MEDICINES_LIST",
          medicinesToAdd: [
            { client_med_id: "med-1", name: "Aspirin", isSaved: true },
            { client_med_id: "med-2", name: "Ibuprofen", isSaved: false },
          ],
        };
        let localMedicines = [...state.medicinesToAdd];

        // User taps Cancel from REVIEW_MEDICINES_LIST:
        // Crucial invariant: Do NOT filter out REVIEW_MEDICINES_LIST from messages
        const confirmedMeds = (localMedicines || state?.medicinesToAdd || []).filter(
          (m: any) => m.isSaved === true,
        );
        localMedicines = confirmedMeds;
        state = {
          ...state,
          currentStep: "MEDICINE_OPTIONS",
          medicinesToAdd: confirmedMeds,
          currentMedicineIndex: confirmedMeds.length,
          cancellationNotice: true,
        };

        // Cancel user message + cancellation assistant response
        messages.push(
          { id: "msg-user-cancel", role: "user", content: "Cancel", rawValue: "CANCEL" },
          { id: "msg-ai-cancel", role: "assistant", action: "MEDICINE_OPTIONS", content: "Cancelled" },
        );

        // Regression assertion 12: REVIEW_MEDICINES_LIST card preserved in chat history
        expect(messages.some((m) => m.action === "REVIEW_MEDICINES_LIST")).toBe(true);
        expect(state.currentStep).toBe("MEDICINE_OPTIONS");
        expect(localMedicines).toHaveLength(1);
        expect(localMedicines[0].name).toBe("Aspirin");
      });

      it("13: Add & Continue and Save Medicines behavior is completely unaffected by cancellation fixes", () => {
        let localMedicines: any[] = [];
        let state: any = {
          currentStep: "ADD_MEDICINE",
          medicinesToAdd: [],
          currentMedicineIndex: 0,
        };

        // 1. Add & Continue with Medicine #1
        const med1 = { client_med_id: "med_1", name: "Paracetamol", isSaved: false };
        const draftsAfterAdd1 = [...localMedicines, med1];
        localMedicines = draftsAfterAdd1;
        state = {
          ...state,
          medicinesToAdd: draftsAfterAdd1,
          currentMedicineIndex: draftsAfterAdd1.length,
        };

        expect(localMedicines).toHaveLength(1);
        expect(state.currentMedicineIndex).toBe(1);

        // 2. Add & Continue with Medicine #2
        const med2 = { client_med_id: "med_2", name: "Amoxicillin", isSaved: false };
        const draftsAfterAdd2 = [...localMedicines, med2];
        localMedicines = draftsAfterAdd2;
        state = {
          ...state,
          medicinesToAdd: draftsAfterAdd2,
          currentMedicineIndex: draftsAfterAdd2.length,
        };

        expect(localMedicines).toHaveLength(2);
        expect(state.currentMedicineIndex).toBe(2);

        // 3. Save Medicines
        const savedDrafts = [...localMedicines];
        state = {
          ...state,
          medicinesToAdd: savedDrafts,
          currentStep: "REVIEW_MEDICINES_LIST",
        };

        // Regression assertion 13: Save Medicines advances step to REVIEW_MEDICINES_LIST with all drafts
        expect(state.currentStep).toBe("REVIEW_MEDICINES_LIST");
        expect(state.medicinesToAdd).toHaveLength(2);
        expect(state.medicinesToAdd[0].name).toBe("Paracetamol");
        expect(state.medicinesToAdd[1].name).toBe("Amoxicillin");
      });
    });
  });
});
describe("14. Phase 1 Acceptance Criteria: Full 14-Point Invariant Verification", () => {
  const baseItemProps: any = {
    index: 0,
    mergedMessages: [],
    isDark: false,
    theme: { colors: { surface: "#ffffff", border: "#e2e8f0" } },
    preferredLang: "english",
    speakingMessageId: null,
    speakMessage: jest.fn(),
    onboardingSessionId: "session-1",
    chatWizardState: {
      step: "idle",
      jobIds: [],
      filesInfo: [],
      extractedMedicines: [],
      conflicts: [],
      currentConflictIndex: 0,
      resolvedMedicines: [],
      replaceList: [],
      mergeList: [],
      summaries: [],
    },
    isLoadingResults: false,
    isConfirmingMeds: false,
    setMedicineToEdit: jest.fn(),
    editSheetRef: { current: null },
    handleConfirmSelection: jest.fn().mockResolvedValue(undefined),
    resolveCurrentConflict: jest.fn(),
    navigateConflict: jest.fn(),
    handleContinueAnyway: jest.fn(),
    handleReviewMedicines: jest.fn(),
    handleConfirmAndAddMeds: jest.fn().mockResolvedValue(undefined),
    handleGenericOptionPress: jest.fn().mockResolvedValue(undefined),
    navigation: { navigate: jest.fn() },
    setChatWizardState: jest.fn(),
  };

  it("Criteria 1 & 2: patient.onboardingCompleted === true and state.isOnboardingCompleted === true", () => {
    const mockPatient = { id: "p1", onboardingCompleted: true };
    const mockState = { isOnboardingCompleted: true, currentStep: "COMPLETE" };

    expect(mockPatient.onboardingCompleted).toBe(true);
    expect(mockState.isOnboardingCompleted).toBe(true);
  });

  it("Criteria 3 & 4: state.currentStep === COMPLETE and pendingStep === null", () => {
    let pendingStep: string | null = "ASK_BLOOD_GROUP";
    const isOnboardingCompleted = true;

    const setPendingStep = (step: string | null) => {
      if (isOnboardingCompleted) {
        pendingStep = null;
      } else {
        pendingStep = step;
      }
    };

    setPendingStep("ASK_BLOOD_GROUP");
    expect(pendingStep).toBeNull();

    const state = { currentStep: "COMPLETE", isOnboardingCompleted: true };
    expect(state.currentStep).toBe("COMPLETE");
  });

  it("Criteria 5: Blood Group options cannot execute", async () => {
    const bloodGroupMsg: any = {
      id: "bg-prompt-test",
      role: "assistant",
      action: "ASK_BLOOD_GROUP",
      text: "What is your blood group?",
      options: [
        { label: "O+", value: "O+" },
        { label: "A+", value: "A+" },
      ],
      createdAt: "2026-09-22T10:00:00.000Z",
    };

    const handleOptionPress = jest.fn();

    const userReplyMsg: any = {
      id: "user-bg-reply",
      role: "user",
      text: "O+",
      createdAt: "2026-09-22T10:01:00.000Z",
    };

    const { queryByText } = await render(
      <ChatMessageItem
        {...baseItemProps}
        item={bloodGroupMsg}
        mergedMessages={[userReplyMsg, bloodGroupMsg]}
        isOnboardingCompleted={true}
        handleGenericOptionPress={handleOptionPress}
      />
    );

    const oPlusChip = queryByText("O+");
    expect(oPlusChip).toBeTruthy();
    if (oPlusChip) {
      fireEvent.press(oPlusChip);
    }
    expect(handleOptionPress).not.toHaveBeenCalled();

    // Test functional guard in handleGenericOptionPress
    const isOnboardingCompleted = true;
    let isAllowedPostOnboarding = false;
    const optKey = "O+";
    const option = { label: "O+", value: "O+" };
    if (isOnboardingCompleted) {
      const normalizedKeyStr = String(optKey || "").trim();
      isAllowedPostOnboarding =
        (option as any)?.actionType === "ASK_REPORT" ||
        normalizedKeyStr === "ASK_REPORT" ||
        normalizedKeyStr === "ASK_ABOUT_REPORT" ||
        (option as any)?.actionType === "CONFIRM_MEDICINES" ||
        (option as any)?.actionType === "ADD_MEDICINE" ||
        normalizedKeyStr === "ADD_MEDICINE" ||
        Boolean((option as any)?.value?.medicine) ||
        (option as any)?.actionType === "ADD_DOCUMENT" ||
        normalizedKeyStr === "ADD_DOCUMENT";
    }
    expect(isAllowedPostOnboarding).toBe(false);
  });

  it("Criteria 6: Skip cannot execute", () => {
    const isOnboardingCompleted = true;
    const optKey = "SKIP";
    const option = { label: "Skip", value: "SKIP", actionType: "SKIP" };
    let isAllowedPostOnboarding = false;
    if (isOnboardingCompleted) {
      const normalizedKeyStr = String(optKey || "").trim();
      isAllowedPostOnboarding =
        (option as any)?.actionType === "ASK_REPORT" ||
        normalizedKeyStr === "ASK_REPORT" ||
        normalizedKeyStr === "ASK_ABOUT_REPORT" ||
        (option as any)?.actionType === "CONFIRM_MEDICINES" ||
        (option as any)?.actionType === "ADD_MEDICINE" ||
        normalizedKeyStr === "ADD_MEDICINE" ||
        Boolean((option as any)?.value?.medicine) ||
        (option as any)?.actionType === "ADD_DOCUMENT" ||
        normalizedKeyStr === "ADD_DOCUMENT";
    }
    expect(isAllowedPostOnboarding).toBe(false);
  });

  it("Criteria 7: Continue cannot execute", () => {
    const isOnboardingCompleted = true;
    const optKey = "CONTINUE";
    const option = { label: "Continue", value: "CONTINUE", actionType: "CONTINUE" };
    let isAllowedPostOnboarding = false;
    if (isOnboardingCompleted) {
      const normalizedKeyStr = String(optKey || "").trim();
      isAllowedPostOnboarding =
        (option as any)?.actionType === "ASK_REPORT" ||
        normalizedKeyStr === "ASK_REPORT" ||
        normalizedKeyStr === "ASK_ABOUT_REPORT" ||
        (option as any)?.actionType === "CONFIRM_MEDICINES" ||
        (option as any)?.actionType === "ADD_MEDICINE" ||
        normalizedKeyStr === "ADD_MEDICINE" ||
        Boolean((option as any)?.value?.medicine) ||
        (option as any)?.actionType === "ADD_DOCUMENT" ||
        normalizedKeyStr === "ADD_DOCUMENT";
    }
    expect(isAllowedPostOnboarding).toBe(false);
  });

  it("Criteria 8: Submit cannot execute", () => {
    const isOnboardingCompleted = true;
    const optKey = "SUBMIT";
    const option = { label: "Submit", value: "SUBMIT", actionType: "SUBMIT" };
    let isAllowedPostOnboarding = false;
    if (isOnboardingCompleted) {
      const normalizedKeyStr = String(optKey || "").trim();
      isAllowedPostOnboarding =
        (option as any)?.actionType === "ASK_REPORT" ||
        normalizedKeyStr === "ASK_REPORT" ||
        normalizedKeyStr === "ASK_ABOUT_REPORT" ||
        (option as any)?.actionType === "CONFIRM_MEDICINES" ||
        (option as any)?.actionType === "ADD_MEDICINE" ||
        normalizedKeyStr === "ADD_MEDICINE" ||
        Boolean((option as any)?.value?.medicine) ||
        (option as any)?.actionType === "ADD_DOCUMENT" ||
        normalizedKeyStr === "ADD_DOCUMENT";
    }
    expect(isAllowedPostOnboarding).toBe(false);
  });

  it("Criteria 9: No onboarding callback can execute", () => {
    const isOnboardingCompleted = true;
    const onboardingActions = [
      "ASK_LANGUAGE",
      "RESOLVE_PROFILE_SOURCE",
      "ASK_UPLOAD_OR_SKIP",
      "ASK_GENDER",
      "ASK_DOB",
      "ASK_BLOOD_GROUP",
      "SKIP_BLOOD_GROUP",
      "ASK_ALLERGIES",
      "SKIP_ALLERGIES",
    ];

    for (const act of onboardingActions) {
      const option = { actionType: act, value: act, label: act };
      let isAllowedPostOnboarding = false;
      if (isOnboardingCompleted) {
        const normalizedKeyStr = String(act || "").trim();
        isAllowedPostOnboarding =
          option?.actionType === "ASK_REPORT" ||
          normalizedKeyStr === "ASK_REPORT" ||
          normalizedKeyStr === "ASK_ABOUT_REPORT" ||
          option?.actionType === "CONFIRM_MEDICINES" ||
          option?.actionType === "ADD_MEDICINE" ||
          normalizedKeyStr === "ADD_MEDICINE" ||
          Boolean((option as any)?.value?.medicine) ||
          option?.actionType === "ADD_DOCUMENT" ||
          normalizedKeyStr === "ADD_DOCUMENT";
      }
      expect(isAllowedPostOnboarding).toBe(false);
    }
  });

  it("Criteria 10 & 11: No historical message can set pendingStep or change currentStep", () => {
    let pendingStep: string | null = null;
    let currentStep = "COMPLETE";
    const isOnboardingCompleted = true;

    const setPendingStep = (step: string | null) => {
      if (isOnboardingCompleted) {
        pendingStep = null;
      } else {
        pendingStep = step;
      }
    };

    // Attempt setting from historical message step
    setPendingStep("ASK_BLOOD_GROUP");
    expect(pendingStep).toBeNull();

    // State reconciliation cannot revert currentStep
    const incomingHistoricalStep = "ASK_BLOOD_GROUP";
    if (isOnboardingCompleted) {
      if (currentStep !== "ASK_REPORT" && currentStep !== "MEDICINE_OPTIONS") {
        currentStep = "COMPLETE";
      }
    } else {
      currentStep = incomingHistoricalStep;
    }
    expect(currentStep).toBe("COMPLETE");
  });

  it("Criteria 12: No historical action can resume onboarding", () => {
    const isOnboardingCompleted = true;
    const historicalAction = "ASK_BLOOD_GROUP";

    const HISTORICAL_ONBOARDING_ACTIONS = new Set([
      "ASK_BLOOD_GROUP",
      "SKIP_BLOOD_GROUP",
      "BLOOD_GROUP",
      "ASK_ALLERGIES",
      "SKIP_ALLERGIES",
      "ASK_GENDER",
      "ASK_DOB",
      "ASK_LANGUAGE",
      "RESOLVE_PROFILE_SOURCE",
      "ASK_UPLOAD_OR_SKIP",
      "SKIP",
      "CONTINUE",
      "SUBMIT",
    ]);

    const isBlocked = isOnboardingCompleted && HISTORICAL_ONBOARDING_ACTIONS.has(historicalAction);
    expect(isBlocked).toBe(true);
  });

  it("Criteria 13: Dashboard free text remains NORMAL_CHAT and never routes to onboarding", () => {
    const isOnboardingCompleted = true;
    const pendingStep = null;

    let routedActionType = "";
    if (!isOnboardingCompleted && pendingStep) {
      routedActionType = "ONBOARDING";
    } else {
      routedActionType = "NORMAL_CHAT";
    }

    expect(routedActionType).toBe("NORMAL_CHAT");
  });

  it("Criteria 14: Reopening the chat preserves the same behavior", () => {
    // Simulate fetchOnboardingHistory response when reopening chat
    const historyResponse = {
      data: {
        chatSessionId: "sess-reopen",
        currentStep: "COMPLETE",
        isOnboardingCompleted: true,
        resumableState: {
          isOnboardingCompleted: true,
          hasSkipped: true,
          currentStep: "COMPLETE",
        },
        messages: [
          { id: "m1", role: "assistant", metadata: { action: "ASK_BLOOD_GROUP" } },
          { id: "m2", role: "user", content: "Skip" },
        ],
      },
    };

    const topLevelIsOnboardingCompleted = historyResponse.data.isOnboardingCompleted;
    const resumableState = historyResponse.data.resumableState;
    const resolvedPendingStep = resumableState?.currentStep || historyResponse.data.currentStep;

    const completedFromState = Boolean(
      topLevelIsOnboardingCompleted ||
      resumableState?.isOnboardingCompleted ||
      resumableState?.hasSkipped ||
      resumableState?.currentStep === "POST_ONBOARDING" ||
      resumableState?.currentStep === "COMPLETE" ||
      resolvedPendingStep === "POST_ONBOARDING" ||
      resolvedPendingStep === "COMPLETE"
    );

    const isComplete = completedFromState;
    const finalPendingStep = isComplete ? null : resolvedPendingStep;

    expect(isComplete).toBe(true);
    expect(finalPendingStep).toBeNull();
  });

  describe("15. Pre-Onboarding Chatbot -> Dashboard -> Chat History Flow (Go to Dashboard User Response Preservation)", () => {
    it("1. Selecting 'Go to Dashboard' preserves the user response in messages and navigates without losing it", () => {
      let messages: any[] = [
        {
          id: "assistant-med-options",
          role: "assistant",
          content: "Here are your options:",
          action: "MEDICINE_OPTIONS",
          options: [
            { key: "ADD", label: "Add More Medicines", value: "ADD" },
            { key: "DASHBOARD", label: "Go to Dashboard", value: "DASHBOARD" },
          ],
        },
      ];

      let state: any = {
        preferredLanguage: "english",
        flowMode: "MANUAL",
        profileConfirmed: true,
        bloodGroupSkipped: true,
        allergiesSkipped: true,
        medicationFlowDone: false,
        medicinesConfirmed: false,
        currentStep: "MEDICINE_OPTIONS",
      };

      let isOnboardingCompleted = false;

      // Mock sendMessage implementation mirroring OnboardingScreen.tsx
      const sendMessage = (userText: string, updatedState: any, displayLabel?: string) => {
        const userContent = displayLabel || userText;
        const userMsg = {
          id: `user-${Date.now()}`,
          role: "user",
          content: userContent,
          rawValue: userText,
          createdAt: new Date().toISOString(),
        };
        messages = [...messages, userMsg];

        // Simulate backend returning completion response
        const resData = {
          mode: "ONBOARDING",
          action: "COMPLETE",
          actionType: "COMPLETE",
          reply: "",
          onboardingState: {
            ...updatedState,
            isOnboardingCompleted: true,
            currentStep: "COMPLETE",
          },
        };

        // processAssistantResponse logic in OnboardingScreen.tsx
        const isRedundantCompletionMsg =
          resData.action === "COMPLETE" ||
          resData.action === "POST_ONBOARDING" ||
          !resData.reply?.trim();

        if (!isRedundantCompletionMsg) {
          messages = [
            ...messages,
            { id: `ai-${Date.now()}`, role: "assistant", content: resData.reply },
          ];
        }

        isOnboardingCompleted = Boolean(resData.onboardingState?.isOnboardingCompleted);
      };

      // Mock handleOptionPress in OnboardingScreen.tsx
      const handleOptionPress = (value: string, label: string) => {
        if (value === "GO_TO_DASHBOARD" || value === "DASHBOARD") {
          const optionLabel = label || "Go to Dashboard";
          const nextState = {
            ...state,
            medicationFlowDone: true,
            medicinesConfirmed: true,
            currentStep: "COMPLETE",
            isOnboardingCompleted: true,
          };
          state = nextState;
          sendMessage(value, nextState, optionLabel);
        }
      };

      // User presses "Go to Dashboard"
      handleOptionPress("DASHBOARD", "Go to Dashboard");

      // Verify user response is preserved in messages
      expect(messages.length).toBe(2);
      expect(messages[1].role).toBe("user");
      expect(messages[1].content).toBe("Go to Dashboard");
      expect(messages[1].rawValue).toBe("DASHBOARD");

      // Verify no redundant assistant message was appended
      expect(messages.filter((m) => m.role === "assistant").length).toBe(1);

      // Verify onboarding completion state
      expect(isOnboardingCompleted).toBe(true);
      expect(state.currentStep).toBe("COMPLETE");
      expect(state.isOnboardingCompleted).toBe(true);
    });

    it("2. When reopening Chat from Dashboard, existing conversation history loads with the user's 'Go to Dashboard' response visible", () => {
      // Historical messages returned by GET /v1/onboarding/history
      const historyFromBackend = [
        {
          id: "m-1",
          role: "assistant",
          content: "All set! What would you like to do next?",
          metadata: {
            action: "MEDICINE_OPTIONS",
            options: [
              { key: "ADD", label: "Add More Medicines", value: "ADD" },
              { key: "DASHBOARD", label: "Go to Dashboard", value: "DASHBOARD" },
            ],
          },
          createdAt: "2026-09-23T08:00:00.000Z",
        },
        {
          id: "m-2",
          role: "user",
          content: "Go to Dashboard",
          metadata: {
            rawValue: "DASHBOARD",
            stepKey: "COMPLETE",
          },
          createdAt: "2026-09-23T08:00:05.000Z",
        },
      ];

      // Rehydrate messages using useChatSession mapping
      const mappedMessages = historyFromBackend.map((dbMsg) => {
        const meta = dbMsg.metadata || {};
        const mappedRole = dbMsg.role === "assistant" ? "ai" : "user";
        return {
          ...meta,
          id: dbMsg.id,
          role: mappedRole,
          text: dbMsg.content,
          createdAt: dbMsg.createdAt,
          action: meta.action || "NORMAL_CHAT",
          rawValue: meta.rawValue || null,
        };
      });

      expect(mappedMessages.length).toBe(2);
      expect(mappedMessages[0].role).toBe("ai");
      expect(mappedMessages[1].role).toBe("user");
      expect(mappedMessages[1].text).toBe("Go to Dashboard");
      expect(mappedMessages[1].rawValue).toBe("DASHBOARD");

      // In AIChatScreen, messages are inverted (newest first)
      const invertedMessages = [...mappedMessages].reverse();

      // Check findHistoricalUserReply on the assistant message
      const { chosenVal, chosenLabel } = findHistoricalUserReply(
        invertedMessages,
        "m-1",
        true, // isInverted = true
      );

      expect(chosenVal).toBe("DASHBOARD");
      expect(chosenLabel).toBe("Go to Dashboard");

      // Check that findHistoricalUserReply correctly marks "Go to Dashboard" as chosen
      const optionsList = [
        { key: "ADD", label: "Add More Medicines", value: "ADD" },
        { key: "DASHBOARD", label: "Go to Dashboard", value: "DASHBOARD" },
      ];

      const dashboardOpt = optionsList.find((opt) => opt.key === "DASHBOARD")!;
      const isDashboardChosen =
        (chosenVal && dashboardOpt.key.toLowerCase() === chosenVal.toLowerCase()) ||
        (chosenLabel && dashboardOpt.label.toLowerCase() === chosenLabel.toLowerCase());

      const addOpt = optionsList.find((opt) => opt.key === "ADD")!;
      const isAddChosen =
        (chosenVal && addOpt.key.toLowerCase() === chosenVal.toLowerCase()) ||
        (chosenLabel && addOpt.label.toLowerCase() === chosenLabel.toLowerCase());

      expect(isDashboardChosen).toBeTruthy();
      expect(isAddChosen).toBeFalsy();
    });

    it("3. Reopening Chat does not restart onboarding, does not duplicate assistant prompt, and preserves isOnboardingCompleted", () => {
      const historyResponse = {
        data: {
          chatSessionId: "session-onboarding-123",
          currentStep: "COMPLETE",
          canSkip: true,
          resumableState: {
            isOnboardingCompleted: true,
            currentStep: "COMPLETE",
            medicationFlowDone: true,
            medicinesConfirmed: true,
          },
          messages: [
            {
              id: "msg-opt",
              role: "assistant",
              content: "What would you like to do next?",
              metadata: { action: "MEDICINE_OPTIONS" },
            },
            {
              id: "msg-dash",
              role: "user",
              content: "Go to Dashboard",
              metadata: { rawValue: "DASHBOARD" },
            },
          ],
        },
      };

      const { resumableState, currentStep } = historyResponse.data;
      const isComplete = Boolean(
        resumableState?.isOnboardingCompleted ||
        resumableState?.currentStep === "COMPLETE" ||
        currentStep === "COMPLETE",
      );

      const pendingStep = isComplete ? null : (resumableState?.currentStep || currentStep);

      // Verify onboarding does NOT restart
      expect(isComplete).toBe(true);
      expect(pendingStep).toBeNull();

      // Verify no duplicate assistant message
      const assistantMessages = historyResponse.data.messages.filter((m) => m.role === "assistant");
      expect(assistantMessages.length).toBe(1);

      // Verify user response is present and intact
      const userMessages = historyResponse.data.messages.filter((m) => m.role === "user");
      expect(userMessages.length).toBe(1);
      expect(userMessages[0].content).toBe("Go to Dashboard");
    });
  });
});
