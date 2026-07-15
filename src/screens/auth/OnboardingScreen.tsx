import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import React, { useEffect, useRef, useState } from "react";
import {
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
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import Toast from "react-native-toast-message";

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
import ConfirmationModal from "../../components/shared/ConfirmationModal";

import { AddMedicineCard } from "../../components/chat/widgets/AddMedicineCard";
import { ReviewMedicinesListCard } from "../../components/chat/widgets/ReviewMedicinesListCard";
import { ConfirmMedicineCard } from "../../components/chat/widgets/ConfirmMedicineCard";
import { MedicineOptionsPanel } from "../../components/chat/widgets/MedicineOptionsPanel";
import { ResolveProfileSourceCard } from "../../components/chat/widgets/ResolveProfileSourceCard";
import { AskUploadOrSkipCard } from "../../components/chat/widgets/AskUploadOrSkipCard";
import { findHistoricalUserReply } from "../../components/chat/widgets/HistoricalChips";
import { LinearGradient } from "expo-linear-gradient";

type Message = {
  id: string;
  role: "assistant" | "user";
  content: string;
  rawValue?: string;
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
  medicines?: any[];
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
  phoneNumber?: string;
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
    edit: "Edit",
    "dosePreview.tablet": "{count} tablet(s) per intake",
    "dosePreview.capsule": "{count} capsule(s) per intake",
    "dosePreview.puff": "{count} puff(s) per intake",
    "dosePreview.other": "{count} {unit} per intake",
    "medicineType.TABLET": "Tablet",
    "medicineType.CAPSULE": "Capsule",
    "medicineType.SYRUP": "Syrup",
    "medicineType.INJECTION": "Injection",
    "medicineType.DROPS": "Drops",
    "medicineType.SPRAY": "Spray",
    "medicineType.INHALER": "Inhaler",
    "placeholder.paracetamol": "e.g. Paracetamol",
    "placeholder.qty": "e.g. 30",
    "placeholder.notes": "Additional notes...",
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
    edit: "સુધારો",
    "dosePreview.tablet": "{count} ગોળી પ્રત્યેક ડોઝ દીઠ",
    "dosePreview.capsule": "{count} કેપ્સ્યુલ પ્રત્યેક ડોઝ દીઠ",
    "dosePreview.puff": "{count} પફ પ્રત્યેક ડોઝ દીઠ",
    "dosePreview.other": "{count} {unit} પ્રત્યેક ડોઝ દીઠ",
    "medicineType.TABLET": "ટેબ્લેટ (ગોળી)",
    "medicineType.CAPSULE": "કેપ્સ્યુલ",
    "medicineType.SYRUP": "સિરાપ (પ્રવાહી)",
    "medicineType.INJECTION": "ઇન્જેક્શન",
    "medicineType.DROPS": "ટીપાં (ડ્રોપ્સ)",
    "medicineType.SPRAY": "સ્પ્રે",
    "medicineType.INHALER": "ઇનહેલર",
    "placeholder.paracetamol": "દા.ત. પેરાસીટામોલ",
    "placeholder.qty": "દા.ત. ૩૦",
    "placeholder.notes": "વધારાની નોંધો...",
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
    edit: "संपादित करें",
    "dosePreview.tablet": "{count} टैबलेट प्रति खुराक",
    "dosePreview.capsule": "{count} कैप्सूल प्रति खुराक",
    "dosePreview.puff": "{count} पफ प्रति खुराक",
    "dosePreview.other": "{count} {unit} प्रति खुराक",
    "medicineType.TABLET": "टैबलेट",
    "medicineType.CAPSULE": "कैप्सूल",
    "medicineType.SYRUP": "सिरप",
    "medicineType.INJECTION": "इंजेक्शन",
    "medicineType.DROPS": "ड्रॉप्स",
    "medicineType.SPRAY": "स्प्रे",
    "medicineType.INHALER": "इनहेलर",
    "placeholder.paracetamol": "उदा. पैरासिटामोल",
    "placeholder.qty": "उदा. ३०",
    "placeholder.notes": "अतिरिक्त टिप्पणियाँ...",
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
    edit: "संपादित करा",
    "dosePreview.tablet": "{count} गोळी प्रत्येक डोससाठी",
    "dosePreview.capsule": "{count} कॅप्सूल प्रत्येक डोससाठी",
    "dosePreview.puff": "{count} पफ प्रत्येक डोससाठी",
    "dosePreview.other": "{count} {unit} प्रत्येक डोससाठी",
    "medicineType.TABLET": "टॅबलेट",
    "medicineType.CAPSULE": "कॅप्सूल",
    "medicineType.SYRUP": "सिरप",
    "medicineType.INJECTION": "इंजेक्शन",
    "medicineType.DROPS": "ड्रॉप्स",
    "medicineType.SPRAY": "स्प्रे",
    "medicineType.INHALER": "इन्हेलर",
    "placeholder.paracetamol": "उदा. पॅरासिटामॉल",
    "placeholder.qty": "उदा. ३०",
    "placeholder.notes": "अतिरिक्त नोंदी...",
  },
  tamil: {
    morning: "காலை (08:00)",
    noon: "மதியம் (14:00)",
    night: "இரவு (20:00)",
    custom: "தனிப்பயன்",
    counter:
      "தேர்வு செய்க {required} முறைகள் · {selected} இல் {required} தேர்ந்தெடுக்கப்பட்டது",
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
    "dosePreview.tablet": "ஒவ்வொரு வேளைக்கும் {count} மாத்திரை",
    "dosePreview.capsule": "ஒவ்வொரு வேளைக்கும் {count} கேப்சூல்",
    "dosePreview.puff": "ஒவ்வொரு வேளைக்கும் {count} பஃப்",
    "dosePreview.other": "ஒவ்வொரு வேளைக்கும் {count} {unit}",
    "medicineType.TABLET": "மாத்திரை",
    "medicineType.CAPSULE": "கேப்சூல்",
    "medicineType.SYRUP": "சிரப்",
    "medicineType.INJECTION": "ஊசி",
    "medicineType.DROPS": "சொட்டு மருந்து",
    "medicineType.SPRAY": "ஸ்ப்ரே",
    "medicineType.INHALER": "இன்ஹேலர்",
    "placeholder.paracetamol": "உதாரணமாக. பாராசிட்டமால்",
    "placeholder.qty": "உதாரணமாக. 30",
    "placeholder.notes": "கூடுதல் குறிப்புகள்...",
  },
};

