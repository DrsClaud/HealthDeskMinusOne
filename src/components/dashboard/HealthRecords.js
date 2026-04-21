import React, { useState, useContext } from "react";
import { useForm, Controller } from "react-hook-form";
import { db } from "services/firebase";
import { AuthContext } from "context/Auth";
import { differenceInYears } from "date-fns";
import {
  Alert,
  Box,
  Typography,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  FormHelperText,
} from "@mui/material";
import { LoadingButton } from "@mui/lab";
import { LocalHospitalRounded } from "@mui/icons-material";
import { grey } from "@mui/material/colors";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import InfoBox from "components/common/InfoBox";
import DashboardPageHeader from "components/common/DashboardPageHeader";

const HealthRecords = () => {
  const { user, userData } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm({
    defaultValues: {
      dateOfBirth: userData?.healthRecords?.dateOfBirth || "",
      sex: userData?.healthRecords?.sex || "",
    },
  });

  const watchedDateOfBirth = watch("dateOfBirth");

  // Calculate age from date of birth for InfoBox display only
  const calculateAge = (dateOfBirth) => {
    if (!dateOfBirth) return null;
    try {
      const dob = new Date(dateOfBirth);
      if (isNaN(dob.getTime())) return null;
      const age = differenceInYears(new Date(), dob);
      return age >= 0 && age <= 150 ? age : null;
    } catch {
      return null;
    }
  };

  const currentAge = calculateAge(userData?.healthRecords?.dateOfBirth);

  const validateHealthRecords = (data) => {
    // Date of birth validation
    if (data.dateOfBirth) {
      const dob = new Date(data.dateOfBirth);
      if (isNaN(dob.getTime())) {
        return "Invalid date format for date of birth";
      }
      const age = differenceInYears(new Date(), dob);
      if (age < 0 || age > 150) {
        return "Please enter a valid date of birth";
      }
      // Check if date is in the future
      if (dob > new Date()) {
        return "Date of birth cannot be in the future";
      }
    }

    // Sex validation (including "prefer-not-to-say")
    if (
      data.sex &&
      !["male", "female", "other", "prefer-not-to-say"].includes(
        data.sex.toLowerCase(),
      )
    ) {
      return "Please select a valid option for sex";
    }

    return null;
  };

  const onSubmit = async (data) => {
    setLoading(true);
    setError("");
    setSubmitted(false);

    try {
      // Validate the data
      const validationError = validateHealthRecords(data);
      if (validationError) {
        setError(validationError);
        setLoading(false);
        return;
      }

      // Prepare health records data
      const healthRecords = {};

      if (data.dateOfBirth) {
        healthRecords.dateOfBirth = data.dateOfBirth;
      }

      if (data.sex && data.sex !== "prefer-not-to-say") {
        healthRecords.sex = data.sex.toLowerCase();
      }

      // Update user document
      await db.collection("users").doc(user.uid).update({
        healthRecords: healthRecords,
      });

      setSubmitted("Your health records have been updated successfully.");
      setLoading(false);
    } catch (err) {
      console.error("Error updating health records:", err);
      setError("Failed to update health records. Please try again.");
      setLoading(false);
    }
  };

  const maxDate = new Date().toISOString().split("T")[0]; // Today's date in YYYY-MM-DD format

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <div className="inner">
        <DashboardPageHeader
          title="My HealthRecords"
          subtitle={
            <Typography>
              Provide your basic health information to help our assistants give
              you more personalized medical guidance. Your information is
              encrypted and secure. See our{" "}
              <a href="/privacy-policy" target="_blank" rel="noopener noreferrer">
                Privacy Policy
              </a>{" "}
              for details.
            </Typography>
          }
        />

        {submitted && (
          <Alert severity="success" sx={{ mb: 3, maxWidth: 540 }}>
            {submitted}
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 3, maxWidth: 540 }}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)}>
          {/* Date of Birth */}
          <Typography
            variant="body"
            sx={{ color: grey[700], display: "block", mb: 1 }}
          >
            Date of Birth
          </Typography>

          <Box sx={{ maxWidth: 540, mb: 2 }}>
            <Controller
              name="dateOfBirth"
              control={control}
              rules={{
                required: "Date of birth is required for age calculation",
              }}
              render={({ field, fieldState: { error } }) => (
                <DatePicker
                  {...field}
                  value={field.value ? new Date(field.value) : null}
                  onChange={(date) => {
                    field.onChange(
                      date ? date.toISOString().split("T")[0] : "",
                    );
                  }}
                  maxDate={new Date()}
                  format="MM/dd/yyyy"
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      variant: "standard",
                      error: !!error,
                      helperText:
                        error?.message ||
                        "Used only for age calculation in medical guidance.",
                    },
                  }}
                />
              )}
            />
          </Box>

          {/* Sex */}
          <Typography
            variant="body"
            sx={{ color: grey[700], display: "block", mb: 0 }}
          >
            Sex
          </Typography>

          <Box sx={{ maxWidth: 540, mb: 3 }}>
            <Controller
              name="sex"
              control={control}
              render={({ field, fieldState: { error } }) => (
                <FormControl component="fieldset" error={!!error} fullWidth>
                  <RadioGroup {...field} row>
                    <FormControlLabel
                      value="male"
                      control={<Radio size="small" />}
                      label="Male"
                      sx={{ mr: 2 }}
                    />
                    <FormControlLabel
                      value="female"
                      control={<Radio size="small" />}
                      label="Female"
                      sx={{ mr: 2 }}
                    />
                    <FormControlLabel
                      value="prefer-not-to-say"
                      control={<Radio size="small" />}
                      label="Prefer Not To Say"
                      sx={{ mr: 0 }}
                    />
                  </RadioGroup>
                  {error && (
                    <FormHelperText sx={{ ml: 0 }}>
                      {error.message}
                    </FormHelperText>
                  )}
                  <FormHelperText sx={{ ml: 0 }}>
                    Used for medical guidance. Some conditions and treatments
                    vary by sex.
                  </FormHelperText>
                </FormControl>
              )}
            />
          </Box>

          <LoadingButton
            type="submit"
            variant="contained"
            loading={loading}
            disabled={loading}
            size="large"
          >
            Update Health Records
          </LoadingButton>
        </form>

        {/* Test Chat Component */}
        {/* <MiniChat /> */}
      </div>
    </LocalizationProvider>
  );
};

export default HealthRecords;
