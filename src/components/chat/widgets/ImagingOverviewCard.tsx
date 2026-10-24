import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from "react-native";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { StructuredReportDocument } from "./StructuredReportSummaryCard";

export interface ImagingOverviewCardProps {
  document: StructuredReportDocument;
  isDark?: boolean;
  theme?: any;
  preferredLang?: string;
  onViewFullReport?: (doc: any) => void;
  suggestedQuestions?: string[];
  onQuestionPress?: (question: string) => void;
  readOnly?: boolean;
}

/* All Indic & English strings below: needs native-speaker review */
const STATIC_DISCLOSURES: Record<string, Record<string, string>> = {
  x_ray: {
    english: "X-ray image saved. No written report text was detected. Please upload the radiologist's formal report for clinical interpretation.", /* needs native-speaker review */
    gujarati: "એક્સ-રે ઇમેજ સાચવવામાં આવી છે. આમાં કોઈ લેખિત રિપોર્ટ લખાણ મળ્યું નથી. ઔપચારિક તબીબી અર્થઘટન માટે કૃપા કરીને રેડિયોલોજિસ્ટનો રિપોર્ટ અપલોડ કરો.", /* needs native-speaker review */
    hindi: "एक्स-रे छवि सुरक्षित कर ली गई है। इसमें कोई लिखित रिपोर्ट नहीं मिली है। औपचारिक नैदानिक व्याख्या के लिए कृपया रेडियोलॉजिस्ट की रिपोर्ट अपलोड करें।", /* needs native-speaker review */
  },
  ecg: {
    english: "Electrocardiogram (ECG) tracing saved. No written report text was detected. Clinical interpretation requires physician or cardiologist review.", /* needs native-speaker review */
    gujarati: "ઇલેક્ટ્રોકાર્ડિયોગ્રામ (ECG) ટ્રેસિંગ સાચવવામાં આવ્યું છે. આમાં કોઈ લેખિત રિપોર્ટ મળ્યો નથી. ECG રિધમનું તબીબી અર્થઘટન ચિકિત્સક અથવા કાર્ડિયોલોજિસ્ટ દ્વારા જરૂરી છે.", /* needs native-speaker review */
    hindi: "इलेक्ट्रोकार्डियोग्राम (ईसीजी) ट्रेसिंग सुरक्षित कर ली गई है। इसमें कोई लिखित रिपोर्ट नहीं मिली है। ईसीजी ताल के नैदानिक विश्लेषण के लिए चिकित्सक या हृदय रोग विशेषज्ञ की समीक्षा आवश्यक है।", /* needs native-speaker review */
  },
  ultrasound: {
    english: "Ultrasound sonogram saved. No written report text was detected. Please upload the radiologist's formal report for clinical interpretation.", /* needs native-speaker review */
    gujarati: "અલ્ટ્રાસાઉન્ડ સોનોગ્રામ સાચવવામાં આવ્યું છે. આમાં કોઈ લેખિત રિપોર્ટ મળ્યો નથી. ઔપચારિક તબીબી અર્થઘટન માટે કૃપા કરીને રેડિયોલોજિસ્ટનો રિપોર્ટ અપલોડ કરો.", /* needs native-speaker review */
    hindi: "अल्ट्रासाउंड सोनोग्राम सुरक्षित कर लिया गया है। इसमें कोई लिखित रिपोर्ट नहीं मिली है। औपचारिक नैदानिक व्याख्या के लिए कृपया रेडियोलॉजिस्ट की रिपोर्ट अपलोड करें।", /* needs native-speaker review */
  },
  ct: {
    english: "CT scan image saved. No written report text was detected. Please upload the radiologist's formal report for clinical interpretation.", /* needs native-speaker review */
    gujarati: "સીટી સ્કેન ઇમેજ સાચવવામાં આવી છે. આમાં કોઈ લેખિત રિપોર્ટ મળ્યો નથી. ઔપચારિક તબીબી અર્થઘટન માટે કૃપા કરીને રેડિયોલોજિસ્ટનો રિપોર્ટ અપલોડ કરો.", /* needs native-speaker review */
    hindi: "सीटी स्कैन छवि सुरक्षित कर ली गई है। इसमें कोई लिखित रिपोर्ट नहीं मिली है। औपचारिक नैदानिक व्याख्या के लिए कृपया रेडियोलॉजिस्ट की रिपोर्ट अपलोड करें।", /* needs native-speaker review */
  },
  mri: {
    english: "MRI scan image saved. No written report text was detected. Please upload the radiologist's formal report for clinical interpretation.", /* needs native-speaker review */
    gujarati: "એમઆરઆઈ સ્કેન ઇમેજ સાચવવામાં આવી છે. આમાં કોઈ લેખિત રિપોર્ટ મળ્યો નથી. ઔપચારિક તબીબી અર્થઘટન માટે કૃપા કરીને રેડિયોલોજિસ્ટનો રિપોર્ટ અપલોડ કરો.", /* needs native-speaker review */
    hindi: "एमआरआई स्कैन छवि सुरक्षित कर ली गई है। इसमें कोई लिखित रिपोर्ट नहीं मिली है। औपचारिक नैदानिक व्याख्या के लिए कृपया रेडियोलॉजिस्ट की रिपोर्ट अपलोड करें।", /* needs native-speaker review */
  },
  default: {
    english: "Medical image saved. No written report text was detected. Please upload the official diagnostic report for formal clinical interpretation.", /* needs native-speaker review */
    gujarati: "તબીબી ઇમેજ સાચવવામાં આવી છે. આમાં કોઈ લેખિત રિપોર્ટ મળ્યો નથી. ઔપચારિક તબીબી અર્થઘટન માટે કૃપા કરીને અધિકૃત રિપોર્ટ અપલોડ કરો.", /* needs native-speaker review */
    hindi: "चिकित्सा छवि सुरक्षित कर ली गई है। इसमें कोई लिखित रिपोर्ट नहीं मिली है। औपचारिक नैदानिक व्याख्या के लिए कृपया आधिकारिक रिपोर्ट अपलोड करें।", /* needs native-speaker review */
  },
};