const I18N_ONBOARDING_UI: Record<string, Record<string, string>> = {
  english: {
    extractedMedicationsList: "Extracted Medications List",
    pleaseCheckWhichMedicines:
      "Please check which medicines to keep in your list:",
    review: "Review",
    confirmSelection: "Confirm Selection",
    addNew: "Add New",
    skipAll: "Skip All",
    verifyInformation: "Verify Information",
    editProfileDetails: "Edit Profile Details",
    selectDateOfBirth: "Select Date of Birth",
    male: "Male",
    female: "Female",
    saveDetails: "Save Details",
    cancel: "Cancel",
    confirmYourProfileDetails: "Confirm your profile details",
    weFoundTwoDifferentProfiles: "We found two different profiles",
    pleaseCheckAndConfirmAllDetails:
      "Please check and confirm all details below",
    pleaseReviewAndChooseOneYouPrefer:
      "Please review and choose the one you prefer",
    yourDetails: "Your Details",
    fromDocument: "From Document",
    confirmAndContinue: "Confirm & Continue",
    editDetails: "Edit Details",
    useSocialLogin: "Use Social Login",
    useDocument: "Use Document",
    editManuallyInstead: "Edit manually instead",
    chooseDate: "Choose Date",
    chooseTime: "Choose Time",
    fromSocialLogin: "From Social Login",
    fromGoogle: "From Google",
    fromFacebook: "From Facebook",
    fromPhone: "From Phone",
    fromEmail: "From Email",
    documentUploaded: "Document Uploaded: ",
    whyAmISeeingThis: "Why am I seeing this?",
    fromApple: "From Apple",
    fromMicrosoft: "From Microsoft",
  },
  gujarati: {
    extractedMedicationsList: "મેળવેલી દવાઓની યાદી",
    pleaseCheckWhichMedicines:
      "કૃપા કરીને તપાસો કે કઈ દવાઓ તમારી સૂચિમાં રાખવી છે:",
    review: "સમીક્ષા જરૂરી",
    confirmSelection: "આગળ વધો",
    addNew: "ઉમેરો",
    skipAll: "બધું છોડી દો",
    verifyInformation: "માહિતીની ચકાસણી",
    editProfileDetails: "પ્રોફાઇલ વિગતો સુધારો",
    selectDateOfBirth: "જન્મ તારીખ પસંદ કરો",
    male: "પુરુષ",
    female: "સ્ત્રી",
    saveDetails: "સાચવો",
    cancel: "રદ કરો",
    confirmYourProfileDetails: "પ્રોફાઇલ વિગતોની પુષ્ટિ કરો",
    weFoundTwoDifferentProfiles: "અમને બે અલગ પ્રોફાઇલ મળી છે",
    pleaseCheckAndConfirmAllDetails:
      "કૃપા કરીને નીચેની બધી વિગતો તપાસો અને પુષ્ટિ કરો",
    pleaseReviewAndChooseOneYouPrefer:
      "કૃપા કરીને સમીક્ષા કરો અને તમારી પસંદગી પસંદ કરો",
    yourDetails: "તમારી વિગતો",
    fromDocument: "દસ્તાવેજથી",
    confirmAndContinue: "પુષ્ટિ કરો અને ચાલુ રાખો",
    editDetails: "વિગતો સુધારો",
    useSocialLogin: "સોશિયલ લોગિન વાપરો",
    useDocument: "દસ્તાવેજ વાપરો",
    editManuallyInstead: "તેના બદલે વિગતો જાતે સુધારો",
    chooseDate: "તારીખ પસંદ કરો",
    chooseTime: "સમય પસંદ કરો",
    fromSocialLogin: "સોશિયલ લોગિનથી",
    fromGoogle: "Google થી",
    fromFacebook: "Facebook થી",
    fromPhone: "ફોન નંબરથી",
    fromEmail: "ઇમેઇલથી",
    documentUploaded: "દસ્તાવેજ અપલોડ થયો: ",
    whyAmISeeingThis: "હું આ કેમ જોઈ રહ્યો છું?",
    fromApple: "Apple થી",
    fromMicrosoft: "Microsoft થી",
  },
  hindi: {
    extractedMedicationsList: "निकाली गई दवाओं की सूची",
    pleaseCheckWhichMedicines:
      "कृपया जांचें कि कौन सी दवाएं अपनी सूची में रखनी हैं:",
    review: "समीक्षा आवश्यक",
    confirmSelection: "चयन की पुष्टि करें",
    addNew: "नई जोड़ें",
    skipAll: "सभी छोड़ें",
    verifyInformation: "जानकारी सत्यापित करें",
    editProfileDetails: "प्रोफ़ाइल विवरण संपादित करें",
    selectDateOfBirth: "जन्म तिथि चुनें",
    male: "पुरुष",
    female: "महिला",
    saveDetails: "विवरण सहेजें",
    cancel: "रद्द करें",
    confirmYourProfileDetails: "अपने प्रोफ़ाइल विवरण की पुष्टि करें",
    weFoundTwoDifferentProfiles: "हमें दो अलग-अलग प्रोफ़ाइल मिली हैं",
    pleaseCheckAndConfirmAllDetails:
      "कृपया नीचे दिए गए सभी विवरणों की जांच करें और पुष्टि करें",
    pleaseReviewAndChooseOneYouPrefer:
      "कृपया समीक्षा करें और अपनी पसंदीदा प्रोफ़ाइल चुनें",
    yourDetails: "आपका विवरण",
    fromDocument: "दस्तावेज़ से",
    confirmAndContinue: "पुष्टि करें और जारी रखें",
    editDetails: "विवरण संपादित करें",
    useSocialLogin: "सोशल लॉगिन का उपयोग करें",
    useDocument: "दस्तावेज़ का उपयोग करें",
    editManuallyInstead: "इसके बजाय मैन्युअल रूप से संपादित करें",
    chooseDate: "तारीख चुनें",
    chooseTime: "समय चुनें",
    fromSocialLogin: "सोशल लॉगिन से",
    fromGoogle: "Google से",
    fromFacebook: "Facebook से",
    fromPhone: "फ़ोन से",
    fromEmail: "ईमेल से",
    documentUploaded: "दस्तावेज़ अपलोड किया गया: ",
    whyAmISeeingThis: "मैं यह क्यों देख रहा हूँ?",
    fromApple: "Apple से",
    fromMicrosoft: "Microsoft से",
  },
  marathi: {
    extractedMedicationsList: "काढलेल्या औषधांची यादी",
    pleaseCheckWhichMedicines:
      "कृपया आपली औषध तपासणी करून घ्या आणि कोणती ठेवायची आहेत ते निवडा:",
    review: "पुनरावलोकन आवश्यक",
    confirmSelection: "निवडीची पुष्टी करा",
    addNew: "नवीन जोडा",
    skipAll: "सर्व वगळा",
    verifyInformation: "माहितीची पडताळणी",
    editProfileDetails: "प्रोफाइल तपशील संपादित करा",
    selectDateOfBirth: "जन्म तारीख निवडा",
    male: "पुरुष",
    female: "स्त्री",
    saveDetails: "तपशील जतन करा",
    cancel: "रद्द करा",
    confirmYourProfileDetails: "तुमच्या प्रोफाइल तपशीलाची पुष्टी करा",
    weFoundTwoDifferentProfiles: "आम्हाला दोन भिन्न प्रोफाइल सापडल्या",
    pleaseCheckAndConfirmAllDetails:
      "कृपया खालील सर्व तपशील तपासा आणि पुष्टी करा",
    pleaseReviewAndChooseOneYouPrefer:
      "कृपया पुनरावलोकन करा आणि आपल्याला हवे ते निवडा",
    yourDetails: "तुमचे तपशील",
    fromDocument: "दस्तऐवजावरून",
    confirmAndContinue: "पुष्टी करा आणि पुढे जा",
    editDetails: "तपशील सुधारा",
    useSocialLogin: "सोशल लॉगिन वापरा",
    useDocument: "दस्तऐवज वापरा",
    editManuallyInstead: "त्याऐवजी मॅन्युअली संपादन करा",
    chooseDate: "तारीख निवडा",
    chooseTime: "वेळ निवडा",
    fromSocialLogin: "सोशल लॉगिनवरून",
    fromGoogle: "Google वरून",
    fromFacebook: "Facebook वरून",
    fromPhone: "फोनवरून",
    fromEmail: "ईमेलवरून",
    documentUploaded: "दस्तऐवज अपलोड केला: ",
    whyAmISeeingThis: "मला हे का दिसत आहे?",
    fromApple: "Apple वरून",
    fromMicrosoft: "Microsoft वरून",
  },
  tamil: {
    extractedMedicationsList: "பிரித்தெடுக்கப்பட்ட மருந்துகளின் பட்டியல்",
    pleaseCheckWhichMedicines:
      "தயவுசெய்து உங்கள் பட்டியலில் வைக்க வேண்டிய மருந்துகளைச் சரிபார்க்கவும்:",
    review: "மதிப்பாய்வு தேவை",
    confirmSelection: "தேர்வை உறுதிப்படுத்துக",
    addNew: "புதியதைச் சேர்",
    skipAll: "அனைத்தையும் தவிர்",
    verifyInformation: "தகவலைச் சரிபார்க்கவும்",
    editProfileDetails: "சுயவிவர விவரங்களைத் திருத்தவும்",
    selectDateOfBirth: "பிறந்த தேதியைத் தேர்ந்தெடுக்கவும்",
    male: "ஆண்",
    female: "பெண்",
    saveDetails: "விவரங்களைச் சேமிக்கவும்",
    cancel: "ரத்துசெய்",
    confirmYourProfileDetails: "உங்கள் சுயவிவர விவரங்களை உறுதிப்படுத்தவும்",
    weFoundTwoDifferentProfiles:
      "நாங்கள் இரண்டு வெவ்வேறு சுயவிவரங்களைக் கண்டறிந்துள்ளோம்",
    pleaseCheckAndConfirmAllDetails:
      "தயவுசெய்து கீழே உள்ள அனைத்து விவரங்களையும் சரிபார்த்து உறுதிப்படுத்தவும்",
    pleaseReviewAndChooseOneYouPrefer:
      "தயவுசெய்து மதிப்பாய்வு செய்து நீங்கள் விரும்பும் ஒன்றை தேர்ந்தெடுக்கவும்",
    yourDetails: "உங்கள் விவரங்கள்",
    fromDocument: "ஆவணத்திலிருந்து",
    confirmAndContinue: "உறுதிப்படுத்தித் தொடரவும்",
    editDetails: "விவரங்களைத் திருத்தவும்",
    useSocialLogin: "சமூக உள்நுழைவைப் பயன்படுத்தவும்",
    useDocument: "ஆவணத்தைப் பயன்படுத்தவும்",
    editManuallyInstead: "அதற்கு பதிலாக கைமுறையாக திருத்தவும்",
    chooseDate: "தேதியைத் தேர்ந்தெடு",
    chooseTime: "நேரத்தைத் தேர்ந்தெடு",
    fromSocialLogin: "சமூக உள்நுழைவிலிருந்து",
    fromGoogle: "Google இலிருந்து",
    fromFacebook: "Facebook இலிருந்து",
    fromPhone: "தொலைபேசியிலிருந்து",
    fromEmail: "மின்னஞ்சலிலிருந்து",
    documentUploaded: "ஆவணம் பதிவேற்றப்பட்டது: ",
    whyAmISeeingThis: "இதை நான் ஏன் பார்க்கிறேன்?",
    fromApple: "Apple இலிருந்து",
    fromMicrosoft: "Microsoft இலிருந்து",
  },
};

