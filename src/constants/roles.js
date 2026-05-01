export const PATIENT_FAMILY_ROLES = ["patient", "p4"];
export const CHARTMIND_ADMIN_ROLES = ["chartmind-admin", "chartmind-kijabe"];

export const isPatientFamilyRole = (role) =>
  PATIENT_FAMILY_ROLES.includes(role);

export const isChartmindAdminRole = (role) =>
  CHARTMIND_ADMIN_ROLES.includes(role);
