import { ChatMessage } from "../types/chat";
import { ExtractedMedicine } from "../types/medicationReview";
import { AddOrEditMedication } from "../types";

export const LOCALE_TAG_MAP: Record<string, string> = {
  english: "en-US",
  en: "en-US",
  gujarati: "gu-IN",
  gu: "gu-IN",
  hindi: "hi-IN",
  hi: "hi-IN",
  marathi: "mr-IN",
  mr: "mr-IN",
  tamil: "ta-IN",
  ta: "ta-IN",
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
  preferredLang: string,
  tFunc: (key: string) => string
): string => {
  const now = new Date();
  const todayKey = getLocalDayKey(now);

  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const yesterdayKey = getLocalDayKey(yesterday);

  const targetKey = getLocalDayKey(date);

  if (targetKey === todayKey) {
    return tFunc("today");
  }
  if (targetKey === yesterdayKey) {
    return tFunc("yesterday");
  }

  const localeTag = LOCALE_TAG_MAP[preferredLang] || LOCALE_TAG_MAP.english;
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

export const buildChatHistory = (messages: ChatMessage[]) =>
  messages.map((m) => ({
    role: m.role === "ai" ? "assistant" : "user",
    content: m.text,
  }));

export const getTodayDateString = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/**
 * Return reminder times in the chat/form representation (HH:mm).
 * Schedules can arrive from the API as either an array or a keyed object,
 * and API values may include seconds.
 */
export const normalizeMedicationScheduleTimes = (schedule: any): string[] => {
  const values: any[] = [];

  const collect = (value: any) => {
    if (Array.isArray(value)) {
      value.forEach(collect);
    } else if (typeof value === "string" && value.includes(":")) {
      values.push(value);
    }
  };

  collect(schedule);
  if (schedule && typeof schedule === "object" && !Array.isArray(schedule)) {
    Object.values(schedule).forEach(collect);
  }

  return Array.from(
    new Set(
      values
        .map((value) => value.trim().split(":").slice(0, 2).join(":"))
        .filter((value) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value)),
    ),
  ).sort();
};

export const buildMedicationSchedulePayload = (schedule: any): Record<string, any> => {
  const scheduleObj: Record<string, any> = {};
  normalizeMedicationScheduleTimes(schedule).forEach((time) => {
    const key = time === "08:00" ? "MORNING" : time === "14:00" ? "NOON" : time === "20:00" ? "NIGHT" : "CUSTOM";
    const value = `${time}:00`;
    if (scheduleObj[key]) {
      scheduleObj[key] = Array.isArray(scheduleObj[key])
        ? [...scheduleObj[key] as string[], value]
        : [scheduleObj[key] as string, value];
    } else {
      scheduleObj[key] = key === "CUSTOM" ? [value] : value;
    }
  });
  return scheduleObj;
};

export const buildMedicationPayload = (
  med: ExtractedMedicine
): AddOrEditMedication => {
  const scheduleObj = buildMedicationSchedulePayload(med.medicationSchedule);

  let freqLabel = "Once Daily";
  if (med.frequency === "TWICE" || med.frequency === "Twice Daily")
    freqLabel = "Twice Daily";
  else if (med.frequency === "THRICE" || med.frequency === "3x Daily")
    freqLabel = "3x Daily";

  let normalizedFoodFreq = "AFTER_FOOD";
  const rawFood = (
    med.foodFrequency ||
    med.timing ||
    "AFTER_FOOD"
  ).toUpperCase();
  if (rawFood.includes("BEFORE") || rawFood.includes("PRE")) {
    normalizedFoodFreq = "BEFORE_FOOD";
  }

  return {
    medicationName: med.name.trim(),
    medicationType: (med.medicineType || "TABLET").toUpperCase(),
    prescribedBy: med.prescribedBy || "",
    dosePerIntake: parseFloat(med.dosage || "1") || 1,
    frequency: freqLabel,
    foodFrequency: normalizedFoodFreq,
    startDate:
      med.startDate && med.startDate !== "None"
        ? med.startDate
        : getTodayDateString(),
    ongoing: true,
    medicationSchedule: scheduleObj,
    totalQuantity: med.totalQuantity || 10,
    notes: med.notes || "",
    resolution: med.resolution,
    replaceMedicationId: med.replaceMedicationId,
  };
};
