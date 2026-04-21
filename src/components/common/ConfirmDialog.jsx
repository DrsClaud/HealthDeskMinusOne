import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from "@mui/material";
import { LoadingButton } from "@mui/lab";

/**
 * ConfirmDialog - Reusable "Are you sure?" confirmation dialog
 *
 * @param {boolean} open - Whether dialog is open
 * @param {function} onClose - Called when dialog should close (e.g. backdrop click, cancel)
 * @param {string} title - Dialog title
 * @param {React.ReactNode} message - Body content (string or JSX)
 * @param {string} confirmLabel - Confirm button label (e.g. "Remove", "Cancel Invitation")
 * @param {string} [cancelLabel="Cancel"] - Cancel button label
 * @param {function} onConfirm - Async handler for confirm (caller should set loading and close when done)
 * @param {boolean} loading - Show loading state on confirm button
 * @param {string} [confirmColor="primary"] - MUI button color ("error" for destructive)
 * @param {function} [onExited] - Called when dialog close animation finishes (e.g. clear selection)
 */
const ConfirmDialog = ({
  open,
  onClose,
  title,
  message,
  confirmLabel,
  cancelLabel = "Cancel",
  onConfirm,
  loading = false,
  confirmColor = "primary",
  onExited,
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      TransitionProps={{ onExited }}
    >
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        {typeof message === "string" ? (
          <DialogContentText>{message}</DialogContentText>
        ) : (
          message
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          {cancelLabel}
        </Button>
        <LoadingButton
          onClick={onConfirm}
          color={confirmColor}
          variant="contained"
          loading={loading}
          disabled={loading}
        >
          {confirmLabel}
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmDialog;
