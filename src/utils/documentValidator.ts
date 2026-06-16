import MLKit from "react-native-mlkit-ocr";

const MEDICAL_KEYWORDS = [
  "hospital",
  "clinic",
  "doctor",
  "patient",
  "prescription",
  "rx",
  "diagnosis",
  "report",
  "lab",
  "health",
  "medical",
  "pharmacy",
  "scan",
  "x-ray",
  "mri",
  "blood",
  "test",
  "disease",
  "treatment",
  "medicine",
  "tablet",
  "capsule",
  "syrup",
];

export const isValidMedicalDocument = async (
  uri: string,
  isPdf: boolean = false
): Promise<boolean> => {
  // Currently skipping OCR for PDFs as requested
  if (isPdf) {
    return true;
  }

  try {
    const result = await MLKit.detectFromUri(uri);
    
    if (!result || result.length === 0) {
      return false; // No text found, likely not a document
    }

    const fullText = result
      .map((block) => block.text)
      .join(" ")
      .toLowerCase();

    // Check if the text contains any of our medical keywords
    const isValid = MEDICAL_KEYWORDS.some((keyword) =>
      fullText.includes(keyword)
    );

    return isValid;
  } catch (error) {
    console.error("OCR Validation Error:", error);
    // On error, we can choose to reject or pass. We'll reject to be strict.
    return false;
  }
};
