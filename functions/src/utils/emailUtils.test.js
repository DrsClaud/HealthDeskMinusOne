const { normalizeEmail } = require("./emailUtils");

describe("normalizeEmail", () => {
  describe("Gmail addresses", () => {
    test("removes plus addressing", () => {
      expect(normalizeEmail("user+trick@gmail.com")).toBe("user@gmail.com");
      expect(normalizeEmail("user+test123@gmail.com")).toBe("user@gmail.com");
      expect(normalizeEmail("john+spam@gmail.com")).toBe("john@gmail.com");
    });

    test("removes dots from local part", () => {
      expect(normalizeEmail("user.name@gmail.com")).toBe("username@gmail.com");
      expect(normalizeEmail("j.o.h.n@gmail.com")).toBe("john@gmail.com");
      expect(normalizeEmail("first.last@gmail.com")).toBe("firstlast@gmail.com");
    });

    test("handles both dots and plus addressing", () => {
      expect(normalizeEmail("user.name+trick@gmail.com")).toBe(
        "username@gmail.com"
      );
      expect(normalizeEmail("first.last+test@gmail.com")).toBe(
        "firstlast@gmail.com"
      );
    });

    test("normalizes googlemail.com to gmail.com", () => {
      expect(normalizeEmail("user@googlemail.com")).toBe("user@gmail.com");
      expect(normalizeEmail("user+trick@googlemail.com")).toBe(
        "user@gmail.com"
      );
      expect(normalizeEmail("user.name@googlemail.com")).toBe(
        "username@gmail.com"
      );
    });

    test("converts to lowercase", () => {
      expect(normalizeEmail("User@Gmail.com")).toBe("user@gmail.com");
      expect(normalizeEmail("USER+TRICK@GMAIL.COM")).toBe("user@gmail.com");
    });
  });

  describe("Non-Gmail addresses", () => {
    test("removes plus addressing but keeps dots", () => {
      expect(normalizeEmail("user+trick@yahoo.com")).toBe("user@yahoo.com");
      expect(normalizeEmail("user.name+test@outlook.com")).toBe(
        "user.name@outlook.com"
      );
      expect(normalizeEmail("first.last+spam@company.com")).toBe(
        "first.last@company.com"
      );
    });

    test("converts to lowercase", () => {
      expect(normalizeEmail("User@Yahoo.com")).toBe("user@yahoo.com");
      expect(normalizeEmail("USER+TRICK@OUTLOOK.COM")).toBe(
        "user@outlook.com"
      );
    });
  });

  describe("Edge cases", () => {
    test("handles null/undefined/empty", () => {
      expect(normalizeEmail(null)).toBe(null);
      expect(normalizeEmail(undefined)).toBe(undefined);
      expect(normalizeEmail("")).toBe("");
    });

    test("handles invalid email formats", () => {
      expect(normalizeEmail("notanemail")).toBe("notanemail");
      expect(normalizeEmail("@gmail.com")).toBe("@gmail.com");
    });

    test("trims whitespace", () => {
      expect(normalizeEmail("  user@gmail.com  ")).toBe("user@gmail.com");
      expect(normalizeEmail(" user+trick@gmail.com ")).toBe("user@gmail.com");
    });
  });
});

