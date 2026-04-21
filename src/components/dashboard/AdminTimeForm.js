import React, { useContext, useState, useEffect, useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import { db } from "services/firebase";
import firebase from "firebase/compat/app";
import {
  calculateHlthdskScore,
  getActiveWaitTime,
} from "utils/locationProcessing";
import { Link } from "react-router-dom";
import { subHours, isBefore, isToday, format } from "date-fns";

import SeatRating from "../SeatRating";
import CurrentWaitTimeDisplay from 'components/scheduler/CurrentWaitTimeDisplay';
import {
  Alert,
  Box,
  FormControlLabel,
  RadioGroup,
  Radio,
  CircularProgress,
  FormHelperText,
  List,
  ListItem,
  ListItemText,
  Typography,
  FormControl,
  Divider,
  Snackbar,
  IconButton,
  Checkbox,
  FormGroup,
} from "@mui/material";
import { LoadingButton } from "@mui/lab";
import { PhoneInput } from "components/common/form/inputs/PhoneInput";
import { grey } from "@mui/material/colors";
import { AuthContext } from "context/Auth";
import CloseIcon from "@mui/icons-material/Close";

// Consistent max width for all form sections
const FORM_MAX_WIDTH = 540;

const AdminTimeForm = ({ data }) => {
  const { user, subscription, userData, userLoading } = useContext(AuthContext);
  const {
    handleSubmit,
    register,
    control,
    watch,
    formState: { errors },
  } = useForm();
  const [loading, setLoading] = useState(false);
  const [loadingWaitTime, setLoadingWaitTime] = useState(false);
  const [loadingCapabilities, setLoadingCapabilities] = useState(false);
  const [submittedWaitTime, setSubmittedWaitTime] = useState(false);
  const [submittedCapabilities, setSubmittedCapabilities] = useState(false);
  const [dbError, setDbError] = useState(false);
  const [needsUpdate, setNeedsUpdate] = useState(false);
  const [dataProcessed, setDataProcessed] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");

  // Watch the time field value
  const watchedTime = watch("time");

  // Use the shared active wait time function
  const activeMapTime = useMemo(
    () => getActiveWaitTime(data, needsUpdate),
    [data, needsUpdate]
  );

  useEffect(() => {
    if (!data || !data.id) {
      // Data not yet loaded
      setDataProcessed(false);
      return;
    }

    setDataProcessed(true);

    if (!data?.waitTimes?.length) {
      setNeedsUpdate(true);
      return;
    }

    // Find the most recent admin update
    const adminUpdates = data.waitTimes.filter((entry) => entry.admin);
    if (adminUpdates.length > 0) {
      // Sort by date in descending order
      const sortedUpdates = [...adminUpdates].sort((a, b) => b.date - a.date);
      const mostRecentUpdate = sortedUpdates[0];

      // Check if the most recent update is older than 24 hours
      const twentyFourHoursAgo = subHours(new Date(), 24);
      const updateDate = new Date(mostRecentUpdate.date);

      // Only set needsUpdate if the date is in the past and older than 24 hours
      if (updateDate < new Date() && isBefore(updateDate, twentyFourHoursAgo)) {
        setNeedsUpdate(true);
      } else {
        setNeedsUpdate(false);
      }
    } else {
      setNeedsUpdate(true);
    }
  }, [data]);

  const onSubmit = (values) => {
    setLoadingCapabilities(true);
    setNeedsUpdate(false);

    // Create capabilities object - values are now boolean from checkboxes
    const capabilities = {
      lab: values.lab === true,
      xray: values.xray === true,
      ultrasound: values.ultrasound === true,
      ct: values.ct === true,
      mri: values.mri === true,
    };

    // Top-level properties that shouldn't be in waitTimes
    const facilityProperties = {
      // customPhone: values.customPhone, // COMMENTED OUT: Field removed from form
    };

    // Create a copy of the data object with the new capabilities
    const updatedData = {
      ...data,
      ...facilityProperties,
      capabilities: capabilities || data.capabilities,
    };

    // Calculate updated My HealthDesk score
    const hlthdskScore = calculateHlthdskScore(updatedData);

    // Update document with new data
    const updateData = {
      // ...facilityProperties, // COMMENTED OUT: No facility properties to update
      hlthdsk_score: hlthdskScore,
    };

    // Only add capabilities if they exist
    if (capabilities) {
      updateData.capabilities = capabilities;
    }

    db.collection("locations")
      .doc(String(data.id))
      .update(updateData)
      .then(function () {
        setLoadingCapabilities(false);
        setSubmittedCapabilities(true);
        setSnackbarMessage("Capabilities have been updated successfully.");
        setSnackbarSeverity("success");
        setSnackbarOpen(true);
      })
      .catch(function (error) {
        setLoadingCapabilities(false);
        setDbError(true);
      });
  };

  const onSubmitWaitTime = (values) => {
    // Validate time is selected
    if (!values.time) {
      setSnackbarMessage("Please select a wait time before submitting.");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return;
    }

    setLoadingWaitTime(true);
    setNeedsUpdate(false);

    // Wait time entry - only includes wait time data
    const waitTimeEntry = {
      date: Date.now(),
      waitTime: Number(values.time),
      admin: true,
    };

    if (!subscription) waitTimeEntry.temp = true;

    // Update document with new wait time
    const updateData = {
      waitTimes: firebase.firestore.FieldValue.arrayUnion(waitTimeEntry),
    };

    db.collection("locations")
      .doc(String(data.id))
      .update(updateData)
      .then(function () {
        setLoadingWaitTime(false);
        setSubmittedWaitTime(true);
        setSnackbarMessage("Wait time has been updated successfully.");
        setSnackbarSeverity("success");
        setSnackbarOpen(true);
      })
      .catch(function (error) {
        setLoadingWaitTime(false);
        setDbError(true);
        setSnackbarMessage("Error updating wait time. Please try again.");
        setSnackbarSeverity("error");
        setSnackbarOpen(true);
      });
  };

  const handleSnackbarClose = (event, reason) => {
    if (reason === "clickaway") {
      return;
    }
    setSnackbarOpen(false);
  };

  const capabilities = [
    { id: "lab", title: "Lab" },
    { id: "xray", title: "X-ray (plain films)" },
    { id: "ultrasound", title: "Ultrasound" },
    { id: "ct", title: "CT" },
    { id: "mri", title: "MRI" },
  ];

  return (
    <div className="inner">
      <Typography
        variant="h4"
        component="h2"
        sx={{ mt: { xs: 1, sm: 5 }, mb: 2 }}
      >
        Status Board
      </Typography>

      <Typography variant="body" sx={{ display: "block", mt: 1, mb: 4 }}>
        Update the status of your facility's waiting room to let potential
        patients know how long they'll be waiting and the capabilities of your
        facility.
      </Typography>

      {dataProcessed && needsUpdate && !data?.waitTimes?.length && (
        <Alert severity="info" sx={{ mb: 3, maxWidth: FORM_MAX_WIDTH }}>
          Welcome! Let's get started by submitting your first wait time
          estimate. You can also use the{" "}
          <Link to="/dashboard/schedule">Schedule</Link> tool to automate future
          updates.
        </Alert>
      )}

      {/* Show loading circle if data is still loading */}
      {!data.id ? (
        <CircularProgress />
      ) : (
        <>
          <form onSubmit={handleSubmit(onSubmitWaitTime)}>
            <Box sx={{ mb: 4, maxWidth: FORM_MAX_WIDTH }}>
              <Typography
                variant="body"
                sx={{ color: grey[700], display: "block", mb: 1 }}
              >
                What is the current estimated waiting room volume for your
                facility?
              </Typography>

              <SeatRating showLegend={true} register={register} />

              {errors.time ? (
                <FormHelperText error>{errors.time.message}</FormHelperText>
              ) : null}

              <LoadingButton
                disabled={loadingWaitTime}
                loading={loadingWaitTime}
                type="submit"
                variant="contained"
                size="large"
                sx={{ mt: 2 }}
              >
                Update Wait Time
              </LoadingButton>
            </Box>
          </form>

          <Box sx={{ maxWidth: FORM_MAX_WIDTH }}>
            {/* End the maxWidth container before the divider */}
          </Box>

          {/* Display currently active wait time */}
          {activeMapTime && (
            <CurrentWaitTimeDisplay
              activeTime={activeMapTime}
              sx={{ mt: 4, maxWidth: FORM_MAX_WIDTH }}
            />
          )}

          <Divider sx={{ my: 4 }} />

          <form onSubmit={handleSubmit(onSubmit)}>
            {/* Show on-site capabilities for all facility types */}
            <Box sx={{ maxWidth: FORM_MAX_WIDTH, mb: 3 }}>
              <Typography
                variant="body"
                sx={{ color: grey[700], display: "block", mb: 2 }}
              >
                What on-site capabilities do you have at your facility?
              </Typography>

              <FormGroup sx={{ mb: 3 }}>
                {capabilities.map(({ id, title }) => {
                  const defaultValue =
                    data.capabilities?.[id] ?? data[id] ?? false;
                  return (
                    <Controller
                      key={id}
                      name={id}
                      control={control}
                      defaultValue={defaultValue}
                      render={({ field: { value, onChange } }) => (
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={value}
                              onChange={(e) => onChange(e.target.checked)}
                            />
                          }
                          label={title}
                        />
                      )}
                    />
                  );
                })}
              </FormGroup>

              {/* COMMENTED OUT: Phone number field - appears to be unused for notifications
            <Typography
              variant="body"
              sx={{ color: grey[700], display: "block", mt: 3, mb: 1 }}
            >
              Facility Phone Number (For waiting time update notifications)
            </Typography>

            <Box sx={{ maxWidth: FORM_MAX_WIDTH, mb: 2 }}>
              <Controller
                name="customPhone"
                control={control}
                defaultValue={data?.customPhone || ""}
                rules={{
                  pattern: {
                    value: /^\d{10}$/,
                    message: "Please enter a valid 10-digit phone number.",
                  },
                }}
                render={({ field, fieldState: { error } }) => (
                  <PhoneInput
                    id="customPhone"
                    placeholder="123 456 7890"
                    error={!!error}
                    helperText={error?.message}
                    {...field}
                  />
                )}
              />
            </Box>
            */}

              <LoadingButton
                disabled={loadingCapabilities}
                loading={loadingCapabilities}
                type="submit"
                variant="contained"
                size="large"
              >
                Update Capabilities
              </LoadingButton>
            </Box>
          </form>
        </>
      )}

      {dbError && (
        <Alert severity="error" sx={{ mt: 2, maxWidth: FORM_MAX_WIDTH }}>
          Error submitting the form. Please try again later.
        </Alert>
      )}

      <Snackbar
        open={snackbarOpen}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      >
        <Alert
          severity={snackbarSeverity}
          sx={{ width: "100%" }}
          action={
            <IconButton
              size="small"
              aria-label="close"
              color="inherit"
              onClick={handleSnackbarClose}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          }
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default AdminTimeForm;
