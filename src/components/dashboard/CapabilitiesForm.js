import React, { useContext, useState, useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { db } from "services/firebase";
import { calculateHlthdskScore } from "utils/locationProcessing";

import {
  Alert,
  Box,
  FormControlLabel,
  Typography,
  FormGroup,
  Snackbar,
  IconButton,
  Checkbox,
} from "@mui/material";
import { LoadingButton } from "@mui/lab";
import { grey } from "@mui/material/colors";
import { AuthContext } from "context/Auth";
import CloseIcon from "@mui/icons-material/Close";

// Consistent max width for all form sections
const FORM_MAX_WIDTH = 540;

const CapabilitiesForm = ({ data }) => {
  const { handleSubmit, control, reset } = useForm();
  const [loadingCapabilities, setLoadingCapabilities] = useState(false);
  const [submittedCapabilities, setSubmittedCapabilities] = useState(false);
  const [dbError, setDbError] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");

  // Reset form when data changes
  useEffect(() => {
    if (data) {
      const formValues = {
        lab: data.capabilities?.lab ?? data.lab ?? false,
        xray: data.capabilities?.xray ?? data.xray ?? false,
        ultrasound: data.capabilities?.ultrasound ?? data.ultrasound ?? false,
        ct: data.capabilities?.ct ?? data.ct ?? false,
        mri: data.capabilities?.mri ?? data.mri ?? false,
      };
      reset(formValues);
    }
  }, [data, reset]);

  const onSubmit = (values) => {
    setLoadingCapabilities(true);

    // Create capabilities object - values are now boolean from checkboxes
    const capabilities = {
      lab: values.lab === true,
      xray: values.xray === true,
      ultrasound: values.ultrasound === true,
      ct: values.ct === true,
      mri: values.mri === true,
    };

    // Create a copy of the data object with the new capabilities
    const updatedData = {
      ...data,
      capabilities: capabilities || data.capabilities,
    };

    // Calculate updated My HealthDesk score
    const hlthdskScore = calculateHlthdskScore(updatedData);

    // Update document with new data
    const updateData = {
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
    <>
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
              return (
                <Controller
                  key={id}
                  name={id}
                  control={control}
                  render={({ field: { value, onChange } }) => (
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={value || false}
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

export default CapabilitiesForm;
