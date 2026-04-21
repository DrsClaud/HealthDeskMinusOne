import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import firebase from "firebase/compat/app";
import "firebase/compat/firestore";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
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
import EditRounded from "@mui/icons-material/EditRounded";
import { LoadingButton } from "@mui/lab";
import DashboardPageHeader from "components/common/DashboardPageHeader";
import Loading from "components/Loading";
import { useAuth } from "hooks/useAuth";
import { db } from "services/firebase";
import {
  addMonths,
  differenceInCalendarDays,
  format,
  isBefore,
  parseISO,
  startOfDay,
} from "date-fns";

const FILTER_ALL = "all";
const WINDOW_STEP_MONTHS = 12;
const MAX_WINDOW_MONTHS = 66; // just past 2031-12-31 from 2026-04-01
const NOTES_MAX_LEN = 8000;

const STATUS_CONFIG = {
  pending: { label: "Pending", chipColor: "default" },
  "in-progress": { label: "In Progress", chipColor: "info" },
  done: { label: "Done", chipColor: "success" },
};

/** Fixed column widths (px) — Task column gets the remainder via first empty <col /> */
const COL_WIDTH = {
  due: 108,
  owner: 132,
  status: 156,
  action: 44,
};

const tableFixedSx = {
  tableLayout: "fixed",
  width: "100%",
  "& .MuiTableCell-root": { verticalAlign: "middle" },
};

const COL = {
  due: {
    width: COL_WIDTH.due,
    maxWidth: COL_WIDTH.due,
    whiteSpace: "nowrap",
  },
  owner: {
    width: COL_WIDTH.owner,
    maxWidth: COL_WIDTH.owner,
    minWidth: COL_WIDTH.owner,
  },
  status: { width: COL_WIDTH.status, maxWidth: COL_WIDTH.status },
  action: { width: COL_WIDTH.action, maxWidth: COL_WIDTH.action, px: 0.5 },
};

const ColGroup = () => (
  <colgroup>
    <col />
    <col style={{ width: COL_WIDTH.due }} />
    <col style={{ width: COL_WIDTH.owner }} />
    <col style={{ width: COL_WIDTH.status }} />
    <col style={{ width: COL_WIDTH.action }} />
  </colgroup>
);

const ownerTypographySx = {
  wordBreak: "break-word",
  overflowWrap: "break-word",
};

const formatDueDate = (value) => {
  try {
    return format(parseISO(value), "MMM d, yyyy");
  } catch {
    return value;
  }
};

const formatTimestamp = (ts) => {
  if (!ts || typeof ts.toDate !== "function") return null;
  return format(ts.toDate(), "MMM d, yyyy");
};

const truncateOwner = (owner) => {
  if (!owner) return "";
  // Keep it short — strip generic suffixes like "collects", "coordinates"
  return owner.replace(/\s*\(.*?\)/g, "").trim();
};

const normalize = (value) => String(value || "").toLowerCase();

const StatusSelect = ({ task, saving, onChange }) => {
  const status = task.status || "pending";
  return (
    <Select
      value={status}
      variant="standard"
      size="small"
      disabled={saving}
      onChange={(e) => onChange(task, e.target.value)}
      renderValue={(val) => {
        const c = STATUS_CONFIG[val] ?? STATUS_CONFIG.pending;
        return <Chip label={c.label} color={c.chipColor} size="small" />;
      }}
      sx={{ minWidth: 130 }}
      inputProps={{ sx: { py: "2px !important" } }}
    >
      {Object.entries(STATUS_CONFIG).map(([val, { label, chipColor }]) => (
        <MenuItem key={val} value={val}>
          <Chip label={label} color={chipColor} size="small" />
        </MenuItem>
      ))}
    </Select>
  );
};

const DetailButton = ({ task, onOpen }) => (
  <Tooltip title="Task details">
    <IconButton size="small" onClick={() => onOpen(task)}>
      <EditRounded fontSize="small" />
    </IconButton>
  </Tooltip>
);

