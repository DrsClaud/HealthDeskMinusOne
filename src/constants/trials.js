export const TRIAL_LENGTH_BY_ROLE = {
  patient: 3,
  professional: 3,
  facility: 21,
  admin: 0, // Admins don't get trials - they manage org billing
};

export const getTrialLengthForRole = (role) => {
  if (!role) return TRIAL_LENGTH_BY_ROLE.patient;
  return TRIAL_LENGTH_BY_ROLE[role] || TRIAL_LENGTH_BY_ROLE.patient;
};

export const getTrialLabelForRole = (role) => {
  const length = getTrialLengthForRole(role);
  return `${length}-Day Free Trial`;
};
