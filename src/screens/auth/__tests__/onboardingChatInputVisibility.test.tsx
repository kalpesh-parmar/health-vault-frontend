describe("Onboarding Chat Input Visibility Tests", () => {
  const isChatInputHiddenForAction = (activeAction: string) => {
    return (
      activeAction === "ASK_LANGUAGE" ||
      activeAction === "ASK_UPLOAD_OR_SKIP" ||
      activeAction === "RESOLVE_PROFILE_SOURCE" ||
      activeAction === "ASK_GENDER" ||
      activeAction === "ASK_DOB" ||
      activeAction === "ASK_BLOOD_GROUP" ||
      activeAction === "ASK_ALLERGIES" ||
      activeAction === "REVIEW_MEDICINES_LIST" ||
      activeAction === "ADD_MEDICINE" ||
      activeAction === "EDIT_MEDICINE" ||
      activeAction === "CONFIRM_MEDICINE" ||
      activeAction === "MEDICINE_OPTIONS" ||
      activeAction === "ASK_REPORT" ||
      activeAction === "POST_ONBOARDING" ||
      activeAction === "COMPLETE"
    );
  };

  it("hides chat text input when activeAction is ASK_BLOOD_GROUP", () => {
    expect(isChatInputHiddenForAction("ASK_BLOOD_GROUP")).toBe(true);
  });

  it("hides chat text input when activeAction is ASK_ALLERGIES", () => {
    expect(isChatInputHiddenForAction("ASK_ALLERGIES")).toBe(true);
  });

  it("shows chat text input for freeform text questions (e.g. ASK_FIRST_NAME, ASK_LAST_NAME)", () => {
    expect(isChatInputHiddenForAction("ASK_FIRST_NAME")).toBe(false);
    expect(isChatInputHiddenForAction("ASK_LAST_NAME")).toBe(false);
  });
});
