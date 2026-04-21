import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import ContentCopy from "@mui/icons-material/ContentCopy";
import { LoadingButton } from "@mui/lab";
import { Navigate } from "react-router-dom";
import firebase from "firebase/compat/app";
import "firebase/compat/functions";
import { db } from "services/firebase";
import { useAuth } from "hooks/useAuth";
import DashboardPageHeader from "components/common/DashboardPageHeader";

/** UI + Firestore list + createRegionalAdmin callable: all require JWT custom claim admin (same as isGlobalAdmin). */

const isAlreadyExistsError = (err) => {
  const code = err?.code || "";
  return (
    code === "already-exists" ||
    code === "functions/already-exists" ||
    String(err?.message || "").includes("already exists")
  );
};

const RegionalAdminsPage = () => {
  const { isGlobalAdmin, userLoading } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [region, setRegion] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [lastPassword, setLastPassword] = useState(null);
  const [copyFeedback, setCopyFeedback] = useState(false);

  const loadRows = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const snap = await db
        .collection("users")
        .where("role", "==", "regional_admin")
        .get();
      const list = [];
      snap.forEach((doc) => {
        const d = doc.data();
        list.push({
          id: doc.id,
          email: d.email || "—",
          region: d.region || "—",
          registrationDate: d.registrationDate || null,
        });
      });
      list.sort((a, b) => {
        const am = a.registrationDate?.toMillis?.() || 0;
        const bm = b.registrationDate?.toMillis?.() || 0;
        return bm - am;
      });
      setRows(list);
    } catch (e) {
      console.error(e);
      setError(e.message || "Failed to load regional admins.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!userLoading && isGlobalAdmin) loadRows();
  }, [userLoading, isGlobalAdmin, loadRows]);

  const handleCreate = async () => {
    setFormError(null);
    const e = email.trim();
    const r = region.trim();
    if (!e || !e.includes("@")) {
      setFormError("Enter a valid email.");
      return;
    }
    if (!r) {
      setFormError("Region is required.");
      return;
    }
    setSubmitting(true);
    try {
      const fn = firebase.functions().httpsCallable("createRegionalAdmin");
      const { data } = await fn({ email: e, region: r });
      setLastPassword(data.temporaryPassword);
      setEmail("");
      setRegion("");
      setDialogOpen(false);
      await loadRows();
    } catch (err) {
      if (isAlreadyExistsError(err)) {
        setFormError("That email is already registered.");
      } else {
        setFormError(err.message || "Request failed.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const copyPassword = async () => {
    if (!lastPassword) return;
    try {
      await navigator.clipboard.writeText(lastPassword);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    } catch {
      /* ignore */
    }
  };

  if (!userLoading && !isGlobalAdmin) {
    return <Navigate to="/dashboard/prompts" replace />;
  }

  return (
    <Box>
      <DashboardPageHeader
        title="Regional admins"
        subtitle={
          <Typography>
            Creates <strong>regional_admin</strong> accounts (Auth + Firestore).
            The temporary password is shown once—copy it before you leave this
            page. No email is sent from HealthDesk.
          </Typography>
        }
      />

      <Button
        variant="contained"
        onClick={() => {
          setDialogOpen(true);
          setFormError(null);
        }}
        sx={{ mb: 2 }}
      >
        Add new
      </Button>

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}
      {lastPassword ? (
        <Alert
          severity="success"
          sx={{ mb: 2 }}
          action={
            <Tooltip title={copyFeedback ? "Copied" : "Copy"}>
              <IconButton color="inherit" size="small" onClick={copyPassword}>
                <ContentCopy fontSize="small" />
              </IconButton>
            </Tooltip>
          }
        >
          <Typography variant="body2" sx={{ wordBreak: "break-all" }}>
            Temporary password (copy now): <strong>{lastPassword}</strong>
          </Typography>
        </Alert>
      ) : null}

      <TableContainer component={Paper}>
        <Table size="small" sx={{ minWidth: 650 }} aria-label="regional admins">
          <TableHead>
            <TableRow>
              <TableCell>Email</TableCell>
              <TableCell>Region</TableCell>
              <TableCell>User ID</TableCell>
              <TableCell>Created</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4}>Loading…</TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4}>No regional admins yet.</TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.email}</TableCell>
                  <TableCell>{row.region}</TableCell>
                  <TableCell
                    sx={{ fontFamily: "monospace", fontSize: "0.8rem" }}
                  >
                    {row.id}
                  </TableCell>
                  <TableCell>
                    {row.registrationDate?.toDate
                      ? row.registrationDate.toDate().toLocaleString()
                      : "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog
        open={dialogOpen}
        onClose={() => !submitting && setDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Add regional admin</DialogTitle>
        <DialogContent sx={{ display: "grid", gap: 2, pt: 1 }}>
          {formError ? <Alert severity="error">{formError}</Alert> : null}
          <TextField
            label="Email"
            type="email"
            fullWidth
            autoFocus
            value={email}
            onChange={(ev) => setEmail(ev.target.value)}
          />
          <TextField
            label="Region"
            fullWidth
            helperText="Stored on the user doc as region; must match llmLocalPrompts scopeId for regional prompts."
            value={region}
            onChange={(ev) => setRegion(ev.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={submitting}>
            Cancel
          </Button>
          <LoadingButton
            variant="contained"
            loading={submitting}
            onClick={handleCreate}
          >
            Create
          </LoadingButton>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RegionalAdminsPage;
