const PERSONAL_EMAIL_DOMAINS = [
  "gmail.com",
  "yahoo.com",
  "hotmail.com",
  "outlook.com",
  "aol.com",
  "icloud.com",
  "protonmail.com",
  "mail.com",
  "zoho.com",
  "me.com",
  "live.com",
  "msn.com",
  "ymail.com",
  "inbox.com",
  "fastmail.com",
  "gmx.com",
  "mac.com",
];

export const isLikelyWorkEmail = (email) => {
  if (!email) return false;

  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) return false;

  // If it's a known personal email domain, it's not a work email
  return !PERSONAL_EMAIL_DOMAINS.includes(domain);
};
