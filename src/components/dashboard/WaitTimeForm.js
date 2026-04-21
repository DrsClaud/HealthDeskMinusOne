import React, { useContext, useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { db } from "services/firebase";
import firebase from "firebase/compat/app";
import { getActiveWaitTime } from "utils/locationProcessing";
import { Link } from "react-router-dom";
import { subHours, isBefore } from "date-fns";

import SeatRating from "../SeatRating";
import CurrentWaitTimeDisplay from 'components/scheduler/CurrentWaitTimeDisplay';
import FacilityAlerts from "./FacilityAlerts";
import {
  Alert,
  Box,
  CircularProgress,
  FormHelperText,
  Typography,
  Divider,
  Snackbar,
  IconButton,
} from "@mui/material";
import { UpdateRounded } from "@mui/icons-material";
import { LoadingButton } from "@mui/lab";
import { grey } from "@mui/material/colors";
import { AuthContext } from "context/Auth";
import { facilityAlertsService } from "services/facilityAlertsService";
import CloseIcon from "@mui/icons-material/Close";

// Consistent max width for all form sections
const FORM_MAX_WIDTH = 540;

const WaitTimeForm = ({ data }) => {
  const { user, subscription } = useContext(AuthContext);
  const {
    handleSubmit,
    register,
    formState: { errors },
  } = useForm();

  const [loadingWaitTime, setLoadingWaitTime] = useState(false);
  const [submittedWaitTime, setSubmittedWaitTime] = useState(false);
  const [dbError, setDbError] = useState(false);
  const [needsUpdate, setNeedsUpdate] = useState(false);
  const [dataProcessed, setDataProcessed] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");

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

        // Record wait time update for facility alerts
        if (user?.uid && data?.id) {
          facilityAlertsService.recordWaitTimeUpdate(user.uid, String(data.id));
        }
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

  return (
    <>
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

          {/* Facility Alert Settings */}
          <Box sx={{ maxWidth: FORM_MAX_WIDTH, mt: 3.5, mb: 3 }}>
            <Typography
              variant="body2"
              sx={{ color: grey[600], mb: 0.5, lineHeight: 1.6 }}
            >
              Get text reminders when your wait time needs updating.
            </Typography>

            <FacilityAlerts
              facilityId={String(data.id)}
              facilityName={data.title || "Your Facility"}
              lastWaitTimeUpdate={data.lastWaitTimeUpdate}
              onAlertsChange={() => {
                // Optional: Could refresh data or show success message
                console.log("Facility alerts updated");
              }}
            />
          </Box>
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
    </>
  );
};

export default WaitTimeForm;