const UI_TEXT: Record<string, Record<string, string>> = {
  english: {
    aiPreviewBadge: "AI preview, not a diagnosis", /* needs native-speaker review */
    aiEstimate: "AI estimate", /* needs native-speaker review */
    viewFullReport: "View Full Image / Report", /* needs native-speaker review */
    suggestedQuestionsTitle: "Suggested Questions", /* needs native-speaker review */
  },
  gujarati: {
    aiPreviewBadge: "AI પૂર્વાવલોકન (નિદાન નથી)", /* needs native-speaker review */
    aiEstimate: "AI અંદાજ", /* needs native-speaker review */
    viewFullReport: "સંપૂર્ણ ઇમેજ / રિપોર્ટ જુઓ", /* needs native-speaker review */
    suggestedQuestionsTitle: "સૂચવેલા પ્રશ્નો", /* needs native-speaker review */
  },
  hindi: {
    aiPreviewBadge: "AI पूर्वावलोकन (निदान नहीं)", /* needs native-speaker review */
    aiEstimate: "AI अनुमान", /* needs native-speaker review */
    viewFullReport: "पूरी छवि / रिपोर्ट देखें", /* needs native-speaker review */
    suggestedQuestionsTitle: "सुझाए गए प्रश्न", /* needs native-speaker review */
  },
};

/* Short localized allow-list for anatomical regions */
interface RegionAllowListEntry {
  english: string; /* needs native-speaker review */
  gujarati: string; /* needs native-speaker review */
  hindi: string; /* needs native-speaker review */
}

