import { Ionicons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  KeyboardEvent,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
} from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import styled from "styled-components/native";

import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../../context/ContextAPI";
import { useAppTheme } from "../../context/ThemeContext";
import apiClient from "../../services/apiClient";
import {
  requestGalleryPermission,
  requestCameraPermission,
  openGalleryAsset,
  takePhotoAsset,
  pickDocumentAsset,
} from "../../services/mediaServices";
import { getUser, updateUser } from "../../services/userService";

// Reusable Redesigned Components
import { ChatInput } from "../../components/chat/ChatInput";
import { MessageBubble } from "../../components/chat/MessageBubble";
import TypingIndicator from "../../components/chat/TypingIndicator";
import UploadBottomSheet from "../../components/upload/UploadBottomSheet";
import DocumentPreview from "../../components/upload/DocumentPreview";
import UploadValidationDialog from "../../components/upload/UploadValidationDialog";

type Message = {
  id: string;
  role: "assistant" | "user";
  content: string;
  action?: string;
  options?: any[];
  fields?: any[];
  loginSummary?: string;
  documentSummary?: string;
  mode?: string;
  title?: string;
  subtitle?: string;
  explainer?: string;
  loginProvider?: string;
  medicine?: any;
  summary?: any;
};

type UserData = {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  bloodGroup: string;
  allergies: string[];
  email: string;
};



const I18N_MEDICINE: Record<string, Record<string, string>> = {
  english: {
    morning: "Morning (08:00)",
    noon: "Noon (14:00)",
    night: "Night (20:00)",
    custom: "Custom",
    counter: "Choose {required} times · {selected} of {required} selected",
    duplicate: "This time is already added",
    saveGateError: "Please select exactly {required} time slots",
    nameRequired: "Name is required",
    unitRequired: "Unit is required",
    saveMedicine: "Save Medicine",
    cancel: "Cancel",
    editMedicine: "Edit Medicine",
    addMedicine: "Add Medication Details",
    medicineName: "Medicine Name",
    medicineType: "Medicine Type",
    dose: "Dose",
    frequency: "Frequency",
    refillAlert: "Refill Alert",
    totalQuantity: "Total Quantity",
    prescribedBy: "Prescribed By",
    notes: "Notes",
    addAnother: "Add Another Medicine",
    goToDashboard: "Go to Dashboard",
    askAboutReport: "Ask About My Report",
    verifyTitle: "Verify Information",
    confirmSave: "Confirm & Save",
    edit: "Edit",
  },
  gujarati: {
    morning: "સવાર (08:00)",
    noon: "બપોર (14:00)",
    night: "રાત (20:00)",
    custom: "કસ્ટમ",
    counter: "પસંદ કરો {required} સમય · {selected} માંથી {required} પસંદ કરેલ",
    duplicate: "આ સમય પહેલાથી જ ઉમેરેલ છે",
    saveGateError: "કૃપા કરીને બરાબર {required} સમય પસંદ કરો",
    nameRequired: "નામ જરૂરી છે",
    unitRequired: "એકમ જરૂરી છે",
    saveMedicine: "સાચવો",
    cancel: "રદ કરો",
    editMedicine: "દવા સુધારો",
    addMedicine: "નવી દવાની વિગત ઉમેરો",
    medicineName: "દવાનું નામ",
    medicineType: "દવાનો પ્રકાર",
    dose: "ડોઝ (માત્રા)",
    frequency: "આવર્તન (Frequency)",
    refillAlert: "રિફિલ ચેતવણી",
    totalQuantity: "કુલ જથ્થો",
    prescribedBy: "ડૉક્ટરનું નામ",
    notes: "નોંધ",
    addAnother: "બીજી દવા ઉમેરો",
    goToDashboard: "ડેશબોર્ડ પર જાઓ",
    askAboutReport: "મારા રિપોર્ટ વિશે પૂછો",
    verifyTitle: "માહિતીની ચકાસણી",
    confirmSave: "હા, યોગ્ય છે",
    edit: "સુધારો",
  },
  hindi: {
    morning: "सुबह (08:00)",
    noon: "दोपहर (14:00)",
    night: "रात (20:00)",
    custom: "कस्टम",
    counter: "चुनें {required} समय · {selected} में से {required} चयनित",
    duplicate: "यह समय पहले से ही जोड़ा गया है",
    saveGateError: "कृपया ठीक {required} समय स्लॉट चुनें",
    nameRequired: "नाम आवश्यक है",
    unitRequired: "इकाई आवश्यक है",
    saveMedicine: "दवा सहेजें",
    cancel: "रद्द करें",
    editMedicine: "दवा संपादित करें",
    addMedicine: "दवा विवरण जोड़ें",
    medicineName: "दवा का नाम",
    medicineType: "दवा का प्रकार",
    dose: "खुराक",
    frequency: "आवृत्ति (Frequency)",
    refillAlert: "रिफिल अलर्ट",
    totalQuantity: "कुल मात्रा",
    prescribedBy: "डॉक्टर का नाम",
    notes: "टिप्पणी",
    addAnother: "एक और दवा जोड़ें",
    goToDashboard: "डैशबोर्ड पर जाएं",
    askAboutReport: "मेरे रिपोर्ट के बारे में पूछें",
    verifyTitle: "जानकारी सत्यापित करें",
    confirmSave: "हाँ, सही है",
    edit: "संपादित करें",
  },
  marathi: {
    morning: "सकाळ (08:00)",
    noon: "दुपार (14:00)",
    night: "रात्र (20:00)",
    custom: "कस्टम",
    counter: "निवडा {required} वेळा · {selected} पैकी {required} निवडले",
    duplicate: "ही वेळ आधीच जोडली गेली आहे",
    saveGateError: "कृपया नेमके {required} वेळ स्लॉट निवडा",
    nameRequired: "नाव आवश्यक आहे",
    unitRequired: "युनिट आवश्यक आहे",
    saveMedicine: "औषध जतन करा",
    cancel: "रद्द करा",
    editMedicine: "औषध संपादित करा",
    addMedicine: "औषधाचा तपशील जोडा",
    medicineName: "औषधाचे नाव",
    medicineType: "औषधाचा प्रकार",
    dose: "डोस",
    frequency: "वारंवारता (Frequency)",
    refillAlert: "रिफिल अलर्ट",
    totalQuantity: "एकूण प्रमाण",
    prescribedBy: "डॉक्टरांचे नाव",
    notes: "टीप",
    addAnother: "दुसरे औषध जोडा",
    goToDashboard: "डॅशबोर्डवर जा",
    askAboutReport: "माझ्या रिपोर्टबद्दल विचारा",
    verifyTitle: "माहितीची पडताळणी",
    confirmSave: "होय, योग्य आहे",
    edit: "संपादित करा",
  },
  tamil: {
    morning: "காலை (08:00)",
    noon: "மதியம் (14:00)",
    night: "இரவு (20:00)",
    custom: "தனிப்பயன்",
    counter: "தேர்வு செய்க {required} முறைகள் · {selected} இல் {required} தேர்ந்தெடுக்கப்பட்டது",
    duplicate: "இந்த நேரம் ஏற்கனவே சேர்க்கப்பட்டுள்ளது",
    saveGateError: "சரியாக {required} நேர ஸ்லாட்டுகளைத் தேர்ந்தெடுக்கவும்",
    nameRequired: "பெயர் தேவை",
    unitRequired: "அலகு தேவை",
    saveMedicine: "மருந்தைச் சேமிக்கவும்",
    cancel: "ரத்துசெய்",
    editMedicine: "மருந்தைத் திருத்தவும்",
    addMedicine: "மருந்து விவரங்களைச் சேர்க்கவும்",
    medicineName: "மருந்தின் பெயர்",
    medicineType: "மருந்து வகை",
    dose: "அளவு",
    frequency: "அதிர்வெண் (Frequency)",
    refillAlert: "மறு நிரப்பல் எச்சரிக்கை",
    totalQuantity: "மொத்த அளவு",
    prescribedBy: "பரிந்துரைத்தவர்",
    notes: "குறிப்புகள்",
    addAnother: "மற்றொரு மருந்தைச் சேர்க்கவும்",
    goToDashboard: "டாஷ்போர்டிற்குச் செல்லவும்",
    askAboutReport: "என் அறிக்கையைப் பற்றி கேளுங்கள்",
    verifyTitle: "தகவலைச் சரிபார்க்கவும்",
    confirmSave: "ஆம், சரியானது",
    edit: "திருத்து",
  }
};

interface MedicineIconProps {
  type: string;
  size?: number;
  color?: string;
}

function MedicineIcon({ type, size = 24, color = "#6366f1" }: MedicineIconProps) {
  const normType = (type || "").toUpperCase();

  if (normType === "TABLET") {
    return (
      <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
        <Circle cx="24" cy="24" r="20" stroke={color} strokeWidth="4" />
        <Path d="M10 24H38" stroke={color} strokeWidth="4" strokeLinecap="round" />
      </Svg>
    );
  }

  if (normType === "CAPSULE") {
    return (
      <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
        <Path d="M16 18C16 13.58 19.58 10 24 10C28.42 10 32 13.58 32 18V24H16V18Z" fill={color} />
        <Path d="M16 24V30C16 34.42 19.58 38 24 38C28.42 38 32 34.42 32 30V24H16Z" stroke={color} strokeWidth="4" fill={`${color}30`} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    );
  }

  if (normType === "SYRUP") {
    return (
      <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
        <Rect x="20" y="6" width="8" height="6" rx="1" fill={color} />
        <Rect x="22" y="12" width="4" height="6" fill={color} />
        <Rect x="14" y="18" width="20" height="24" rx="4" stroke={color} strokeWidth="4" />
        <Rect x="18" y="24" width="12" height="12" rx="1" fill={color} opacity="0.3" />
      </Svg>
    );
  }

  if (normType === "INJECTION") {
    return (
      <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
        <Path d="M24 4V12" stroke={color} strokeWidth="3" strokeLinecap="round" />
        <Rect x="20" y="12" width="8" height="22" rx="1" stroke={color} strokeWidth="4" />
        <Path d="M20 18H24M20 23H24M20 28H24" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <Path d="M24 34V42M18 42H30" stroke={color} strokeWidth="4" strokeLinecap="round" />
      </Svg>
    );
  }

  if (normType === "DROPS") {
    return (
      <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
        <Path d="M26 12L12 26" stroke={color} strokeWidth="4" strokeLinecap="round" />
        <Path d="M36 6C34 4 30 4 28 6L32 10" stroke={color} strokeWidth="4" strokeLinecap="round" />
        <Path d="M12 36C12 36 9 39 9 41C9 42.66 10.34 44 12 44C13.66 44 15 42.66 15 41C15 39 12 36 12 36Z" fill={color} />
      </Svg>
    );
  }

  if (normType === "SPRAY") {
    return (
      <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
        <Rect x="16" y="22" width="16" height="20" rx="3" stroke={color} strokeWidth="4" />
        <Rect x="22" y="14" width="4" height="8" fill={color} />
        <Path d="M20 8H28V14H20V8Z" fill={color} />
        <Circle cx="12" cy="10" r="2" fill={color} />
        <Circle cx="36" cy="10" r="2" fill={color} />
      </Svg>
    );
  }

  if (normType === "INHALER") {
    return (
      <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
        <Rect x="26" y="6" width="10" height="24" rx="2" stroke={color} strokeWidth="4" />
        <Path d="M22 18H38V42H22V36H10V26H22V18Z" stroke={color} strokeWidth="4" strokeLinejoin="round" fill="none" />
        <Path d="M10 26V36H6V26H10Z" fill={color} />
      </Svg>
    );
  }

  return <Ionicons name="medical-outline" size={size} color={color} />;
}

interface DoseVisualProps {
  type: string;
  value: number;
  unit?: string;
  size?: number;
  color?: string;
}

function DoseVisual({ type, value, unit, size = 32, color = "#6366f1" }: DoseVisualProps) {
  const normType = (type || "").toUpperCase();
  const val = Number(value) || 0;

  if (normType === "TABLET") {
    const wholePills = Math.floor(val);
    const remainder = val - wholePills;

    const renderPillSVG = (filledWedges: number, keyStr: string) => {
      return (
        <Svg key={keyStr} width={size} height={size} viewBox="0 0 100 100" style={{ marginRight: 6 }}>
          <Circle cx="50" cy="50" r="42" stroke={color} strokeWidth="6" fill="#f8fafc" />
          <Path
            d="M 50 50 L 50 8 C 73 8, 92 27, 92 50 Z"
            fill={filledWedges >= 1 ? color : "transparent"}
          />
          <Path
            d="M 50 50 L 92 50 C 92 73, 73 92, 50 92 Z"
            fill={filledWedges >= 2 ? color : "transparent"}
          />
          <Path
            d="M 50 50 L 50 92 C 27 92, 8 73, 8 50 Z"
            fill={filledWedges >= 3 ? color : "transparent"}
          />
          <Path
            d="M 50 50 L 8 50 C 8 27, 27 8, 50 8 Z"
            fill={filledWedges >= 4 ? color : "transparent"}
          />
          <Path d="M 50 8 L 50 92 M 8 50 L 92 50" stroke={color} strokeWidth="2" strokeDasharray="4 2" />
        </Svg>
      );
    };

    const pills = [];
    for (let i = 0; i < wholePills; i++) {
      pills.push(renderPillSVG(4, `whole-${i}`));
    }
    if (remainder > 0) {
      const wedges = Math.round(remainder * 4);
      pills.push(renderPillSVG(wedges, "remainder"));
    }
    if (pills.length === 0) {
      pills.push(renderPillSVG(0, "empty"));
    }

    return (
      <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap" }} accessibilityLabel={`${val} tablet`}>
        {pills}
      </View>
    );
  }

  if (normType === "CAPSULE") {
    const roundedVal = Math.max(1, Math.round(val));
    const showCount = roundedVal <= 5;
    return (
      <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap" }} accessibilityLabel={`${roundedVal} capsule`}>
        {showCount ? (
          Array.from({ length: roundedVal }).map((_, i) => (
            <View key={i} style={{ marginRight: 4 }}>
              <MedicineIcon type="CAPSULE" size={size} color={color} />
            </View>
          ))
        ) : (
          <>
            <MedicineIcon type="CAPSULE" size={size} color={color} />
            <Text style={{ fontSize: 14, fontWeight: "bold", color, marginLeft: 4 }}>×{roundedVal}</Text>
          </>
        )}
      </View>
    );
  }

  if (normType === "SPRAY" || normType === "INHALER") {
    const roundedVal = Math.max(1, Math.round(val));
    const showCount = roundedVal <= 5;
    return (
      <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap" }} accessibilityLabel={`${roundedVal} puff`}>
        {showCount ? (
          Array.from({ length: roundedVal }).map((_, i) => (
            <View key={i} style={{ marginRight: 4 }}>
              <MedicineIcon type={normType} size={size} color={color} />
            </View>
          ))
        ) : (
          <>
            <MedicineIcon type={normType} size={size} color={color} />
            <Text style={{ fontSize: 14, fontWeight: "bold", color, marginLeft: 4 }}>×{roundedVal}</Text>
          </>
        )}
      </View>
    );
  }

  return (
    <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap" }} accessibilityLabel={`${val} ${unit || ""}`}>
      <View style={{ marginRight: 6 }}>
        <MedicineIcon type={normType} size={size} color={color} />
      </View>
      <Text style={{ fontSize: 14, fontWeight: "bold", color }}>
        {val} {unit || ""}
      </Text>
    </View>
  );
}

