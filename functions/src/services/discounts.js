const functions = require("firebase-functions");

exports.validateDiscountCode = functions.https.onCall(async (data, context) => {
  const { code } = data;
  const VALID_CODE = "STUDENT7";

  try {
    return {
      valid: code === VALID_CODE,
      message:
        code === VALID_CODE
          ? "Discount code applied successfully."
          : "Invalid discount code.",
    };
  } catch (error) {
    console.error("Discount validation error:", error);
    throw new functions.https.HttpsError(
      "internal",
      "Error validating discount code."
    );
  }
});
