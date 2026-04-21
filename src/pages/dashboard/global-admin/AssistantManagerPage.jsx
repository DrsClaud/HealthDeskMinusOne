import React, {
  useState,
  useContext,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import { useForm, Controller } from "react-hook-form";
import firebase from "firebase/compat/app";
import "firebase/compat/functions";
import { db } from "services/firebase";
import { AuthContext } from "context/Auth";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormHelperText,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Chip,
  Autocomplete,
} from "@mui/material";
import { LoadingButton } from "@mui/lab";
import EditIcon from "@mui/icons-material/Edit";
import { useNavigate } from "react-router-dom";
import DashboardPageHeader from "components/common/DashboardPageHeader";

const MODEL_SUGGESTIONS = [
  "gpt-4o",
  "gpt-4o-mini",
  "gpt-4-turbo",
  "gpt-4",
  "gpt-3.5-turbo",
];

const AssistantTable = ({ assistants, onEdit }) => (
  <TableContainer component={Paper} sx={{ mb: 4 }}>
    <Table sx={{ minWidth: 650 }} aria-label="assistant table">
      <TableHead>
        <TableRow>
          <TableCell>Assistant ID</TableCell>
          <TableCell>Prompt Preview</TableCell>
          <TableCell>Actions</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {assistants.map((assistant) => (
          <TableRow
            key={assistant.id}
            sx={{ "&:last-child td, &:last-child th": { border: 0 } }}
          >
            <TableCell>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {assistant.id}
              </Typography>
            </TableCell>
            <TableCell>
              <Typography
                variant="body2"
                sx={{
                  maxWidth: 400,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {assistant.prompt
                  ? assistant.prompt.replace(/\\n/g, " ").substring(0, 150) +
                    "..."
                  : "No prompt"}
              </Typography>
            </TableCell>
            <TableCell>
              <IconButton
                onClick={() => onEdit(assistant)}
                color="primary"
                size="small"
              >
                <EditIcon />
              </IconButton>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </TableContainer>
);

const EditAssistantDialog = ({ open, assistant, onClose, onSave, loading }) => {
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm({
    defaultValues: {
      model: "",
      vectorStoreId: "",
      prompt: "",
    },
  });

  useEffect(() => {
    if (assistant) {
      reset({
        model: assistant.model || "gpt-4o-mini",
        vectorStoreId: assistant.vectorStoreId || "",
        prompt: (assistant.prompt || "").replace(/\\n/g, "\n"),
      });
    }
  }, [assistant, reset]);

  const onSubmit = (data) => {
    const processedData = {
      ...data,
      prompt: data.prompt.replace(/\n/g, "\\n"),
    };
    onSave(assistant.id, processedData);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { minHeight: "60vh" },
      }}
    >
      <DialogTitle>
        Edit Assistant:{" "}
        <Chip label={assistant?.id} size="small" sx={{ ml: 1 }} />
      </DialogTitle>

      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3, pt: 1 }}>
            <Controller
              name="prompt"
              control={control}
              rules={{ required: "Prompt is required" }}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Prompt"
                  multiline
                  rows={12}
                  variant="standard"
                  error={!!errors.prompt}
                  helperText={errors.prompt?.message}
                  fullWidth
                  FormHelperTextProps={{ sx: { ml: 0 } }}
                />
              )}
            />

            <Controller
              name="vectorStoreId"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Vector Store ID"
                  placeholder="vs_xxxxxxxxxxxxxxxxx"
                  variant="standard"
                  helperText="Optional - leave empty if no vector store needed."
                  fullWidth
                  InputProps={{
                    sx: { fontFamily: "monospace", fontSize: "0.9rem" },
                  }}
                  FormHelperTextProps={{ sx: { ml: 0 } }}
                />
              )}
            />

            <Controller
              name="model"
              control={control}
              rules={{ required: "Model is required" }}
              render={({ field }) => (
                <Autocomplete
                  {...field}
                  options={MODEL_SUGGESTIONS}
                  freeSolo
                  onChange={(_, value) => field.onChange(value)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Model"
                      variant="standard"
                      error={!!errors.model}
                      helperText={
                        errors.model?.message ||
                        "Choose from suggestions or enter custom model."
                      }
                      fullWidth
                      FormHelperTextProps={{ sx: { ml: 0 } }}
                    />
                  )}
                />
              )}
            />
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 3, gap: 2 }}>
          <Button onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <LoadingButton
            type="submit"
            variant="contained"
            loading={loading}
            disabled={!isDirty}
          >
            Save Changes
          </LoadingButton>
        </DialogActions>
      </form>
    </Dialog>
  );
};