function AddMedicineCard({
  med,
  isEditingLocal,
  preferredLang,
  isDark,
  theme,
  currentClientMedId,
  setCurrentClientMedId,
  onSave,
  onCancel,
}: AddMedicineCardProps) {
  const [formName, setFormName] = useState(med.name || "");
  const [formType, setFormType] = useState(med.type || "TABLET");
  const [formFreq, setFormFreq] = useState(med.frequency || "ONCE");
  const [formNotes, setFormNotes] = useState(med.notes || "");
  const [formPrescribed, setFormPrescribed] = useState(med.prescribedBy || med.prescribed_by || "");
  const [formRefill, setFormRefill] = useState(med.refill_alert || med.refillAlert || false);
  const [formQty, setFormQty] = useState(
    med.total_quantity !== undefined ? String(med.total_quantity ?? "1") : String(med.totalQuantity ?? "1")
  );

  let initialCount = 1;
  let initialVal = 1;
  let initialUnit = "ml";

  if (med.dose) {
    if (med.dose.count !== undefined) initialCount = med.dose.count;
    if (med.dose.value !== undefined) initialVal = med.dose.value;
    if (med.dose.unit !== undefined) initialUnit = med.dose.unit;
  }

  const [formCount, setFormCount] = useState(initialCount);
  const [formVal, setFormVal] = useState(initialVal);
  const [formUnit, setFormUnit] = useState(initialUnit);
  const [localErrors, setLocalErrors] = useState<string[]>([]);

  // Time slots selection
  const [timeSlots, setTimeSlots] = useState<string[]>(() => {
    const schedule = med.medicationSchedule || {};
    const times = schedule.times || schedule.reminderTimes;
    if (Array.isArray(times) && times.length > 0) {
      return times;
    }
    if (formFreq === "ONCE") return ["08:00"];
    if (formFreq === "TWICE") return ["08:00", "20:00"];
    return ["08:00", "14:00", "20:00"];
  });

  const [selectedSlots, setSelectedSlots] = useState<string[]>(timeSlots);
  const [isCustomMode, setIsCustomMode] = useState<boolean>(() => {
    return timeSlots.some(t => t !== "08:00" && t !== "14:00" && t !== "20:00");
  });
  const [slotError, setSlotError] = useState("");
  const [isSlotPickerVisible, setSlotPickerVisible] = useState(false);
  const [editingCustomTimeVal, setEditingCustomTimeVal] = useState<string | null>(null);

  const isFirstRenderType = useRef(true);
  const isFirstRenderFreq = useRef(true);

  useEffect(() => {
    if (!isEditingLocal && !currentClientMedId) {
      const newId = med.client_med_id || `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setCurrentClientMedId(newId);
    }
  }, [med]);

  const allowedUnitsMap: Record<string, string[]> = {
    SYRUP: ["ml", "tsp", "tbsp"],
    INJECTION: ["ml", "IU"],
    DROPS: ["drops", "ml"],
    SPRAY: ["puff"],
    INHALER: ["puff"],
  };

  const currentAllowedUnits = allowedUnitsMap[formType] || [];

  const t = (key: string, replacements?: Record<string, string | number>) => {
    const lang = preferredLang || "english";
    const dict = I18N_MEDICINE[lang] || I18N_MEDICINE.english;
    let str = dict[key] || I18N_MEDICINE.english[key] || key;
    if (replacements) {
      Object.entries(replacements).forEach(([k, v]) => {
        str = str.split(`{${k}}`).join(String(v));
      });
    }
    return str;
  };

  useEffect(() => {
    const units = allowedUnitsMap[formType];
    if (units && !units.includes(formUnit)) {
      setFormUnit(units[0]);
    }
  }, [formType]);

  // Adjust slots based on frequency with prefill guard
  useEffect(() => {
    if (isFirstRenderFreq.current) {
      isFirstRenderFreq.current = false;
      return;
    }
    setIsCustomMode(false);
    if (formFreq === "ONCE") {
      setSelectedSlots(["08:00"]);
    } else if (formFreq === "TWICE") {
      setSelectedSlots(["08:00", "20:00"]);
    } else {
      setSelectedSlots(["08:00", "14:00", "20:00"]);
    }
    setSlotError("");
  }, [formFreq]);

  // Sync integer/fraction limits in UI with prefill guard
  useEffect(() => {
    if (isFirstRenderType.current) {
      isFirstRenderType.current = false;
      return;
    }
    if (formType === "TABLET" || formType === "CAPSULE") {
      setFormCount(1);
    } else if (formType === "SYRUP") {
      setFormVal(5);
      setFormUnit("ml");
    } else if (formType === "INJECTION") {
      setFormVal(1);
      setFormUnit("ml");
    } else if (formType === "DROPS") {
      setFormVal(1);
      setFormUnit("drops");
    } else if (formType === "SPRAY" || formType === "INHALER") {
      setFormVal(1);
      setFormUnit("puff");
    }
  }, [formType]);

  const togglePresetSlot = (timeStr: string) => {
    const N = formFreq === "ONCE" ? 1 : formFreq === "TWICE" ? 2 : 3;
    if (selectedSlots.includes(timeStr)) {
      setSelectedSlots(prev => prev.filter(t => t !== timeStr));
      setSlotError("");
    } else {
      if (selectedSlots.length < N) {
        setSelectedSlots(prev => [...prev, timeStr]);
        setSlotError("");
      }
    }
  };

  const handleExitCustomMode = (timeStr: string) => {
    setIsCustomMode(false);
    setSelectedSlots([timeStr]);
    setSlotError("");
  };

  const format12h = (time24: string) => {
    const parts = time24.split(":");
    if (parts.length !== 2) return time24;
    let hour = parseInt(parts[0], 10);
    const minute = parts[1];
    const ampm = hour >= 12 ? "PM" : "AM";
    hour = hour % 12;
    if (hour === 0) hour = 12;
    return `${hour}:${minute} ${ampm}`;
  };

  const formatTabletDose = (count: number) => {
    const whole = Math.floor(count);
    const remainder = count - whole;
    let frac = "";
    if (remainder === 0.25) frac = "¼";
    else if (remainder === 0.5) frac = "½";
    else if (remainder === 0.75) frac = "¾";
    if (whole === 0) return frac || "0";
    return frac ? `${whole} ${frac}` : `${whole}`;
  };

  const handleSave = () => {
    const errors: string[] = [];
    if (!formName.trim()) {
      errors.push(t("nameRequired"));
    }
    if (formType !== "TABLET" && formType !== "CAPSULE") {
      if (!formUnit) {
        errors.push(t("unitRequired"));
      }
    }
    const N = formFreq === "ONCE" ? 1 : formFreq === "TWICE" ? 2 : 3;
    if (selectedSlots.length !== N) {
      setSlotError(t("saveGateError", { required: N }));
      errors.push(t("saveGateError", { required: N }));
    }
    if (errors.length > 0) {
      setLocalErrors(errors);
      return;
    }

    const dose = (formType === "TABLET" || formType === "CAPSULE")
      ? { count: formCount }
      : { value: formVal, unit: formUnit };

    const qtyVal = formQty.trim() ? parseInt(formQty, 10) : 1;

    const sortedTimes = [...selectedSlots].sort((a, b) => {
      const [ha, ma] = a.split(":").map(Number);
      const [hb, mb] = b.split(":").map(Number);
      if (ha !== hb) return ha - hb;
      return ma - mb;
    });

    const updatedMed = {
      name: formName.trim(),
      type: formType,
      dose,
      frequency: formFreq,
      notes: formNotes.trim(),
      prescribed_by: formPrescribed.trim() || null,
      refill_alert: formRefill,
      total_quantity: qtyVal,
      client_med_id: isEditingLocal ? med.client_med_id : currentClientMedId,
      source: med.source || "MANUAL",
      medicationSchedule: {
        times: sortedTimes,
        reminderTimes: sortedTimes,
        dose: (formType === "TABLET" || formType === "CAPSULE")
          ? { value: formCount, unit: formType.toLowerCase() }
          : { value: formVal, unit: formUnit },
        source: med.source || "MANUAL",
        refillAlert: formRefill,
        foodContext: med.foodContext || med.medicationSchedule?.foodContext || "AFTER_FOOD"
      }
    };

    onSave(updatedMed);
  };

  const getDosePreviewText = () => {
    const isGuj = preferredLang === "gujarati";
    if (formType === "TABLET") {
      const fracLabel = formatTabletDose(formCount);
      return isGuj ? `${fracLabel} ગોળી પ્રત્યેક ડોઝ દીઠ` : `${fracLabel} tablet(s) per intake`;
    }
    if (formType === "CAPSULE") {
      return isGuj ? `${formCount} કેપ્સ્યુલ પ્રત્યેક ડોઝ દીઠ` : `${formCount} capsule(s) per intake`;
    }
    if (formType === "SPRAY" || formType === "INHALER") {
      return isGuj ? `${formVal} પફ પ્રત્યેક ડોઝ દીઠ` : `${formVal} puff(s) per intake`;
    }
    return isGuj ? `${formVal} ${formUnit} પ્રત્યેક ડોઝ દીઠ` : `${formVal} ${formUnit} per intake`;
  };

  const renderDoseInput = () => {
    if (formType === "TABLET") {
      return (
        <View style={styles.stepperContainer}>
          <TouchableOpacity
            style={[styles.stepperButton, { backgroundColor: isDark ? "#334155" : "#cbd5e1" }]}
            onPress={() => setFormCount(prev => {
              const next = Math.max(0.25, Math.round((prev - 0.25) * 100) / 100);
              return next;
            })}
          >
            <Ionicons name="remove" size={20} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.stepperValue, { color: theme.colors.textPrimary, minWidth: 50, textAlign: "center" }]}>
            {formatTabletDose(formCount)}
          </Text>
          <TouchableOpacity
            style={[styles.stepperButton, { backgroundColor: isDark ? "#334155" : "#cbd5e1" }]}
            onPress={() => setFormCount(prev => Math.round((prev + 0.25) * 100) / 100)}
          >
            <Ionicons name="add" size={20} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={{ marginLeft: 8, color: theme.colors.textSecondary }}>tablet(s)</Text>
        </View>
      );
    }

    if (formType === "CAPSULE") {
      return (
        <View style={styles.stepperContainer}>
          <TouchableOpacity
            style={[styles.stepperButton, { backgroundColor: isDark ? "#334155" : "#cbd5e1" }]}
            onPress={() => setFormCount(prev => Math.max(1, Math.round(prev - 1)))}
          >
            <Ionicons name="remove" size={20} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.stepperValue, { color: theme.colors.textPrimary, minWidth: 40, textAlign: "center" }]}>{Math.max(1, Math.round(formCount))}</Text>
          <TouchableOpacity
            style={[styles.stepperButton, { backgroundColor: isDark ? "#334155" : "#cbd5e1" }]}
            onPress={() => setFormCount(prev => Math.round(prev + 1))}
          >
            <Ionicons name="add" size={20} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={{ marginLeft: 8, color: theme.colors.textSecondary }}>capsule(s)</Text>
        </View>
      );
    }

    if (formType === "INHALER") {
      return (
        <View style={styles.stepperContainer}>
          <TouchableOpacity
            style={[styles.stepperButton, { backgroundColor: isDark ? "#334155" : "#cbd5e1" }]}
            onPress={() => setFormVal(prev => Math.max(1, Math.round(prev - 1)))}
          >
            <Ionicons name="remove" size={20} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.stepperValue, { color: theme.colors.textPrimary, minWidth: 40, textAlign: "center" }]}>
            {Math.max(1, Math.round(formVal))}
          </Text>
          <TouchableOpacity
            style={[styles.stepperButton, { backgroundColor: isDark ? "#334155" : "#cbd5e1" }]}
            onPress={() => setFormVal(prev => Math.round(prev + 1))}
          >
            <Ionicons name="add" size={20} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={{ marginLeft: 8, color: theme.colors.textSecondary }}>puff(s)</Text>
        </View>
      );
    }

    if (formType === "SPRAY") {
      return (
        <View style={styles.stepperContainer}>
          <TouchableOpacity
            style={[styles.stepperButton, { backgroundColor: isDark ? "#334155" : "#cbd5e1" }]}
            onPress={() => setFormVal(prev => Math.max(1, Math.round(prev - 1)))}
          >
            <Ionicons name="remove" size={20} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.stepperValue, { color: theme.colors.textPrimary, minWidth: 40, textAlign: "center" }]}>{Math.max(1, Math.round(formVal))}</Text>
          <TouchableOpacity
            style={[styles.stepperButton, { backgroundColor: isDark ? "#334155" : "#cbd5e1" }]}
            onPress={() => setFormVal(prev => Math.round(prev + 1))}
          >
            <Ionicons name="add" size={20} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={{ marginLeft: 8, color: theme.colors.textSecondary }}>puff(s)</Text>
        </View>
      );
    }

    return (
      <View style={{ flex: 1, flexDirection: "row", alignItems: "center" }}>
        <TextInput
          style={[styles.textInput, { flex: 0.4, marginRight: 8, color: theme.colors.textPrimary, borderColor: isDark ? "#475569" : "#cbd5e1", backgroundColor: isDark ? "#0f172a" : "#f8fafc" }]}
          value={String(formVal)}
          onChangeText={val => setFormVal(parseFloat(val) || 0)}
          keyboardType="numeric"
          placeholder="1"
          placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
        />
        <View style={[styles.unitContainer, { flex: 0.6, flexDirection: "row", flexWrap: "wrap" }]}>
          {currentAllowedUnits.map(u => (
            <TouchableOpacity
              key={u}
              style={[styles.unitChip, { backgroundColor: formUnit === u ? theme.colors.primary : (isDark ? "#334155" : "#f1f5f9") }]}
              onPress={() => setFormUnit(u)}
            >
              <Text style={[styles.unitChipText, { color: formUnit === u ? "#ffffff" : theme.colors.textPrimary }]}>{u}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const N = formFreq === "ONCE" ? 1 : formFreq === "TWICE" ? 2 : 3;

  const renderTimeSlotPicker = () => {
    const isMorningActive = !isCustomMode && selectedSlots.includes("08:00");
    const isNoonActive = !isCustomMode && selectedSlots.includes("14:00");
    const isNightActive = !isCustomMode && selectedSlots.includes("20:00");

    const isMaxReached = selectedSlots.length >= N;

    const customChips = isCustomMode ? selectedSlots : [];

    return (
      <View style={{ marginTop: 8 }}>
        <Text style={[styles.inputLabel, { color: theme.colors.textSecondary, fontSize: 11, marginBottom: 6 }]}>
          {t("counter", { required: N, selected: selectedSlots.length })}
        </Text>

        <View style={styles.chipRow}>
          <TouchableOpacity
            disabled={!isCustomMode && isMaxReached && !isMorningActive}
            style={[
              styles.unitChip,
              {
                backgroundColor: isMorningActive ? theme.colors.primary : (isDark ? "#334155" : "#f1f5f9"),
                opacity: (!isCustomMode && isMaxReached && !isMorningActive) ? 0.4 : 1,
                justifyContent: "center",
                alignItems: "center",
                height: 38,
                paddingHorizontal: 12,
              }
            ]}
            onPress={() => {
              if (isCustomMode) {
                handleExitCustomMode("08:00");
              } else {
                togglePresetSlot("08:00");
              }
            }}
          >
            <Text style={[styles.unitChipText, { color: isMorningActive ? "#ffffff" : theme.colors.textPrimary, fontSize: 13, fontWeight: "600" }]}>
              {t("morning")}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            disabled={!isCustomMode && isMaxReached && !isNoonActive}
            style={[
              styles.unitChip,
              {
                backgroundColor: isNoonActive ? theme.colors.primary : (isDark ? "#334155" : "#f1f5f9"),
                opacity: (!isCustomMode && isMaxReached && !isNoonActive) ? 0.4 : 1,
                justifyContent: "center",
                alignItems: "center",
                height: 38,
                paddingHorizontal: 12,
              }
            ]}
            onPress={() => {
              if (isCustomMode) {
                handleExitCustomMode("14:00");
              } else {
                togglePresetSlot("14:00");
              }
            }}
          >
            <Text style={[styles.unitChipText, { color: isNoonActive ? "#ffffff" : theme.colors.textPrimary, fontSize: 13, fontWeight: "600" }]}>
              {t("noon")}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            disabled={!isCustomMode && isMaxReached && !isNightActive}
            style={[
              styles.unitChip,
              {
                backgroundColor: isNightActive ? theme.colors.primary : (isDark ? "#334155" : "#f1f5f9"),
                opacity: (!isCustomMode && isMaxReached && !isNightActive) ? 0.4 : 1,
                justifyContent: "center",
                alignItems: "center",
                height: 38,
                paddingHorizontal: 12,
              }
            ]}
            onPress={() => {
              if (isCustomMode) {
                handleExitCustomMode("20:00");
              } else {
                togglePresetSlot("20:00");
              }
            }}
          >
            <Text style={[styles.unitChipText, { color: isNightActive ? "#ffffff" : theme.colors.textPrimary, fontSize: 13, fontWeight: "600" }]}>
              {t("night")}
            </Text>
          </TouchableOpacity>

          {isCustomMode && customChips.map((time) => (
            <TouchableOpacity
              key={`custom-${time}`}
              style={[
                styles.unitChip,
                {
                  backgroundColor: theme.colors.primary,
                  flexDirection: "row",
                  alignItems: "center",
                  height: 38,
                  paddingHorizontal: 10,
                }
              ]}
              onPress={() => {
                setEditingCustomTimeVal(time);
                setSlotPickerVisible(true);
              }}
            >
              <Text style={[styles.unitChipText, { color: "#ffffff", fontSize: 13, fontWeight: "600", marginRight: 6 }]}>
                {format12h(time)}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setSelectedSlots(prev => prev.filter(t => t !== time));
                  setSlotError("");
                }}
              >
                <Ionicons name="close-circle" size={16} color="#ffffff" />
              </TouchableOpacity>
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            disabled={isCustomMode && isMaxReached}
            style={[
              styles.unitChip,
              {
                backgroundColor: isCustomMode ? theme.colors.primary : (isDark ? "#334155" : "#f1f5f9"),
                opacity: (isCustomMode && isMaxReached) ? 0.4 : 1,
                borderWidth: isCustomMode ? 0 : 1,
                borderColor: theme.colors.primary,
                borderStyle: "dashed",
                flexDirection: "row",
                alignItems: "center",
                height: 38,
                paddingHorizontal: 12,
              }
            ]}
            onPress={() => {
              if (!isCustomMode) {
                setIsCustomMode(true);
                setSelectedSlots([]);
                setSlotError("");
                setEditingCustomTimeVal(null);
                setSlotPickerVisible(true);
              } else {
                setEditingCustomTimeVal(null);
                setSlotPickerVisible(true);
              }
            }}
          >
            <Ionicons name={isCustomMode ? "add" : "time-outline"} size={16} color={isCustomMode ? "#ffffff" : theme.colors.primary} style={{ marginRight: 4 }} />
            <Text style={[styles.unitChipText, { color: isCustomMode ? "#ffffff" : theme.colors.textPrimary, fontSize: 13, fontWeight: "600" }]}>
              {t("custom")}
            </Text>
          </TouchableOpacity>
        </View>

        {slotError ? (
          <Text style={{ color: "#ef4444", fontSize: 12, marginTop: 4, fontWeight: "600" }}>{slotError}</Text>
        ) : null}
      </View>
    );
  };

  const currentLabelLabels: Record<string, { en: string; gu: string }> = {
    TABLET: { en: "Tablet", gu: "ટેબ્લેટ (ગોળી)" },
    CAPSULE: { en: "Capsule", gu: "કેપ્સ્યુલ" },
    SYRUP: { en: "Syrup", gu: "સિરાપ (પ્રવાહી)" },
    INJECTION: { en: "Injection", gu: "ઇન્જેક્શન" },
    DROPS: { en: "Drops", gu: "ટીપાં (ડ્રોપ્સ)" },
    SPRAY: { en: "Spray", gu: "સ્પ્રે" },
    INHALER: { en: "Inhaler", gu: "ઇનહેલર" },
  };

  return (
    <View style={[styles.medEditCard, { backgroundColor: isDark ? "#1e293b" : "#ffffff", borderColor: isDark ? "#334155" : "#e2e8f0" }]}>
      <Text style={[styles.medCardTitle, { color: theme.colors.textPrimary }]}>
        {isEditingLocal ? t("editMedicine") : t("addMedicine")}
      </Text>

      <View style={styles.inputGroup}>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
          <Ionicons name="ellipse-outline" size={14} color={theme.colors.textSecondary} style={{ marginRight: 6 }} />
          <Text style={[styles.inputLabel, { color: theme.colors.textSecondary, marginBottom: 0 }]}>
            {t("medicineName")}
          </Text>
        </View>
        <TextInput
          style={[styles.textInput, { color: theme.colors.textPrimary, borderColor: isDark ? "#475569" : "#cbd5e1", backgroundColor: isDark ? "#0f172a" : "#f8fafc" }]}
          value={formName}
          onChangeText={setFormName}
          placeholder={preferredLang === "gujarati" ? "દા.ત. પેરાસીટામોલ" : "e.g. Paracetamol"}
          placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
        />
      </View>

      <View style={styles.inputGroup}>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
          <Ionicons name="grid-outline" size={14} color={theme.colors.textSecondary} style={{ marginRight: 6 }} />
          <Text style={[styles.inputLabel, { color: theme.colors.textSecondary, marginBottom: 0 }]}>
            {t("medicineType")}
          </Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: "row", marginVertical: 4 }}>
          {["TABLET", "CAPSULE", "SYRUP", "INJECTION", "DROPS", "SPRAY", "INHALER"].map(tItem => {
            const isSelected = formType === tItem;
            const label = preferredLang === "gujarati" ? currentLabelLabels[tItem].gu : currentLabelLabels[tItem].en;
            return (
              <TouchableOpacity
                key={tItem}
                style={[
                  styles.typeChip,
                  {
                    backgroundColor: isSelected ? theme.colors.primary : (isDark ? "#334155" : "#f1f5f9"),
                    flexDirection: "row",
                    alignItems: "center",
                    paddingHorizontal: 12,
                    height: 40,
                    borderRadius: 10,
                    marginRight: 8,
                  }
                ]}
                onPress={() => setFormType(tItem)}
              >
                <View style={{ marginRight: 6 }}>
                  <MedicineIcon type={tItem} size={16} color={isSelected ? "#ffffff" : theme.colors.primary} />
                </View>
                <Text style={[styles.typeChipText, { color: isSelected ? "#ffffff" : theme.colors.textPrimary, fontSize: 13, fontWeight: "600" }]}>
                  {label}
                </Text>
                {isSelected && <Ionicons name="checkmark-circle" size={14} color="#ffffff" style={{ marginLeft: 6 }} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.inputGroup}>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
          <Ionicons name="flask-outline" size={14} color={theme.colors.textSecondary} style={{ marginRight: 6 }} />
          <Text style={[styles.inputLabel, { color: theme.colors.textSecondary, marginBottom: 0 }]}>
            {t("dose")}
          </Text>
        </View>
        {renderDoseInput()}

        {/* Responsive, independent two-row layout for DoseVisual and live text preview */}
        <View style={{ marginTop: 12 }}>
          <View style={{ backgroundColor: isDark ? "#10b98115" : "#10b98110", padding: 12, borderRadius: 12 }}>
            {/* Row 1: Full-width Preview Text */}
            <Text style={{ color: "#10b981", fontSize: 14, fontWeight: "bold", marginBottom: 8, lineHeight: 20 }}>
              ✓ {getDosePreviewText()}
            </Text>
            {/* Row 2: Visual icons row below, left-aligned */}
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <DoseVisual type={formType} value={formType === "TABLET" || formType === "CAPSULE" ? formCount : formVal} unit={formUnit} size={36} color="#10b981" />
            </View>
          </View>
        </View>
      </View>

      <View style={styles.inputGroup}>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
          <Ionicons name="time-outline" size={14} color={theme.colors.textSecondary} style={{ marginRight: 6 }} />
          <Text style={[styles.inputLabel, { color: theme.colors.textSecondary, marginBottom: 0 }]}>
            {t("frequency")}
          </Text>
        </View>
        <View style={styles.chipRow}>
          {["ONCE", "TWICE", "THRICE"].map(f => (
            <TouchableOpacity
              key={f}
              style={[styles.freqChip, { backgroundColor: formFreq === f ? theme.colors.primary : (isDark ? "#334155" : "#f1f5f9"), paddingVertical: 8, paddingHorizontal: 16, borderRadius: 10, marginRight: 8, marginBottom: 8 }]}
              onPress={() => setFormFreq(f)}
            >
              <Text style={[styles.freqChipText, { color: formFreq === f ? "#ffffff" : theme.colors.textPrimary, fontWeight: "bold" }]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {renderTimeSlotPicker()}
      </View>

      <View style={[styles.inputGroup, { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }]}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Ionicons name="notifications-outline" size={14} color={theme.colors.textSecondary} style={{ marginRight: 6 }} />
          <Text style={[styles.inputLabel, { color: theme.colors.textSecondary, marginBottom: 0 }]}>
            {t("refillAlert")}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.toggleButton, { backgroundColor: formRefill ? "#10b981" : (isDark ? "#475569" : "#cbd5e1") }]}
          onPress={() => setFormRefill(!formRefill)}
        >
          <Text style={{ color: "#ffffff", fontWeight: "bold", fontSize: 11 }}>{formRefill ? "ON" : "OFF"}</Text>
        </TouchableOpacity>
      </View>

      {formRefill && (
        <View style={styles.inputGroup}>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
            <Ionicons name="cube-outline" size={14} color={theme.colors.textSecondary} style={{ marginRight: 6 }} />
            <Text style={[styles.inputLabel, { color: theme.colors.textSecondary, marginBottom: 0 }]}>
              {t("totalQuantity")}
            </Text>
          </View>
          <TextInput
            style={[styles.textInput, { color: theme.colors.textPrimary, borderColor: isDark ? "#475569" : "#cbd5e1", backgroundColor: isDark ? "#0f172a" : "#f8fafc" }]}
            value={formQty}
            onChangeText={setFormQty}
            keyboardType="numeric"
            placeholder={preferredLang === "gujarati" ? "દા.ત. 30" : "e.g. 30"}
            placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
          />
        </View>
      )}

      <View style={styles.inputGroup}>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
          <Ionicons name="person-outline" size={14} color={theme.colors.textSecondary} style={{ marginRight: 6 }} />
          <Text style={[styles.inputLabel, { color: theme.colors.textSecondary, marginBottom: 0 }]}>
            {t("prescribedBy")}
          </Text>
        </View>
        <TextInput
          style={[styles.textInput, { color: theme.colors.textPrimary, borderColor: isDark ? "#475569" : "#cbd5e1", backgroundColor: isDark ? "#0f172a" : "#f8fafc" }]}
          value={formPrescribed}
          onChangeText={setFormPrescribed}
          placeholder={preferredLang === "gujarati" ? "ડૉક્ટર નું નામ" : "Doctor's Name"}
          placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
        />
      </View>

      <View style={styles.inputGroup}>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
          <Ionicons name="document-text-outline" size={14} color={theme.colors.textSecondary} style={{ marginRight: 6 }} />
          <Text style={[styles.inputLabel, { color: theme.colors.textSecondary, marginBottom: 0 }]}>
            {preferredLang === "gujarati" ? "નોંધ" : "Notes"}
          </Text>
        </View>
        <TextInput
          style={[styles.textInput, { height: 60, color: theme.colors.textPrimary, borderColor: isDark ? "#475569" : "#cbd5e1", backgroundColor: isDark ? "#0f172a" : "#f8fafc" }]}
          value={formNotes}
          onChangeText={setFormNotes}
          placeholder={preferredLang === "gujarati" ? "વધારાની નોંધો..." : "Additional notes..."}
          placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
          multiline
        />
      </View>

      {localErrors.length > 0 && (
        <View style={{ marginBottom: 12 }}>
          {localErrors.map((err, i) => (
            <Text key={i} style={{ color: "#ef4444", fontSize: 12 }}>• {err}</Text>
          ))}
        </View>
      )}

      <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 12 }}>
        <TouchableOpacity
          disabled={selectedSlots.length !== N}
          style={[
            styles.bigActionButtonSide,
            {
              backgroundColor: selectedSlots.length !== N ? (isDark ? "#475569" : "#cbd5e1") : theme.colors.primary,
              flex: 1,
              marginRight: 8
            }
          ]}
          onPress={handleSave}
        >
          <Text style={[styles.bigActionButtonTextSide, { color: selectedSlots.length !== N ? (isDark ? "#94a3b8" : "#64748b") : "#ffffff" }]}>
            {preferredLang === "gujarati" ? "સાચવો" : "Save Medicine"}
          </Text>
        </TouchableOpacity>
        {isEditingLocal && onCancel && (
          <TouchableOpacity
            style={[styles.bigActionButtonSide, { backgroundColor: isDark ? "#334155" : "#e2e8f0", flex: 0.4 }]}
            onPress={onCancel}
          >
            <Text style={[styles.bigActionButtonTextSide, { color: theme.colors.textPrimary }]}>
              {preferredLang === "gujarati" ? "રદ કરો" : "Cancel"}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <DateTimePickerModal
        isVisible={isSlotPickerVisible}
        mode="time"
        onConfirm={(date) => {
          setSlotPickerVisible(false);
          const time24 = format(date, "HH:mm");
          if (editingCustomTimeVal !== null) {
            if (time24 === editingCustomTimeVal) {
              return;
            }
            if (selectedSlots.includes(time24)) {
              setSlotError(t("duplicate"));
              return;
            }
            setSelectedSlots(prev => prev.map(t => t === editingCustomTimeVal ? time24 : t));
            setSlotError("");
          } else {
            if (selectedSlots.includes(time24)) {
              setSlotError(t("duplicate"));
              return;
            }
            if (selectedSlots.length < N) {
              setSelectedSlots(prev => [...prev, time24]);
              setSlotError("");
            }
          }
        }}
        onCancel={() => setSlotPickerVisible(false)}
      />
    </View>
  );
}

interface ReviewMedicinesListCardProps {
  localMedicines: any[];
  setLocalMedicines: React.Dispatch<React.SetStateAction<any[]>>;
  preferredLang: string;
  isDark: boolean;
  theme: any;
  onConfirm: (checkedMeds: string[]) => void;
  onAddNew: () => void;
  onSkipAll: () => void;
  onEdit: (med: any) => void;
}

function ReviewMedicinesListCard({
  localMedicines,
  setLocalMedicines,
  preferredLang,
  isDark,
  theme,
  onConfirm,
  onAddNew,
  onSkipAll,
  onEdit,
}: ReviewMedicinesListCardProps) {
  const [checkedMeds, setCheckedMeds] = useState<string[]>(localMedicines.filter(m => m.selected).map(m => m.id));

  useEffect(() => {
    setCheckedMeds(localMedicines.filter(m => m.selected).map(m => m.id));
  }, [localMedicines]);

  const toggleCheck = (id: string) => {
    if (checkedMeds.includes(id)) {
      setCheckedMeds(prev => prev.filter(m => m !== id));
      setLocalMedicines(prev => prev.map(m => m.id === id ? { ...m, selected: false } : m));
    } else {
      setCheckedMeds(prev => [...prev, id]);
      setLocalMedicines(prev => prev.map(m => m.id === id ? { ...m, selected: true } : m));
    }
  };

  const handleConfirm = () => {
    onConfirm(checkedMeds);
  };

  return (
    <View style={[styles.medListCard, { backgroundColor: isDark ? "#1e293b" : "#ffffff", borderColor: isDark ? "#334155" : "#e2e8f0" }]}>
      <Text style={[styles.medCardTitle, { color: theme.colors.textPrimary }]}>
        {preferredLang === "gujarati" ? "મેળવેલી દવાઓની યાદી" : "Extracted Medications List"}
      </Text>
      <Text style={[styles.medCardSubtitleText, { color: theme.colors.textSecondary }]}>
        {preferredLang === "gujarati" ? "કૃપા કરીને તપાસો કે કઈ દવાઓ તમારી સૂચિમાં રાખવી છે:" : "Please check which medicines to keep in your list:"}
      </Text>

      <View style={{ marginVertical: 12 }}>
        {localMedicines.map(med => {
          const isChecked = checkedMeds.includes(med.id);
          return (
            <View key={med.id} style={[styles.medListItemRow, { borderBottomColor: isDark ? "#334155" : "#f1f5f9" }]}>
              <TouchableOpacity
                style={{ flexDirection: "row", alignItems: "center", flex: 1 }}
                onPress={() => toggleCheck(med.id)}
              >
                <Ionicons
                  name={isChecked ? "checkbox" : "square-outline"}
                  size={20}
                  color={isChecked ? theme.colors.primary : theme.colors.textSecondary}
                  style={{ marginRight: 10 }}
                />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.medListItemName, { color: theme.colors.textPrimary, textDecorationLine: isChecked ? "none" : "line-through" }]}>
                    {med.name}
                  </Text>
                  <Text style={[styles.medListItemSubtitle, { color: theme.colors.textSecondary }]}>
                    {med.subtitle}
                  </Text>
                  {med.needsReview && Object.values(med.needsReview).some(v => v === true) && (
                    <Text style={{ color: "#d97706", fontSize: 11, fontWeight: "600", marginTop: 2 }}>
                      ⚠️ {preferredLang === "gujarati" ? "સમીક્ષા જરૂરી" : "Review"}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.pencilIconButton}
                onPress={() => onEdit(med)}
              >
                <Ionicons name="pencil" size={16} color={theme.colors.primary} />
              </TouchableOpacity>
            </View>
          );
        })}
      </View>

      <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
        <TouchableOpacity
          style={[styles.bigActionButtonSide, { backgroundColor: theme.colors.primary, flex: 1, marginRight: 6 }]}
          onPress={handleConfirm}
        >
          <Text style={styles.bigActionButtonTextSide}>
            {preferredLang === "gujarati" ? "આગળ વધો" : "Confirm Selection"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.bigActionButtonSide, { backgroundColor: isDark ? "#334155" : "#e2e8f0", flex: 0.5 }]}
          onPress={onAddNew}
        >
          <Text style={[styles.bigActionButtonTextSide, { color: theme.colors.textPrimary }]}>
            {preferredLang === "gujarati" ? "ઉમેરો" : "Add New"}
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.skipListButton}
        onPress={onSkipAll}
      >
        <Text style={[styles.skipListText, { color: theme.colors.textSecondary }]}>
          {preferredLang === "gujarati" ? "બધું છોડી દો" : "Skip All"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

interface ConfirmMedicineCardProps {
  summary: any;
  preferredLang: string;
  isDark: boolean;
  theme: any;
  onConfirm: () => void;
  onEdit: () => void;
}

function ConfirmMedicineCard({
  summary,
  preferredLang,
  isDark,
  theme,
  onConfirm,
  onEdit,
}: ConfirmMedicineCardProps) {
  const title = summary.title || "";
  const lines = summary.lines || [];

  const t = (key: string) => {
    const lang = preferredLang || "english";
    const dict = I18N_MEDICINE[lang] || I18N_MEDICINE.english;
    return dict[key] || I18N_MEDICINE.english[key] || key;
  };

  const getLocalizedSummaryLabel = (lbl: string) => {
    const k = lbl.toLowerCase();
    if (k === "type") return t("medicineType");
    if (k === "dose") return t("dose");
    if (k === "frequency") return t("frequency");
    if (k === "times") return t("times") || "Times";
    if (k === "prescribed by") return t("prescribedBy");
    if (k === "notes") return t("notes");
    return lbl;
  };

  const getLineIcon = (key: string) => {
    const k = key.toLowerCase();
    if (k.includes("type")) return "grid-outline";
    if (k.includes("dose")) return "flask-outline";
    if (k.includes("frequency")) return "calendar-outline";
    if (k.includes("times")) return "time-outline";
    if (k.includes("prescribed")) return "person-outline";
    if (k.includes("refill")) return "notifications-outline";
    if (k.includes("quantity")) return "cube-outline";
    if (k.includes("notes")) return "document-text-outline";
    return "information-circle-outline";
  };

  return (
    <View style={[styles.medConfirmCard, { backgroundColor: isDark ? "#1e293b" : "#ffffff", borderColor: isDark ? "#334155" : "#e2e8f0" }]}>
      <Text style={[styles.medCardTitle, { color: theme.colors.textPrimary }]}>
        {t("verifyTitle")}
      </Text>

      <View style={[styles.confirmSummaryBox, { backgroundColor: isDark ? "#0f172a" : "#f8fafc", borderColor: isDark ? "#334155" : "#e2e8f0" }]}>
        <Text style={[styles.confirmSummaryTitle, { color: theme.colors.primary }]}>{title}</Text>
        {lines.map((line: string, i: number) => {
          const colonIdx = line.indexOf(":");
          const label = colonIdx > -1 ? line.substring(0, colonIdx).trim() : "";
          const val = colonIdx > -1 ? line.substring(colonIdx + 1).trim() : line;
          const icon = getLineIcon(label || line);

          return (
            <View key={i} style={[styles.summaryLineRow, { borderBottomWidth: 1, borderBottomColor: isDark ? "#1e293b" : "#f1f5f9", paddingVertical: 10, alignItems: "center" }]}>
              <Ionicons name={icon as any} size={18} color={theme.colors.primary} style={{ marginRight: 10 }} />
              <View style={{ flex: 1 }}>
                {label ? (
                  <Text style={{ fontSize: 11, color: theme.colors.textSecondary, textTransform: "uppercase", fontWeight: "600" }}>
                    {getLocalizedSummaryLabel(label)}
                  </Text>
                ) : null}
                <Text style={[styles.summaryLineText, { color: theme.colors.textPrimary, marginTop: 2, fontSize: 14, fontWeight: "500" }]}>{val}</Text>
              </View>
            </View>
          );
        })}
      </View>

      <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 16 }}>
        <TouchableOpacity
          style={[styles.bigActionButtonSide, { backgroundColor: "#10b981", flex: 1, marginRight: 8 }]}
          onPress={onConfirm}
        >
          <Text style={styles.bigActionButtonTextSide}>
            {t("confirmSave")}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.bigActionButtonSide, { backgroundColor: isDark ? "#334155" : "#e2e8f0", flex: 0.5 }]}
          onPress={onEdit}
        >
          <Text style={[styles.bigActionButtonTextSide, { color: theme.colors.textPrimary }]}>
            {t("edit")}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

interface MedicineOptionsPanelProps {
  optionsList: any[];
  isDark: boolean;
  theme: any;
  onOptionPress: (key: string, label: string) => void;
}

function MedicineOptionsPanel({
  optionsList,
  isDark,
  theme,
  onOptionPress,
}: MedicineOptionsPanelProps) {
  const getOptionIcon = (key: string) => {
    if (key === "ADD") return "add-circle";
    if (key === "DASHBOARD") return "grid";
    if (key === "ASK_REPORT") return "document-text";
    return "arrow-forward-circle";
  };

  return (
    <View style={styles.optionsPanel}>
      {optionsList.map((opt: any) => (
        <TouchableOpacity
          key={opt.key}
          style={[
            styles.optionsPanelButton,
            {
              backgroundColor: opt.primary ? theme.colors.primary : (isDark ? "#1e293b" : "#f1f5f9"),
              borderColor: opt.primary ? theme.colors.primary : (isDark ? "#334155" : "#e2e8f0"),
              borderWidth: 1,
            }
          ]}
          onPress={() => onOptionPress(opt.key, opt.label)}
        >
          <Ionicons
            name={getOptionIcon(opt.key)}
            size={20}
            color={opt.primary ? "#ffffff" : theme.colors.primary}
            style={{ marginRight: 10 }}
          />
          <Text style={[styles.optionsPanelText, { color: opt.primary ? "#ffffff" : theme.colors.textPrimary }]}>
            {opt.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function OnboardingScreen() {
  const { theme, isDark } = useAppTheme();
  const queryClient = useQueryClient();
  const navigation = useNavigation<any>();
  const { logout } = useAuth();
  const isUploadingRef = useRef(false);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isDatePickerVisible, setDatePickerVisible] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<"date" | "time">("date");
  const [isEditingProfileManually, setIsEditingProfileManually] = useState(false);
  const [editedProfileData, setEditedProfileData] = useState<any>({});
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [keyboardPadding, setKeyboardPadding] = useState(0);



  // Document upload state
  const [selectedFile, setSelectedFile] = useState<{
    uri: string;
    name: string;
    type: string;
    size?: number;
    fileType: "pdf" | "image";
  } | null>(null);
  const [validationDialogVisible, setValidationDialogVisible] = useState(false);

  const [state, setState] = useState({
    currentStep: null as string | null,
    isOnboardingCompleted: false,
    uploadedMedicalDocument: false,
    documentUploaded: false,
    documentConfirmed: false,
    documentText: "",
    preferredLanguage: null as string | null,
    flowMode: null as string | null,
    documentExtracted: false,
    bloodGroupSkipped: false,
    allergiesSkipped: false,
    hasSocialData: undefined as boolean | undefined,
    foundMedicines: [] as any[],
    medicinesFlowStarted: false,
    medicinesConfirmed: false,
    medicinesToAdd: [] as any[],
    currentMedicineIndex: 0,
    medicinesSavedToDb: false,
    existingUserData: {
      firstName: "",
      lastName: "",
      dateOfBirth: "",
      gender: "",
      bloodGroup: "",
      allergies: [] as string[],
      email: "",
    },
  });

  // Local medicines state for UI checkbox tracking and local edits
  const [localMedicines, setLocalMedicines] = useState<any[]>([]);
  const [activeMedicineToEdit, setActiveMedicineToEdit] = useState<any>(null);
  const [currentClientMedId, setCurrentClientMedId] = useState<string | null>(null);

  // Synchronize localMedicines with backend state when it changes
  useEffect(() => {
    if (state?.medicinesToAdd) {
      setLocalMedicines(state.medicinesToAdd);
    }
  }, [state?.medicinesToAdd]);

  const flatListRef = useRef<FlatList>(null);
  const uploadSheetRef = useRef<any>(null);

  // Keyboard adjustments matching AIChatScreen
  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (e: KeyboardEvent) => setKeyboardPadding(e.endCoordinates.height),
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setKeyboardPadding(0),
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Fetch initial profile
  const { data: userData } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const response = await getUser();
      return response?.data || response;
    },
  });

  useEffect(() => {
    if (userData) {
      const isCompleted =
        userData.firstName &&
        userData.firstName !== "User" &&
        userData.dateOfBirth &&
        userData.gender;

      const initialUserData: UserData = {
        firstName:
          userData.firstName === "User" ? "" : userData.firstName || "",
        lastName: userData.lastName?.startsWith("+")
          ? ""
          : userData.lastName || "",
        dateOfBirth: userData.dateOfBirth
          ? format(new Date(userData.dateOfBirth), "yyyy-MM-dd")
          : "",
        gender: userData.gender || "",
        bloodGroup: userData.bloodGroup || "",
        allergies: Array.isArray(userData.allergies)
          ? userData.allergies
          : typeof userData.allergies === "string" && userData.allergies
            ? (userData.allergies as string).split(",").map((s) => s.trim())
            : [],
        email: userData.email || "",
      };

      const newState = {
        currentStep: null as string | null,
        isOnboardingCompleted: !!isCompleted,
        uploadedMedicalDocument: false,
        documentUploaded: false,
        documentConfirmed: false,
        documentText: "",
        preferredLanguage: null,
        flowMode: null,
        documentExtracted: false,
        bloodGroupSkipped: false,
        allergiesSkipped: false,
        hasSocialData: undefined,
        foundMedicines: [],
        medicinesFlowStarted: false,
        medicinesConfirmed: false,
        medicinesToAdd: [],
        currentMedicineIndex: 0,
        medicinesSavedToDb: false,
        existingUserData: initialUserData,
      };

      setState(newState);

      if (messages.length === 0) {
        startOnboardingChat(newState);
      }
    }
  }, [userData]);

  const startOnboardingChat = async (currentState: typeof state) => {
    setLoading(true);
    try {
      const payload = {
        message: "hello",
        history: [],
        state: currentState,
      };

      const response = await apiClient.post("/v1/onboarding/chat", payload, {
        timeout: 90000,
      });
      const resData = response.data?.data;
      console.log("AI Response :- ", resData);

      if (resData) {
        processAssistantResponse(resData, currentState);
      }
    } catch (error: any) {
      console.error("[Onboarding] Start failed:", error);
      Toast.show({
        type: "error",
        text1: "Connection Error",
        text2: "Failed to connect to the onboarding assistant.",
      });
    } finally {
      setLoading(false);
    }
  };

  const processAssistantResponse = (aiRes: any, currentState: typeof state) => {
    const preferredLang =
      aiRes.preferredLanguage || currentState.preferredLanguage || "english";

    const messageContent =
      preferredLang === "gujarati"
        ? aiRes.message_gu || aiRes.message
        : aiRes.message_en || aiRes.message;

    const newMsg: Message = {
      id: `ai-${Date.now()}`,
      role: "assistant",
      content: messageContent || "Please provide the information.",
      action: aiRes.action,
      options: aiRes.options,
      fields: aiRes.fields,
      loginSummary: aiRes.loginSummary,
      documentSummary: aiRes.documentSummary,
      mode: aiRes.mode,
      title: aiRes.title,
      subtitle: aiRes.subtitle,
      explainer: aiRes.explainer,
      loginProvider: aiRes.loginProvider,
      medicine: aiRes.medicine,
      summary: aiRes.summary,
    };

    setMessages((prev) => [...prev, newMsg]);

    let updatedUserData = { ...currentState.existingUserData };

    if (aiRes.action === "REGISTER_USER" && aiRes.data) {
      handleRegistration(aiRes.data);
      return;
    }

    if (aiRes.extractedData) {
      updatedUserData = {
        ...updatedUserData,
        ...aiRes.extractedData,
      };
    }

    let finalState = { ...currentState };

    if (aiRes.state) {
      finalState = {
        ...finalState,
        ...aiRes.state,
      };
    } else {
      finalState = {
        ...finalState,
        preferredLanguage:
          aiRes.preferredLanguage || finalState.preferredLanguage,
        flowMode: aiRes.flowMode || finalState.flowMode,
        documentUploaded:
          aiRes.documentUploaded !== undefined
            ? aiRes.documentUploaded
            : finalState.documentUploaded,
        documentConfirmed:
          aiRes.documentConfirmed !== undefined
            ? aiRes.documentConfirmed
            : finalState.documentConfirmed,
        documentExtracted:
          aiRes.documentExtracted !== undefined
            ? aiRes.documentExtracted
            : finalState.documentExtracted,
        bloodGroupSkipped:
          aiRes.bloodGroupSkipped !== undefined
            ? aiRes.bloodGroupSkipped
            : finalState.bloodGroupSkipped,
        allergiesSkipped:
          aiRes.allergiesSkipped !== undefined
            ? aiRes.allergiesSkipped
            : finalState.allergiesSkipped,
        hasSocialData: aiRes.hasSocialData !== undefined ? aiRes.hasSocialData : finalState.hasSocialData,
        foundMedicines: aiRes.foundMedicines || finalState.foundMedicines,
        medicinesFlowStarted: aiRes.medicinesFlowStarted !== undefined ? aiRes.medicinesFlowStarted : finalState.medicinesFlowStarted,
        medicinesConfirmed: aiRes.medicinesConfirmed !== undefined ? aiRes.medicinesConfirmed : finalState.medicinesConfirmed,
        medicinesToAdd: aiRes.medicinesToAdd || finalState.medicinesToAdd,
        currentMedicineIndex: aiRes.currentMedicineIndex !== undefined ? aiRes.currentMedicineIndex : finalState.currentMedicineIndex,
        medicinesSavedToDb: aiRes.medicinesSavedToDb !== undefined ? aiRes.medicinesSavedToDb : finalState.medicinesSavedToDb,
        existingUserData: updatedUserData,
      };
    }

    setState(finalState);

    if (finalState.documentExtracted) {
      setUploadProgress(null);
    }
  };

  const sendMessage = async (userText: string, updatedState = state, displayLabel?: string) => {
    if (!userText.trim()) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: displayLabel || userText,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const history = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const payload = {
        message: userText,
        history,
        state: updatedState,
      };

      console.log("Payload for Onboarding Chat :- ", payload);

      const response = await apiClient.post("/v1/onboarding/chat", payload, {
        timeout: 90000,
      });
      console.log("Response for Onboarding Chat :- ", response);
      const resData = response.data?.data;

      if (resData) {
        processAssistantResponse(resData, updatedState);
      }
    } catch (error: any) {
      console.error("[Onboarding] Send message failed:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to get response from onboarding assistant.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRegistration = async (registerData: UserData) => {
    setLoading(true);
    try {
      const user = await getUser();
      const userId = user?.data?.id;
      if (!userId) throw new Error("No user ID found.");

      const payload = {
        firstName: registerData.firstName,
        lastName: registerData.lastName,
        dateOfBirth: registerData.dateOfBirth,
        gender: registerData.gender,
        bloodGroup: registerData.bloodGroup || undefined,
        allergies:
          registerData.allergies && registerData.allergies.length > 0
            ? registerData.allergies
            : undefined,
      };

      await updateUser(userId, payload);

      Toast.show({
        type: "success",
        text1: "Onboarding Completed! 🎉",
        text2: "Welcome to your health dashboard.",
      });

      // Refetch profile queries
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
      await queryClient.invalidateQueries({ queryKey: ["userProfile"] });
    } catch (error: any) {
      console.error("[Onboarding] Registration failed:", error);
      Toast.show({
        type: "error",
        text1: "Registration Error",
        text2: error.message || "Failed to update profile.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDateConfirm = (date: Date) => {
    setDatePickerVisible(false);
    if (datePickerMode === "time") {
      const timeString = format(date, "hh:mm a");
      sendMessage(timeString, state);
    } else {
      const dobString = format(date, "yyyy-MM-dd");
      if (isEditingProfileManually) {
        setEditedProfileData((prev: any) => ({ ...prev, dateOfBirth: dobString }));
      } else {
        const updatedUserData = {
          ...state.existingUserData,
          dateOfBirth: dobString,
        };
        const newState = {
          ...state,
          existingUserData: updatedUserData,
        };
        setState(newState);
        sendMessage(dobString, newState);
      }
    }
  };

  const handleGenderSelect = (gender: string) => {
    const updatedUserData = {
      ...state.existingUserData,
      gender,
    };
    const newState = {
      ...state,
      existingUserData: updatedUserData,
    };
    setState(newState);
    sendMessage(gender, newState);
  };

  const handleSend = () => {
    const textToSubmit = input.trim();
    if (selectedFile) {
      uploadSelectedFile(selectedFile);
    } else if (textToSubmit) {
      sendMessage(textToSubmit);
    }
  };

  // Upload actions for BottomSheet
  const handleTakePhoto = async () => {
    if (loading) return;
    const permission = await requestCameraPermission();
    if (!permission.granted) {
      Toast.show({
        type: "error",
        text1: "Permission Required",
        text2: "Camera permission is required to capture photos of reports.",
      });
      return;
    }

    const asset = await takePhotoAsset();
    if (!asset) return;

    const uriParts = asset.uri.split(".");
    const ext = uriParts[uriParts.length - 1] || "jpg";
    const name = `report_${Date.now()}.${ext}`;

    console.log("[ONBOARDING] Document Selected", name);
    const file = {
      uri: asset.uri,
      name,
      type: asset.mimeType || "image/jpeg",
      size: asset.fileSize,
      fileType: "image" as const,
    };
    setSelectedFile(file);
    setInput(name);

    setTimeout(() => {
      uploadSelectedFile(file);
    }, 100);
  };

  const handleChooseGallery = async () => {
    if (loading) return;
    const permission = await requestGalleryPermission();
    if (!permission.granted) {
      Toast.show({
        type: "error",
        text1: "Permission Required",
        text2: "Gallery permission is required to select photos of reports.",
      });
      return;
    }

    const asset = await openGalleryAsset();
    if (!asset) return;

    const uriParts = asset.uri.split(".");
    const ext = uriParts[uriParts.length - 1] || "jpg";
    const name = asset.fileName || `report_${Date.now()}.${ext}`;

    console.log("[ONBOARDING] Document Selected", name);
    const file = {
      uri: asset.uri,
      name,
      type: asset.mimeType || "image/jpeg",
      size: asset.fileSize,
      fileType: "image" as const,
    };
    setSelectedFile(file);
    setInput(name);

    setTimeout(() => {
      uploadSelectedFile(file);
    }, 100);
  };

  const handleChooseDocument = async () => {
    if (loading) return;
    const asset = await pickDocumentAsset();
    if (!asset) return;

    const isPdf =
      asset.name?.toLowerCase().endsWith(".pdf") ||
      asset.mimeType === "application/pdf";
    const name = asset.name || `report_${Date.now()}.${isPdf ? "pdf" : "jpg"}`;

    console.log("[ONBOARDING] Document Selected", name);
    const file = {
      uri: asset.uri,
      name,
      type: asset.mimeType || (isPdf ? "application/pdf" : "image/jpeg"),
      size: asset.size,
      fileType: (isPdf ? "pdf" : "image") as "pdf" | "image",
    };
    setSelectedFile(file);
    setInput(name);

    setTimeout(() => {
      uploadSelectedFile(file);
    }, 100);
  };

  const handleDocumentUpload = () => {
    if (loading) return;
    Keyboard.dismiss();
    uploadSheetRef.current?.present();
  };

  const pollOcrStatus = async (documentId: string): Promise<any> => {
    return new Promise((resolve, reject) => {
      const interval = setInterval(async () => {
        try {
          const statusRes = await apiClient.get(`/v1/ocr/status/${documentId}`);
          const resData = statusRes.data?.data;
          console.log("[ONBOARDING] Poll OCR Status:", resData?.status);

          if (resData?.status === "done") {
            clearInterval(interval);
            resolve(resData);
          } else if (resData?.status === "failed") {
            clearInterval(interval);
            reject(new Error("Document processing failed on the server."));
          }
        } catch (error) {
          console.error("[ONBOARDING] Status poll error:", error);
        }
      }, 3000);
    });
  };

  const pollLatestDocumentStatus = async (fileName: string): Promise<any> => {
    const startTime = Date.now();
    const pollTimeout = 240000; // 4 minutes
    const pollInterval = 5000;  // 5 seconds

    return new Promise((resolve, reject) => {
      const interval = setInterval(async () => {
        if (Date.now() - startTime > pollTimeout) {
          clearInterval(interval);
          reject(new Error("Document processing timed out on server."));
          return;
        }

        try {
          const listRes = await apiClient.get("/v1/documents/list?limit=5");
          const items = listRes.data?.data?.items || [];
          const latestDoc = items.find((item: any) => item.fileName === fileName);

          if (latestDoc) {
            console.log("[ONBOARDING] Polling latest document status:", latestDoc.ocrStatus);
            if (latestDoc.ocrStatus === "completed") {
              clearInterval(interval);
              resolve({
                document: latestDoc,
                structuredData: latestDoc.structuredExtractedData || {},
              });
            } else if (latestDoc.ocrStatus === "failed") {
              clearInterval(interval);
              reject(new Error("Document processing failed on server."));
            }
          }
        } catch (error) {
          console.warn("[ONBOARDING] Polling latest document error:", error);
        }
      }, pollInterval);
    });
  };

  const handleSuccessfulOcr = async (pollResult: any, fileName: string) => {
    const docData = pollResult.document || {};
    const extractedText = docData.ocrExtractedText || "";
    const structured = pollResult.structuredData || {};

    console.log("[ONBOARDING] Extracted Structured Data:", structured);

    const parsedAllergies = Array.isArray(structured.allergies)
      ? structured.allergies
      : [];

    let firstName = structured.firstName || "";
    let lastName = structured.lastName || "";
    if (!firstName && !lastName && structured.patientName) {
      const parts = structured.patientName.trim().split(/\s+/);
      if (parts.length > 0) {
        firstName = parts[0];
        lastName = parts.slice(1).join(" ");
      }
    }

    const updatedUserData = {
      ...state.existingUserData,
      firstName: firstName || state.existingUserData.firstName || "",
      lastName: lastName || state.existingUserData.lastName || "",
      dateOfBirth:
        structured.dateOfBirth ||
        structured.reportDate ||
        state.existingUserData.dateOfBirth ||
        "",
      gender: structured.gender || state.existingUserData.gender || "",
      bloodGroup:
        structured.bloodGroup || state.existingUserData.bloodGroup || "",
      allergies:
        parsedAllergies.length > 0
          ? parsedAllergies
          : state.existingUserData.allergies || [],
      email: structured.email || state.existingUserData.email || "",
      phoneNumber: structured.phoneNumber || state.existingUserData.phoneNumber || "",
    };

    const newState = {
      ...state,
      flowMode: "UPLOAD",
      uploadedMedicalDocument: true,
      documentUploaded: true,
      documentText: extractedText,
      documentExtracted: true,
      documentData: {
        firstName: firstName || null,
        lastName: lastName || null,
        dateOfBirth: structured.dateOfBirth || structured.reportDate || null,
        gender: structured.gender || null,
        email: structured.email || null,
        phoneNumber: structured.phoneNumber || null,
        medications: structured.medications || [],
      },
      documentId: docData.id || null,
      existingUserData: updatedUserData,
    };

    setState(newState);
    setUploadProgress(null);

    // Reset selected states
    setSelectedFile(null);
    setInput("");

    sendMessage("Document Uploaded: " + fileName, newState);
  };

  const uploadSelectedFile = async (fileToUpload = selectedFile) => {
    if (!fileToUpload) return;
    if (isUploadingRef.current) {
      console.log("[ONBOARDING] Upload already in progress. Ignoring duplicate trigger.");
      return;
    }

    isUploadingRef.current = true;
    setLoading(true);
    setUploadProgress("Uploading and validating report...");
    console.log("[ONBOARDING] Upload Started");
    try {
      const formData = new FormData();
      formData.append("file", {
        uri: fileToUpload.uri,
        name: fileToUpload.name,
        type: fileToUpload.type,
      } as any);

      const response = await apiClient.post("/v1/ocr/extract", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 240000,
      });

      console.log("[ONBOARDING] Upload Success, checking document status...");
      const docId = response.data?.data?.documentId || response.data?.data?.document?.id;
      if (!docId) {
        throw new Error("Failed to start processing: no document ID returned.");
      }

      setUploadProgress("Analyzing report details...");
      const pollResult = await pollOcrStatus(docId);
      await handleSuccessfulOcr(pollResult, fileToUpload.name);

    } catch (error: any) {
      console.error("[Onboarding] Document processing failed:", error);

      const isTimeoutOrNetworkError =
        error.message?.toLowerCase().includes("timeout") ||
        error.message?.toLowerCase().includes("network") ||
        error.code === "ECONNABORTED" ||
        !error.response;

      if (isTimeoutOrNetworkError) {
        setUploadProgress("Analyzing report details (connection timed out, polling status)...");
        try {
          const pollResult = await pollLatestDocumentStatus(fileToUpload.name);
          if (pollResult) {
            await handleSuccessfulOcr(pollResult, fileToUpload.name);
            return;
          }
        } catch (pollErr) {
          console.error("[Onboarding] Polling latest document status failed:", pollErr);
        }
      }

      setUploadProgress(null);

      const errCode = error?.response?.data?.error?.code;
      if (errCode === "INVALID_MEDICAL_DOCUMENT") {
        setValidationDialogVisible(true);
      } else {
        // Signal failure to backend state machine
        sendMessage("OCR_FAILED", state);
        Toast.show({
          type: "error",
          text1: "Scan Failed",
          text2:
            error?.response?.data?.error?.message ||
            error.message ||
            "Failed to process medical document.",
        });
      }
    } finally {
      isUploadingRef.current = false;
      setLoading(false);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setInput("");
  };

  const handleSelectAgain = () => {
    setValidationDialogVisible(false);
    setSelectedFile(null);
    setInput("");
    setTimeout(() => {
      uploadSheetRef.current?.present();
    }, 300);
  };

  const handleContinueManual = () => {
    setValidationDialogVisible(false);
    setSelectedFile(null);
    setInput("");
    const newState = { ...state, flowMode: "MANUAL" };
    setState(newState);
    sendMessage("MANUAL", newState);
  };

  const renderOptions = (activeMsg: Message) => {
    const preferredLang = state.preferredLanguage || "en";

    const getProviderIcon = (p: string | undefined) => {
      if (!p) return "person-circle-outline";
      const iconMap: Record<string, string> = {
        google: "logo-google",
        facebook: "logo-facebook",
        microsoft: "logo-windows",
        apple: "logo-apple",
        mobile: "call",
        email: "mail",
      };
      return iconMap[p.toLowerCase()] || "person-circle-outline";
    };

    const getProviderIconColor = (p: string | undefined) => {
      if (!p) return "#3b82f6";
      const colorMap: Record<string, string> = {
        google: "#4285F4",
        facebook: "#1877F2",
        microsoft: "#00A4EF",
        apple: theme.colors.textPrimary,
        mobile: theme.colors.primary,
        email: theme.colors.primary,
      };
      return colorMap[p.toLowerCase()] || "#3b82f6";
    };

    const getProviderLabel = (p: string | undefined) => {
      const isGuj = preferredLang === "gujarati";
      if (!p) return isGuj ? "સોશિયલ લોગિનથી" : "From Social Login";

      switch (p.toLowerCase()) {
        case "google":
          return isGuj ? "Google થી" : "From Google";
        case "facebook":
          return isGuj ? "Facebook થી" : "From Facebook";
        case "apple":
          return isGuj ? "Apple થી" : "From Apple";
        case "microsoft":
          return isGuj ? "Microsoft થી" : "From Microsoft";
        case "mobile":
          return isGuj ? "ફોન લોગિનથી" : "From Phone";
        case "email":
          return isGuj ? "ઈમેલ લોગિનથી" : "From Email";
        default:
          return isGuj ? "સોશિયલ લોગિનથી" : "From Social Login";
      }
    };

    const handleOptionPress = (value: string, label: string) => {
      if (value === "GO_TO_DASHBOARD" || value === "DASHBOARD") {
        queryClient.invalidateQueries({ queryKey: ["profile"] });
        queryClient.invalidateQueries({ queryKey: ["userProfile"] });
        sendMessage(value, state, label);
      } else if (value === "ADD_MORE_MEDICINES" || value === "ADD") {
        sendMessage(value, state, label);
      } else if (value === "VIEW_MEDICINES" || value === "VIEW_MY_MEDICINES") {
        queryClient.invalidateQueries({ queryKey: ["profile"] });
        queryClient.invalidateQueries({ queryKey: ["userProfile"] });
        setTimeout(() => {
          navigation.navigate("MEDICATION", {
            screen: "MedicationList",
          });
        }, 500);
      } else if (value === "ASK_ABOUT_REPORT" || value === "ASK_REPORT") {
        queryClient.invalidateQueries({ queryKey: ["profile"] });
        queryClient.invalidateQueries({ queryKey: ["userProfile"] });
        sendMessage(value, state, label);
        setTimeout(() => {
          navigation.navigate("HOME", {
            screen: "AIChatScreen",
          });
        }, 500);
      } else if (value === "LOGOUT") {
        logout();
      } else {
        sendMessage(value, state, label);
      }
    };

    const getFieldIcon = (key: string) => {
      switch (key) {
        case "firstName":
        case "lastName":
          return "person-outline";
        case "phoneNumber":
        case "mobile":
          return "call-outline";
        case "dateOfBirth":
        case "dob":
          return "calendar-outline";
        case "gender":
          return "male-female-outline";
        case "email":
          return "mail-outline";
        case "bloodGroup":
          return "water-outline";
        default:
          return "help-circle-outline";
      }
    };

    if (activeMsg.action === "RESOLVE_PROFILE_SOURCE") {
      const fields = activeMsg.fields || [];
      const loginSummary = activeMsg.loginSummary || "";
      const documentSummary = activeMsg.documentSummary || "";

      if (isEditingProfileManually) {
        return (
          <View style={styles.resolveCardContainer}>
            <View style={styles.resolveCardHeader}>
              <Ionicons name="create-outline" size={20} color={theme.colors.primary} />
              <Text style={[styles.resolveCardTitle, { color: theme.colors.textPrimary, marginLeft: 8 }]}>
                {preferredLang === "gujarati" ? "પ્રોફાઇલ વિગતો સુધારો" : "Edit Profile Details"}
              </Text>
            </View>
            <View style={styles.editFormContainer}>
              {fields.map((field: any) => {
                if (field.verified) return null;

                if (field.key === "dateOfBirth") {
                  return (
                    <View key={field.key} style={styles.inputGroup}>
                      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
                        <Ionicons name={getFieldIcon(field.key)} size={14} color={theme.colors.textSecondary} style={{ marginRight: 4 }} />
                        <Text style={[styles.inputLabel, { color: theme.colors.textSecondary, marginBottom: 0 }]}>
                          {field.label}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={[
                          styles.textInput,
                          {
                            borderColor: isDark ? "#475569" : "#cbd5e1",
                            backgroundColor: isDark ? "#1e293b" : "#f8fafc",
                            justifyContent: "center",
                          },
                        ]}
                        onPress={() => {
                          setDatePickerMode("date");
                          setDatePickerVisible(true);
                        }}
                      >
                        <Text style={{ color: editedProfileData.dateOfBirth ? theme.colors.textPrimary : (isDark ? "#64748b" : "#94a3b8") }}>
                          {editedProfileData.dateOfBirth || (preferredLang === "gujarati" ? "જન્મ તારીખ પસંદ કરો" : "Select Date of Birth")}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  );
                }

                if (field.key === "gender") {
                  const currentGen = (editedProfileData.gender || "").toLowerCase();
                  return (
                    <View key={field.key} style={styles.inputGroup}>
                      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
                        <Ionicons name={getFieldIcon(field.key)} size={14} color={theme.colors.textSecondary} style={{ marginRight: 4 }} />
                        <Text style={[styles.inputLabel, { color: theme.colors.textSecondary, marginBottom: 0 }]}>
                          {field.label}
                        </Text>
                      </View>
                      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                        <TouchableOpacity
                          style={[
                            styles.resolveActionButton,
                            {
                              flex: 1,
                              marginRight: 6,
                              backgroundColor: currentGen === "male" ? theme.colors.primary : (isDark ? "#1e293b" : "#f1f5f9"),
                              borderColor: currentGen === "male" ? theme.colors.primary : (isDark ? "#475569" : "#cbd5e1"),
                              borderWidth: 1,
                            },
                          ]}
                          onPress={() => setEditedProfileData((prev: any) => ({ ...prev, gender: "male" }))}
                        >
                          <Text style={[styles.resolveActionButtonText, { color: currentGen === "male" ? "#ffffff" : theme.colors.textPrimary }]}>
                            {preferredLang === "gujarati" ? "પુરુષ" : "Male"}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.resolveActionButton,
                            {
                              flex: 1,
                              marginLeft: 6,
                              backgroundColor: currentGen === "female" ? theme.colors.primary : (isDark ? "#1e293b" : "#f1f5f9"),
                              borderColor: currentGen === "female" ? theme.colors.primary : (isDark ? "#475569" : "#cbd5e1"),
                              borderWidth: 1,
                            },
                          ]}
                          onPress={() => setEditedProfileData((prev: any) => ({ ...prev, gender: "female" }))}
                        >
                          <Text style={[styles.resolveActionButtonText, { color: currentGen === "female" ? "#ffffff" : theme.colors.textPrimary }]}>
                            {preferredLang === "gujarati" ? "સ્ત્રી" : "Female"}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                }

                if (field.key === "phoneNumber") {
                  const phoneStr = editedProfileData.phoneNumber || "";
                  let countryCode = "+91";
                  let nationalNumber = phoneStr;
                  if (phoneStr.startsWith("+")) {
                    countryCode = phoneStr.slice(0, 3);
                    nationalNumber = phoneStr.slice(3);
                  } else if (phoneStr.length > 10) {
                    countryCode = "+" + phoneStr.slice(0, 2);
                    nationalNumber = phoneStr.slice(2);
                  }

                  return (
                    <View key={field.key} style={styles.inputGroup}>
                      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
                        <Ionicons name={getFieldIcon(field.key)} size={14} color={theme.colors.textSecondary} style={{ marginRight: 4 }} />
                        <Text style={[styles.inputLabel, { color: theme.colors.textSecondary, marginBottom: 0 }]}>
                          {field.label}
                        </Text>
                      </View>
                      <View style={{ flexDirection: "row" }}>
                        <TextInput
                          style={[
                            styles.textInput,
                            {
                              width: 60,
                              marginRight: 8,
                              textAlign: "center",
                              color: theme.colors.textPrimary,
                              borderColor: isDark ? "#475569" : "#cbd5e1",
                              backgroundColor: isDark ? "#1e293b" : "#f8fafc",
                            },
                          ]}
                          value={countryCode}
                          onChangeText={(cc) => {
                            setEditedProfileData((prev: any) => ({
                              ...prev,
                              phoneNumber: cc + nationalNumber,
                            }));
                          }}
                          placeholder="+91"
                          placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
                        />
                        <TextInput
                          style={[
                            styles.textInput,
                            {
                              flex: 1,
                              color: theme.colors.textPrimary,
                              borderColor: isDark ? "#475569" : "#cbd5e1",
                              backgroundColor: isDark ? "#1e293b" : "#f8fafc",
                            },
                          ]}
                          value={nationalNumber}
                          onChangeText={(num) => {
                            setEditedProfileData((prev: any) => ({
                              ...prev,
                              phoneNumber: countryCode + num,
                            }));
                          }}
                          keyboardType="phone-pad"
                          placeholder="Phone Number"
                          placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
                        />
                      </View>
                    </View>
                  );
                }

                return (
                  <View key={field.key} style={styles.inputGroup}>
                    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
                      <Ionicons name={getFieldIcon(field.key)} size={14} color={theme.colors.textSecondary} style={{ marginRight: 4 }} />
                      <Text style={[styles.inputLabel, { color: theme.colors.textSecondary, marginBottom: 0 }]}>
                        {field.label}
                      </Text>
                    </View>
                    <TextInput
                      style={[
                        styles.textInput,
                        {
                          color: theme.colors.textPrimary,
                          borderColor: isDark ? "#475569" : "#cbd5e1",
                          backgroundColor: isDark ? "#1e293b" : "#f8fafc",
                        },
                      ]}
                      value={editedProfileData[field.key] || ""}
                      onChangeText={(val) =>
                        setEditedProfileData((prev: any) => ({ ...prev, [field.key]: val }))
                      }
                      placeholder={field.label}
                      placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
                      keyboardType={field.key === "email" ? "email-address" : "default"}
                    />
                  </View>
                );
              })}
            </View>
            <View style={styles.resolveActionButtonsRow}>
              <TouchableOpacity
                style={[styles.resolveActionButton, { backgroundColor: theme.colors.primary, flex: 1, marginRight: 8 }]}
                onPress={() => {
                  setIsEditingProfileManually(false);
                  sendMessage(JSON.stringify({ edited: editedProfileData }), state, "Saved manual changes");
                }}
              >
                <Text style={styles.resolveActionButtonText}>
                  {preferredLang === "gujarati" ? "સાચવો" : "Save Details"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.resolveActionButton,
                  { backgroundColor: isDark ? "#334155" : "#e2e8f0", flex: 1 },
                ]}
                onPress={() => setIsEditingProfileManually(false)}
              >
                <Text style={[styles.resolveActionButtonText, { color: theme.colors.textPrimary }]}>
                  {preferredLang === "gujarati" ? "રદ કરો" : "Cancel"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      }

      const mode = activeMsg.mode || "CONFIRM";

      return (
        <View style={styles.resolveCardContainer}>
          {/* Header */}
          <View style={styles.resolveCardHeader}>
            <View style={[styles.shieldIconContainer, { backgroundColor: isDark ? "rgba(59, 130, 246, 0.2)" : "#eff6ff" }]}>
              <Ionicons name="shield-checkmark" size={24} color="#3b82f6" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.resolveCardTitle, { color: theme.colors.textPrimary }]}>
                {activeMsg.title || (mode === "CONFIRM"
                  ? (preferredLang === "gujarati" ? "પ્રોફાઇલ વિગતોની પુષ્ટિ કરો" : "Confirm your profile details")
                  : (preferredLang === "gujarati" ? "અમને બે અલગ પ્રોફાઇલ મળી છે" : "We found two different profiles"))}
              </Text>
              <Text style={[styles.resolveCardSubtitle, { color: theme.colors.textSecondary }]}>
                {activeMsg.subtitle || (mode === "CONFIRM"
                  ? (preferredLang === "gujarati" ? "કૃપા કરીને નીચેની બધી વિગતો તપાસો અને પુષ્ટિ કરો" : "Please check and confirm all details below")
                  : (preferredLang === "gujarati" ? "કૃપા કરીને સમીક્ષા કરો અને તમારી પસંદગી પસંદ કરો" : "Please review and choose the one you prefer"))}
              </Text>
            </View>
          </View>

          {/* VS Card Columns or CONFIRM layout */}
          {mode === "CONFIRM" ? (
            <View style={[styles.vsColumn, { borderColor: isDark ? "#475569" : "#cbd5e1", width: "100%", marginBottom: 12, borderWidth: 1, borderRadius: 8, overflow: "hidden" }]}>
              <View style={[styles.columnHeader, { backgroundColor: isDark ? "#1e293b" : "#f8fafc" }]}>
                <Ionicons name="person-circle-outline" size={18} color={theme.colors.primary} style={{ marginRight: 6 }} />
                <Text style={[styles.columnHeaderTitle, { color: theme.colors.textPrimary }]}>
                  {preferredLang === "gujarati" ? "તમારી વિગતો" : "Your Details"}
                </Text>
              </View>
              <View style={styles.columnBody}>
                {fields.map((field: any) => {
                  const val = field.value;
                  return (
                    <View key={field.key} style={styles.fieldRow}>
                      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", width: "100%", marginBottom: 2 }}>
                        <View style={{ flexDirection: "row", alignItems: "center" }}>
                          <Ionicons name={getFieldIcon(field.key)} size={11} color={theme.colors.textSecondary} style={{ marginRight: 4 }} />
                          <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary, marginBottom: 0 }]} numberOfLines={1}>
                            {field.label}
                          </Text>
                          {field.verified ? (
                            <Ionicons name="checkmark-circle" size={12} color="#10b981" style={{ marginLeft: 4 }} />
                          ) : null}
                        </View>
                        {!field.verified && (
                          <TouchableOpacity
                            onPress={() => {
                              const initData: any = {};
                              fields.forEach((f: any) => {
                                initData[f.key] = f.value || "";
                              });
                              setEditedProfileData(initData);
                              setIsEditingProfileManually(true);
                            }}
                          >
                            <Ionicons name="pencil" size={12} color={theme.colors.primary} />
                          </TouchableOpacity>
                        )}
                      </View>
                      <Text
                        style={[
                          styles.fieldValue,
                          {
                            color: field.verified
                              ? (isDark ? "#64748b" : "#94a3b8")
                              : theme.colors.textPrimary,
                            paddingLeft: 15
                          }
                        ]}
                        numberOfLines={1}
                      >
                        {val || "—"}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          ) : (
            <View style={styles.vsContainer}>
              {/* Social Login Column */}
              <View style={[styles.vsColumn, { borderColor: "rgba(59, 130, 246, 0.2)" }]}>
                <View style={[styles.columnHeader, { backgroundColor: isDark ? "rgba(59, 130, 246, 0.15)" : "#eff6ff" }]}>
                  <Ionicons
                    name={getProviderIcon(activeMsg.loginProvider)}
                    size={16}
                    color={getProviderIconColor(activeMsg.loginProvider)}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={[styles.columnHeaderTitle, { color: getProviderIconColor(activeMsg.loginProvider) }]}>
                    {getProviderLabel(activeMsg.loginProvider)}
                  </Text>
                </View>
                <View style={styles.columnBody}>
                  {fields.map((field: any) => {
                    const val = field.loginValue;
                    return (
                      <View key={field.key} style={styles.fieldRow}>
                        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 2 }}>
                          <Ionicons name={getFieldIcon(field.key)} size={11} color={theme.colors.textSecondary} style={{ marginRight: 4 }} />
                          <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary, marginBottom: 0 }]} numberOfLines={1}>
                            {field.label}
                          </Text>
                          {field.verified ? (
                            <Ionicons name="checkmark-circle" size={12} color="#10b981" style={{ marginLeft: 4 }} />
                          ) : field.isMismatch ? (
                            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#d97706", marginLeft: 4 }} />
                          ) : null}
                        </View>
                        {field.isMismatch ? (
                          <View style={[styles.highlightChip, { backgroundColor: isDark ? "rgba(245, 158, 11, 0.2)" : "#fef3c7" }]}>
                            <Text style={[styles.fieldValue, { color: "#d97706", fontWeight: "bold" }]} numberOfLines={1}>
                              {val || "—"}
                            </Text>
                          </View>
                        ) : (
                          <Text
                            style={[
                              styles.fieldValue,
                              {
                                color: field.verified
                                  ? (isDark ? "#64748b" : "#94a3b8")
                                  : theme.colors.textPrimary,
                                paddingLeft: 15
                              }
                            ]}
                            numberOfLines={1}
                          >
                            {val || "—"}
                          </Text>
                        )}
                      </View>
                    );
                  })}
                </View>
              </View>

              {/* VS Badge */}
              <View style={[styles.vsBadge, { backgroundColor: isDark ? "#1e293b" : "#ffffff", borderColor: isDark ? "#475569" : "#cbd5e1" }]}>
                <Text style={[styles.vsBadgeText, { color: theme.colors.textPrimary }]}>VS</Text>
              </View>

              {/* Document Column */}
              <View style={[styles.vsColumn, { borderColor: "rgba(16, 185, 129, 0.2)" }]}>
                <View style={[styles.columnHeader, { backgroundColor: isDark ? "rgba(16, 185, 129, 0.15)" : "#ecfdf5" }]}>
                  <Ionicons name="document-text" size={16} color="#10b981" style={{ marginRight: 6 }} />
                  <Text style={[styles.columnHeaderTitle, { color: "#10b981" }]}>
                    {preferredLang === "gujarati" ? "દસ્તાવેજથી" : "From Document"}
                  </Text>
                </View>
                <View style={styles.columnBody}>
                  {fields.map((field: any) => {
                    const val = field.documentValue;
                    return (
                      <View key={field.key} style={styles.fieldRow}>
                        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 2 }}>
                          <Ionicons name={getFieldIcon(field.key)} size={11} color={theme.colors.textSecondary} style={{ marginRight: 4 }} />
                          <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary, marginBottom: 0 }]} numberOfLines={1}>
                            {field.label}
                          </Text>
                          {field.verified ? (
                            <Ionicons name="checkmark-circle" size={12} color="#10b981" style={{ marginLeft: 4 }} />
                          ) : field.isMismatch ? (
                            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#d97706", marginLeft: 4 }} />
                          ) : null}
                        </View>
                        {field.isMismatch ? (
                          <View style={[styles.highlightChip, { backgroundColor: isDark ? "rgba(245, 158, 11, 0.2)" : "#fef3c7" }]}>
                            <Text style={[styles.fieldValue, { color: "#d97706", fontWeight: "bold" }]} numberOfLines={1}>
                              {val || "—"}
                            </Text>
                          </View>
                        ) : (
                          <Text
                            style={[
                              styles.fieldValue,
                              {
                                color: field.verified
                                  ? (isDark ? "#64748b" : "#94a3b8")
                                  : theme.colors.textPrimary,
                                paddingLeft: 15
                              }
                            ]}
                            numberOfLines={1}
                          >
                            {val || "—"}
                          </Text>
                        )}
                      </View>
                    );
                  })}
                </View>
              </View>
            </View>
          )}

          {/* Explainer box */}
          {mode === "CONFLICT" && (
            <View style={[styles.explainerBox, { backgroundColor: isDark ? "#1e293b" : "#f8fafc" }]}>
              <Ionicons name="information-circle-outline" size={18} color={theme.colors.textSecondary} style={{ marginRight: 8, marginTop: 2 }} />
              <Text style={[styles.explainerText, { color: theme.colors.textSecondary }]}>
                {activeMsg.explainer || (preferredLang === "gujarati"
                  ? "વિગતો દસ્તાવેજો અને સામાજિક પ્રોફાઇલમાં ક્યારેક અલગ હોઈ શકે છે."
                  : "Name details can sometimes be written differently in documents vs social profiles.")}
              </Text>
            </View>
          )}

          {/* Large Action Buttons Side-by-Side */}
          {mode === "CONFIRM" ? (
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 12 }}>
              <TouchableOpacity
                style={[styles.bigActionButtonSide, { backgroundColor: "#10b981", flex: 1, marginRight: 6, justifyContent: "center", paddingVertical: 12 }]}
                onPress={() => sendMessage(JSON.stringify({ confirmed: true }), state, "Confirm Details")}
              >
                <Text style={[styles.bigActionButtonTextSide, { color: "#ffffff", textAlign: "center" }]} numberOfLines={1}>
                  {preferredLang === "gujarati" ? "પુષ્ટિ કરો અને ચાલુ રાખો" : "Confirm & Continue"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.bigActionButtonSide,
                  { backgroundColor: isDark ? "#334155" : "#e2e8f0", flex: 1, marginLeft: 6, justifyContent: "center", paddingVertical: 12 },
                ]}
                onPress={() => {
                  const initData: any = {};
                  fields.forEach((f: any) => {
                    initData[f.key] = f.value || "";
                  });
                  setEditedProfileData(initData);
                  setIsEditingProfileManually(true);
                }}
              >
                <Text style={[styles.bigActionButtonTextSide, { color: theme.colors.textPrimary, textAlign: "center" }]} numberOfLines={1}>
                  {preferredLang === "gujarati" ? "વિગતો સુધારો" : "Edit Details"}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 12 }}>
              <TouchableOpacity
                style={[styles.bigActionButtonSide, { backgroundColor: "#3b82f6", flex: 1, marginRight: 6 }]}
                onPress={() => sendMessage(JSON.stringify({ source: "LOGIN" }), state, "Use Social Login")}
              >
                <View style={{ alignItems: "center" }}>
                  <Text style={styles.bigActionButtonTextSide} numberOfLines={1}>
                    {preferredLang === "gujarati" ? "સોશિયલ લોગિન વાપરો" : "Use Social Login"}
                  </Text>
                  {loginSummary ? (
                    <Text style={styles.bigActionButtonSubtitleSide} numberOfLines={1}>
                      {loginSummary}
                    </Text>
                  ) : null}
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.bigActionButtonSide, { backgroundColor: "#10b981", flex: 1, marginLeft: 6 }]}
                onPress={() => sendMessage(JSON.stringify({ source: "DOCUMENT" }), state, "Use Document")}
              >
                <View style={{ alignItems: "center" }}>
                  <Text style={styles.bigActionButtonTextSide} numberOfLines={1}>
                    {preferredLang === "gujarati" ? "દસ્તાવેજ વાપરો" : "Use Document"}
                  </Text>
                  {documentSummary ? (
                    <Text style={styles.bigActionButtonSubtitleSide} numberOfLines={1}>
                      {documentSummary}
                    </Text>
                  ) : null}
                </View>
              </TouchableOpacity>
            </View>
          )}

          {/* Center Manual Edit Link */}
          {mode === "CONFLICT" && (
            <TouchableOpacity
              style={styles.manualEditLink}
              onPress={() => {
                const initData: any = {};
                fields.forEach((f: any) => {
                  initData[f.key] = f.loginValue || f.documentValue || "";
                });
                setEditedProfileData(initData);
                setIsEditingProfileManually(true);
              }}
            >
              <Text style={[styles.manualEditLinkLabel, { color: theme.colors.primary }]}>
                {preferredLang === "gujarati" ? "તેના બદલે વિગતો જાતે સુધારો" : "Edit manually instead"}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }

    if (activeMsg.action === "ASK_LANGUAGE") {
      return (
        <View style={styles.chipRow}>
          {(activeMsg.options || []).map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.chip, { backgroundColor: theme.colors.primary }]}
              onPress={() => {
                const newState = { ...state, preferredLanguage: opt.value };
                setState(newState);
                sendMessage(opt.value, newState, opt.label);
              }}
            >
              <Text style={styles.chipText}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      );
    }

    if (activeMsg.action === "ASK_UPLOAD_OR_SKIP") {
      const uploadOpt =
        (activeMsg.options || []).find((o) => o.value === "UPLOAD") || {};
      const manualOpt =
        (activeMsg.options || []).find((o) => o.value === "MANUAL") || {};

      const uploadLabel =
        preferredLang === "gujarati"
          ? uploadOpt.label_gu || uploadOpt.label || "મેડિકલ રિપોર્ટ અપલોડ કરો"
          : uploadOpt.label_en || uploadOpt.label || "Upload Medical Report";
      const manualLabel =
        preferredLang === "gujarati"
          ? manualOpt.label_gu || manualOpt.label || "છોડો અને મેન્યુઅલી દાખલ કરો"
          : manualOpt.label_en || manualOpt.label || "Skip and Enter Manually";

      return (
        <View style={styles.optionContainer}>
          <TouchableOpacity
            style={[
              styles.optionCard,
              { backgroundColor: theme.colors.primary + "15" },
            ]}
            onPress={handleDocumentUpload}
          >
            <View
              style={[
                styles.iconCircle,
                { backgroundColor: theme.colors.primary },
              ]}
            >
              <Ionicons name="cloud-upload" size={24} color="#fff" />
            </View>
            <Text
              style={[styles.optionTitle, { color: theme.colors.textPrimary }]}
            >
              {uploadLabel}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.optionCard,
              { backgroundColor: "rgba(100, 116, 139, 0.1)" },
            ]}
            onPress={() => {
              const newState = { ...state, flowMode: "MANUAL" };
              setState(newState);
              sendMessage("MANUAL", newState, manualLabel);
            }}
          >
            <View style={[styles.iconCircle, { backgroundColor: "#64748b" }]}>
              <Ionicons name="create" size={24} color="#fff" />
            </View>
            <Text
              style={[styles.optionTitle, { color: theme.colors.textPrimary }]}
            >
              {manualLabel}
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (activeMsg.action === "ASK_GENDER") {
      return (
        <View style={styles.chipRow}>
          {(activeMsg.options || []).map((opt) => {
            const label =
              preferredLang === "gujarati" ? opt.label_gu || opt.label : opt.label_en || opt.label;
            return (
              <TouchableOpacity
                key={opt.value}
                style={[styles.chip, { backgroundColor: theme.colors.primary }]}
                onPress={() => {
                  const updatedUserData = { ...state.existingUserData, gender: opt.value };
                  const newState = { ...state, existingUserData: updatedUserData };
                  setState(newState);
                  sendMessage(opt.value, newState, label);
                }}
              >
                <Text style={styles.chipText}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      );
    }

    if (activeMsg.action === "ASK_DOB" || activeMsg.action === "ASK_MEDICINE_START_DATE") {
      return (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[
              styles.actionButton,
              { backgroundColor: theme.colors.primary },
            ]}
            onPress={() => {
              setDatePickerMode("date");
              setDatePickerVisible(true);
            }}
          >
            <Ionicons
              name="calendar"
              size={18}
              color="#fff"
              style={{ marginRight: 8 }}
            />
            <Text style={styles.actionButtonText}>
              {preferredLang === "gujarati"
                ? "તારીખ પસંદ કરો"
                : "Choose Date"}
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (activeMsg.action === "ASK_MEDICINE_SCHEDULE") {
      return (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[
              styles.actionButton,
              { backgroundColor: theme.colors.primary },
            ]}
            onPress={() => {
              setDatePickerMode("time");
              setDatePickerVisible(true);
            }}
          >
            <Ionicons
              name="time"
              size={18}
              color="#fff"
              style={{ marginRight: 8 }}
            />
            <Text style={styles.actionButtonText}>
              {preferredLang === "gujarati"
                ? "સમય પસંદ કરો"
                : "Choose Time"}
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (activeMsg.action === "ADD_MEDICINE" || activeMedicineToEdit) {
      const med = activeMedicineToEdit || activeMsg.medicine || {};
      const isEditingLocal = !!activeMedicineToEdit;

      const handleSave = (updatedMed: any) => {
        if (isEditingLocal) {
          setLocalMedicines(prev => prev.map(m => m.client_med_id === med.client_med_id ? { ...m, ...updatedMed, subtitle: updatedMed.type === "TABLET" || updatedMed.type === "CAPSULE" ? `${updatedMed.dose.count} ${updatedMed.type.toLowerCase()}(s) · ${updatedMed.frequency.toLowerCase()}` : `${updatedMed.dose.value} ${updatedMed.dose.unit} · ${updatedMed.frequency.toLowerCase()}` } : m));
          setActiveMedicineToEdit(null);
        } else {
          setCurrentClientMedId(null);
          const displayLabel = preferredLang === "gujarati"
            ? `દવા ઉમેરો: ${updatedMed.name}`
            : `Add medicine: ${updatedMed.name}`;
          sendMessage(JSON.stringify({ medicine: updatedMed, clientMedId: currentClientMedId }), state, displayLabel);
        }
      };

      return (
        <AddMedicineCard
          key={med.client_med_id || med.id || "new"}
          med={med}
          isEditingLocal={isEditingLocal}
          preferredLang={preferredLang}
          isDark={isDark}
          theme={theme}
          currentClientMedId={currentClientMedId}
          setCurrentClientMedId={setCurrentClientMedId}
          onSave={handleSave}
          onCancel={isEditingLocal ? () => setActiveMedicineToEdit(null) : undefined}
        />
      );
    }

    if (activeMsg.action === "REVIEW_MEDICINES_LIST") {
      const handleConfirm = (checkedMeds: string[]) => {
        sendMessage(JSON.stringify({ selected: checkedMeds }), state, preferredLang === "gujarati" ? "પસંદ કરેલી દવાઓની પુષ્ટિ કરો" : "Confirm Selected");
      };
      const handleAddNew = () => {
        sendMessage(JSON.stringify({ addNew: true }), state, preferredLang === "gujarati" ? "નવી દવા ઉમેરો" : "Add New");
      };
      const handleSkipAll = () => {
        sendMessage(JSON.stringify({ skipAll: true }), state, preferredLang === "gujarati" ? "બધી દવાઓ છોડી દો" : "Skip All");
      };
      const handleEdit = (med: any) => {
        setActiveMedicineToEdit(med);
      };

      return (
        <ReviewMedicinesListCard
          localMedicines={localMedicines}
          setLocalMedicines={setLocalMedicines}
          preferredLang={preferredLang}
          isDark={isDark}
          theme={theme}
          onConfirm={handleConfirm}
          onAddNew={handleAddNew}
          onSkipAll={handleSkipAll}
          onEdit={handleEdit}
        />
      );
    }

    if (activeMsg.action === "CONFIRM_MEDICINE") {
      const handleConfirm = () => {
        sendMessage(JSON.stringify({ confirmed: true }), state, preferredLang === "gujarati" ? "હા, યોગ્ય છે" : "Yes, Correct");
      };
      const handleEdit = () => {
        sendMessage(JSON.stringify({ edit: true }), state, preferredLang === "gujarati" ? "સુધારો" : "Edit");
      };

      return (
        <ConfirmMedicineCard
          summary={activeMsg.summary || {}}
          preferredLang={preferredLang}
          isDark={isDark}
          theme={theme}
          onConfirm={handleConfirm}
          onEdit={handleEdit}
        />
      );
    }

    if (activeMsg.action === "MEDICINE_OPTIONS") {
      return (
        <MedicineOptionsPanel
          optionsList={activeMsg.options || []}
          isDark={isDark}
          theme={theme}
          onOptionPress={handleOptionPress}
        />
      );
    }

    if (activeMsg.action === "POST_ONBOARDING") {
      return (
        <View style={styles.chipRow}>
          {(activeMsg.options || []).map((opt) => {
            const label =
              preferredLang === "gujarati" ? opt.label_gu || opt.label : opt.label_en || opt.label;
            return (
              <TouchableOpacity
                key={opt.value}
                style={[styles.chip, { backgroundColor: theme.colors.primary }]}
                onPress={() => handleOptionPress(opt.value, label)}
              >
                <Text style={styles.chipText}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      );
    }

    if (activeMsg.options && activeMsg.options.length > 0) {
      return (
        <View style={styles.chipRow}>
          {activeMsg.options.map((opt) => {
            const label =
              typeof opt === "string"
                ? opt
                : preferredLang === "gujarati"
                  ? opt.label_gu || opt.label_en || opt.label || opt.value
                  : opt.label_en || opt.label || opt.value;
            const value = typeof opt === "string" ? opt : opt.value;
            return (
              <TouchableOpacity
                key={value}
                style={[styles.chip, { backgroundColor: theme.colors.primary }]}
                onPress={() => handleOptionPress(value, typeof label === "string" ? label : value)}
              >
                <Text style={styles.chipText}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      );
    }

    return null;
  };

  const activeAction = messages[messages.length - 1]?.action;

  return (
    <LinearGradient
      colors={isDark ? ["#1e1b4b", "#0f172a"] : ["#f5f3ff", "#ffffff"]}
      style={styles.container}
    >
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <View
              style={[
                styles.avatarBadge,
                { backgroundColor: theme.colors.primary },
              ]}
            >
              <Ionicons name="sparkles" size={18} color="#fff" />
            </View>
            <View>
              <Text
                style={[
                  styles.headerTitle,
                  { color: theme.colors.textPrimary },
                ]}
              >
                Health Assistant
              </Text>
              <Text
                style={[
                  styles.headerSub,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Multilingual Profile Onboarding
              </Text>
            </View>
          </View>
        </View>

        <View
          style={[styles.keyboardContainer, { paddingBottom: keyboardPadding }]}
        >
          {/* Messages List */}
          <View style={styles.listWrapper}>
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
              onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
              renderItem={({ item }) => {
                console.log("Message Item : ", item);
                const isAi = item.role === "assistant";
                const mappedMsg = {
                  id: item.id,
                  role: isAi ? ("ai" as const) : ("user" as const),
                  text: item.content,
                };
                const options = renderOptions(item);
                const isJson = item.content && item.content.trim().startsWith("{");

                return (
                  <View style={{ width: "100%" }}>
                    {!isJson && <MessageBubble message={mappedMsg} isDark={isDark} />}
                    {isAi && options !== null && (
                      <View style={styles.optionsWrapper}>{options}</View>
                    )}
                  </View>
                );
              }}
            />
          </View>

          {/* Typing Indicator */}
          {loading && <TypingIndicator isDark={isDark} />}

          {/* Document Upload Progress Overlay */}
          {uploadProgress && (
            <View style={styles.progressCard}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text
                style={[
                  styles.progressText,
                  { color: theme.colors.textPrimary },
                ]}
              >
                {uploadProgress}
              </Text>
            </View>
          )}

          {/* Selected Document Preview */}
          {selectedFile && (
            <DocumentPreview
              fileName={selectedFile.name}
              fileSize={selectedFile.size}
              uri={selectedFile.uri}
              fileType={selectedFile.fileType}
              onRemove={handleRemoveFile}
            />
          )}

          {/* Floating Input Capsule */}
          {activeAction !== "ASK_LANGUAGE" &&
            activeAction !== "ASK_UPLOAD_OR_SKIP" &&
            activeAction !== "ASK_GENDER" &&
            activeAction !== "ASK_DOB" &&
            activeAction !== "REVIEW_MEDICINES_LIST" &&
            activeAction !== "ADD_MEDICINE" &&
            activeAction !== "CONFIRM_MEDICINE" &&
            activeAction !== "MEDICINE_OPTIONS" &&
            activeAction !== "POST_ONBOARDING" && (
              <ChatInput
                value={input}
                onChangeText={setInput}
                onSend={handleSend}
                isSending={loading}
                isDark={isDark}
                keyboardType={(activeAction === "ASK_DOSE_PER_INTAKE" || activeAction === "ASK_MEDICINE_QUANTITY") ? "numeric" : "default"}
              />
            )}
        </View>

        {/* Modal Date Picker */}
        <DateTimePickerModal
          isVisible={isDatePickerVisible}
          mode={datePickerMode}
          maximumDate={datePickerMode === "date" ? new Date() : undefined}
          minimumDate={datePickerMode === "date" ? new Date("1900-01-01") : undefined}
          onConfirm={handleDateConfirm}
          onCancel={() => setDatePickerVisible(false)}
        />

        {/* Custom Upload Bottom Sheet */}
        <UploadBottomSheet
          ref={uploadSheetRef}
          onTakePhoto={handleTakePhoto}
          onChooseGallery={handleChooseGallery}
          onChooseDocument={handleChooseDocument}
        />

        {/* Custom Validation Alert Dialog */}
        <UploadValidationDialog
          visible={validationDialogVisible}
          onSelectAgain={handleSelectAgain}
          onContinueManual={handleContinueManual}
          onClose={() => setValidationDialogVisible(false)}
        />
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(100, 116, 139, 0.1)",
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "bold",
  },
  headerSub: {
    fontSize: 12,
  },
  keyboardContainer: {
    flex: 1,
  },
  listWrapper: {
    flex: 1,
  },
  listContent: {
    padding: 8,
    paddingBottom: 16,
  },
  optionsWrapper: {
    paddingLeft: 48,
    paddingRight: 16,
    marginBottom: 8,
    marginTop: 2,
  },
  optionContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
    width: "100%",
  },
  optionCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: "rgba(100, 116, 139, 0.15)",
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  optionTitle: {
    fontSize: 13,
    fontWeight: "bold",
    marginBottom: 4,
    textAlign: "center",
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 4,
    width: "100%",
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  chipText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  actionRow: {
    marginTop: 4,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  progressCard: {
    position: "absolute",
    top: "35%",
    left: "10%",
    right: "10%",
    padding: 24,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  progressText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: "bold",
  },
  summaryContainer: {
    padding: 12,
    backgroundColor: "rgba(100, 116, 139, 0.05)",
    borderRadius: 12,
    marginTop: 8,
  },
  summaryTitle: {
    fontWeight: "bold",
    marginBottom: 8,
  },
  medCard: {
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  resolveCardContainer: {
    width: "100%",
    padding: 12,
    borderRadius: 20,
    backgroundColor: "transparent",
    marginTop: 8,
  },
  resolveCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  shieldIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  resolveCardTitle: {
    fontSize: 15,
    fontWeight: "bold",
  },
  resolveCardSubtitle: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  vsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "stretch",
    position: "relative",
    marginBottom: 16,
  },
  vsColumn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 16,
    overflow: "hidden",
    marginHorizontal: 4,
  },
  columnHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  columnHeaderTitle: {
    fontSize: 11,
    fontWeight: "bold",
  },
  columnBody: {
    padding: 8,
  },
  fieldRow: {
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: "600",
    marginBottom: 2,
  },
  fieldValue: {
    fontSize: 12,
  },
  highlightChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  vsBadge: {
    position: "absolute",
    top: "40%",
    left: "50%",
    marginLeft: -16,
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  vsBadgeText: {
    fontSize: 10,
    fontWeight: "bold",
  },
  explainerBox: {
    flexDirection: "row",
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  explainerText: {
    fontSize: 11,
    flex: 1,
    lineHeight: 16,
  },
  bigActionButton: {
    width: "100%",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  bigActionButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  bigActionButtonSubtitle: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 11,
    marginTop: 2,
  },
  manualEditLink: {
    width: "100%",
    paddingVertical: 8,
    alignItems: "center",
  },
  manualEditLinkLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  editFormContainer: {
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 6,
  },
  textInput: {
    height: 44,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  resolveActionButtonsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  resolveActionButton: {
    height: 44,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  resolveActionButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  bigActionButtonSide: {
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  bigActionButtonTextSide: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "bold",
  },
  bigActionButtonSubtitleSide: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 10,
    marginTop: 2,
    textAlign: "center",
  },
  medEditCard: {
    width: "100%",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 8,
  },
  medCardTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 12,
  },
  medCardSubtitleText: {
    fontSize: 12,
    marginBottom: 12,
  },
  stepperContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  stepperButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  stepperValue: {
    fontSize: 16,
    fontWeight: "bold",
    marginHorizontal: 16,
  },
  toggleButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  unitContainer: {
    flexDirection: "row",
  },
  unitChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 6,
  },
  unitChipText: {
    fontSize: 12,
    fontWeight: "bold",
  },
  typeChip: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 6,
    marginBottom: 6,
  },
  typeChipText: {
    fontSize: 10,
    fontWeight: "bold",
  },
  freqChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 8,
  },
  freqChipText: {
    fontSize: 12,
    fontWeight: "bold",
  },
  medListCard: {
    width: "100%",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 8,
  },
  medListItemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  medListItemName: {
    fontSize: 14,
    fontWeight: "600",
  },
  medListItemSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  pencilIconButton: {
    padding: 6,
  },
  skipListButton: {
    width: "100%",
    paddingVertical: 10,
    alignItems: "center",
    marginTop: 8,
  },
  skipListText: {
    fontSize: 12,
    fontWeight: "600",
  },
  medConfirmCard: {
    width: "100%",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 8,
  },
  confirmSummaryBox: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginVertical: 8,
  },
  confirmSummaryTitle: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 8,
  },
  summaryLineRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  summaryLineText: {
    fontSize: 12,
    flex: 1,
    lineHeight: 16,
  },
  optionsPanel: {
    width: "100%",
    marginTop: 8,
  },
  optionsPanelButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    marginBottom: 8,
  },
  optionsPanelText: {
    fontSize: 14,
    fontWeight: "bold",
  },
});