const REGION_ALLOW_LIST: Record<string, RegionAllowListEntry> = {
  skull: { english: "Head / Skull", gujarati: "માથું / ખોપરી", hindi: "सिर / खोपड़ी" }, /* needs native-speaker review */
  head: { english: "Head / Skull", gujarati: "માથું / ખોપરી", hindi: "सिर / खोपड़ी" }, /* needs native-speaker review */
  cranium: { english: "Head / Skull", gujarati: "માથું / ખોપરી", hindi: "सिर / खोपड़ी" }, /* needs native-speaker review */
  chest: { english: "Chest", gujarati: "છાતી", hindi: "छाती" }, /* needs native-speaker review */
  thorax: { english: "Chest", gujarati: "છાતી", hindi: "छाती" }, /* needs native-speaker review */
  spine: { english: "Spine", gujarati: "કરોડરજ્જુ", hindi: "रीढ़" }, /* needs native-speaker review */
  vertebra: { english: "Spine", gujarati: "કરોડરજ્જુ", hindi: "रीढ़" }, /* needs native-speaker review */
  abdomen: { english: "Abdomen", gujarati: "પેટ", hindi: "पेट" }, /* needs native-speaker review */
  pelvis: { english: "Abdomen / Pelvis", gujarati: "પેટ / પેલ્વિસ", hindi: "पेट / पेल्विस" }, /* needs native-speaker review */
  extremity: { english: "Limb / Extremity", gujarati: "અંગ / હાથ-પગ", hindi: "अंग / हाथ-पैर" }, /* needs native-speaker review */
  limb: { english: "Limb / Extremity", gujarati: "અંગ / હાથ-પગ", hindi: "अंग / हाथ-पैर" }, /* needs native-speaker review */
  knee: { english: "Knee / Limb", gujarati: "ઘૂંટણ / અંગ", hindi: "घुटना / अंग" }, /* needs native-speaker review */
  shoulder: { english: "Shoulder", gujarati: "ખભો", hindi: "कंधा" }, /* needs native-speaker review */
  other: { english: "Other Region", gujarati: "અન્ય ભાગ", hindi: "अन्य भाग" }, /* needs native-speaker review */
};

