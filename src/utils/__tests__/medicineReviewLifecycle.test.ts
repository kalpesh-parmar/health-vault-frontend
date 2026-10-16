import {
  isMedicineReviewMessage,
  getLatestMedicineReviewMessage,
  isMedicineReviewResolved,
  computeMedicineReviewReadOnly,
} from "../medicineReviewLifecycle";

describe("Medicine Review Card Lifecycle & Single-Active Enforcement", () => {
  const makeReviewMsg = (id: string, medicines: any[] = [{ id: "m1", name: "MBSON" }]) => ({
    id,
    role: "ai",
    action: "REVIEW_MEDICINES_LIST",
    medicines,
    createdAt: "2026-10-16T10:00:00.000Z",
  });

  const makeDocumentReviewMsg = (id: string, medicines: any[] = [{ id: "m2", name: "Caldison D3" }]) => ({
    id,
    role: "ai",
    action: "ADD_DOCUMENT",
    medicines,
    mode: "ACTION",
    createdAt: "2026-10-16T10:05:00.000Z",
  });

  const makeUserChatMsg = (id: string, text: string) => ({
    id,
    role: "user",
    text,
    createdAt: "2026-10-16T10:06:00.000Z",
  });

  const makeAssistantChatMsg = (id: string, text: string) => ({
    id,
    role: "ai",
    text,
    createdAt: "2026-10-16T10:07:00.000Z",
  });

  test("Single review card when newly uploaded is editable", () => {
    const reviewA = makeReviewMsg("review-A");
    const messages = [reviewA];

    const result = computeMedicineReviewReadOnly(messages, reviewA, true);
    expect(result.isReadOnly).toBe(false);
    expect(result.isCurrentActiveReview).toBe(true);
  });

  test("STRICT REQUIREMENT: Review A unanswered, Review B uploaded -> Review A disabled and Review B editable", () => {
    const reviewA = makeReviewMsg("review-A", [{ id: "m1", name: "MBSON" }]);
    const reviewB = makeDocumentReviewMsg("review-B", [{ id: "m2", name: "Caldison D3" }]);
    const messages = [reviewA, reviewB];

    // Review A (historical unanswered review) MUST be read-only
    const resultA = computeMedicineReviewReadOnly(messages, reviewA, true);
    expect(resultA.isReadOnly).toBe(true);
    expect(resultA.isCurrentActiveReview).toBe(false);

    // Review B (the latest review) MUST be editable
    const resultB = computeMedicineReviewReadOnly(messages, reviewB, true);
    expect(resultB.isReadOnly).toBe(false);
    expect(resultB.isCurrentActiveReview).toBe(true);
  });

  test("Review A unanswered, Review B uploaded, Review C uploaded -> only Review C is editable", () => {
    const reviewA = makeReviewMsg("review-A");
    const reviewB = makeDocumentReviewMsg("review-B");
    const reviewC = makeReviewMsg("review-C");
    const messages = [reviewA, reviewB, reviewC];

    expect(computeMedicineReviewReadOnly(messages, reviewA, true)).toEqual({
      isReadOnly: true,
      isCurrentActiveReview: false,
    });
    expect(computeMedicineReviewReadOnly(messages, reviewB, true)).toEqual({
      isReadOnly: true,
      isCurrentActiveReview: false,
    });
    expect(computeMedicineReviewReadOnly(messages, reviewC, true)).toEqual({
      isReadOnly: false,
      isCurrentActiveReview: true,
    });
  });

  test("Pending review followed by unrelated chat messages remains editable", () => {
    const reviewA = makeReviewMsg("review-A");
    const userQuestion = makeUserChatMsg("user-1", "Can you explain this lab report?");
    const assistantReply = makeAssistantChatMsg("ai-1", "The lab report shows normal blood sugar.");
    const messages = [reviewA, userQuestion, assistantReply];

    const result = computeMedicineReviewReadOnly(messages, reviewA, true);
    expect(result.isReadOnly).toBe(false);
    expect(result.isCurrentActiveReview).toBe(true);
  });

  test("Confirmed review card becomes locked/read-only", () => {
    const reviewA = makeReviewMsg("review-A");
    const userConfirm = {
      id: "user-confirm",
      role: "user",
      action: "CONFIRM_MEDICINES",
      rawValue: JSON.stringify({ selected: ["m1"] }),
    };
    const assistantConfirm = {
      id: "ai-confirm",
      role: "ai",
      action: "CONFIRM_MEDICINES",
      isConfirmed: true,
    };
    const messages = [reviewA, userConfirm, assistantConfirm];

    const result = computeMedicineReviewReadOnly(messages, reviewA, true);
    expect(result.isReadOnly).toBe(true);
    expect(result.isCurrentActiveReview).toBe(false);
  });

  test("Cancelled/Skipped review card becomes locked/read-only", () => {
    const reviewA = makeReviewMsg("review-A");
    const userSkip = {
      id: "user-skip",
      role: "user",
      action: "SKIP_MEDICINES",
      rawValue: JSON.stringify({ skipAll: true }),
    };
    const messages = [reviewA, userSkip];

    const result = computeMedicineReviewReadOnly(messages, reviewA, true);
    expect(result.isReadOnly).toBe(true);
    expect(result.isCurrentActiveReview).toBe(false);
  });

  test("Locally confirmed review card is immediately locked", () => {
    const reviewA = {
      ...makeReviewMsg("review-A"),
      isConfirmed: true,
    };
    const messages = [reviewA];

    const result = computeMedicineReviewReadOnly(messages, reviewA, true);
    expect(result.isReadOnly).toBe(true);
    expect(result.isCurrentActiveReview).toBe(false);
  });

  test("Locally cancelled review card is immediately locked", () => {
    const reviewA = {
      ...makeReviewMsg("review-A"),
      isCancelled: true,
    };
    const messages = [reviewA];

    const result = computeMedicineReviewReadOnly(messages, reviewA, true);
    expect(result.isReadOnly).toBe(true);
    expect(result.isCurrentActiveReview).toBe(false);
  });

  test("Historical onboarding review message is locked when onboarding completed", () => {
    const onboardingReview = {
      ...makeReviewMsg("onboarding-review"),
      isOnboardingMessage: true,
    };
    const messages = [onboardingReview];

    const result = computeMedicineReviewReadOnly(messages, onboardingReview, true);
    expect(result.isReadOnly).toBe(true);
    expect(result.isCurrentActiveReview).toBe(false);
  });

  test("Chat reload scenario: Review A unanswered and Review B unanswered -> Review A locked, Review B active", () => {
    // Simulates history fetched on app reload
    const reviewA = makeReviewMsg("hist-A");
    const reviewB = makeDocumentReviewMsg("hist-B");
    const reloadedMessages = [reviewA, reviewB];

    expect(computeMedicineReviewReadOnly(reloadedMessages, reviewA, true).isReadOnly).toBe(true);
    expect(computeMedicineReviewReadOnly(reloadedMessages, reviewB, true).isReadOnly).toBe(false);
  });
});
