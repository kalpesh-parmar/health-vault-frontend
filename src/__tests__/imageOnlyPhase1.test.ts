import assert from "node:assert";
import { stripMarkdown, extractFirstCleanSentence } from "../utils/textSanitizer";
import {
  isImageOnlyDocument,
  normalizeReportSummaryToDocument,
  normalizeSingleDocument,
} from "../utils/documentNormalizer";

// Legacy Skull X-Ray fixture
const legacySkullXrayFixture = {
  id: "legacy-skull-xray-001",
  fileName: "Skull_AP_LAT.jpeg",
  documentType: "IMAGING_REPORT",
  subType: "image_only_radiograph",
  isNoText: true,
  summaryEnglish: "**Skull Radiograph (X-Ray)**\n\n• The cranial vault appears intact with normal contour.\n• No acute displaced fracture is definitively identified.\n\n* * *",
  summaryInPreferredLanguage: "ખોપરીનો એક્સ-રે સાચવવામાં આવ્યો છે. કોઈ લેખિત રિપોર્ટ મળ્યો નથી.",
  preferredLanguage: "gujarati",
  keyPoints: [
    "**Skull Radiograph (X-Ray)**\n\n• The cranial vault appears intact with normal contour.\n• No acute displaced fracture is definitively identified.\n\n* * *",
  ],
  keyFindings: [],
  imageAnalysis: {
    status: "UNVERIFIED_PRELIMINARY",
    clinicallyAnalyzed: false,
    requiresClinicianReview: true,
    modality: "x_ray",
    anatomicalRegion: "Skull / Cranium",
    suggestedView: "AP / Lateral",
    imageQuality: "Adequate",
    educationalDescription: "Visual educational description of cranial vault.",
  },
  extractedStructuredData: {
    isNoText: true,
    documentInfo: {
      documentType: "IMAGING_REPORT",
      documentSubtype: "image_only_radiograph",
    },
    imageAnalysis: {
      status: "UNVERIFIED_PRELIMINARY",
      modality: "x_ray",
      educationalDescription: "Visual educational description of cranial vault.",
    },
    keyPoints: [
      "**Skull Radiograph (X-Ray)**\n\n• The cranial vault appears intact with normal contour.\n• No acute displaced fracture is definitively identified.\n\n* * *",
    ],
    keyFindings: [],
  },
};

// Standard Lab Report fixture (Regression baseline)
const standardLabReportFixture = {
  id: "lab-report-001",
  fileName: "Blood_Test.pdf",
  documentType: "LAB_REPORT",
  subType: null,
  isNoText: false,
  summaryEnglish: "Complete Blood Count shows hemoglobin at 13.5 g/dL and normal platelets.",
  preferredLanguage: "english",
  keyPoints: ["Hemoglobin: 13.5 g/dL (Normal)", "Platelet Count: 250,000 /uL (Normal)"],
  keyFindings: ["Hemoglobin: 13.5 g/dL (Normal)"],
  abnormalResults: [],
  normalResults: [{ name: "Hemoglobin", value: "13.5", unit: "g/dL", status: "Normal" }],
};

