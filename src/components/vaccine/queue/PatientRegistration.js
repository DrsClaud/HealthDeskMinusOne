import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Controller, useForm } from "react-hook-form";
import Resizer from "react-image-file-resizer";
import {
  Box,
  Button,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormHelperText,
  TextField,
  Typography,
} from "@mui/material";
import { LoadingButton } from "@mui/lab";
import firebase, { db } from "services/firebase";
import { Description, Upload } from "@mui/icons-material";
import LogoLarge from "components/styled/LogoLarge";
import Loading from "components/Loading";

const DocumentButton = ({ label, name, control, onClick }) => (
  <Controller
    name={name}
    control={control}
    rules={{
      required: "Please read and sign this document before continuing.",
    }}
    defaultValue={false}
    render={({ field: { onChange, value }, fieldState: { error } }) => (
      <Box sx={{ mb: 2 }}>
        <Button
          fullWidth
          variant="outlined"
          onClick={() => {
            onClick();
            onChange(true);
          }}
          color={value ? "success" : "primary"}
          startIcon={<Description />}
          sx={{
            py: 1.5,
            borderWidth: 2,
            borderStyle: "solid",
            "&:hover": {
              borderWidth: 2,
            },
            ...(value && {
              backgroundColor: "success.50",
              borderColor: "success.main",
            }),
          }}
        >
          <Box>
            <Typography variant="button">{label}</Typography>
            <Typography
              variant="caption"
              display="block"
              sx={{
                opacity: 0.8,
                color: value ? "success.main" : "primary.main",
              }}
            >
              {value ? "Document Reviewed" : "Click to Review and Sign"}
            </Typography>
          </Box>
        </Button>
        {error && <FormHelperText error>{error.message}</FormHelperText>}
      </Box>
    )}
  />
);

