/**
 * DischargeInstructionModal - Edit a single discharge instruction's prose
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
} from '@mui/material';

interface Instruction {
  id: string;
  title?: string;
  prose?: string;
  category?: string;
}

interface DischargeInstructionModalProps {
  open: boolean;
  onClose: () => void;
  instruction: Instruction | null;
  onSave: (instructionId: string, newProse: string) => void;
}

const DischargeInstructionModal: React.FC<DischargeInstructionModalProps> = ({
  open,
  onClose,
  instruction,
  onSave,
}) => {
  const [prose, setProse] = useState('');

  useEffect(() => {
    if (instruction) {
      setProse(instruction.prose ?? '');
    }
  }, [instruction]);

  const handleClose = () => {
    setProse('');
    onClose();
  };

  const handleSave = () => {
    if (instruction) {
      onSave(instruction.id, prose);
    }
    handleClose();
  };

  if (!instruction) return null;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>{instruction.title ?? 'Edit instruction'}</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          fullWidth
          multiline
          minRows={6}
          value={prose}
          onChange={(e) => setProse(e.target.value)}
          variant="outlined"
          sx={{ mt: 1 }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained">
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DischargeInstructionModal;
