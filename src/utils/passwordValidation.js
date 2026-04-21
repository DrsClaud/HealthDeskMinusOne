/**
 * HIPAA-aligned password validation rules for react-hook-form.
 *
 * Follows NIST SP 800-63B guidance adapted for healthcare:
 *   - Minimum 8 characters
 *   - At least one uppercase letter
 *   - At least one lowercase letter
 *   - At least one number
 *   - At least one special character
 */
export const passwordRules = {
  required: "Password is required.",
  minLength: {
    value: 8,
    message: "Password must be at least 8 characters.",
  },
  validate: {
    hasUppercase: (v) =>
      /[A-Z]/.test(v) || "Password must contain at least one uppercase letter.",
    hasLowercase: (v) =>
      /[a-z]/.test(v) || "Password must contain at least one lowercase letter.",
    hasNumber: (v) =>
      /\d/.test(v) || "Password must contain at least one number.",
    hasSpecial: (v) =>
      /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(v) ||
      "Password must contain at least one special character.",
  },
};

/**
 * Requirements list for display as a hint below the password field.
 * Each item has a label and a test function for real-time feedback.
 */
export const passwordRequirements = [
  { label: "At least 8 characters", test: (v) => v.length >= 8 },
  { label: "One uppercase letter", test: (v) => /[A-Z]/.test(v) },
  { label: "One lowercase letter", test: (v) => /[a-z]/.test(v) },
  { label: "One number", test: (v) => /\d/.test(v) },
  {
    label: "One special character",
    test: (v) => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(v),
  },
];
