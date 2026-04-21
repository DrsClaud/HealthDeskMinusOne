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

// ============================================================================
// Types
// ============================================================================

interface AddTestModalProps {
  open: boolean;
  onClose: () => void;
  onAdd: (test: {
    name: string;
    category: 'lab' | 'imaging' | 'procedure' | 'other';
    priority: 'stat' | 'urgent' | 'routine';
    rationale: string;
    isCustom: boolean;
  }) => void;
  existingTests: string[];
}

// ============================================================================
// Component
// ============================================================================

/**
 * AddTestModal - Modal for adding a custom diagnostic test
 */
const AddTestModal: React.FC<AddTestModalProps> = ({
  open,
  onClose,
  onAdd,
  existingTests = [],
}) => {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<'lab' | 'imaging' | 'procedure' | 'other'>("lab");
  const [priority, setPriority] = useState<'stat' | 'urgent' | 'routine'>("routine");
  const [error, setError] = useState("");

  const handleClose = () => {
    setName("");
    setCategory("lab");
    setPriority("routine");
    setError("");
    onClose();
  };

  const handleAdd = () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Please enter a test name");
      return;
    }

    // Check for duplicates
    const isDuplicate = existingTests.some(
      (t) => t.toLowerCase() === trimmedName.toLowerCase()
    );
    if (isDuplicate) {
      setError("This test already exists in the plan");
      return;
    }

    onAdd({
      name: trimmedName,
      category,
      priority,
      rationale: "Added manually",
      isCustom: true,
    });

    handleClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle>Add Diagnostic Test</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>
          Add a test to the diagnostic workup plan.
        </DialogContentText>
        <TextField
          autoFocus
          label="Test name"
          placeholder="e.g., Complete Blood Count, Chest X-Ray"
          fullWidth
          variant="outlined"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (error) setError("");
          }}
          error={!!error}
          helperText={error}
          sx={{ mb: 3 }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAdd();
            }
          }}
        />

        <DialogContentText variant="subtitle2" sx={{ mb: 1 }}>
          Category
        </DialogContentText>
        <ToggleButtonGroup
          value={category}
          exclusive
          onChange={(e, val) => val && setCategory(val)}
          fullWidth
          size="small"
          color="primary"
          sx={{ mb: 3 }}
        >
          <ToggleButton value="lab">Lab</ToggleButton>
          <ToggleButton value="imaging">Imaging</ToggleButton>
          <ToggleButton value="procedure">Procedure</ToggleButton>
          <ToggleButton value="other">Other</ToggleButton>
        </ToggleButtonGroup>

        <DialogContentText variant="subtitle2" sx={{ mb: 1 }}>
          Priority
        </DialogContentText>
        <ToggleButtonGroup
          value={priority}
          exclusive
          onChange={(e, val) => val && setPriority(val)}
          fullWidth
          size="small"
          color="primary"
        >
          <ToggleButton value="stat">STAT</ToggleButton>
          <ToggleButton value="urgent">Urgent</ToggleButton>
          <ToggleButton value="routine">Routine</ToggleButton>
        </ToggleButtonGroup>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button onClick={handleAdd} variant="contained">
          Add to Plan
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddTestModal;
