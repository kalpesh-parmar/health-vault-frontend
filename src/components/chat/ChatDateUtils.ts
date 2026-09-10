export interface ChatMessageLike {
  id?: string;
  role: "user" | "ai" | "assistant";
  text: string;
  createdAt?: string | Date;
}

export const normalizeDocumentIds = (...sources: any[]): string[] | undefined => {
  const ids = sources
    .flatMap((source) => {
      if (!source) return [];
      if (Array.isArray(source)) return source;
      return [source];
    })
    .flatMap((item) => {
      if (!item) return [];
      if (typeof item === "string") return [item];
      if (Array.isArray(item.documentId)) return item.documentId;
      if (Array.isArray(item.documentIds)) return item.documentIds;
      if (item.documentId) return [item.documentId];
      if (item.id) return [item.id];
      if (item.fileKey) return [item.fileKey];
      if (item.s3Key) return [item.s3Key];
      return [];
    })
    .map((id) => String(id).trim())
    .filter(Boolean);

  return ids.length ? Array.from(new Set(ids)) : undefined;
};

export const buildChatHistory = (messages: ChatMessageLike[]) =>
  messages.map((m) => ({
    role: m.role === "ai" ? "assistant" : "user",
    content: m.text,
  }));

export const I18N_CHAT_UI: Record<string, Record<string, string>> = {
  english: {
    today: "Today",
    yesterday: "Yesterday",
    selectModeOrReport: "Select Mode or Report",
    chooseGeneralOrDiscuss:
      "Choose general health mode or discuss a specific medical report",
    generalHealthChatNoDoc: "General Health Chat (No Document)",
    recentConversations: "Recent Conversations",
    onboardingSessionReadOnly: "Onboarding Session (Read-Only)",
    untitledSession: "Untitled Session",
    noReportsUploaded: "You haven't uploaded any medical reports yet.",
    uploadMedicalReport: "Upload Medical Report",
    seekImmediateAttention: "Seek immediate medical attention",
    emergencyWarning:
      "This may require urgent medical attention. Please contact emergency services or visit the nearest emergency department immediately.",
    onboardingArchive: "Onboarding Session (Read-Only Archive)",
    documentPrefix: "Document: ",
  },
  gujarati: {
    today: "આજે",
    yesterday: "ગઈકાલે",
    selectModeOrReport: "મોડ અથવા રિપોર્ટ પસંદ કરો",
    chooseGeneralOrDiscuss:
      "સામાન્ય સ્વાસ્થ્ય મોડ પસંદ કરો અથવા ચોક્કસ તબીબી અહેવાલ વિશે ચર્ચા કરો",
    generalHealthChatNoDoc: "સામાન્ય સ્વાસ્થ્ય ચર્ચા (કોઈ દસ્તાવેજ નથી)",
    recentConversations: "તાજેતરની વાતચીતો",
    onboardingSessionReadOnly: "ઓનબોર્ડિંગ સત્ર (ફક્ત વાંચવા માટે)",
    untitledSession: "શીર્ષક વગરનું સત્ર",
    noReportsUploaded: "તમે હજી સુધી કોઈ તબીબી અહેવાલો અપલોડ કર્યા નથી.",
    uploadMedicalReport: "તબીબી અહેવાલ અપલોડ કરો",
    seekImmediateAttention: "તાત્કાલિક તબીબી સારવાર મેળવો",
    emergencyWarning:
      "આ માટે તાત્કાલિક તબીબી સારવારની જરૂર પડી શકે છે. કૃપા કરીને તાત્કાલિક કટોકટી સેવાઓનો સંપર્ક કરો અથવા નજીકના કટોકટી વિભાગની મુલાકાત લો.",
    onboardingArchive: "ઓનબોર્ડિંગ સત્ર (ફક્ત વાંચવા માટેનું આર્કાઇવ)",
    documentPrefix: "દસ્તાવેજ: ",
  },
  hindi: {
    today: "आज",
    yesterday: "कल",
    selectModeOrReport: "मोड या रिपोर्ट चुनें",
    chooseGeneralOrDiscuss:
      "सामान्य स्वास्थ्य मोड चुनें या किसी विशिष्ट मेडिकल रिपोर्ट पर चर्चा करें",
    generalHealthChatNoDoc: "सामान्य स्वास्थ्य चैट (कोई दस्तावेज़ नहीं)",
    recentConversations: "हाल की बातचीत",
    onboardingSessionReadOnly: "ऑनबोर्डिंग सत्र (केवल पढ़ने के लिए)",
    untitledSession: "बिना शीर्षक का सत्र",
    noReportsUploaded: "आपने अभी तक कोई मेडिकल रिपोर्ट अपलोड नहीं की है।",
    uploadMedicalReport: "मेडिकल रिपोर्ट अपलोड करें",
    seekImmediateAttention: "तुरंत चिकित्सा सहायता लें",
    emergencyWarning:
      "इसके लिए तत्काल चिकित्सा सहायता की आवश्यकता हो सकती है। कृपया तुरंत आपातकालीन सेवाओं से संपर्क करें या निकटतम आपातकालीन विभाग में जाएं।",
    onboardingArchive: "ऑनबोर्डिंग सत्र (केवल पढ़ने के लिए पुरालेख)",
    documentPrefix: "दस्तावेज़: ",
  },
  marathi: {
    today: "आज",
    yesterday: "काल",
    selectModeOrReport: "मोड किंवा अहवाल निवडा",
    chooseGeneralOrDiscuss:
      "सामान्य आरोग्य मोड निवडा किंवा विशिष्ट वैद्यकीय अहवालावर चर्चा करा",
    generalHealthChatNoDoc: "सामान्य आरोग्य चॅट (कोणताही दस्तऐवज नाही)",
    recentConversations: "अलीकडील संभाषणे",
    onboardingSessionReadOnly: "ऑनबोर्डिंग सत्र (फक्त वाचण्यासाठी)",
    untitledSession: "शीर्षक नसलेले सत्र",
    noReportsUploaded:
      "तुम्ही अद्याप कोणतेही वैद्यकीय अहवाल अपलोड केलेले नाहीत.",
    uploadMedicalReport: "वैद्यकीय अहवाल अपलोड करा",
    seekImmediateAttention: "त्वरित वैद्यकीय मदत घ्या",
    emergencyWarning:
      "यासाठी त्वरित वैद्यकीय लक्ष देण्याची आवश्यकता असू शकते. कृपया त्वरित आपत्कालीन सेवांशी संपर्क साधा किंवा जवळच्या आपत्कालीन विभागात जा.",
    onboardingArchive: "ऑनबोर्डिंग सत्र (फक्त वाचण्यासाठीचे संग्रहण)",
    documentPrefix: "दस्तऐवज: ",
  },
  tamil: {
    today: "இன்று",
    yesterday: "நேற்று",
    selectModeOrReport: "முறை அல்லது அறிக்கையைத் தேர்ந்தெடுக்கவும்",
    chooseGeneralOrDiscuss:
      "பொது சுகாதார முறையைத் தேர்ந்தெடுக்கவும் அல்லது குறிப்பிட்ட மருத்துவ அறிக்கையைப் பற்றி விவாதிக்கவும்",
    generalHealthChatNoDoc: "பொது சுகாதார அரட்டை (ஆவணம் இல்லை)",
    recentConversations: "சமீபத்திய உரையாடல்கள்",
    onboardingSessionReadOnly: "உள்வாங்கல் அமர்வு (படிக்க மட்டும்)",
    untitledSession: "தலைப்பில்லா அமர்வு",
    noReportsUploaded:
      "நீங்கள் இன்னும் மருத்துவ அறிக்கைகள் எதையும் பதிவேற்றவில்லை.",
    uploadMedicalReport: "மருத்துவ அறிக்கையைப் பதிவேற்றவும்",
    seekImmediateAttention: "உடனடி மருத்துவ உதவியை நாடுங்கள்",
    emergencyWarning:
      "இதற்கு அவசர மருத்துவ உதவி தேவைப்படலாம். அவசர சேவைகளைத் தொடர்பு கொள்ளவும் அல்லது உடனடியாக அருகிலுள்ள அவசர சிகிச்சைப் பிரிவுக்குச் செல்லவும்.",
    onboardingArchive: "உள்வாங்கல் அமர்வு (படிக்க மட்டும் காப்பகம்)",
    documentPrefix: "ஆவணம்: ",
  },
};

