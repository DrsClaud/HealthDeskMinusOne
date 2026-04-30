export const PATIENT_FAMILY_ROLES = ["patient", "p4"];

export const isPatientFamilyRole = (role) =>
  PATIENT_FAMILY_ROLES.includes(role);