export const ImagingOverviewCard: React.FC<ImagingOverviewCardProps> = ({
  document,
  isDark = false,
  theme,
  preferredLang = "english",
  onViewFullReport,
  suggestedQuestions = [],
  onQuestionPress,
  readOnly = false,
}) => {
  const [imageError, setImageError] = useState(false);

  const normLang = (preferredLang || "english").toLowerCase();
  const langKey = normLang.startsWith("gu")
    ? "gujarati"
    : normLang.startsWith("hi")
      ? "hindi"
      : "english";

  const ui = UI_TEXT[langKey] || UI_TEXT.english;

  // Resolve modality key
  const docAny = document as any;
  const rawModality = String(
    docAny.imagingOverview?.modality ||
    docAny.imageAnalysis?.modality ||
    document.documentType ||
    docAny.subType ||
    ""
  ).toLowerCase();

  let modalityKey = "default";
  let modalityLabel = "Medical Image";
  if (rawModality.includes("x_ray") || rawModality.includes("xray") || rawModality.includes("radiograph")) {
    modalityKey = "x_ray";
    modalityLabel = "X-Ray";
  } else if (rawModality.includes("ecg") || rawModality.includes("electrocardiogram") || rawModality.includes("heartbeat")) {
    modalityKey = "ecg";
    modalityLabel = "ECG Tracing";
  } else if (rawModality.includes("ultrasound") || rawModality.includes("sonogram")) {
    modalityKey = "ultrasound";
    modalityLabel = "Ultrasound";
  } else if (rawModality.includes("ct")) {
    modalityKey = "ct";
    modalityLabel = "CT Scan";
  } else if (rawModality.includes("mri")) {
    modalityKey = "mri";
    modalityLabel = "MRI Scan";
  }

  // Pure static localized sentence - ZERO MedGemma free-text derivation!
  const disclosure =
    STATIC_DISCLOSURES[modalityKey]?.[langKey] ||
    STATIC_DISCLOSURES.default[langKey] ||
    STATIC_DISCLOSURES.default.english;

  // Region chip allow-list check
  const rawRegion = String(
    docAny.imagingOverview?.anatomicalRegion ||
    docAny.imageAnalysis?.anatomicalRegion ||
    ""
  ).toLowerCase().trim();

  let allowListedRegionLabel: string | null = null;
  if (rawRegion) {
    for (const [key, entry] of Object.entries(REGION_ALLOW_LIST)) {
      if (rawRegion.includes(key)) {
        allowListedRegionLabel = entry[langKey as keyof RegionAllowListEntry] || entry.english;
        break;
      }
    }
  }

  // Accessible image thumbnail check
  const candidateUrl =
    document.fileUrl ||
    docAny.previewUrl ||
    docAny.thumbnailUrl ||
    docAny.s3Url ||
    docAny.localUri ||
    null;
  const showThumbnail = Boolean(candidateUrl && !imageError);

  const cardBg = isDark ? "#1e293b" : "#ffffff";
  const borderColor = isDark ? "#334155" : "#e2e8f0";
  const primaryText = isDark ? "#f8fafc" : "#0f172a";
  const secondaryText = isDark ? "#94a3b8" : "#475569";
  const badgeBg = isDark ? "rgba(245, 158, 11, 0.16)" : "#fef3c7";
  const badgeBorder = isDark ? "rgba(245, 158, 11, 0.35)" : "#fde68a";
  const badgeText = isDark ? "#fbbf24" : "#b45309";
  const chipBg = isDark ? "#0f172a" : "#f1f5f9";
  const chipBorder = isDark ? "#334155" : "#cbd5e1";

  return (
    <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
      {/* Top Bar: Title & AI Preview Badge */}
      <View style={styles.headerRow}>
        <View style={styles.titleContainer}>
          <MaterialCommunityIcons
            name={modalityKey === "ecg" ? "heart-pulse" : "image-filter-black-white"}
            size={20}
            color={isDark ? "#38bdf8" : "#0284c7"}
            style={{ marginRight: 6 }}
          />
          <Text style={[styles.documentTitle, { color: primaryText }]} numberOfLines={1}>
            {document.fileName || (document as any).name || modalityLabel}
          </Text>
        </View>

        <View style={[styles.badge, { backgroundColor: badgeBg, borderColor: badgeBorder }]}>
          <Ionicons name="information-circle" size={13} color={badgeText} style={{ marginRight: 4 }} />
          <Text style={[styles.badgeText, { color: badgeText }]}>{ui.aiPreviewBadge}</Text>
        </View>
      </View>

      {/* Main Content Area: Optional Thumbnail + Chips */}
      <View style={styles.contentRow}>
        {showThumbnail && (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => onViewFullReport && onViewFullReport(document)}
            style={[styles.thumbnailWrapper, { borderColor: chipBorder }]}
          >
            <Image
              source={{ uri: candidateUrl! }}
              style={styles.thumbnail}
              resizeMode="cover"
              onError={() => setImageError(true)}
            />
            <View style={styles.thumbnailOverlay}>
              <Ionicons name="scan-outline" size={14} color="#ffffff" />
            </View>
          </TouchableOpacity>
        )}

        {/* Chips Column */}
        <View style={styles.chipsContainer}>
          {/* Modality Chip (Always Shown) */}
          <View style={[styles.chip, { backgroundColor: chipBg, borderColor: chipBorder }]}>
            <MaterialCommunityIcons
              name="radiology-box"
              size={13}
              color={isDark ? "#38bdf8" : "#0284c7"}
              style={{ marginRight: 4 }}
            />
            <Text style={[styles.chipText, { color: primaryText }]}>{modalityLabel}</Text>
          </View>

          {/* Region Chip (Shown ONLY if allow-listed, labeled AI estimate) */}
          {allowListedRegionLabel && (
            <View style={[styles.chip, { backgroundColor: chipBg, borderColor: chipBorder }]}>
              <MaterialCommunityIcons
                name="human-handsup"
                size={13}
                color={isDark ? "#a78bfa" : "#7c3aed"}
                style={{ marginRight: 4 }}
              />
              <Text style={[styles.chipText, { color: primaryText }]}>
                {allowListedRegionLabel} ({ui.aiEstimate})
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Static Localized Sentence Banner (No AI free-text, no markdown) */}
      <View
        style={[
          styles.disclosureBanner,
          {
            backgroundColor: isDark ? "rgba(15, 23, 42, 0.6)" : "#f8fafc",
            borderColor: isDark ? "#334155" : "#e2e8f0",
          },
        ]}
      >
        <Ionicons
          name="shield-checkmark-outline"
          size={16}
          color={isDark ? "#38bdf8" : "#0284c7"}
          style={styles.disclosureIcon}
        />
        <Text style={[styles.disclosureText, { color: secondaryText }]}>
          {disclosure}
        </Text>
      </View>

      {/* View Full Report Button */}
      {onViewFullReport && (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => onViewFullReport(document)}
          style={[
            styles.viewReportButton,
            {
              backgroundColor: isDark ? "rgba(56, 189, 248, 0.1)" : "#f0f9ff",
              borderColor: isDark ? "rgba(56, 189, 248, 0.3)" : "#bae6fd",
            },
          ]}
        >
          <Ionicons
            name="document-text-outline"
            size={16}
            color={isDark ? "#38bdf8" : "#0284c7"}
            style={{ marginRight: 6 }}
          />
          <Text style={[styles.viewReportButtonText, { color: isDark ? "#38bdf8" : "#0284c7" }]}>
            {ui.viewFullReport}
          </Text>
        </TouchableOpacity>
      )}

      {/* Suggested Follow-up Questions (Optional) */}
      {!readOnly && suggestedQuestions.length > 0 && onQuestionPress && (
        <View style={styles.questionsContainer}>
          <Text style={[styles.questionsTitle, { color: secondaryText }]}>
            {ui.suggestedQuestionsTitle}
          </Text>
          <View style={styles.questionChips}>
            {suggestedQuestions.map((q, idx) => (
              <TouchableOpacity
                key={`q-${idx}`}
                style={[
                  styles.questionChip,
                  {
                    backgroundColor: isDark ? "#1e293b" : "#f1f5f9",
                    borderColor: isDark ? "#334155" : "#cbd5e1",
                  },
                ]}
                onPress={() => onQuestionPress(q)}
                activeOpacity={0.7}
              >
                <Text style={[styles.questionChipText, { color: primaryText }]} numberOfLines={2}>
                  {q}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginVertical: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
  },
  documentTitle: {
    fontSize: 15,
    fontWeight: "700",
    flexShrink: 1,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  contentRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  thumbnailWrapper: {
    width: 64,
    height: 64,
    borderRadius: 10,
    borderWidth: 1,
    overflow: "hidden",
    marginRight: 10,
    position: "relative",
  },
  thumbnail: {
    width: "100%",
    height: "100%",
  },
  thumbnailOverlay: {
    position: "absolute",
    bottom: 2,
    right: 2,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderRadius: 4,
    padding: 2,
  },
  chipsContainer: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
    fontWeight: "600",
  },
  disclosureBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    marginBottom: 10,
  },
  disclosureIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  disclosureText: {
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  viewReportButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  viewReportButtonText: {
    fontSize: 13,
    fontWeight: "600",
  },
  questionsContainer: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(148, 163, 184, 0.15)",
    paddingTop: 10,
  },
  questionsTitle: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 6,
  },
  questionChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  questionChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  questionChipText: {
    fontSize: 12,
  },
});
