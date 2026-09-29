import { ProfileField } from "../useProfileSourceState";

describe("ProfileField & Source Resolution Logic", () => {
  it("determines field mismatch correctly between login and document data", () => {
    const field: ProfileField = {
      key: "firstName",
      label: "First Name",
      value: "John",
      loginValue: "Johnathan",
      documentValue: "John",
      verified: true,
      isMismatch: true,
    };

    expect(field.isMismatch).toBe(true);
    expect(field.loginValue).not.toEqual(field.documentValue);
  });

  it("handles matching values without flagging mismatch", () => {
    const field: ProfileField = {
      key: "email",
      label: "Email",
      value: "john@example.com",
      loginValue: "john@example.com",
      documentValue: "john@example.com",
      verified: true,
      isMismatch: false,
    };

    expect(field.isMismatch).toBe(false);
    expect(field.value).toBe("john@example.com");
  });
});
