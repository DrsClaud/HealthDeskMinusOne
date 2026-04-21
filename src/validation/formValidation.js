import { getAddress } from "utils/helpers/getAddress";

export const formValidation = {
  // User Information
  name: {
    required: "First name is required.",
    pattern: {
      value: /^[a-zA-Z\s-']+$/,
      message:
        "Name can only contain letters, spaces, hyphens and apostrophes.",
    },
    minLength: {
      value: 2,
      message: "Name must be at least 2 characters long.",
    },
    maxLength: {
      value: 50,
      message: "Name cannot exceed 50 characters.",
    },
  },

  lastName: {
    required: "Last name is required.",
    pattern: {
      value: /^[a-zA-Z\s-']+$/,
      message:
        "Name can only contain letters, spaces, hyphens and apostrophes.",
    },
    minLength: {
      value: 2,
      message: "Name must be at least 2 characters long.",
    },
    maxLength: {
      value: 50,
      message: "Name cannot exceed 50 characters.",
    },
  },

  email: {
    required: "Email is required.",
    pattern: {
      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}$/i,
      message: "Invalid email address.",
    },
  },

  // Password validation
  password: {
    required: "Password is required.",
    minLength: {
      value: 8,
      message: "Password must be at least 8 characters long.",
    },
    pattern: {
      value:
        /(?=^.{8,}$)((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/g,
      message:
        "Password must contain uppercase and lowercase letters, and at least one number or special character.",
    },
  },

  confirmPassword: {
    required: "Please confirm your password.",
    validate: (value, formValues) =>
      value === formValues.password || "Passwords do not match.",
  },

  // Facility Information
  facility: {
    required: "Facility is required.",
    minLength: {
      value: 2,
      message: "Facility name must be at least 2 characters long.",
    },
    maxLength: {
      value: 100,
      message: "Facility name cannot exceed 100 characters.",
    },
  },

  location: {
    required: "Facility name is required.",
  },

  address: {
    validate: {
      required: (value) => {
        if (!value) return "Facility address is required.";
        if (!getAddress(value)) {
          return "We weren't able to get an address from this location. Please choose a different address.";
        }
        return true;
      },
    },
  },

  phone: {
    pattern: {
      value: /^\+?[1-9]\d{1,14}$/,
      message: "Please enter a valid phone number.",
    },
  },

  // Legal Agreements
  privacy: {
    required: "You must agree to the privacy policy.",
  },

  terms: {
    required: "You must agree to the terms and services.",
  },

  // Optional Fields
  website: {
    pattern: {
      value: /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/,
      message: "Please enter a valid website URL.",
    },
  },

  description: {
    maxLength: {
      value: 500,
      message: "Description cannot exceed 500 characters.",
    },
  },
};
