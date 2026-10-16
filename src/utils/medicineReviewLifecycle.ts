function parseChosenJson(val: any): any {
  if (!val) return null;
  if (typeof val === "object") return val;
  if (typeof val !== "string") return null;
  const trimmed = val.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
    return null;
  }
  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}

export interface MedicineReviewResolution {
  isResolved: boolean;
  resolvedAction: "CONFIRM" | "SKIP" | "ADD" | "SUPERSEDED" | "HISTORICAL_ONBOARDING" | null;
}

/**
 * Checks whether a message represents a medicine review card or flow step.
 */
export function isMedicineReviewMessage(msg: any): boolean {
  if (!msg) return false;
  const action =
    msg.action ||
    msg.actionType ||
    msg.metadata?.actionType ||
    msg.metadata?.action;
  const mode = msg.mode || msg.metadata?.mode;
  const meds = msg.medicines || msg.metadata?.medicines;
  const hasMeds = Array.isArray(meds) && meds.length > 0;

  if (
    action === "REVIEW_MEDICINES_LIST" ||
    action === "ADD_MEDICINE" ||
    action === "EDIT_MEDICINE"
  ) {
    return true;
  }

  if (
    (action === "ADD_DOCUMENT" || action === "ACTION" || mode === "ACTION") &&
    hasMeds
  ) {
    return true;
  }

  return false;
}

/**
 * Finds the latest (most recent) medicine review assistant message in chronological order.
 */
export function getLatestMedicineReviewMessage(messages: any[]): any | null {
  if (!Array.isArray(messages) || messages.length === 0) return null;
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m && (m.role === "ai" || m.role === "assistant") && isMedicineReviewMessage(m)) {
      return m;
    }
  }
  return null;
}

/**
 * Checks whether a specific medicine review message has been resolved (confirmed, skipped, or superseded).
 */
export function isMedicineReviewResolved(
  messages: any[],
  item: any,
  isOnboardingCompleted?: boolean
): MedicineReviewResolution {
  if (!item) {
    return { isResolved: false, resolvedAction: null };
  }

  // 1. Locally marked confirmed
  if (
    Boolean(item.isConfirmed) ||
    Boolean(item.medicinesConfirmed) ||
    item.action === "CONFIRM_MEDICINES" ||
    item.actionType === "CONFIRM_MEDICINES" ||
    item.metadata?.isConfirmed === true
  ) {
    return { isResolved: true, resolvedAction: "CONFIRM" };
  }

  // 2. Locally marked cancelled / skipped
  if (
    Boolean(item.isCancelled) ||
    item.action === "SKIP_MEDICINES" ||
    item.actionType === "SKIP_MEDICINES" ||
    item.metadata?.skipAll === true
  ) {
    return { isResolved: true, resolvedAction: "SKIP" };
  }

  // 3. Historical onboarding message when onboarding is completed
  if (item.isOnboardingMessage && isOnboardingCompleted) {
    return { isResolved: true, resolvedAction: "HISTORICAL_ONBOARDING" };
  }

  if (!Array.isArray(messages) || messages.length === 0) {
    return { isResolved: false, resolvedAction: null };
  }

  const itemIdx = messages.findIndex((m) => m && m.id === item.id);
  if (itemIdx === -1) {
    return { isResolved: false, resolvedAction: null };
  }

  // 4. Scan subsequent messages in chronological order
  for (let i = itemIdx + 1; i < messages.length; i++) {
    const nextMsg = messages[i];
    if (!nextMsg) continue;

    const nextAction =
      nextMsg.action ||
      nextMsg.actionType ||
      nextMsg.metadata?.actionType ||
      nextMsg.metadata?.action;

    // A newer review message exists -> this review was superseded
    if (
      (nextMsg.role === "ai" || nextMsg.role === "assistant") &&
      isMedicineReviewMessage(nextMsg)
    ) {
      return { isResolved: true, resolvedAction: "SUPERSEDED" };
    }

    // Confirmation message
    if (
      nextAction === "CONFIRM_MEDICINES" ||
      nextMsg.isConfirmed ||
      nextMsg.metadata?.isConfirmed
    ) {
      return { isResolved: true, resolvedAction: "CONFIRM" };
    }

    // Skip / cancellation message
    if (
      nextAction === "SKIP_MEDICINES" ||
      nextMsg.metadata?.skipAll === true ||
      nextMsg.rawValue?.skipAll === true
    ) {
      return { isResolved: true, resolvedAction: "SKIP" };
    }

    // Transition to ADD_MEDICINE from this review
    if (nextAction === "ADD_MEDICINE") {
      return { isResolved: true, resolvedAction: "ADD" };
    }

    // User reply inspection
    if (nextMsg.role === "user") {
      const parsed = parseChosenJson(nextMsg.rawValue);
      if (
        parsed?.selected !== undefined ||
        (nextMsg.rawValue &&
          typeof nextMsg.rawValue === "object" &&
          (nextMsg.rawValue as any).selected)
      ) {
        return { isResolved: true, resolvedAction: "CONFIRM" };
      }
      if (
        parsed?.skipAll === true ||
        (nextMsg.rawValue &&
          typeof nextMsg.rawValue === "object" &&
          (nextMsg.rawValue as any).skipAll)
      ) {
        return { isResolved: true, resolvedAction: "SKIP" };
      }
      if (parsed?.addNew === true || nextMsg.rawValue === "ADD") {
        return { isResolved: true, resolvedAction: "ADD" };
      }

      // Explicit localized confirmation or cancellation labels
      const userText = String(nextMsg.text || nextMsg.content || "").toLowerCase().trim();
      if (
        userText === "continue" ||
        userText === "confirm selection" ||
        userText === "confirm selected" ||
        userText === "આગળ વધો" ||
        userText === "आगे बढ़ें" ||
        userText === "पुढे जा" ||
        userText === "தொடரவும்"
      ) {
        return { isResolved: true, resolvedAction: "CONFIRM" };
      }
      if (
        userText === "skip all" ||
        userText === "cancel" ||
        userText === "બધું છોડો" ||
        userText === "રદ કરો" ||
        userText === "सभी छोड़ें" ||
        userText === "રદ્દ કરે"
      ) {
        return { isResolved: true, resolvedAction: "SKIP" };
      }

      // Any other user text (e.g., questions about the report) is NOT confirmation/cancellation!
    }
  }

  return { isResolved: false, resolvedAction: null };
}

/**
 * Computes read-only and active status for a medicine review card.
 * STRICT ENFORCEMENT: Exactly ONE medicine review card can be active per session.
 * All previous reviews are read-only, even if unanswered.
 */
export function computeMedicineReviewReadOnly(
  messages: any[],
  item: any,
  isOnboardingCompleted?: boolean
): { isReadOnly: boolean; isCurrentActiveReview: boolean } {
  if (!isMedicineReviewMessage(item)) {
    return { isReadOnly: false, isCurrentActiveReview: false };
  }

  // 1. Must be the latest medicine review message in the entire session
  const latestReviewMsg = getLatestMedicineReviewMessage(messages);
  const isLatestReview = Boolean(latestReviewMsg && latestReviewMsg.id === item.id);

  if (!isLatestReview) {
    // A newer review exists; this review is superseded and MUST be read-only
    return { isReadOnly: true, isCurrentActiveReview: false };
  }

  // 2. The latest review is editable ONLY if it is not resolved/confirmed/cancelled
  const resolution = isMedicineReviewResolved(messages, item, isOnboardingCompleted);
  if (resolution.isResolved) {
    return { isReadOnly: true, isCurrentActiveReview: false };
  }

  return { isReadOnly: false, isCurrentActiveReview: true };
}