const PatientRegistration = () => {
  const path = window.location.pathname;
  const segments = path.split("/");
  const id = String(segments.pop()) || String(segments.pop());
  const [locationData, setLocationData] = useState({});
  const [currentQueue, setCurrentQueue] = useState();
  const [data, setData] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [PDF, setPDF] = useState();
  const [PDFVisible, setPDFVisible] = useState(false);
  const [formsViewedError, setFormsViewedError] = useState();
  const [photoFile, setPhotoFile] = useState(null);
  // Preview removed
  const [uploadError, setUploadError] = useState(null);

  const {
    control,
    handleSubmit,
    formState: { errors, touchedFields },
    watch,
    trigger,
  } = useForm({
    defaultValues: {
      photoId: null,
    },
  });

  const handlePhotoUpload = async (event) => {
    setUploadError(null);
    const file = event.target.files[0];

    if (file) {
      // Check file type
      if (!["image/jpeg", "image/png"].includes(file.type)) {
        setUploadError("Please upload a JPG or PNG image file.");
        return;
      }

      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setUploadError("Please upload an image smaller than 5MB.");
        return;
      }

      try {
        // Resize and convert to base64 for cloud function upload
        Resizer.imageFileResizer(
          file,
          1000, // max width
          1000, // max height
          "JPEG",
          95, // quality
          0, // rotation
          (base64DataUrl) => {
            setPhotoFile(base64DataUrl);
            trigger("photoId");
          },
          "base64",
        );
      } catch (error) {
        console.error("Error resizing image:", error);
        setUploadError("Error processing image. Please try a different file.");
      }
    }
  };

  const checkFormCompleted = async () => {
    if (!photoFile) {
      setFormsViewedError("Please upload a photo ID before submitting.");
      return false;
    }
    return true;
  };

  const onSubmit = async (formData) => {
    setSubmitLoading(true);

    try {
      if (!(await checkFormCompleted())) {
        setSubmitLoading(false);
        return;
      }

      // Strip the data URL prefix — send raw base64 to the cloud function
      const photoBase64 = photoFile.replace(/^data:image\/\w+;base64,/, "");

      const submitRegistration = firebase
        .functions()
        .httpsCallable("submitPatientRegistration");

      await submitRegistration({
        registrationId: id,
        email: formData.email,
        name: formData.signature,
        photoBase64,
      });

      setSubmitted(true);
    } catch (error) {
      console.error("Registration error:", error);
      setFormsViewedError(
        "An error occurred during registration. Please try again.",
      );
    } finally {
      setSubmitLoading(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const registrationDoc = await db
          .collection("registrations")
          .doc(id)
          .get();

        if (!registrationDoc.exists) {
          setData(null);
          setInitialLoading(false);
          return;
        }

        const registrationData = registrationDoc.data();
        setData(registrationData);

        const locationDoc = await db
          .collection("locations")
          .doc(String(registrationData.location))
          .get();
        const locationData = locationDoc.data();
        setLocationData(locationData);
        setCurrentQueue(locationData.healthcare_que);
      } catch (error) {
        console.error("Error fetching registration:", error);
        setData(null);
      } finally {
        setInitialLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (initialLoading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        height="100vh"
        width="100%"
      >
        <Loading page />
      </Box>
    );
  }

  if (!data) {
    return (
      <Container maxWidth="md">
        <Box
          sx={{
            py: 8,
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 3,
          }}
        >
          <Typography variant="h4" component="h1">
            Registration Not Found
          </Typography>

          <Typography variant="body1" color="text.secondary">
            We couldn't find the registration you're looking for. This link may
            be expired or invalid.
          </Typography>

          <Button component={Link} to="/" variant="contained">
            Return to Map
          </Button>
        </Box>
      </Container>
    );
  }

  if (submitted || data.submitted) {
    return (
      <Container maxWidth="md">
        <Box
          sx={{
            py: 8,
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 3,
          }}
        >
          <Typography variant="h4" component="h1">
            Thank You!
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Your registration has been successfully submitted.
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
            We look forward to seeing you at {locationData?.title}.
          </Typography>
          <Button component={Link} to="/" variant="contained">
            Return to Map
          </Button>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Dialog
        open={!!formsViewedError}
        onClose={() => setFormsViewedError(undefined)}
      >
        <DialogTitle>Attention Required</DialogTitle>
        <DialogContent>
          <DialogContentText>{formsViewedError}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFormsViewedError(undefined)} autoFocus>
            Okay
          </Button>
        </DialogActions>
      </Dialog>
      <LogoLarge />
      <Typography variant="body1" paragraph>
        {locationData?.title} is pleased to partner with the HealthDesk to
        streamline your registration. Please use the form below to complete your
        registration process. If for any reason you are unable to complete the
        process, come in to the facility and complete the process manually.
      </Typography>
      <form onSubmit={handleSubmit(onSubmit)}>
        <Dialog
          open={PDFVisible}
          onClose={() => setPDFVisible(false)}
          maxWidth="lg"
          fullWidth
        >
          <DialogContent>
            <iframe
              src={PDF}
              style={{ width: "100%", height: "80vh" }}
              title="PDF Viewer"
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPDFVisible(false)}>Close</Button>
          </DialogActions>
        </Dialog>

        {currentQueue?.forms?.map((form) => (
          <DocumentButton
            key={form.name}
            label={form.name}
            name={form.name}
            control={control}
            onClick={() => {
              setPDF(form.url);
              setPDFVisible(true);
            }}
          />
        ))}

        <Box sx={{ mb: 2 }}>
          <Controller
            name="photoId"
            control={control}
            rules={{
              required: "Photo ID is required.",
              validate: (value) => {
                if (!photoFile && !value) return "Please upload a photo ID.";
                return true;
              },
            }}
            render={({ field: { onChange, value }, fieldState: { error } }) => (
              <>
                <Button
                  component="label"
                  variant="outlined"
                  fullWidth
                  color={photoFile ? "success" : "primary"}
                  startIcon={<Upload />}
                  sx={{
                    py: 1.5,
                    borderWidth: 2,
                    borderStyle: "solid",
                    "&:hover": {
                      borderWidth: 2,
                    },
                    ...(photoFile && {
                      backgroundColor: "success.50",
                      borderColor: "success.main",
                    }),
                  }}
                >
                  <Box>
                    <Typography variant="button">
                      {photoFile ? "Photo ID Uploaded" : "Upload Photo ID"}
                    </Typography>
                    <Typography
                      variant="caption"
                      display="block"
                      sx={{
                        opacity: 0.8,
                        color: photoFile ? "success.main" : "primary.main",
                      }}
                    >
                      {photoFile
                        ? "Image uploaded successfully"
                        : "Upload JPG/PNG (max 5MB)"}
                    </Typography>
                  </Box>
                  <input
                    type="file"
                    hidden
                    accept="image/jpeg,image/png"
                    onChange={(e) => {
                      handlePhotoUpload(e);
                      onChange(e.target.files[0]);
                    }}
                  />
                </Button>

                {(error || uploadError) && (
                  <FormHelperText error>
                    {error?.message || uploadError}
                  </FormHelperText>
                )}
              </>
            )}
          />

          {/* Preview removed */}
        </Box>

        <Controller
          name="signature"
          control={control}
          defaultValue=""
          rules={{ required: "Signature is required." }}
          render={({ field, fieldState: { error } }) => (
            <TextField
              {...field}
              label="Signature"
              variant="standard"
              InputLabelProps={{ shrink: true }}
              fullWidth
              error={!!error}
              helperText={error?.message}
              sx={{ mb: 2 }}
            />
          )}
        />

        <Controller
          name="email"
          control={control}
          defaultValue=""
          rules={{
            required: "Email is required.",
            pattern: {
              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}$/i,
              message: "Invalid email address.",
            },
          }}
          render={({ field, fieldState: { error } }) => (
            <TextField
              {...field}
              label="Email Address"
              type="email"
              variant="standard"
              InputLabelProps={{ shrink: true }}
              fullWidth
              error={!!error}
              helperText={error?.message}
              sx={{ mb: 2 }}
            />
          )}
        />

        <Box sx={{ mt: 2 }}>
          <Typography
            variant="subtitle2"
            color="text.secondary"
            gutterBottom
            align="center"
          >
            By clicking submit, you agree to the terms outlined in the documents
            above.
          </Typography>
          <LoadingButton
            type="submit"
            variant="contained"
            loading={submitLoading}
            fullWidth
            size="large"
            sx={{
              bgcolor: "primary.main",
              fontSize: "1.1rem",
              "&:hover": {
                bgcolor: "primary.dark",
              },
            }}
          >
            Submit Registration
          </LoadingButton>
        </Box>
      </form>
    </Container>
  );
};

export default PatientRegistration;
