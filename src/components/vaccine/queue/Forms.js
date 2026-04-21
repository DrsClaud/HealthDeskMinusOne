import React, { useState } from "react";
import firebaseApp, { db } from "services/firebase";
import { useAuth } from "hooks/useAuth";
import {
  Button,
  TextField,
  Typography,
  Box,
  Alert,
  CircularProgress,
  IconButton,
  Link,
  Paper,
  Stack,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { LoadingButton } from "@mui/lab";

const Forms = ({ data, vaccine }) => {
  const { user } = useAuth();
  const currentQueue = vaccine ? data.virtual_que : data.healthcare_que;
  const [name, setName] = useState("");
  const [error, setError] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [url, setUrl] = useState("");
  const [showForm, setShowForm] = useState(false);

  const removeForm = (index) => {
    const updatedQueue = { ...currentQueue };
    updatedQueue.forms.splice(index, 1);

    const document = vaccine
      ? { virtual_que: updatedQueue }
      : { healthcare_que: updatedQueue };

    db.collection("locations")
      .doc(String(data.id))
      .update(document)
      .then(() => {
        console.log("success");
      })
      .catch((error) => {
        console.error("Error removing form:", error);
      });
  };

  const handlePDF = (event) => {
    if (!name.trim()) {
      setError(true);
      return;
    }

    setError(false);
    setUploading(true);

    const file = event.target.files[0];
    if (!file) {
      setUploading(false);
      return;
    }

    if (!user?.uid) {
      console.error("No user ID found");
      setUploading(false);
      return;
    }
    const filePath = `registrations/${
      user.uid
    }/consent_forms/${Date.now()}.pdf`;
    const storageRef = firebaseApp.storage().ref();

    storageRef
      .child(filePath)
      .put(file)
      .then((snapshot) => {
        snapshot.ref.getDownloadURL().then((downloadUrl) => {
          setUrl(downloadUrl);
          const newForm = { name: name.trim(), url: downloadUrl };

          const updatedQueue = { ...currentQueue };
          if (!updatedQueue.forms) {
            updatedQueue.forms = [];
          }
          updatedQueue.forms.push(newForm);

          const document = vaccine
            ? { virtual_que: updatedQueue }
            : { healthcare_que: updatedQueue };

          db.collection("locations")
            .doc(String(data.id))
            .update(document)
            .then(() => {
              setUploading(false);
              setUploaded(true);
              setShowForm(false);
              setName("");
            })
            .catch((error) => {
              console.error("Error uploading form:", error);
              setUploading(false);
            });
        });
      })
      .catch((error) => {
        console.error("Error uploading file:", error);
        setUploading(false);
      });
  };

  return (
    <Box sx={{ py: 2 }}>
      <Typography variant="h6" gutterBottom>
        Patient Forms
      </Typography>

      {currentQueue.forms?.length > 0 && (
        <Box sx={{ mb: 3, maxWidth: 600 }}>
          {currentQueue.forms.map((form, i) => (
            <Paper
              key={i}
              elevation={1}
              sx={{
                p: 2,
                mb: 2,
                "&:hover": {
                  bgcolor: "action.hover",
                },
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Box sx={{ flex: 1 }}>
                  <Link
                    href={form.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{
                      typography: "subtitle1",
                      fontWeight: "medium",
                    }}
                  >
                    {form.name}
                  </Link>
                </Box>
                <LoadingButton
                  color="error"
                  size="small"
                  onClick={() => removeForm(i)}
                  sx={{
                    minWidth: 32,
                    width: 32,
                    height: 32,
                    p: 0,
                  }}
                >
                  <CloseIcon sx={{ fontSize: "1rem" }} />
                </LoadingButton>
              </Box>
            </Paper>
          ))}
        </Box>
      )}

      {uploaded && (
        <Alert
          severity="success"
          sx={{ mb: 3 }}
          action={
            <IconButton size="small" onClick={() => setUploaded(false)}>
              <CloseIcon fontSize="small" />
            </IconButton>
          }
        >
          Your form has been uploaded.{" "}
          <a href={url} target="_blank" rel="noopener noreferrer">
            View your form
          </a>
        </Alert>
      )}

      {(currentQueue.forms === undefined ||
        !currentQueue.forms?.length ||
        showForm) && (
        <Box>
          <Typography variant="body1" gutterBottom>
            Please upload a consent form and any other applicable forms.
          </Typography>

          <Box
            sx={{
              mt: 2,
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 2,
              alignItems: "flex-start",
            }}
          >
            <TextField
              label="Form Name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (e.target.value.trim()) {
                  setError(false);
                }
              }}
              error={error}
              helperText={error ? "Form name is required" : ""}
              variant="standard"
              InputLabelProps={{ shrink: true }}
              fullWidth
            />

            <Button
              component="label"
              variant="contained"
              startIcon={
                uploading ? <CircularProgress size={20} /> : <CloudUploadIcon />
              }
              disabled={uploading}
              sx={{
                marginTop: 1,
                width: "100%",
                fontSize: "1rem",
              }}
            >
              {uploading ? "Uploading..." : "Upload PDF"}
              <input
                type="file"
                hidden
                accept=".pdf"
                onChange={handlePDF}
                onClick={(event) => {
                  event.target.value = null;
                }}
              />
            </Button>
          </Box>
        </Box>
      )}

      {currentQueue.forms?.length > 0 && !showForm && (
        <Button
          variant="outlined"
          size="small"
          onClick={() => setShowForm(true)}
          sx={{ mt: 0 }}
        >
          Add another form
        </Button>
      )}
    </Box>
  );
};

export default Forms;