const ONBOARDING_I18N: Record<string, Record<string, string>> = {
  english: {
    validating: "Verifying file details...",
    uploading: "Uploading report...",
    queued: "Queued for processing...",
    processing: "Analyzing report details...",
    cancelling: "Cancelling upload...",
    upload_cancelled: "Upload cancelled",
    retry_count: "Retrying ({attempt}/{max})...",
    page_progress: "Page {current} of {total}",
    eta_hint: "Estimated time: ~45 seconds per page",
    btn_try_again: "Try Again",
    btn_choose_different: "Choose a different file",
    btn_cancel: "Cancel",
    err_network_timeout:
      "Connection timed out. The server took too long to respond.",
    err_server_busy: "Server is busy. Please try again in a moment.",
    err_ocr_failed:
      "Document analysis failed. Please verify it is a valid medical record.",
    err_unsupported_file:
      "Unsupported file type. Please upload a PDF or image (PNG, JPG, WEBP).",
    err_file_too_large: "File is too large. Limit is 50MB.",
    err_server_unreachable:
      "AI server is unreachable. Please check your connection and try again.",
    err_upload_failed:
      "File upload failed. Please check your network connection.",
    err_unexpected_error:
      "An unexpected error occurred during processing. Please try again.",
  },
  gujarati: {
    validating: "દસ્તાવેજની વિગતો ચકાસાઈ રહી છે...",
    uploading: "મેડિકલ રિપોર્ટ અપલોડ થઈ રહ્યો છે...",
    queued: "પ્રક્રિયા માટે કતારમાં...",
    processing: "રિપોર્ટ વિગતોનું વિશ્લેષણ કરવામાં આવી રહ્યું છે...",
    cancelling: "અપલોડ રદ કરી રહ્યાં છીએ...",
    upload_cancelled: "અપલોડ રદ કરવામાં આવ્યું",
    retry_count: "ફરી પ્રયાસ કરી રહ્યા છીએ ({attempt}/{max})...",
    page_progress: "પૃષ્ઠ {total} માંથી {current}",
    eta_hint: "અંદાજિત સમય: પૃષ્ઠ દીઠ ~45 સેકન્ડ",
    btn_try_again: "ફરી પ્રયાસ કરો",
    btn_choose_different: "બીજી ફાઈલ પસંદ કરો",
    btn_cancel: "રદ કરો",
    err_network_timeout:
      "જોડાણ સમયસીમા સમાપ્ત થઈ ગઈ. સર્વરે પ્રતિસાદ આપવામાં ઘણો સમય લીધો.",
    err_server_busy: "સર્વર વ્યસ્ત છે. કૃપા કરીને થોડીવાર પછી ફરી પ્રયાસ કરો.",
    err_ocr_failed:
      "દસ્તાવેજ વિશ્લેષણ નિષ્ફળ ગયું. કૃપા કરીને ચકાસો કે તે માન્ય મેડિકલ રેકોર્ડ છે.",
    err_unsupported_file:
      "અસમર્થિત ફાઇલ પ્રકાર. કૃપા કરીને પીડીએફ અથવા છબી (PNG, JPG, WEBP) અપલોડ કરો.",
    err_file_too_large: "ફાઇલ ખૂબ મોટી છે. મર્યાદા 50MB છે.",
    err_server_unreachable:
      "AI સર્વર અગમ્ય છે. કૃપા કરીને તમારું કનેક્શન તપાસો અને ફરી પ્રયાસ કરો.",
    err_upload_failed:
      "ફાઇલ અપલોડ નિષ્ફળ ગઈ. કૃપા કરીને તમારું નેટવર્ક કનેક્શન તપાસો.",
    err_unexpected_error:
      "પ્રક્રિયા દરમિયાન એક અનપેક્ષિત ભૂલ આવી. કૃપા કરીને ફરી પ્રયાસ કરો.",
  },
  hindi: {
    validating: "दस्तावेज़ विवरण सत्यापित किया जा रहा है...",
    uploading: "रिपोर्ट अपलोड की जा रही है...",
    queued: "प्रसंस्करण के लिए कतारबद्ध...",
    processing: "रिपोर्ट विवरण का विश्लेषण किया जा रहा है...",
    cancelling: "अपलोड रद्द किया जा रहा है...",
    upload_cancelled: "अपलोड रद्द कर दिया गया",
    retry_count: "पुनः प्रयास कर रहे हैं ({attempt}/{max})...",
    page_progress: "पृष्ठ {total} में से {current}",
    eta_hint: "अनुमानित समय: लगभग 45 सेकंड प्रति पृष्ठ",
    btn_try_again: "पुनः प्रयास करें",
    btn_choose_different: "दूसरी फ़ाइल चुनें",
    btn_cancel: "रद्द करें",
    err_network_timeout:
      "कनेक्शन का समय समाप्त हो गया। सर्वर ने प्रतिक्रिया देने में बहुत लंबा समय लिया।",
    err_server_busy: "सर्वर व्यस्त है। कृपया कुछ क्षणों में पुनः प्रयास करें।",
    err_ocr_failed:
      "दस्तावेज़ विश्लेषण विफल रहा। कृपया सत्यापित करें कि यह एक वैध मेडिकल रिकॉर्ड है।",
    err_unsupported_file:
      "असमर्थित फ़ाइल प्रकार। कृपया पीडीएफ या छवि (PNG, JPG, WEBP) अपलोड करें।",
    err_file_too_large: "फ़ाइल बहुत बड़ी है। सीमा 50MB है।",
    err_server_unreachable:
      "एआई सर्वर अनुपलब्ध है। कृपया अपना कनेक्शन जांचें और पुनः प्रयास करें।",
    err_upload_failed:
      "फ़ाइल अपलोड विफल रही। कृपया अपना नेटवर्क कनेक्शन जांचें।",
    err_unexpected_error:
      "प्रसंस्करण के दौरान एक अप्रत्याशित त्रुटि हुई। कृपया पुनः प्रयास करें।",
  },
  marathi: {
    validating: "दस्तऐवज तपशील तपासत आहे...",
    uploading: "अहवाल अपलोड होत आहे...",
    queued: "प्रक्रियेसाठी रांगेत...",
    processing: "अहवाल तपशीलांचे विश्लेषण करत आहे...",
    cancelling: "अपलोड रद्द करत आहे...",
    upload_cancelled: "अपलोड रद्द केले",
    retry_count: "पुन्हा प्रयत्न करत आहे ({attempt}/{max})...",
    page_progress: "पान {total} पैकी {current}",
    eta_hint: "अंदाजे वेळ: प्रति पृष्ठ ~४५ सेकंद",
    btn_try_again: "पुन्हा प्रयत्न करा",
    btn_choose_different: "वेगळी फाईल निवडा",
    btn_cancel: "रद्द करा",
    err_network_timeout:
      "कनेक्शनची वेळ संपली. सर्व्हरने प्रतिसाद देण्यास खूप वेळ घेतला.",
    err_server_busy: "सर्व्हर व्यस्त आहे. कृपया काही वेळात पुन्हा प्रयत्न करा.",
    err_ocr_failed:
      "दस्तऐवज विश्लेषण अयशस्वी झाले. कृपया ते वैध वैद्यकीय रेकॉर्ड असल्याची खात्री करा.",
    err_unsupported_file:
      "असमर्थित फाईल प्रकार. कृपया पीडीएफ किंवा प्रतिमा (PNG, JPG, WEBP) अपलोड करा.",
    err_file_too_large: "फाईल खूप मोठी आहे. मर्यादा 50MB आहे.",
    err_server_unreachable:
      "AI सर्व्हर अनुपलब्ध आहे. कृपया आपले कनेक्शन तपासा आणि पुन्हा प्रयत्न करा.",
    err_upload_failed:
      "फाईल अपलोड अयशस्वी झाली. कृपया आपले नेटवर्क कनेक्शन तपासा.",
    err_unexpected_error:
      "प्रक्रियेदरम्यान अनपेक्षित त्रुटी आली. कृपया पुन्हा प्रयत्न करा.",
  },
  tamil: {
    validating: "ஆவண விவரங்கள் சரிபார்க்கப்படுகின்றன...",
    uploading: "அறிக்கை பதிவேற்றப்படுகிறது...",
    queued: "செயலாக்கத்திற்காக வரிசைப்படுத்தப்பட்டுள்ளது...",
    processing: "அறிக்கை விவரங்கள் பகுப்பாய்வு செய்யப்படுகின்றன...",
    cancelling: "பதிவேற்றம் ரத்து செய்யப்படுகிறது...",
    upload_cancelled: "பதிவேற்றம் ரத்து செய்யப்பட்டது",
    retry_count: "மீண்டும் முயற்சிக்கிறது ({attempt}/{max})...",
    page_progress: "பக்கம் {total}-ல் {current}",
    eta_hint: "மதிப்பிடப்பட்ட நேரம்: ஒரு பக்கத்திற்கு ~45 வினாடிகள்",
    btn_try_again: "மீண்டும் முயற்சி செய்",
    btn_choose_different: "வேறு கோப்பைத் தேர்ந்தெடுக்கவும்",
    btn_cancel: "ரத்து செய்",
    err_network_timeout:
      "இணைப்பு காலாவதியானது. பதிலளிக்க சேவையகம் அதிக நேரம் எடுத்துக்கொண்டது.",
    err_server_busy:
      "சேவையகம் பிஸியாக உள்ளது. சற்று நேரத்தில் மீண்டும் முயற்சிக்கவும்.",
    err_ocr_failed:
      "ஆவண பகுப்பாய்வு தோல்வியடைந்தது. இது ஒரு செல்லுபடியாகும் மருத்துவ அறிக்கை என்பதை உறுதிப்படுத்தவும்.",
    err_unsupported_file:
      "ஆதரிக்கப்படாத கோப்பு வகை. பிடிஎஃப் அல்லது படம் (PNG, JPG, WEBP) பதிவேற்றவும்.",
    err_file_too_large: "கோப்பு மிகப்பெரியது. வரம்பு 50MB ஆகும்.",
    err_server_unreachable:
      "AI சேவையகத்தை இணைக்க முடியவில்லை. உங்கள் இணைப்பைச் சரிபார்த்து மீண்டும் முயற்சிக்கவும்.",
    err_upload_failed:
      "கோப்பு பதிவேற்றம் தோல்வியடைந்தது. உங்கள் இணைய இணைப்பைச் சரிபார்க்கவும்.",
    err_unexpected_error:
      "செயலாக்கத்தின் போது எதிர்பாராத பிழை ஏற்பட்டது. மீண்டும் முயற்சிக்கவும்.",
  },
};

