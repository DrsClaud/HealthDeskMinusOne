/**
 * Normalize email addresses to prevent +trick and dot variations
 * This helps prevent users from creating multiple accounts with the same email
 */

/**
 * Normalizes an email address by removing Gmail tricks:
 * - Removes everything after + in the local part (username+trick@gmail.com -> username@gmail.com)
 * - Removes dots from Gmail addresses (user.name@gmail.com -> username@gmail.com)
 * - Also applies to googlemail.com (Gmail's alternative domain)
 *
 * @param {string} email - The email address to normalize
 * @returns {string} - The normalized email address
 */
const normalizeEmail = (email) => {
  if (!email || typeof email !== "string") {
    return email;
  }

  const emailLower = email.toLowerCase().trim();
  const [localPart, domain] = emailLower.split("@");

  if (!domain) {
    return emailLower;
  }

  let normalizedLocal = localPart;

  // Gmail-specific normalization
  if (domain === "gmail.com" || domain === "googlemail.com") {
    // Remove everything after + (plus addressing)
    normalizedLocal = normalizedLocal.split("+")[0];
    // Remove all dots (Gmail ignores dots in addresses)
    normalizedLocal = normalizedLocal.replace(/\./g, "");
  } else {
    // For other providers, just remove everything after + (most support this)
    // Don't remove dots as other providers may treat them as significant
    normalizedLocal = normalizedLocal.split("+")[0];
  }

  // Always use gmail.com for googlemail.com addresses
  const normalizedDomain = domain === "googlemail.com" ? "gmail.com" : domain;

  return `${normalizedLocal}@${normalizedDomain}`;
};

module.exports = {
  normalizeEmail,
};

