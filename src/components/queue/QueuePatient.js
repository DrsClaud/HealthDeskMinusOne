import React, { useState } from "react";
import firebase from "firebase/compat/app";
import { format, formatDistanceToNow } from "date-fns";
import PatientIdModal from "./PatientIdModal";
import { 
  Box,
  Typography,
  Chip,
  IconButton,
  Link,
  Paper,
  Tooltip,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  DialogContentText
} from "@mui/material";
import { 
  ClearRounded,
  AccessTimeRounded,
  CheckCircleOutline,
  NotificationsActive
} from "@mui/icons-material";
import { LoadingButton } from "@mui/lab";
import { useAuth } from "hooks/useAuth";

const QueuePatient = ({ data, setData, patient }) => {
  const { user } = useAuth();
  const [phoneVisible, setPhoneVisible] = useState(false);
  const [calledTime, setCalledTime] = useState();
  const [registerLoading, setRegisterLoading] = useState(false);
  const [notifyLoading, setNotifyLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [registerDialogOpen, setRegisterDialogOpen] = useState(false);
  const [notifyDialogOpen, setNotifyDialogOpen] = useState(false);

  const getElapsedTime = () => {
    const time = calledTime ? calledTime : patient.called;
    if (!time) return null;
    return formatDistanceToNow(time, { addSuffix: true });
  };

  const getStatusChip = () => {
    if (patient?.status?.toUpperCase() === "ARRIVED") {
      return <Chip label="Arrived" color="success" icon={<CheckCircleOutline />} />;
    }
    if (patient?.status?.toUpperCase() === "CANCELLED") {
      return <Chip label="Cancelled" color="error" />;
    }
    if (patient.called || calledTime) {
      return (
        <Stack direction="row" spacing={1} alignItems="center">
          <Chip 
            label="Called" 
            color="warning" 
            icon={<NotificationsActive sx={{ fontSize: '1.2rem' }} />} 
          />
          <Tooltip title="Time since called">
            <Typography variant="body2" color="text.secondary">
              <AccessTimeRounded fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
              {getElapsedTime()}
            </Typography>
          </Tooltip>
        </Stack>
      );
    }
    return <Chip label="Waiting" color="primary" variant="outlined" />;
  };

  const deletePatient = async (patient) => {
    setDeleteLoading(true);

    try {
      const fn = firebase.functions().httpsCallable("deleteQueuePatient");
      await fn({
        locationId: data.id,
        patientId: patient.id,
      });

      const newQueue = data.queue.filter((p) => p.id !== patient.id);
      setData({ ...data, queue: newQueue });
      console.log("Patient and registration deleted successfully");
    } catch (error) {
      console.error("Error deleting patient and registration:", error);
    } finally {
      setDeleteLoading(false);
    }
  };

  const registerPatient = async (patient) => {
    const fn = firebase.functions().httpsCallable("sendPatientRegistration");
    await fn({
      locationId: data.id,
      patientId: patient.id,
      appOrigin: window.location.origin,
      textSequenceSecondMessage: data.textSequence ? data.textSequence[1] : undefined,
      healthcareQueEnabled: data?.healthcare_que?.enabled !== false,
    });
    const newQueue = data.queue.map((p) =>
      p.id === patient.id ? { ...p, registrationSent: true } : p
    );
    setData({ ...data, queue: newQueue });
  };

  const textPatient = async (patient, type) => {
    const fn = firebase.functions().httpsCallable("notifyQueuePatient");
    await fn({
      locationId: data.id,
      patientId: patient.id,
      type,
      title: data.title,
      address: data.address,
    });
    const newQueue = data.queue.map((p) =>
      p.id === patient.id
        ? { ...p, ...(type === "call" ? { called: Date.now() } : { registered: Date.now() }) }
        : p
    );
    setData({ ...data, queue: newQueue });
  };

  const handleRegisterConfirm = () => {
    setRegisterLoading(true);
    registerPatient(patient)
      .finally(() => {
        setRegisterLoading(false);
        setRegisterDialogOpen(false);
      });
  };

  const handleNotifyConfirm = () => {
    setNotifyLoading(true);
    textPatient(patient, "call")
      .then(() => {
        setCalledTime(Date.now());
      })
      .finally(() => {
        setNotifyLoading(false);
        setNotifyDialogOpen(false);
      });
  };

  return (
    <>
      <Paper 
        elevation={1} 
        sx={{ 
          p: 2, 
          mb: 2,
          '&:hover': {
            bgcolor: 'action.hover'
          }
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ flex: 1 }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Link
                onClick={() => setPhoneVisible(!phoneVisible)}
                sx={{ 
                  cursor: 'pointer',
                  typography: 'subtitle1',
                  fontWeight: 'medium'
                }}
              >
                Patient #{patient.id}
              </Link>
              <Tooltip title="Queue join time">
                <Typography variant="body2" color="text.secondary">
                  {format(patient.date, "h:mm a")}
                </Typography>
              </Tooltip>
            </Stack>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {data?.healthcare_que?.enabled && (
              <LoadingButton
                variant="contained"
                color={patient?.registration ? "success" : "primary"}
                disabled={!patient?.registration && !!patient?.registrationSent}
                loading={registerLoading === patient.id}
                onClick={() => patient?.registration ? setPhoneVisible(true) : setRegisterDialogOpen(true)}
                size="small"
              >
                {patient?.registration
                  ? "Registered"
                  : patient?.registrationSent
                  ? "Sent"
                  : "Register"}
              </LoadingButton>
            )}

            {getStatusChip()}

            {!patient.called && !calledTime && 
              patient?.status?.toUpperCase() !== "ARRIVED" &&
              patient?.status?.toUpperCase() !== "CANCELLED" && (
              <LoadingButton
                variant="contained"
                color="primary"
                size="small"
                onClick={() => setNotifyDialogOpen(true)}
                startIcon={<NotificationsActive />}
              >
                Notify
              </LoadingButton>
            )}

            <LoadingButton
              color="error"
              size="small"
              loading={deleteLoading}
              onClick={() => deletePatient(patient)}
              sx={{ 
                minWidth: 32,
                width: 32,
                height: 32,
                p: 0
              }}
            >
              <ClearRounded sx={{ fontSize: '1rem' }} />
            </LoadingButton>
          </Box>
        </Box>

        <PatientIdModal
          patient={patient}
          visible={phoneVisible}
          setVisible={setPhoneVisible}
        />
      </Paper>

      <Dialog
        open={registerDialogOpen}
        onClose={() => !registerLoading && setRegisterDialogOpen(false)}
      >
        <DialogTitle>Send Registration Form?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will send a text message to the patient with a link to upload their ID and insurance information. This helps expedite their check-in process when they arrive.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setRegisterDialogOpen(false)}
            disabled={registerLoading}
          >
            Cancel
          </Button>
          <LoadingButton 
            onClick={handleRegisterConfirm} 
            loading={registerLoading}
            variant="contained"
          >
            Send Registration
          </LoadingButton>
        </DialogActions>
      </Dialog>

      <Dialog
        open={notifyDialogOpen}
        onClose={() => !notifyLoading && setNotifyDialogOpen(false)}
      >
        <DialogTitle>Notify Patient?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will send a text message to the patient letting them know it's their turn to come in. Make sure you're ready to see them.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setNotifyDialogOpen(false)}
            disabled={notifyLoading}
          >
            Cancel
          </Button>
          <LoadingButton 
            onClick={handleNotifyConfirm} 
            loading={notifyLoading}
            variant="contained" 
            color="primary"
          >
            Send Notification
          </LoadingButton>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default QueuePatient;