export default function OnboardingScreen() {
  const { theme, isDark } = useAppTheme();
  const queryClient = useQueryClient();
  const navigation = useNavigation<any>();
  const { logout } = useAuth();
  const isUploadingRef = useRef(false);
  const isUploadCancelledRef = useRef(false);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isDatePickerVisible, setDatePickerVisible] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<"date" | "time">("date");
  const [isEditingProfileManually, setIsEditingProfileManually] =
    useState(false);
  const [editedProfileData, setEditedProfileData] = useState<any>({});
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [keyboardPadding, setKeyboardPadding] = useState(0);

  // State Machine states for OCR Redesign
  const [uploadState, setUploadState] = useState<
    | "idle"
    | "validating"
    | "uploading"
    | "queued"
    | "processing"
    | "success"
    | "failed"
    | "timed_out"
    | "cancelled"
  >("idle");
  const [uploadPercent, setUploadPercent] = useState<number>(0);
  const [pollElapsedTime, setPollElapsedTime] = useState<number>(0);
  const [pollTotalPages, setPollTotalPages] = useState<number>(1);
  const [pollCurrentPage, setPollCurrentPage] = useState<number>(1);
  const [autoRetryCount, setAutoRetryCount] = useState<number>(0);
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [activeErrorCode, setActiveErrorCode] = useState<string | null>(null);
  const [activeErrorDetails, setActiveErrorDetails] = useState<string | null>(
    null,
  );
  const [idempotencyKey, setIdempotencyKey] = useState<string | null>(null);
  const [versionToken, setVersionToken] = useState<string | null>(null);

  // Safe reference mapping to avoid stale hook variables inside async polling loops
  const isOfflineRef = useRef(false);
  const selectedFileRef = useRef<any>(null);
  const uploadStateRef = useRef<string>("idle");
  const pollActiveRef = useRef<boolean>(false);
  const cancelRequestedRef = useRef<boolean>(false);

  useEffect(() => {
    isOfflineRef.current = isOffline;
  }, [isOffline]);

  useEffect(() => {
    selectedFileRef.current = selectedFile;
  }, []);

  useEffect(() => {
    uploadStateRef.current = uploadState;
  }, [uploadState]);

  // Document upload state
  const [selectedFile, setSelectedFile] = useState<{
    uri: string;
    name: string;
    type: string;
    size?: number;
    fileType: "pdf" | "image";
  } | null>(null);
  const [validationDialogVisible, setValidationDialogVisible] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

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
      phoneNumber: "",
    } as UserData,
  });

  const uiT = (key: string) => {
    const lang = state.preferredLanguage || "english";
    const dict = I18N_ONBOARDING_UI[lang] || I18N_ONBOARDING_UI.english;
    return dict[key] || I18N_ONBOARDING_UI.english[key] || key;
  };

  // Local medicines state for UI checkbox tracking and local edits
  const [localMedicines, setLocalMedicines] = useState<any[]>([]);
  const [activeMedicineToEdit, setActiveMedicineToEdit] = useState<any>(null);
  const [currentClientMedId, setCurrentClientMedId] = useState<string | null>(
    null,
  );

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

  // Network detection check
  useEffect(() => {
    let active = true;
    const checkConnection = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);
        await fetch("https://clients3.google.com/generate_204", {
          method: "HEAD",
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (active) setIsOffline(false);
      } catch {
        if (active) setIsOffline(true);
      }
    };

    const interval = setInterval(checkConnection, 5000);
    checkConnection();

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  // Startup crash recovery / polling resume hook
  useEffect(() => {
    const resumePendingJob = async () => {
      try {
        const pendingDocId = await AsyncStorage.getItem(
          "onboarding_pending_document_id",
        );
        if (
          pendingDocId &&
          pendingDocId !== "null" &&
          pendingDocId !== "undefined" &&
          pendingDocId.trim() !== ""
        ) {
          const uuidRegex =
            /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
          if (!uuidRegex.test(pendingDocId)) {
            console.log(
              "[ONBOARDING] Invalid document ID format in storage, clearing:",
              pendingDocId,
            );
            await AsyncStorage.removeItem("onboarding_pending_document_id");
            return;
          }
          console.log(
            "[ONBOARDING] Resuming pending document ID on startup:",
            pendingDocId,
          );
          try {
            // Query the latest status
            const statusRes = await apiClient.get(
              `/v1/ocr/status/${pendingDocId}`,
            );
            const resData = statusRes.data?.data;

            if (resData) {
              if (resData.status === "done") {
                await AsyncStorage.removeItem("onboarding_pending_document_id");
                setUploadState("success");
                await handleSuccessfulOcr(
                  resData,
                  resData.document?.fileName || "report.pdf",
                );
              } else if (resData.status === "failed") {
                await AsyncStorage.removeItem("onboarding_pending_document_id");
                setUploadState("failed");
                setActiveErrorCode(resData.errorCode || "OCR_FAILED");
                setActiveErrorDetails(resData.errorMessage || null);
              } else if (resData.status === "cancelled") {
                await AsyncStorage.removeItem("onboarding_pending_document_id");
                setUploadState("idle");
              } else {
                // It is processing or queued
                const createdTime = resData.createdAt
                  ? new Date(resData.createdAt).getTime()
                  : Date.now();
                const initialElapsed = Math.max(0, Date.now() - createdTime);
                setPollElapsedTime(initialElapsed);
                setPollCurrentPage(resData.currentPage || 1);
                setPollTotalPages(resData.totalPages || 1);
                setUploadState(resData.status);
              }
            }
          } catch (err: any) {
            console.warn(
              "[ONBOARDING] Failed to query pending document status on server:",
              err.message,
            );
            if (err?.response?.status === 404) {
              console.log(
                "[ONBOARDING] Document not found on server (404), clearing storage ID:",
                pendingDocId,
              );
              await AsyncStorage.removeItem("onboarding_pending_document_id");
            }
          }
        } else {
          // If stored ID is "null" or empty, remove it to keep storage clean
          if (pendingDocId) {
            await AsyncStorage.removeItem("onboarding_pending_document_id");
          }
        }
      } catch (err) {
        console.warn("[ONBOARDING] Failed to resume pending job:", err);
      }
    };

    resumePendingJob();
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
        firstName: userData.firstName || "",
        lastName: userData.lastName || "",
        dateOfBirth: userData.dateOfBirth
          ? format(new Date(userData.dateOfBirth), "yyyy-MM-dd")
          : "",
        gender: userData.gender || "",
        bloodGroup: userData.bloodGroup || "",
        allergies: Array.isArray(userData.allergies) ? userData.allergies : [],
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

      const fetchOnboardingHistory = async () => {
        setLoading(true);
        try {
          console.log("[ONBOARDING] Fetching onboarding history...");
          const response = await apiClient.get("/v1/onboarding/history");
          const {
            chatSessionId,
            messages: historyItems,
            resumableState,
          } = response.data?.data || {};

          let mergedState = { ...newState };
          if (resumableState) {
            mergedState = {
              ...mergedState,
              ...resumableState,
            };
          }

          setState(mergedState);

          if (
            chatSessionId &&
            Array.isArray(historyItems) &&
            historyItems.length > 0
          ) {
            console.log(
              "[ONBOARDING] Replaying",
              historyItems.length,
              "historical messages.",
            );
            const mappedMessages: Message[] = historyItems.map(
              (dbMsg: any) => ({
                ...(dbMsg.metadata || {}),
                id: dbMsg.id,
                role: dbMsg.role,
                content: dbMsg.content,
              }),
            );

            setMessages(mappedMessages);
            setLoading(false);
            return;
          }

          // If no session or no history, start fresh with "hello"
          await startOnboardingChat(mergedState);
        } catch (error) {
          console.error(
            "[ONBOARDING] Failed to load onboarding history:",
            error,
          );
          // Fallback: start fresh
          await startOnboardingChat(newState);
        } finally {
          setLoading(false);
        }
      };

      if (messages.length === 0) {
        fetchOnboardingHistory();
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
    const messageContent =
      aiRes.message || aiRes.message_en || aiRes.message_gu;

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
        hasSocialData:
          aiRes.hasSocialData !== undefined
            ? aiRes.hasSocialData
            : finalState.hasSocialData,
        foundMedicines: aiRes.foundMedicines || finalState.foundMedicines,
        medicinesFlowStarted:
          aiRes.medicinesFlowStarted !== undefined
            ? aiRes.medicinesFlowStarted
            : finalState.medicinesFlowStarted,
        medicinesConfirmed:
          aiRes.medicinesConfirmed !== undefined
            ? aiRes.medicinesConfirmed
            : finalState.medicinesConfirmed,
        medicinesToAdd: aiRes.medicinesToAdd || finalState.medicinesToAdd,
        currentMedicineIndex:
          aiRes.currentMedicineIndex !== undefined
            ? aiRes.currentMedicineIndex
            : finalState.currentMedicineIndex,
        medicinesSavedToDb:
          aiRes.medicinesSavedToDb !== undefined
            ? aiRes.medicinesSavedToDb
            : finalState.medicinesSavedToDb,
        existingUserData: updatedUserData,
      };
    }

    setState(finalState);

    if (finalState.documentExtracted) {
      setUploadProgress(null);
    }
  };

  const sendMessage = async (
    userText: string,
    updatedState = state,
    displayLabel?: string,
  ) => {
    if (!userText.trim()) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: displayLabel || userText,
      rawValue: userText, // Store raw value for live matching!
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
        displayLabel,
      };

      const response = await apiClient.post("/v1/onboarding/chat", payload, {
        timeout: 90000,
      });
      const resData = response.data?.data;

      if (resData) {
        processAssistantResponse(resData, updatedState);
        if (
          resData.action === "COMPLETE" ||
          resData.action === "POST_ONBOARDING" ||
          resData.state?.isOnboardingCompleted
        ) {
          queryClient.invalidateQueries({ queryKey: ["profile"] });
          queryClient.invalidateQueries({ queryKey: ["userProfile"] });
        }
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

  const handleDateConfirm = (date: Date) => {
    setDatePickerVisible(false);
    if (datePickerMode === "time") {
      const timeString = format(date, "hh:mm a");
      sendMessage(timeString, state);
    } else {
      const dobString = format(date, "yyyy-MM-dd");
      if (isEditingProfileManually) {
        setEditedProfileData((prev: any) => ({
          ...prev,
          dateOfBirth: dobString,
        }));
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

  const uploadAbortControllerRef = useRef<AbortController | null>(null);

  const startPolling = async (
    documentId: string,
    currentVersionToken: string,
  ) => {
    pollActiveRef.current = true;
    cancelRequestedRef.current = false;
    setUploadState("queued");
    setPollElapsedTime(0);
    setPollCurrentPage(1);
    setPollTotalPages(1);

    let localElapsedTime = 0;
    let autoRetryAttempts = 0;
    const maxStatusRetries = 3;

    const runPoll = async () => {
      if (!pollActiveRef.current) return;

      // If user requested cancel
      if (cancelRequestedRef.current) {
        pollActiveRef.current = false;
        await handleCancelJob(documentId);
        return;
      }

      // If offline, pause polling
      if (isOfflineRef.current) {
        setTimeout(runPoll, 3000);
        return;
      }

      try {
        const statusRes = await apiClient.get(`/v1/ocr/status/${documentId}`);
        const resData = statusRes.data?.data;
        console.log("[ONBOARDING] Poll OCR Status:", resData?.status);

        // Reset retry count on successful poll
        autoRetryAttempts = 0;

        if (resData?.status === "done") {
          pollActiveRef.current = false;
          await AsyncStorage.removeItem("onboarding_pending_document_id");
          setUploadState("success");
          await handleSuccessfulOcr(
            resData,
            selectedFileRef.current?.name || "report.pdf",
          );
          return;
        } else if (resData?.status === "failed") {
          pollActiveRef.current = false;
          await AsyncStorage.removeItem("onboarding_pending_document_id");
          setUploadState("failed");
          setActiveErrorCode(resData.errorCode || "OCR_FAILED");
          setActiveErrorDetails(resData.errorMessage || null);
          return;
        } else if (resData?.status === "cancelled") {
          pollActiveRef.current = false;
          await AsyncStorage.removeItem("onboarding_pending_document_id");
          setUploadState("cancelled");
          Toast.show({ type: "info", text1: "Upload cancelled" });
          return;
        }

        // It is processing/queued
        setUploadState("processing");
        setPollCurrentPage(resData?.currentPage || 1);
        setPollTotalPages(resData?.totalPages || 1);

        const totalPages = resData?.totalPages || 1;
        const pageCeiling = Math.max(120000, totalPages * 45000 + 30000);

        localElapsedTime += 3000;
        setPollElapsedTime(localElapsedTime);

        if (localElapsedTime >= pageCeiling) {
          console.warn(
            "[ONBOARDING] Polling ceiling exceeded:",
            localElapsedTime,
            "ms",
          );
          pollActiveRef.current = false;
          setUploadState("timed_out");
          setActiveErrorCode("NETWORK_TIMEOUT");
          return;
        }
      } catch (error: any) {
        console.error("[ONBOARDING] Status poll error:", error);

        autoRetryAttempts++;
        if (autoRetryAttempts <= maxStatusRetries) {
          const backoffDelay = Math.pow(2, autoRetryAttempts) * 1000;
          console.log(
            `[ONBOARDING] Status query failed. Auto-retrying status check (${autoRetryAttempts}/${maxStatusRetries}) in ${backoffDelay}ms...`,
          );
          setTimeout(runPoll, backoffDelay);
          return;
        } else {
          pollActiveRef.current = false;
          await AsyncStorage.removeItem("onboarding_pending_document_id");
          setUploadState("failed");
          setActiveErrorCode("SERVER_UNREACHABLE");
          return;
        }
      }

      setTimeout(runPoll, 3000);
    };

    setTimeout(runPoll, 1000);
  };

  const handleCancelJob = async (documentId: string) => {
    try {
      await AsyncStorage.removeItem("onboarding_pending_document_id");
      await apiClient.post(`/v1/ocr/cancel/${documentId}`);
    } catch (err) {
      console.warn("[ONBOARDING] Failed to notify cancel to backend:", err);
    }
    setUploadState("cancelled");
    Toast.show({ type: "info", text1: "Upload cancelled" });
  };

  const handleChooseDifferentFile = () => {
    setUploadState("idle");
    setSelectedFile(null);
    setInput("");
    setIdempotencyKey(null);
    setVersionToken(null);
  };

  const cancelProcessing = async () => {
    cancelRequestedRef.current = true;
    pollActiveRef.current = false;
    if (uploadAbortControllerRef.current) {
      uploadAbortControllerRef.current.abort();
      uploadAbortControllerRef.current = null;
    }
    const pendingDocId = await AsyncStorage.getItem(
      "onboarding_pending_document_id",
    );
    if (pendingDocId) {
      await handleCancelJob(pendingDocId);
    } else {
      setUploadState("cancelled");
      Toast.show({ type: "info", text1: "Upload cancelled" });
    }
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
      phoneNumber:
        structured.phoneNumber || state.existingUserData.phoneNumber || "",
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

    await sendMessage(
      "DOCUMENT_UPLOADED",
      newState,
      "Document Uploaded: " + fileName,
    );

    // Clear the success message after a short delay
    setTimeout(() => {
      setUploadState("idle");
    }, 2500);
  };

  const uploadSelectedFile = async (fileToUpload = selectedFile) => {
    if (!fileToUpload) return;
    if (isUploadingRef.current) {
      console.log(
        "[ONBOARDING] Upload already in progress. Ignoring duplicate trigger.",
      );
      return;
    }

    isUploadingRef.current = true;
    isUploadCancelledRef.current = false;
    setLoading(true);
    setUploadState("validating");
    setActiveErrorCode(null);
    setActiveErrorDetails(null);
    setUploadPercent(0);

    // Generate or reuse idempotencyKey and versionToken
    let activeIdempotencyKey = idempotencyKey;
    if (!activeIdempotencyKey) {
      activeIdempotencyKey =
        Math.random().toString(36).substring(2, 15) + Date.now();
      setIdempotencyKey(activeIdempotencyKey);
    }
    const activeVersionToken =
      Math.random().toString(36).substring(2, 15) + Date.now();
    setVersionToken(activeVersionToken);

    console.log(
      "[ONBOARDING] Upload Started. Idempotency Key:",
      activeIdempotencyKey,
      "Version Token:",
      activeVersionToken,
    );

    const maxUploadRetries = 3;
    let uploadAttempts = 0;

    const performUpload = async (): Promise<string> => {
      uploadAttempts++;
      try {
        const formData = new FormData();
        formData.append("file", {
          uri: fileToUpload.uri,
          name: fileToUpload.name,
          type: fileToUpload.type,
        } as any);
        formData.append("idempotencyKey", activeIdempotencyKey);
        formData.append("versionToken", activeVersionToken);

        setUploadState("uploading");
        setAutoRetryCount(uploadAttempts - 1);

        const controller = new AbortController();
        uploadAbortControllerRef.current = controller;

        const response = await apiClient.post("/v1/ocr/extract", formData, {
          headers: { "Content-Type": "multipart/form-data" },
          timeout: 90000, // 90s timeout for upload phase
          signal: controller.signal,
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const percentCompleted = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total,
              );
              setUploadPercent(percentCompleted);
            }
          },
        });

        const docId =
          response.data?.data?.document?.id ||
          response.data?.data?.documents?.[0]?.id;
        if (!docId) {
          throw new Error(
            "Failed to start processing: no document ID returned.",
          );
        }
        return docId;
      } catch (err: any) {
        console.warn(
          `[ONBOARDING] Upload attempt ${uploadAttempts} failed:`,
          err.message,
        );

        // Auto-retry transient errors
        const isTransient =
          !err.response ||
          err.response.status >= 500 ||
          err.code === "ECONNABORTED";
        if (isTransient && uploadAttempts <= maxUploadRetries) {
          const backoffDelay = Math.pow(2, uploadAttempts) * 1000;
          console.log(`[ONBOARDING] Retrying upload in ${backoffDelay}ms...`);
          await new Promise((r) => setTimeout(r, backoffDelay));
          return performUpload();
        }
        throw err;
      }
    };

    try {
      const docId = await performUpload();
      console.log("[ONBOARDING] Upload Success, docId:", docId);

      // Persist documentId for crash recovery
      await AsyncStorage.setItem("onboarding_pending_document_id", docId);

      // Start status polling
      startPolling(docId, activeVersionToken);

      if (isUploadCancelledRef.current) throw new Error("UPLOAD_CANCELLED");
    } catch (error: any) {
      console.error(
        "[ONBOARDING] Document upload failed after retries:",
        error,
      );
      setUploadState("failed");
      isUploadingRef.current = false;
      setLoading(false);

      // Classify error
      let errCode = "UPLOAD_FAILED";
      let errMsg = error.message || "";
      if (error.response) {
        const backendErr = error.response.data?.error;
        if (backendErr?.code === "INVALID_MEDICAL_DOCUMENT") {
          setValidationDialogVisible(true);
          setUploadState("idle");
          return;
        }
        if (backendErr?.code) {
          errCode = backendErr.code;
        } else if (error.response.status === 413) {
          errCode = "FILE_TOO_LARGE";
        } else if (error.response.status === 415) {
          errCode = "UNSUPPORTED_FILE";
        }
      } else if (errMsg.includes("timeout") || error.code === "ECONNABORTED") {
        errCode = "NETWORK_TIMEOUT";
      }

      setActiveErrorCode(errCode);
      setActiveErrorDetails(errMsg);
    } finally {
      isUploadingRef.current = false;
      setLoading(false);
    }
  };

  const handleRemoveFile = () => {
    isUploadCancelledRef.current = true;
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

  const renderOptions = (activeMsg: Message, isHistorical: boolean = false) => {
    const preferredLang = state.preferredLanguage || "english";

    const { chosenVal, chosenLabel } = findHistoricalUserReply(
      messages,
      activeMsg.id,
      false,
    );

    const uiT = (key: string) => {
      const lang = preferredLang || "english";
      const dict =
        ONBOARDING_I18N[lang.toLowerCase()] || ONBOARDING_I18N.english;
      return dict[key] || ONBOARDING_I18N.english[key] || key;
    };

    const handleOptionPress = (value: string, label: string) => {
      if (value === "GO_TO_DASHBOARD" || value === "DASHBOARD") {
        sendMessage(value, state, label);
      } else if (value === "ADD_MORE_MEDICINES" || value === "ADD") {
        sendMessage(value, state, label);
      } else if (value === "VIEW_MEDICINES" || value === "VIEW_MY_MEDICINES") {
        setTimeout(() => {
          navigation.navigate("MEDICATION", {
            screen: "MedicationList",
          });
        }, 500);
      } else if (value === "ASK_ABOUT_REPORT" || value === "ASK_REPORT") {
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

    if (activeMsg.action === "RESOLVE_PROFILE_SOURCE") {
      return (
        <ResolveProfileSourceCard
          activeMsg={activeMsg}
          preferredLang={preferredLang}
          isDark={isDark}
          theme={theme}
          sendMessage={sendMessage}
          state={state}
          isHistorical={isHistorical}
          chosenVal={chosenVal}
          chosenLabel={chosenLabel}
        />
      );
    }

    if (activeMsg.action === "ASK_LANGUAGE") {
      return (
        <View
          style={styles.chipRow}
          pointerEvents={isHistorical ? "none" : "auto"}
        >
          {(activeMsg.options || []).map((opt) => {
            const isChosen =
              isHistorical &&
              ((chosenVal &&
                String(opt.value).toLowerCase() ===
                  String(chosenVal).toLowerCase()) ||
                (chosenLabel &&
                  String(opt.label).toLowerCase() ===
                    String(chosenLabel).toLowerCase()));
            const isUnchosen = isHistorical && !isChosen;

            return (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.chip,
                  {
                    backgroundColor: theme.colors.primary,
                    opacity: isUnchosen ? 0.55 : 1,
                    borderWidth: isChosen ? 2 : 0,
                    borderColor: isChosen ? "#ffffff" : "transparent",
                  },
                ]}
                onPress={() => {
                  const newState = { ...state, preferredLanguage: opt.value };
                  setState(newState);
                  sendMessage(opt.value, newState, opt.label);
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  {isChosen && (
                    <Ionicons
                      name="checkmark"
                      size={14}
                      color="#fff"
                      style={{ marginRight: 4 }}
                    />
                  )}
                  <Text style={styles.chipText}>{opt.label}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      );
    }

    if (activeMsg.action === "ASK_UPLOAD_OR_SKIP") {
      return (
        <AskUploadOrSkipCard
          activeMsg={activeMsg}
          preferredLang={preferredLang}
          theme={theme}
          state={state}
          setState={setState}
          sendMessage={sendMessage}
          handleDocumentUpload={handleDocumentUpload}
          isHistorical={isHistorical}
          chosenVal={chosenVal}
          chosenLabel={chosenLabel}
        />
      );
    }

    if (activeMsg.action === "ASK_GENDER") {
      return (
        <View
          style={styles.chipRow}
          pointerEvents={isHistorical ? "none" : "auto"}
        >
          {(activeMsg.options || []).map((opt) => {
            const label = opt.label;
            const isChosen =
              isHistorical &&
              ((chosenVal &&
                String(opt.value).toLowerCase() ===
                  String(chosenVal).toLowerCase()) ||
                (chosenLabel &&
                  String(label).toLowerCase() ===
                    String(chosenLabel).toLowerCase()));
            const isUnchosen = isHistorical && !isChosen;

            return (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.chip,
                  {
                    backgroundColor: theme.colors.primary,
                    opacity: isUnchosen ? 0.55 : 1,
                    borderWidth: isChosen ? 2 : 0,
                    borderColor: isChosen ? "#ffffff" : "transparent",
                  },
                ]}
                onPress={() => {
                  const updatedUserData = {
                    ...state.existingUserData,
                    gender: opt.value,
                  };
                  const newState = {
                    ...state,
                    existingUserData: updatedUserData,
                  };
                  setState(newState);
                  sendMessage(opt.value, newState, label);
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  {isChosen && (
                    <Ionicons
                      name="checkmark"
                      size={14}
                      color="#fff"
                      style={{ marginRight: 4 }}
                    />
                  )}
                  <Text style={styles.chipText}>{label}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      );
    }

    if (
      activeMsg.action === "ASK_DOB" ||
      activeMsg.action === "ASK_MEDICINE_START_DATE"
    ) {
      const displayDate = uiT("chooseDate");
      return (
        <View
          style={styles.actionRow}
          pointerEvents={isHistorical ? "none" : "auto"}
        >
          <TouchableOpacity
            disabled={isHistorical}
            style={[
              styles.actionButton,
              {
                backgroundColor: theme.colors.primary,
                opacity: 1,
                borderWidth: isHistorical ? 2 : 0,
                borderColor: isHistorical ? "#ffffff" : "transparent",
              },
            ]}
            onPress={() => {
              setDatePickerMode("date");
              setDatePickerVisible(true);
            }}
          >
            <Ionicons
              name={isHistorical ? "checkmark-circle" : "calendar"}
              size={18}
              color="#fff"
              style={{ marginRight: 8 }}
            />
            <Text style={styles.actionButtonText}>{displayDate}</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (activeMsg.action === "ASK_MEDICINE_SCHEDULE") {
      const displayTime = uiT("chooseTime");
      return (
        <View
          style={styles.actionRow}
          pointerEvents={isHistorical ? "none" : "auto"}
        >
          <TouchableOpacity
            disabled={isHistorical}
            style={[
              styles.actionButton,
              {
                backgroundColor: theme.colors.primary,
                opacity: 1,
                borderWidth: isHistorical ? 2 : 0,
                borderColor: isHistorical ? "#ffffff" : "transparent",
              },
            ]}
            onPress={() => {
              setDatePickerMode("time");
              setDatePickerVisible(true);
            }}
          >
            <Ionicons
              name={isHistorical ? "checkmark-circle" : "time"}
              size={18}
              color="#fff"
              style={{ marginRight: 8 }}
            />
            <Text style={styles.actionButtonText}>{displayTime}</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (
      activeMsg.action === "ADD_MEDICINE" ||
      activeMsg.action === "EDIT_MEDICINE" ||
      (activeMedicineToEdit && !isHistorical)
    ) {
      const med =
        (isHistorical
          ? activeMsg.medicine
          : activeMedicineToEdit || activeMsg.medicine) || {};
      const isEditingLocal = !isHistorical && !!activeMedicineToEdit;

      const handleSave = (updatedMed: any) => {
        if (isEditingLocal) {
          setLocalMedicines((prev) =>
            prev.map((m) =>
              (m.client_med_id || m.id) === (med.client_med_id || med.id)
                ? {
                    ...m,
                    ...updatedMed,
                    subtitle:
                      updatedMed.type === "TABLET" ||
                      updatedMed.type === "CAPSULE"
                        ? `${updatedMed.dose.count} ${updatedMed.type.toLowerCase()}(s) · ${updatedMed.frequency.toLowerCase()}`
                        : `${updatedMed.dose.value} ${updatedMed.dose.unit} · ${updatedMed.frequency.toLowerCase()}`,
                  }
                : m,
            ),
          );

          setActiveMedicineToEdit(null);
          setMessages((prev) => prev.filter((m) => m.id !== activeMsg.id));
        } else {
          setCurrentClientMedId(null);
          const displayLabel =
            preferredLang === "gujarati" || preferredLang === "gu"
              ? `દવા ઉમેરો: ${updatedMed.name}`
              : preferredLang === "hindi" || preferredLang === "hi"
                ? `દવા જોડેં: ${updatedMed.name}`
                : preferredLang === "marathi" || preferredLang === "mr"
                  ? `औषध जोडा: ${updatedMed.name}`
                  : preferredLang === "tamil" || preferredLang === "ta"
                    ? `மருந்தைச் சேர்: ${updatedMed.name}`
                    : `Add medicine: ${updatedMed.name}`;
          sendMessage(
            JSON.stringify({
              medicine: updatedMed,
              clientMedId: currentClientMedId,
            }),
            state,
            displayLabel,
          );
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
          onCancel={
            isEditingLocal
              ? () => {
                  setActiveMedicineToEdit(null);
                  setMessages((prev) =>
                    prev.filter((m) => m.id !== activeMsg.id),
                  );
                }
              : undefined
          }
          readOnly={isHistorical}
          chosenVal={chosenVal}
          chosenLabel={chosenLabel}
        />
      );
    }

    if (activeMsg.action === "REVIEW_MEDICINES_LIST") {
      const handleConfirm = (checkedMeds: string[]) => {
        sendMessage(
          JSON.stringify({ selected: checkedMeds }),
          state,
          uiT("confirmSelection"),
        );
      };
      const handleAddNew = () => {
        sendMessage(JSON.stringify({ addNew: true }), state, uiT("addNew"));
      };
      const handleSkipAll = () => {
        sendMessage(JSON.stringify({ skipAll: true }), state, uiT("skipAll"));
      };
      const handleEdit = (med: any) => {
        setActiveMedicineToEdit(med);
        const newMsg: Message = {
          id: `ai-${Date.now()}`,
          role: "assistant",
          content: "Please edit the medication details below:",
          action: "EDIT_MEDICINE",
          medicine: med,
        };
        setMessages((prev) => [...prev, newMsg]);
      };

      return (
        <ReviewMedicinesListCard
          localMedicines={
            isHistorical ? activeMsg.medicines || [] : localMedicines
          }
          setLocalMedicines={setLocalMedicines}
          preferredLang={preferredLang}
          isDark={isDark}
          theme={theme}
          onConfirm={handleConfirm}
          onAddNew={handleAddNew}
          onSkipAll={handleSkipAll}
          onEdit={handleEdit}
          readOnly={isHistorical}
          chosenVal={chosenVal}
          chosenLabel={chosenLabel}
        />
      );
    }

    if (activeMsg.action === "CONFIRM_MEDICINE") {
      const handleConfirm = () => {
        const displayLabel =
          preferredLang === "gujarati" || preferredLang === "gu"
            ? "હા, યોગ્ય છે"
            : preferredLang === "hindi" || preferredLang === "hi"
              ? "हाँ, सही है"
              : preferredLang === "marathi" || preferredLang === "mr"
                ? "होय, योग्य आहे"
                : preferredLang === "tamil" || preferredLang === "ta"
                  ? "ஆம், சரியானது"
                  : "Yes, Correct";
        sendMessage(JSON.stringify({ confirmed: true }), state, displayLabel);
      };
      const handleEdit = () => {
        const displayLabel =
          preferredLang === "gujarati" || preferredLang === "gu"
            ? "સુધારો"
            : preferredLang === "hindi" || preferredLang === "hi"
              ? "संपादित करें"
              : preferredLang === "marathi" || preferredLang === "mr"
                ? "संपादित करा"
                : preferredLang === "tamil" || preferredLang === "ta"
                  ? "திருத்து"
                  : "Edit";
        sendMessage(JSON.stringify({ edit: true }), state, displayLabel);
      };

      return (
        <ConfirmMedicineCard
          summary={activeMsg.summary || {}}
          preferredLang={preferredLang}
          isDark={isDark}
          theme={theme}
          onConfirm={handleConfirm}
          onEdit={handleEdit}
          readOnly={isHistorical}
          chosenVal={chosenVal}
          chosenLabel={chosenLabel}
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
          readOnly={isHistorical}
          chosenVal={chosenVal}
          chosenLabel={chosenLabel}
        />
      );
    }

    if (
      activeMsg.action === "COMPLETE" ||
      activeMsg.action === "POST_ONBOARDING"
    ) {
      return null;
    }

    if (activeMsg.options && activeMsg.options.length > 0) {
      return (
        <View
          style={styles.chipRow}
          pointerEvents={isHistorical ? "none" : "auto"}
        >
          {activeMsg.options.map((opt) => {
            const label = typeof opt === "string" ? opt : opt.label;
            const value = typeof opt === "string" ? opt : opt.value;
            const isChosen =
              isHistorical &&
              ((chosenVal &&
                String(value).toLowerCase() ===
                  String(chosenVal).toLowerCase()) ||
                (chosenLabel &&
                  String(label).toLowerCase() ===
                    String(chosenLabel).toLowerCase()));
            const isUnchosen = isHistorical && !isChosen;

            return (
              <TouchableOpacity
                key={value}
                style={[
                  styles.chip,
                  {
                    backgroundColor: theme.colors.primary,
                    opacity: isUnchosen ? 0.55 : 1,
                    borderWidth: isChosen ? 2 : 0,
                    borderColor: isChosen ? "#ffffff" : "transparent",
                  },
                ]}
                onPress={() =>
                  handleOptionPress(
                    value,
                    typeof label === "string" ? label : value,
                  )
                }
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  {isChosen && (
                    <Ionicons
                      name="checkmark"
                      size={14}
                      color="#fff"
                      style={{ marginRight: 4 }}
                    />
                  )}
                  <Text style={styles.chipText}>{label}</Text>
                </View>
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
    <SafeAreaView style={{ flex: 1, paddingTop: 50 }}>
        <StatusBar
          barStyle="dark-content"
          backgroundColor="transparent"
          translucent
        />
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
              onContentSizeChange={() =>
                flatListRef.current?.scrollToEnd({ animated: true })
              }
              onLayout={() =>
                flatListRef.current?.scrollToEnd({ animated: true })
              }
              renderItem={({ item }) => {
                // console.log("Message Item : ", item);
                const isAi = item.role === "assistant";
                const mappedMsg = {
                  id: item.id,
                  role: isAi ? ("ai" as const) : ("user" as const),
                  text: item.content,
                };
                const isLast = item.id === messages[messages.length - 1].id;
                const isHistorical = !isLast;
                const options = renderOptions(item, isHistorical);
                const isJson =
                  item.content && item.content.trim().startsWith("{");

                return (
                  <View style={{ width: "100%" }}>
                    {!isJson && (
                      <MessageBubble message={mappedMsg} isDark={isDark} />
                    )}
                    {isAi && options !== null && (
                      <View
                        style={[
                          styles.optionsWrapper,
                          { opacity: isLast ? 1 : 0.5 },
                        ]}
                        pointerEvents={isLast ? "auto" : "none"}
                      >
                        {options}
                      </View>
                    )}
                  </View>
                );
              }}
            />
          </View>

          {/* Typing Indicator */}
          {loading && <TypingIndicator isDark={isDark} />}

          {/* Document Upload & OCR Experience States */}
          {uploadState !== "idle" && uploadState !== "cancelled" && (
            <View
              style={[
                styles.progressCard,
                {
                  backgroundColor: isDark ? "#1e293b" : "#ffffff",
                  borderColor: isDark ? "#334155" : "#e2e8f0",
                  borderWidth: 1,
                },
              ]}
            >
              {/* Progress UI for Success */}
              {uploadState === "success" && (
                <View style={{ alignItems: "center", padding: 15 }}>
                  <Ionicons name="checkmark-circle" size={32} color="#10b981" />
                  <Text
                    style={[
                      styles.progressText,
                      {
                        color: theme.colors.textPrimary,
                        marginTop: 10,
                        fontWeight: "bold",
                      },
                    ]}
                  >
                    {ONBOARDING_I18N[
                      (state.preferredLanguage || "english").toLowerCase()
                    ]?.success || "Analysis Complete"}
                  </Text>
                </View>
              )}
              {/* Progress UI for Validating */}
              {uploadState === "validating" && (
                <View style={{ alignItems: "center", padding: 15 }}>
                  <ActivityIndicator
                    size="large"
                    color={theme.colors.primary}
                  />
                  <Text
                    style={[
                      styles.progressText,
                      { color: theme.colors.textPrimary, marginTop: 10 },
                    ]}
                  >
                    {ONBOARDING_I18N[
                      (state.preferredLanguage || "english").toLowerCase()
                    ]?.validating || ONBOARDING_I18N.english.validating}
                  </Text>
                </View>
              )}

              {/* Progress UI for Uploading */}
              {uploadState === "uploading" && (
                <View style={{ width: "100%", padding: 15 }}>
                  <Text
                    style={[
                      styles.progressText,
                      {
                        color: theme.colors.textPrimary,
                        marginBottom: 8,
                        fontWeight: "bold",
                      },
                    ]}
                  >
                    {autoRetryCount > 0
                      ? (
                          ONBOARDING_I18N[
                            (state.preferredLanguage || "english").toLowerCase()
                          ]?.retry_count || ONBOARDING_I18N.english.retry_count
                        )
                          .replace("{attempt}", String(autoRetryCount))
                          .replace("{max}", "3")
                      : ONBOARDING_I18N[
                          (state.preferredLanguage || "english").toLowerCase()
                        ]?.uploading || ONBOARDING_I18N.english.uploading}
                  </Text>
                  {/* Linear Progress Bar */}
                  <View
                    style={{
                      height: 6,
                      backgroundColor: isDark ? "#334155" : "#e2e8f0",
                      borderRadius: 3,
                      overflow: "hidden",
                      marginVertical: 10,
                    }}
                  >
                    <View
                      style={{
                        height: "100%",
                        width: `${uploadPercent}%`,
                        backgroundColor: theme.colors.primary,
                      }}
                    />
                  </View>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{
                        color: theme.colors.textSecondary,
                        fontSize: 12,
                      }}
                    >
                      {uploadPercent}%
                    </Text>
                    <TouchableOpacity
                      accessibilityLabel={
                        ONBOARDING_I18N[
                          (state.preferredLanguage || "english").toLowerCase()
                        ]?.btn_cancel || ONBOARDING_I18N.english.btn_cancel
                      }
                      accessibilityRole="button"
                      onPress={cancelProcessing}
                      style={{
                        paddingHorizontal: 15,
                        paddingVertical: 6,
                        borderRadius: 15,
                        backgroundColor: isDark ? "#334155" : "#f1f5f9",
                      }}
                    >
                      <Text
                        style={{
                          color: theme.colors.primary,
                          fontWeight: "bold",
                          fontSize: 12,
                        }}
                      >
                        {ONBOARDING_I18N[
                          (state.preferredLanguage || "english").toLowerCase()
                        ]?.btn_cancel || ONBOARDING_I18N.english.btn_cancel}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Progress UI for Queued */}
              {uploadState === "queued" && (
                <View style={{ alignItems: "center", padding: 15 }}>
                  <ActivityIndicator
                    size="large"
                    color={theme.colors.primary}
                  />
                  <Text
                    style={[
                      styles.progressText,
                      { color: theme.colors.textPrimary, marginTop: 10 },
                    ]}
                  >
                    {ONBOARDING_I18N[
                      (state.preferredLanguage || "english").toLowerCase()
                    ]?.queued || ONBOARDING_I18N.english.queued}
                  </Text>
                </View>
              )}

              {/* Progress UI for Processing */}
              {uploadState === "processing" && (
                <View style={{ width: "100%", padding: 15 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginBottom: 10,
                    }}
                  >
                    <ActivityIndicator
                      size="small"
                      color={theme.colors.primary}
                      style={{ marginRight: 10 }}
                    />
                    <Text
                      style={{
                        color: theme.colors.textPrimary,
                        fontWeight: "bold",
                      }}
                      accessibilityLiveRegion="polite"
                    >
                      {isOffline
                        ? "Internet connection lost. Analysis paused..."
                        : ONBOARDING_I18N[
                            (state.preferredLanguage || "english").toLowerCase()
                          ]?.processing || ONBOARDING_I18N.english.processing}
                    </Text>
                  </View>

                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      marginVertical: 8,
                    }}
                  >
                    <Text
                      style={{
                        color: theme.colors.textSecondary,
                        fontSize: 13,
                      }}
                    >
                      {(
                        ONBOARDING_I18N[
                          (state.preferredLanguage || "english").toLowerCase()
                        ]?.page_progress ||
                        ONBOARDING_I18N.english.page_progress
                      )
                        .replace("{current}", String(pollCurrentPage))
                        .replace("{total}", String(pollTotalPages))}
                    </Text>
                    {/* Screen reader isolated timer */}
                    <Text
                      style={{
                        color: theme.colors.textPrimary,
                        fontWeight: "bold",
                        fontSize: 13,
                      }}
                      importantForAccessibility="no-hide-descendants"
                    >
                      {Math.round(pollElapsedTime / 1000)}s
                    </Text>
                  </View>

                  <Text
                    style={{
                      color: theme.colors.textSecondary,
                      fontSize: 11,
                      fontStyle: "italic",
                      marginBottom: 12,
                    }}
                  >
                    {ONBOARDING_I18N[
                      (state.preferredLanguage || "english").toLowerCase()
                    ]?.eta_hint || ONBOARDING_I18N.english.eta_hint}
                  </Text>

                  <TouchableOpacity
                    accessibilityLabel={
                      ONBOARDING_I18N[
                        (state.preferredLanguage || "english").toLowerCase()
                      ]?.btn_cancel || ONBOARDING_I18N.english.btn_cancel
                    }
                    accessibilityRole="button"
                    onPress={cancelProcessing}
                    style={{
                      alignSelf: "flex-end",
                      paddingHorizontal: 20,
                      paddingVertical: 8,
                      borderRadius: 20,
                      backgroundColor: isDark ? "#334155" : "#f1f5f9",
                    }}
                  >
                    <Text
                      style={{
                        color: theme.colors.primary,
                        fontWeight: "bold",
                        fontSize: 13,
                      }}
                    >
                      {ONBOARDING_I18N[
                        (state.preferredLanguage || "english").toLowerCase()
                      ]?.btn_cancel || ONBOARDING_I18N.english.btn_cancel}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Failure / Timeout Card */}
              {(uploadState === "failed" || uploadState === "timed_out") && (
                <View style={{ width: "100%", padding: 15 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginBottom: 12,
                    }}
                  >
                    <Ionicons
                      name="alert-circle"
                      size={24}
                      color="#ef4444"
                      style={{ marginRight: 8 }}
                    />
                    <Text
                      style={{
                        color: "#ef4444",
                        fontWeight: "bold",
                        fontSize: 16,
                      }}
                    >
                      {uploadState === "timed_out"
                        ? "Analysis Timeout"
                        : "Analysis Failed"}
                    </Text>
                  </View>

                  <Text
                    style={{
                      color: theme.colors.textPrimary,
                      marginBottom: 15,
                      fontSize: 14,
                    }}
                  >
                    {uploadState === "timed_out"
                      ? ONBOARDING_I18N[
                          (state.preferredLanguage || "english").toLowerCase()
                        ]?.err_network_timeout ||
                        ONBOARDING_I18N.english.err_network_timeout
                      : ONBOARDING_I18N[
                          (state.preferredLanguage || "english").toLowerCase()
                        ][`err_${activeErrorCode?.toLowerCase()}`] ||
                        ONBOARDING_I18N.english.err_unexpected_error}
                  </Text>

                  {__DEV__ && activeErrorDetails && (
                    <View
                      style={{
                        backgroundColor: isDark ? "#0f172a" : "#f8fafc",
                        padding: 8,
                        borderRadius: 6,
                        marginBottom: 15,
                      }}
                    >
                      <Text
                        style={{
                          color: "#ef4444",
                          fontFamily:
                            Platform.OS === "ios" ? "Courier" : "monospace",
                          fontSize: 11,
                        }}
                        numberOfLines={4}
                      >
                        {activeErrorDetails}
                      </Text>
                    </View>
                  )}

                  <View style={{ flexDirection: "column", gap: 8 }}>
                    <TouchableOpacity
                      accessibilityLabel={
                        ONBOARDING_I18N[
                          (state.preferredLanguage || "english").toLowerCase()
                        ]?.btn_try_again ||
                        ONBOARDING_I18N.english.btn_try_again
                      }
                      accessibilityRole="button"
                      onPress={() => uploadSelectedFile(selectedFile)}
                      style={{
                        width: "100%",
                        paddingVertical: 12,
                        borderRadius: 8,
                        backgroundColor: theme.colors.primary,
                        alignItems: "center",
                      }}
                    >
                      <Text style={{ color: "#ffffff", fontWeight: "bold" }}>
                        {ONBOARDING_I18N[
                          (state.preferredLanguage || "english").toLowerCase()
                        ]?.btn_try_again ||
                          ONBOARDING_I18N.english.btn_try_again}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      accessibilityLabel={
                        ONBOARDING_I18N[
                          (state.preferredLanguage || "english").toLowerCase()
                        ]?.btn_choose_different ||
                        ONBOARDING_I18N.english.btn_choose_different
                      }
                      accessibilityRole="button"
                      onPress={handleChooseDifferentFile}
                      style={{
                        width: "100%",
                        paddingVertical: 12,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: theme.colors.primary,
                        alignItems: "center",
                      }}
                    >
                      <Text
                        style={{
                          color: theme.colors.primary,
                          fontWeight: "bold",
                        }}
                      >
                        {ONBOARDING_I18N[
                          (state.preferredLanguage || "english").toLowerCase()
                        ]?.btn_choose_different ||
                          ONBOARDING_I18N.english.btn_choose_different}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
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
            activeAction !== "EDIT_MEDICINE" &&
            activeAction !== "CONFIRM_MEDICINE" &&
            activeAction !== "MEDICINE_OPTIONS" &&
            activeAction !== "POST_ONBOARDING" && (
              <ChatInput
                value={input}
                onChangeText={setInput}
                onSend={handleSend}
                isSending={loading}
                isDark={isDark}
                keyboardType={
                  activeAction === "ASK_MEDICINE_QUANTITY"
                    ? "numeric"
                    : "default"
                }
              />
            )}
        </View>

        {/* Modal Date Picker */}
        <DateTimePickerModal
          isVisible={isDatePickerVisible}
          mode={datePickerMode}
          maximumDate={datePickerMode === "date" ? new Date() : undefined}
          minimumDate={
            datePickerMode === "date" ? new Date("1900-01-01") : undefined
          }
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
      <ConfirmationModal
        showModal={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        mode="Log Out"
      />
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
    alignItems: "center",
    borderTopColor: "rgba(100, 116, 139, 0.1)",
    borderTopWidth: 1,
    paddingTop: 8,
  },
  tabletGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: 8,
  },
  tabletOptionCard: {
    width: "31%",
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 8,
  },
  tabletImage: {
    width: 32,
    height: 32,
    marginBottom: 6,
  },
  tabletLabel: {
    fontSize: 14,
    fontWeight: "bold",
  },
  counterContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(100, 116, 139, 0.15)",
    backgroundColor: "rgba(100, 116, 139, 0.05)",
  },
  counterBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  counterValue: {
    fontSize: 16,
    fontWeight: "700",
    marginHorizontal: 12,
    minWidth: 20,
    textAlign: "center",
  },
  counterSubmit: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  liquidContainer: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    marginTop: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(100, 116, 139, 0.15)",
    backgroundColor: "rgba(100, 116, 139, 0.05)",
  },
  liquidInput: {
    minWidth: 80,
    height: 36,
    fontSize: 15,
    fontWeight: "500",
    backgroundColor: "transparent",
    paddingHorizontal: 8,
  },
  liquidUnit: {
    fontSize: 13,
    fontWeight: "600",
    marginHorizontal: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  liquidSubmit: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  editMedicineCard: {
    marginTop: 8,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  editMedicineTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 12,
  },
  editRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  editField: {
    marginBottom: 10,
  },
  editFieldLabel: {
    fontSize: 12,
    marginBottom: 4,
    fontWeight: "600",
  },
  editFieldInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
    fontSize: 14,
    backgroundColor: "transparent",
  },
  editConfirmBtn: {
    marginTop: 6,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  editConfirmBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "bold",
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