function runTests() {
  console.log("=== Running Phase 1 Unit Tests ===");

  // 1. Text Sanitizer: stripMarkdown
  console.log("\n[1] Testing stripMarkdown...");
  const markdownText = "**Skull Radiograph (X-Ray)**\n\n• The cranial vault appears intact.\n### Landmark Details\n* * *";
  const stripped = stripMarkdown(markdownText);
  assert.strictEqual(stripped.includes("**"), false, "Must strip **bold**");
  assert.strictEqual(stripped.includes("•"), false, "Must strip bullet points");
  assert.strictEqual(stripped.includes("###"), false, "Must strip headers");
  assert.strictEqual(stripped.includes("* * *"), false, "Must strip dividers");
  assert.strictEqual(stripped.includes("Skull Radiograph (X-Ray)"), true, "Must preserve text");
  console.log("✓ stripMarkdown passed");

  // 2. Text Sanitizer: extractFirstCleanSentence
  console.log("\n[2] Testing extractFirstCleanSentence...");
  const multiSentence = "**First sentence here.** Second sentence is much longer and should not be included.";
  const sentence = extractFirstCleanSentence(multiSentence);
  assert.strictEqual(sentence, "First sentence here.", "Must extract only first clean sentence");
  console.log("✓ extractFirstCleanSentence passed");

  // 3. Image-Only Document Detection
  console.log("\n[3] Testing isImageOnlyDocument detection...");
  assert.strictEqual(isImageOnlyDocument({ isNoText: true }), true, "Detects isNoText at top-level");
  assert.strictEqual(isImageOnlyDocument({ additionalInformation: { isNoText: true } }), true, "Detects isNoText in additionalInformation");
  assert.strictEqual(isImageOnlyDocument({ extractedStructuredData: { isNoText: true } }), true, "Detects isNoText in extractedStructuredData");
  assert.strictEqual(isImageOnlyDocument({ subType: "image_only_radiograph" }), true, "Detects image_only_radiograph subType");
  assert.strictEqual(isImageOnlyDocument({ subType: "image_only_ecg" }), true, "Detects image_only_ecg subType");
  assert.strictEqual(isImageOnlyDocument({ imagingOverview: { modality: "x_ray" } }), true, "Detects imagingOverview");
  assert.strictEqual(isImageOnlyDocument(standardLabReportFixture), false, "Rejects standard lab report");
  console.log("✓ isImageOnlyDocument detection passed");

  // 4. Normalizer with Legacy Skull X-Ray Fixture
  console.log("\n[4] Testing normalizeReportSummaryToDocument with legacy Skull X-Ray...");
  const normalized = normalizeReportSummaryToDocument(legacySkullXrayFixture);
  
  assert.strictEqual(normalized.isNoText, true, "Must set isNoText: true");
  assert.deepStrictEqual(normalized.keyFindings, [], "keyFindings must strictly stay [] for image-only");
  assert.deepStrictEqual(normalized.keyPoints, [], "keyPoints must strictly stay [] for image-only");
  
  // Preferred language Gujarati should take precedence over English markdown
  assert.strictEqual(
    normalized.summary,
    "ખોપરીનો એક્સ-રે સાચવવામાં આવ્યો છે. કોઈ લેખિત રિપોર્ટ મળ્યો નથી.",
    "Must prefer summaryInPreferredLanguage for Gujarati profile",
  );

  // Status UNVERIFIED_PRELIMINARY accepted & educationalDescription mapped to visualDescription
  assert.strictEqual(
    normalized.imageAnalysis?.status,
    "UNVERIFIED_PRELIMINARY",
    "Must accept imageAnalysis.status === UNVERIFIED_PRELIMINARY",
  );
  assert.strictEqual(
    normalized.imageAnalysis?.visualDescription,
    "Visual educational description of cranial vault.",
    "Must map educationalDescription to visualDescription",
  );
  console.log("✓ normalizeReportSummaryToDocument passed for skull X-ray");

  // 5. Normalizer with Document Level normalizeSingleDocument
  console.log("\n[5] Testing normalizeSingleDocument with legacy Skull X-Ray...");
  const normDoc = normalizeSingleDocument(legacySkullXrayFixture);
  assert.strictEqual(normDoc.isNoText, true, "normalizeSingleDocument must set isNoText: true");
  assert.deepStrictEqual(normDoc.keyFindings, [], "normalizeSingleDocument keyFindings must stay []");
  assert.deepStrictEqual(normDoc.keyPoints, [], "normalizeSingleDocument keyPoints must stay []");
  assert.strictEqual(
    normDoc.imageAnalysis?.visualDescription,
    "Visual educational description of cranial vault.",
    "normalizeSingleDocument must map visualDescription",
  );
  console.log("✓ normalizeSingleDocument passed for skull X-ray");

  // 6. Regression Check: Standard Lab Report
  console.log("\n[6] Testing regression on standard lab report...");
  const normLab = normalizeReportSummaryToDocument(standardLabReportFixture);
  assert.strictEqual(normLab.isNoText, false, "Standard lab report is NOT image-only");
  assert.strictEqual(Array.isArray(normLab.keyFindings) && normLab.keyFindings.length > 0, true, "Standard lab report preserves keyFindings");
  assert.strictEqual(normLab.normalResults.length, 1, "Standard lab report preserves normalResults");
  console.log("✓ Standard lab report regression passed");

  console.log("\n>>> ALL PHASE 1 FRONTEND UNIT TESTS PASSED! (6/6) <<<");
}

runTests();
