import React, { useState } from "react";
import firebaseApp, { db, storage } from "services/firebase";
import { Controller, useForm } from "react-hook-form";
import { styled } from "@mui/material/styles";
import {
  Backdrop,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormHelperText,
  InputLabel,
  TextField,
  Typography,
} from "@mui/material";
import { LoadingButton } from "@mui/lab";
import { CloudUploadRounded } from "@mui/icons-material";
import Resizer from "react-image-file-resizer";

const VisuallyHiddenInput = styled("input")({
  clip: "rect(0 0 0 0)",
  clipPath: "inset(50%)",
  height: 1,
  overflow: "hidden",
  position: "absolute",
  bottom: 0,
  left: 0,
  whiteSpace: "nowrap",
  width: 1,
});

const MarketingSettings = ({
  user,
  data,
  location,
  visible,
  close,
  setSubmitted,
}) => {
  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();
  const [loading, setLoading] = useState();
  const [firebaseError, setFirebaseError] = useState();
  const [currentImage, setCurrentImage] = useState();
  const [imagePreview, setImagePreview] = useState();

  const updateZips = (branding) => {
    db.collection("zips")
      .where("owner", "==", location.id)
      .get()
      .then((querySnapshot) => {
        const batch = db.batch();

        querySnapshot.forEach((doc) => {
          batch.update(db.collection("zips").doc(doc.data().zip), {
            branding,
          });
        });

        batch.commit().then(() => {
          console.log("ZIP codes have been updated.");
        });
      });
  };

  const onSubmit = ({ logo, website, tagline, title }) => {
    setFirebaseError();
    setLoading(true);
    setSubmitted(false);

    // Create a batch to update branding
    const batch = db.batch();
    const locationRef = db.collection("locations").doc(String(location.id));

    // If there is a logo uploaded, then upload it to the server
    if (logo[0]) {
      const file = logo[0];

      // File must be jpeg/png
      if (!["image/jpeg", "image/png"].includes(file.type)) {
        setFirebaseError("The image must be a .jpg or .png file.");
        setLoading(false);
        return;
      }

      const fileExtension = file.type === "image/png" ? ".png" : ".jpg";
      const filePath = `assets/images/logos/${user.uid}${fileExtension}`;

      // Upload image
      storage
        .ref()
        .child(filePath)
        .put(currentImage)
        .then((snapshot) => {
          snapshot.ref.getDownloadURL().then((downloadUrl) => {
            let branding = location?.branding || {};

            branding.logo = downloadUrl;
            if (website) branding.website = website;
            if (tagline) branding.tagline = tagline;
            if (title) branding.title = title;

            // Update branding
            batch.update(locationRef, {
              branding,
            });

            // Update ZIP codes
            updateZips(branding);

            // Commit the batch
            batch.commit().then(() => {
              setSubmitted("Your advertising profile has been updated.");
              setLoading(false);
              close();
            });
          });
        });
    } else {
      // If we're not changing the logo, just update the branding
      let branding = location?.branding || {};

      if (website) branding.website = website;
      if (tagline) branding.tagline = tagline;
      if (title) branding.title = title;

      // Update branding
      batch.update(locationRef, {
        branding,
      });

      // Update ZIP codes
      updateZips(branding);

      // Commit the batch
      batch.commit().then(() => {
        setSubmitted("Your advertising profile has been updated.");
        setLoading(false);
        close();
      });
    }
  };

  const handleFile = (event) => {
    setFirebaseError();

    if (event.target.files[0]) {
      try {
        const file = event.target.files[0];
        // Preserve original format - PNG stays PNG, JPEG stays JPEG
        const outputFormat = file.type === "image/png" ? "PNG" : "JPEG";

        // For file upload - higher resolution for better quality
        Resizer.imageFileResizer(
          file,
          500,
          200,
          outputFormat,
          95,
          0,
          (uri) => {
            setCurrentImage(uri);
          },
          "file"
        );

        // For preview - can keep smaller to save memory
        Resizer.imageFileResizer(
          file,
          500,
          200,
          outputFormat,
          95,
          0,
          (uri) => {
            setImagePreview(uri);
          },
          "base64"
        );
      } catch (err) {
        console.log(err);
      }
    }
  };

  // If location data not loaded yet, return loading screen
  if (!location) {
    return (
      <Backdrop
        sx={{ color: "#fff", zIndex: (theme) => theme.zIndex.drawer + 1 }}
        open={visible}
        onClick={close}
      >
        <CircularProgress color="inherit" />
      </Backdrop>
    );
  }

  return (
    <Dialog maxWidth="sm" fullWidth open={visible} onClose={close}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogTitle>Update Your Advertising Profile</DialogTitle>
        <DialogContent>
          <InputLabel shrink>Logo (.jpg or .png, max size 1MB)</InputLabel>

          <Button
            component="label"
            variant="contained"
            startIcon={<CloudUploadRounded />}
            sx={{ mb: 2 }}
            fullWidth
          >
            {location?.branding?.logo ? "Change Logo" : "Upload Logo"}

            <VisuallyHiddenInput
              id="logo"
              type="file"
              {...register("logo")}
              onChange={handleFile}
            />
          </Button>

          {imagePreview || location?.branding?.logo ? (
            <Box>
              <Box
                component="img"
                alt="Your current logo"
                sx={{
                  maxWidth: 250,
                  maxHeight: 100,
                }}
                src={imagePreview ? imagePreview : location?.branding?.logo}
              />
              <Typography
                variant="body2"
                color="secondary"
                sx={{ mb: 2, fontSize: 11 }}
              >
                Your image will be resized to fit (maximum 500 x 200).
              </Typography>
            </Box>
          ) : null}

          <Controller
            name="website"
            control={control}
            defaultValue={location?.branding?.website || ""}
            rules={{
              required: "Website URL is required.",
              pattern: {
                value:
                  /((([A-Za-z]{3,9}:(?:\/\/)?)(?:[-;:&=$+,\w]+@)?[A-Za-z0-9.-]+|(?:www.|[-;:&=$+,\w]+@)[A-Za-z0-9.-]+)((?:\/[+~%/.\w-_]*)?\??(?:[-+=&;%@.\w_]*)#?(?:[\w]*))?)/,
                message:
                  "The URL is invalid. Please include the https:// at the beginning.",
              },
            }}
            render={({ field }) => (
              <TextField
                id="website"
                label="Website URL"
                type="url"
                InputLabelProps={{ shrink: true }}
                variant="standard"
                fullWidth
                placeholder="https://yourclinic.com"
                error={!!errors?.website}
                helperText={errors?.website?.message}
                sx={{ mb: 2 }}
                {...field}
              />
            )}
          />

          {/* Add Advertising Title field */}
          <Controller
            name="title"
            control={control}
            defaultValue={location?.branding?.title || ""}
            rules={{
              required: "Advertising title is required.",
              maxLength: {
                value: 50,
                message: "Title must be 50 characters or less.",
              },
              validate: {
                noNewlines: (value) =>
                  !value.includes("\n") || "Title cannot contain line breaks.",
              },
            }}
            render={({ field }) => (
              <TextField
                id="title"
                label="Advertising Title"
                type="text"
                InputLabelProps={{ shrink: true }}
                variant="standard"
                fullWidth
                error={!!errors?.title}
                helperText={
                  errors?.title?.message ||
                  "This title appears prominently in your advertisements and search results."
                }
                sx={{ mb: 2 }}
                {...field}
              />
            )}
          />

          <Controller
            name="tagline"
            control={control}
            defaultValue={location?.branding?.tagline || ""}
            rules={{
              required: "Tagline is required.",
              maxLength: {
                value: 120,
                message: "The tagline must be under 120 characters.",
              },
            }}
            render={({ field }) => (
              <TextField
                id="tagline"
                label="Tagline (120 character limit)"
                type="text"
                InputLabelProps={{ shrink: true }}
                variant="standard"
                fullWidth
                error={!!errors?.tagline}
                helperText={errors?.tagline?.message}
                {...field}
              />
            )}
          />

          {firebaseError ? (
            <FormHelperText error sx={{ mt: 1 }}>
              {firebaseError}
            </FormHelperText>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={close}>Close</Button>
          <LoadingButton
            loading={loading}
            type="submit"
            disabled={loading}
            autoFocus
            variant="contained"
          >
            Update Profile
          </LoadingButton>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default MarketingSettings;