export const LOCALE_TAG_MAP: Record<string, string> = {
  english: "en-US",
  gujarati: "gu-IN",
  hindi: "hi-IN",
  marathi: "mr-IN",
  tamil: "ta-IN",
};

export const parseToLocalDate = (raw: string | Date | undefined): Date | null => {
  if (!raw) return null;
  const d = typeof raw === "string" ? new Date(raw) : raw;
  if (!d || isNaN(d.getTime())) return null;
  return d;
};

export const getLocalDayKey = (d: Date): string => {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};

export const formatChatDateLabel = (
  date: Date,
  preferredLang: string = "english",
  tFunc?: (key: string) => string
): string => {
  const now = new Date();
  const todayKey = getLocalDayKey(now);

  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const yesterdayKey = getLocalDayKey(yesterday);

  const targetKey = getLocalDayKey(date);

  const lang = preferredLang || "english";
  const resolveTranslation = (key: string) => {
    if (tFunc) return tFunc(key);
    return I18N_CHAT_UI[lang]?.[key] || I18N_CHAT_UI.english?.[key] || key;
  };

  if (targetKey === todayKey) {
    return resolveTranslation("today");
  }
  if (targetKey === yesterdayKey) {
    return resolveTranslation("yesterday");
  }

  const localeTag = LOCALE_TAG_MAP[lang] || LOCALE_TAG_MAP.english;
  try {
    return date.toLocaleDateString(localeTag, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return date.toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }
};

export const SUGGESTED_QUESTIONS_I18N: Record<
  string,
  { general: string[]; document: string[] }
> = {
  english: {
    general: [
      "What are symptoms of diabetes?",
      "Reduce cholesterol levels",
      "Healthy blood pressure diet",
      "General heart health advice",
    ],
    document: [
      "Are there any abnormal values?",
      "What medications are prescribed?",
      "Explain the test results simply.",
      "Summarize this medical report.",
    ],
  },
  gujarati: {
    general: [
      "ડાયાબિટીસના લક્ષણો શું છે?",
      "કોલેસ્ટરોલનું સ્તર ઓછું કરો",
      "સ્વસ્થ બ્લડ પ્રેશર માટે આહાર",
      "સામાન્ય હૃદયના સ્વાસ્થ્ય અંગે સલાહ",
    ],
    document: [
      "શું કોઈ અસામાન્ય મૂલ્યો છે?",
      "કઈ દવાઓ સૂચવવામાં આવી છે?",
      "પરીક્ષણ પરિણામો સરળ રીતે સમજાવો.",
      "આ તબીબી અહેવાલનો સારાંશ આપો.",
    ],
  },
  hindi: {
    general: [
      "मधुमेह के लक्षण क्या हैं?",
      "कोलेस्ट्रॉल का स्तर कम करें",
      "स्वस्थ रक्तचाप के लिए आहार",
      "सामान्य हृदय स्वास्थ्य सलाह",
    ],
    document: [
      "क्या कोई असामान्य मूल्य हैं?",
      "कौन सी दवाएं दी गई हैं?",
      "परीक्षण के परिणामों को सरलता से समझाएं।",
      "इस मेडिकल रिपोर्ट का सारांश दें.",
    ],
  },
  marathi: {
    general: [
      "मधुमेहाची लक्षणे काय आहेत?",
      "कोलेस्टेरॉलची पातळी कमी करा",
      "निरोगी रक्तदाबासाठी आहार",
      "सामान्य हृदय आरोग्य सल्ला",
    ],
    document: [
      "काही असामान्य मूल्ये आहेत का?",
      "कोणती औषधे लिहून दिली आहेत?",
      "चाचणी निकाल सोप्या भाषेत स्पष्ट करा.",
      "या वैद्यकीय अहवालाचा सारांश द्या.",
    ],
  },
  tamil: {
    general: [
      "நீரிழிவு நோயின் அறிகுறிகள் என்ன?",
      "கொழுப்பின் அளவை குறைக்கவும்",
      "ஆரோக்கியமான இரத்த அழுத்த உணவு",
      "பொதுவான இதய சுகாதார ஆலோசனை",
    ],
    document: [
      "ஏதேனும் அசாதாரண மதிப்புகள் உள்ளதா?",
      "என்ன மருந்துகள் பரிந்துரைக்கப்படுகின்றன?",
      "சோதனை முடிவுகளை எளிமையாக விளக்கவும்.",
      "இந்த மருத்துவ அறிக்கையை சுருக்கமாகக் கூறவும்.",
    ],
  },
};

export const getTodayDateString = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