const AssistantManagerPage = () => {
  const { user, userData } = useContext(AuthContext);
  const navigate = useNavigate();

  const [assistants, setAssistants] = useState([]);
  const [editingAssistant, setEditingAssistant] = useState(null);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const sortedAssistants = useMemo(
    () => [...assistants].sort((a, b) => a.id.localeCompare(b.id)),
    [assistants]
  );

  useEffect(() => {
    const fetchAssistants = async () => {
      try {
        const snapshot = await db.collection("assistants").get();

        if (snapshot.empty) {
          setAssistants([]);
        } else {
          const configs = [];
          snapshot.forEach((doc) => {
            const data = doc.data();
            configs.push({
              id: doc.id,
              prompt: data.prompt || "",
              vectorStoreId: data.vectorStoreId || null,
              model: data.model || "gpt-4o-mini",
            });
          });
          setAssistants(configs);
        }
      } catch (error) {
        console.error("Failed to load assistant configs:", error);
        setError("Failed to load assistant configurations");
      } finally {
        setDataLoaded(true);
      }
    };

    if (userData?.admin) {
      fetchAssistants();
    }
  }, [userData]);

  const handleEdit = useCallback((assistant) => {
    setEditingAssistant(assistant);
    setError(null);
    setSuccess(null);
  }, []);

  const handleCloseEdit = useCallback(() => {
    setEditingAssistant(null);
  }, []);

  const handleSave = async (assistantId, data) => {
    try {
      setLoading(true);
      setError(null);

      const currentUser = firebase.auth().currentUser;
      if (!currentUser) throw new Error("Authentication required");

      const userDoc = await db.collection("users").doc(currentUser.uid).get();
      const userData = userDoc.data();

      if (!userData?.admin) throw new Error("Insufficient permissions");

      await db
        .collection("assistants")
        .doc(assistantId)
        .set(
          {
            id: assistantId,
            prompt: data.prompt,
            vectorStoreId: data.vectorStoreId || null,
            model: data.model,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedBy: currentUser.uid,
          },
          { merge: true }
        );

      setAssistants((prev) =>
        prev.map((assistant) =>
          assistant.id === assistantId ? { ...assistant, ...data } : assistant
        )
      );

      setSuccess(`Assistant "${assistantId}" has been updated successfully.`);
      setEditingAssistant(null);
    } catch (error) {
      console.error("Save error:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (userData && !userData?.admin) {
    navigate("/dashboard");
    return null;
  }

  if (!userData?.admin) {
    return <CircularProgress />;
  }

  return (
    <Box sx={{ mb: 4 }}>
      <Box sx={{ mb: 4 }}>
        <DashboardPageHeader
          title="Assistant Manager"
          subtitle={
            <Typography sx={{ display: "block", maxWidth: "40rem" }}>
              Configure AI assistant prompts, models, and vector stores.
            </Typography>
          }
        />

        <Alert severity="info" sx={{ mb: 3 }}>
          Changes may take 1-2 minutes to appear for all active users due to
          system caching.
        </Alert>

        {success && (
          <Alert severity="success" sx={{ mb: 3 }}>
            {success}
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
      </Box>

      {assistants.length > 0 ? (
        <AssistantTable assistants={sortedAssistants} onEdit={handleEdit} />
      ) : dataLoaded ? (
        <Alert severity="warning">
          No assistant configurations found in the database. You may need to
          migrate from the static configuration file.
        </Alert>
      ) : (
        <CircularProgress size={30} />
      )}

      <EditAssistantDialog
        open={!!editingAssistant}
        assistant={editingAssistant}
        onClose={handleCloseEdit}
        onSave={handleSave}
        loading={loading}
      />
    </Box>
  );
};

export default AssistantManagerPage;
