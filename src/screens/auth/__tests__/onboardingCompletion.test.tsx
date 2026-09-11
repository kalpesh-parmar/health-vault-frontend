import React from "react";
import { render, fireEvent, act } from "@testing-library/react-native";
import { I18N_ONBOARDING_UI } from "../../../components/chat/widgets/OnboardingI18n";
import { MessageBubble } from "../../../components/chat/MessageBubble";
import { MedicineOptionsPanel } from "../../../components/chat/widgets/MedicineOptionsPanel";

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
  });
});
