import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  TextField,
  ToggleButtonGroup,
  ToggleButton,
} from "@mui/material";

/**
 * AddDiagnosisModal - Modal for adding a custom diagnosis to the differential
 *
 * Props:
 * - open: boolean - whether the modal is open
 * - onClose: () => void - called when modal closes
 * - onAdd: (diagnosis: { condition: string, likelihood: string }) => void - called when diagnosis is added
 * - existingConditions: string[] - list of existing condition names (for duplicate check)
 */
const AddDiagnosisModal = ({
  open,
  onClose,
  onAdd,
  existingConditions = [],
}) => {
  const [name, setName] = useState("");
  const [likelihood, setLikelihood] = useState("Likely");
  const [error, setError] = useState("");

  const handleClose = () => {
    setName("");
    setLikelihood("Likely");
    setError("");
    onClose();
  };

  const handleAdd = () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Please enter a diagnosis name");
      return;
    }

    // Check for duplicates
    const isDuplicate = existingConditions.some(
      (c) => c.toLowerCase() === trimmedName.toLowerCase()
    );
    if (isDuplicate) {
      setError("This diagnosis already exists");
      return;
    }

    onAdd({
      condition: trimmedName,
      likelihood,
      rationale: "Added manually",
      isCustom: true,
    });

    handleClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle>Add Diagnosis</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 3 }}>
          Add a diagnosis to consider in the differential.
        </DialogContentText>
        <TextField
          autoFocus
          label="Diagnosis name"
          placeholder="e.g., Acute Appendicitis"
          fullWidth
          variant="outlined"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (error) setError("");
          }}
          error={!!error}
          helperText={error}
          sx={{ mb: 2 }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAdd();
            }
          }}
        />

        <DialogContentText variant="subtitle2" sx={{ mb: 1 }}>
          Likelihood
        </DialogContentText>
        <ToggleButtonGroup
          value={likelihood}
          exclusive
          onChange={(e, val) => val && setLikelihood(val)}
          fullWidth
          size="small"
          color="primary"
          sx={{ mb: 2 }}
        >
          <ToggleButton value="More Likely">More Likely</ToggleButton>
          <ToggleButton value="Likely">Likely</ToggleButton>
          <ToggleButton value="Less Likely">Less Likely</ToggleButton>
        </ToggleButtonGroup>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button onClick={handleAdd} variant="contained">
          Add to Differential
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddDiagnosisModal;