const HipaaComplianceCalendarPage = () => {
  const { isGlobalAdmin, userLoading, user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [windowMonths, setWindowMonths] = useState(WINDOW_STEP_MONTHS);

  const [ownerFilter, setOwnerFilter] = useState(FILTER_ALL);

  const [savingTaskId, setSavingTaskId] = useState(null);
  const [detailTask, setDetailTask] = useState(null);
  const [savingDetail, setSavingDetail] = useState(false);

  const { control, handleSubmit, reset } = useForm({
    defaultValues: { driveLink: "", notes: "" },
  });

  const windowEndIso = useMemo(
    () => format(addMonths(new Date(), windowMonths), "yyyy-MM-dd"),
    [windowMonths],
  );

  useEffect(() => {
    if (!isGlobalAdmin) return undefined;

    const unsubscribe = db
      .collection("hipaaTasks")
      .where("dueDate", "<=", windowEndIso)
      .orderBy("dueDate", "asc")
      .onSnapshot(
        (snapshot) => {
          setTasks(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
          setError(null);
          setLoading(false);
          setLoadingMore(false);
        },
        (snapshotError) => {
          setError(snapshotError.message || "Failed to load HIPAA tasks.");
          setLoading(false);
          setLoadingMore(false);
        },
      );

    return () => unsubscribe();
  }, [isGlobalAdmin, windowEndIso]);

  const updateStatus = useCallback(
    async (task, nextStatus) => {
      if (!user?.uid) return;
      setSavingTaskId(task.id);
      setError(null);
      try {
        const payload = { status: nextStatus };
        if (nextStatus === "done") {
          payload.completedAt = firebase.firestore.FieldValue.serverTimestamp();
          payload.completedBy = user.displayName || user.email || user.uid;
        } else {
          payload.completedAt = null;
          payload.completedBy = null;
        }
        await db.collection("hipaaTasks").doc(task.id).update(payload);
      } catch (err) {
        setError(err.message || "Failed to update task status.");
      } finally {
        setSavingTaskId(null);
      }
    },
    [user],
  );

  const openDetail = useCallback(
    (task) => {
      setDetailTask(task);
      reset({ driveLink: task.driveLink || "", notes: task.notes || "" });
    },
    [reset],
  );

  const closeDetail = useCallback(() => {
    if (!savingDetail) setDetailTask(null);
  }, [savingDetail]);

  const onSubmitDetail = useCallback(
    async ({ driveLink, notes }) => {
      if (!detailTask || !user?.uid) return;
      setSavingDetail(true);
      setError(null);
      try {
        await db
          .collection("hipaaTasks")
          .doc(detailTask.id)
          .update({
            driveLink: driveLink.trim() || null,
            notes: notes.slice(0, NOTES_MAX_LEN).trim() || null,
          });
        setDetailTask(null);
      } catch (err) {
        setError(err.message || "Failed to save task details.");
      } finally {
        setSavingDetail(false);
      }
    },
    [detailTask, user],
  );

  const handleLoadMore = useCallback(() => {
    setLoadingMore(true);
    setWindowMonths((m) => Math.min(m + WINDOW_STEP_MONTHS, MAX_WINDOW_MONTHS));
  }, []);

  const { activeTasks, completedTasks } = useMemo(() => {
    const today = startOfDay(new Date());

    const enriched = tasks
      .map((task) => {
        const dueDate = parseISO(task.dueDate);
        const status = task.status || "pending";
        const done = status === "done";
        const overdue = !done && isBefore(dueDate, today);
        const daysUntilDue = differenceInCalendarDays(dueDate, today);
        const dueSoon = !done && daysUntilDue >= 0 && daysUntilDue <= 14;
        return { ...task, done, overdue, dueSoon, dueDateObj: dueDate };
      })
      .filter((task) => isOwnerMatch(task.owner, ownerFilter));

    const active = enriched
      .filter((t) => !t.done)
      .sort((a, b) => {
        if (a.overdue !== b.overdue) return a.overdue ? -1 : 1;
        return a.dueDateObj.getTime() - b.dueDateObj.getTime();
      });

    const completed = enriched
      .filter((t) => t.done)
      .sort((a, b) => {
        const at =
          a.completedAt?.toDate?.() != null
            ? a.completedAt.toDate().getTime()
            : a.dueDateObj.getTime();
        const bt =
          b.completedAt?.toDate?.() != null
            ? b.completedAt.toDate().getTime()
            : b.dueDateObj.getTime();
        return bt - at;
      });

    return { activeTasks: active, completedTasks: completed };
  }, [tasks, ownerFilter]);

  if (!userLoading && !isGlobalAdmin) {
    return <Navigate to="/dashboard/prompts" replace />;
  }

  const completedOn = detailTask
    ? formatTimestamp(detailTask.completedAt)
    : null;

  return (
    <Box>
      <DashboardPageHeader
        title="HIPAA Compliance"
        subtitle="System-of-record task list for HIPAA obligations and completion evidence."
      />

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      ) : null}

      {loading ? (
        <Loading small />
      ) : (
        <>
          <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
            <FormControl sx={{ minWidth: 160 }}>
              <InputLabel>Owner</InputLabel>
              <Select
                label="Owner"
                value={ownerFilter}
                onChange={(e) => setOwnerFilter(e.target.value)}
              >
                <MenuItem value={FILTER_ALL}>All</MenuItem>
                <MenuItem value="murphy">Murphy</MenuItem>
                <MenuItem value="claud">Claud</MenuItem>
                <MenuItem value="mesa">Mesa</MenuItem>
              </Select>
            </FormControl>
          </Stack>

          {/* ── Active tasks ── */}
          <TableContainer>
            <Table
              size="small"
              aria-label="Active HIPAA tasks"
              sx={tableFixedSx}
            >
              <ColGroup />
              <TableHead>
                <TableRow>
                  <TableCell sx={{ minWidth: 0 }}>Task</TableCell>
                  <TableCell sx={COL.due}>Due</TableCell>
                  <TableCell sx={COL.owner}>Owner</TableCell>
                  <TableCell sx={COL.status}>Status</TableCell>
                  <TableCell sx={COL.action} />
                </TableRow>
              </TableHead>
              <TableBody>
                {activeTasks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} sx={{ color: "text.secondary" }}>
                      No active tasks.
                    </TableCell>
                  </TableRow>
                ) : (
                  activeTasks.map((task) => (
                    <TableRow key={task.id}>
                      <TableCell sx={{ minWidth: 0 }}>
                        <Typography
                          variant="body2"
                          sx={{ wordBreak: "break-word" }}
                        >
                          {task.title}
                        </Typography>
                      </TableCell>
                      <TableCell sx={COL.due}>
                        {formatDueDate(task.dueDate)}
                      </TableCell>
                      <TableCell sx={COL.owner}>
                        <Typography variant="body2" sx={ownerTypographySx}>
                          {truncateOwner(task.owner)}
                        </Typography>
                      </TableCell>
                      <TableCell sx={COL.status}>
                        <StatusSelect
                          task={task}
                          saving={savingTaskId === task.id}
                          onChange={updateStatus}
                        />
                      </TableCell>
                      <TableCell
                        sx={COL.action}
                        align="right"
                        padding="checkbox"
                      >
                        <DetailButton task={task} onOpen={openDetail} />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {windowMonths < MAX_WINDOW_MONTHS ? (
            <Stack alignItems="center" spacing={0.5} sx={{ mt: 2 }}>
              <Typography variant="caption" color="text.secondary">
                Showing tasks through{" "}
                {format(addMonths(new Date(), windowMonths), "MMMM yyyy")}
              </Typography>
              <LoadingButton
                size="small"
                loading={loadingMore}
                onClick={handleLoadMore}
              >
                Load next year
              </LoadingButton>
            </Stack>
          ) : null}

          {/* ── Completed tasks ── */}
          {completedTasks.length > 0 ? (
            <Box sx={{ mt: 5 }}>
              <Typography variant="subtitle1" gutterBottom>
                Completed ({completedTasks.length})
              </Typography>
              <TableContainer>
                <Table
                  size="small"
                  aria-label="Completed HIPAA tasks"
                  sx={tableFixedSx}
                >
                  <ColGroup />
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ minWidth: 0 }}>Task</TableCell>
                      <TableCell sx={COL.due}>Due</TableCell>
                      <TableCell sx={COL.owner}>Owner</TableCell>
                      <TableCell sx={COL.status}>Status</TableCell>
                      <TableCell sx={COL.action} />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {completedTasks.map((task) => (
                      <TableRow key={task.id}>
                        <TableCell sx={{ minWidth: 0 }}>
                          <Typography
                            variant="body2"
                            sx={{ wordBreak: "break-word" }}
                          >
                            {task.title}
                          </Typography>
                        </TableCell>
                        <TableCell sx={COL.due}>
                          {formatDueDate(task.dueDate)}
                        </TableCell>
                        <TableCell sx={COL.owner}>
                          <Typography variant="body2" sx={ownerTypographySx}>
                            {truncateOwner(task.owner)}
                          </Typography>
                        </TableCell>
                        <TableCell sx={COL.status}>
                          <StatusSelect
                            task={task}
                            saving={savingTaskId === task.id}
                            onChange={updateStatus}
                          />
                        </TableCell>
                        <TableCell
                          sx={COL.action}
                          align="right"
                          padding="checkbox"
                        >
                          <DetailButton task={task} onOpen={openDetail} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          ) : null}
        </>
      )}

      {/* ── Task Details dialog ── */}
      <Dialog
        open={Boolean(detailTask)}
        onClose={closeDetail}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Task Details</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Typography variant="body2" fontWeight={600}>
              {detailTask?.title}
            </Typography>

            <Stack spacing={0.5}>
              <Typography variant="body2" color="text.secondary">
                Due: {detailTask ? formatDueDate(detailTask.dueDate) : ""}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Owner: {detailTask?.owner}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Cadence: {detailTask?.cadence}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Policy: {detailTask?.policyRef || "—"}
              </Typography>
            </Stack>

            {detailTask?.status === "done" && completedOn ? (
              <Alert severity="success" sx={{ py: 0.5 }}>
                Completed {completedOn}
                {detailTask.completedBy ? ` by ${detailTask.completedBy}` : ""}
              </Alert>
            ) : null}

            <Controller
              name="driveLink"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Evidence link"
                  fullWidth
                  size="small"
                  placeholder="https://..."
                  helperText="Link to supporting document or file (e.g. Google Drive)."
                  disabled={savingDetail}
                />
              )}
            />

            <Controller
              name="notes"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Notes"
                  fullWidth
                  multiline
                  minRows={3}
                  placeholder="Optional context, checklist, or references beyond the link."
                  helperText={`${(field.value || "").length}/${NOTES_MAX_LEN}`}
                  disabled={savingDetail}
                  onChange={(e) =>
                    field.onChange(e.target.value.slice(0, NOTES_MAX_LEN))
                  }
                />
              )}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDetail} disabled={savingDetail}>
            Cancel
          </Button>
          <LoadingButton
            variant="contained"
            loading={savingDetail}
            onClick={handleSubmit(onSubmitDetail)}
          >
            Save
          </LoadingButton>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

const isOwnerMatch = (owner, ownerFilter) => {
  if (ownerFilter === FILTER_ALL) return true;
  return normalize(owner).includes(ownerFilter);
};

export default HipaaComplianceCalendarPage;
