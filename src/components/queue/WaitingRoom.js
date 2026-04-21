import React, { useState, useEffect } from "react";
import { Link as RouterLink } from "react-router-dom";
import { db } from "services/firebase";
import QueuePatient from "./QueuePatient";
import { calculateHlthdskScore } from "utils/locationProcessing";
import {
  Alert,
  Box,
  CircularProgress,
  FormControlLabel,
  IconButton,
  Link,
  Paper,
  Switch,
  TextField,
  Typography,
  Button,
  Snackbar,
} from "@mui/material";
import QueueDisplay from "./splitflap/QueueDisplay";
import LoadingButton from "@mui/lab/LoadingButton";
import CloseIcon from "@mui/icons-material/Close";
import PremiumAlert from "components/dashboard/PremiumAlert";
import PremiumWrapper from "components/dashboard/PremiumWrapper";
import { useAuth } from "hooks/useAuth";
import DashboardPageHeader from "components/common/DashboardPageHeader";

const WaitingRoom = ({ data, setData }) => {
  const { hasValidSubscription } = useAuth();
  const [waitingRoomLoading, setWaitingRoomLoading] = useState(false);
  const [queueCapInput, setQueueCapInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (data?.queueCap) {
      setQueueCapInput(data.queueCap);
    }
  }, [data?.queueCap]);

  const setWaitingRoomCap = () => {
    if (!queueCapInput) return;

    setIsSaving(true);
    setData({ ...data, queueCap: queueCapInput });

    db.collection("locations")
      .doc(String(data.id))
      .update({
        queueCap: queueCapInput,
      })
      .then(() => {
        console.log("Queue cap updated to:", queueCapInput);
        setShowSuccess(true);
      })
      .finally(() => {
        setIsSaving(false);
      });
  };

  const deletePatient = (patient) => {
    setWaitingRoomLoading(true);
    let newQueue = [...data.queue];
    const index = newQueue.indexOf(patient);
    newQueue.splice(index, 1);

    const batch = db.batch();

    batch.update(db.collection("locations").doc(String(data.id)), {
      queue: newQueue,
    });

    batch.commit().then(() => {
      console.log("deleted");
      setWaitingRoomLoading(false);
    });
  };

  const textPatient = (patient, type) => {
    setWaitingRoomLoading(true);

    const batch = db.batch();

    let newQueue = [...data.queue];
    const index = newQueue.indexOf(patient);
    const updatedPatient =
      type === "call"
        ? { ...patient, called: Date.now() }
        : { ...patient, registered: Date.now() };
    newQueue[index] = updatedPatient;

    batch.update(db.collection("locations").doc(String(data.id)), {
      queue: newQueue,
    });

    const message =
      type === "call"
        ? `${data.title} is ready for you to come in. The address is ${data.address}. Show this text to the welcome desk. You are "Patient ${patient.id}".`
        : `Please expect a registration phone call shortly from ${data.title}.`;

    batch.set(db.collection("messages").doc(), {
      to: patient.phone,
      body: message,
    });

    batch.commit().then(() => {
      setWaitingRoomLoading(false);
      setData({ ...data, queue: newQueue });
    });
  };

  const toggleWaitingRoom = () => {
    if (!hasValidSubscription) return;
    if (facilityStatus !== "approved") return;

    const value = !data?.queueEnabled;

    // Calculate updated My HealthDesk score with overridden queue enabled value
    const hlthdskScore = calculateHlthdskScore(data, value);

    const updates = {
      queueEnabled: value,
      ...(value && !data?.queueCap && { queueCap: 10 }),
      hlthdsk_score: hlthdskScore,
    };

    setData({ ...data, ...updates });

    db.collection("locations")
      .doc(String(data.id))
      .update(updates)
      .then(() => {
        console.log("success");
      });
  };

  // Get facility status using the new string-based enum
  const facilityStatus = data.status || "approved";
  const isNotApproved = facilityStatus !== "approved";

  return (
    <div className="inner">
      <DashboardPageHeader
        title="Your Clinic's Queue"
        subtitle="Have patients virtually register to reserve their spot, and let them know when they're ready to be seen via text message."
      />

      {!data.id ? (
        <CircularProgress />
      ) : (
        <Box>
          {!hasValidSubscription && (
            <PremiumAlert feature="Virtual waiting room" />
          )}

          {!isNotApproved && data.healthcare_que?.enabled === false && (
            <Alert severity="info" sx={{ mb: 2 }}>
              To get the most out of the Virtual Queue, enable{" "}
              <Link component={RouterLink} to="/dashboard/virtual-registration">
                Virtual Registration
              </Link>{" "}
              to pre-register patients via text before they arrive and save
              time.
            </Alert>
          )}

          {isNotApproved && (
            <Alert
              severity={facilityStatus === "pending" ? "warning" : "error"}
              sx={{ mb: 4 }}
            >
              {facilityStatus === "pending"
                ? "Virtual waiting room is disabled until your facility is approved. This usually takes 1-2 days."
                : "Your facility has been rejected. Virtual waiting room is disabled."}
            </Alert>
          )}

          <PremiumWrapper disabled={!hasValidSubscription}>
            <FormControlLabel
              value="start"
              control={
                <Switch
                  color="primary"
                  onChange={toggleWaitingRoom}
                  defaultChecked={data?.queueEnabled}
                  disabled={!hasValidSubscription || isNotApproved}
                />
              }
              label="Use virtual waiting room?"
              labelPlacement="start"
              sx={{ ml: 0, mb: 2 }}
            />

            {waitingRoomLoading ? <CircularProgress /> : null}

            {data?.queueEnabled ? (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <Box sx={{ maxWidth: 360 }}>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    Queue Settings
                  </Typography>
                  <TextField
                    id="cap"
                    name="cap"
                    label="Maximum Queue"
                    type="number"
                    variant="standard"
                    onChange={(e) => setQueueCapInput(e.target.value)}
                    value={queueCapInput}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    sx={{ mb: 2 }}
                  />
                  <LoadingButton
                    loading={isSaving}
                    variant="contained"
                    onClick={setWaitingRoomCap}
                  >
                    Save
                  </LoadingButton>
                  {showSuccess && (
                    <Alert
                      severity="success"
                      sx={{ mt: 2 }}
                      action={
                        <IconButton
                          size="small"
                          onClick={() => setShowSuccess(false)}
                        >
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      }
                    >
                      Your settings have been saved.
                    </Alert>
                  )}
                </Box>

                <Box>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    Current Queue
                  </Typography>
                  {data?.queue?.length ? (
                    <Box maxWidth="sm">
                      {data.queue.map((patient) => (
                        <QueuePatient
                          key={patient.date}
                          data={data}
                          setData={setData}
                          patient={patient}
                          textPatient={textPatient}
                          deletePatient={deletePatient}
                        />
                      ))}
                    </Box>
                  ) : (
                    <Alert severity="info">
                      No patients are currently in queue.
                    </Alert>
                  )}
                </Box>
              </Box>
            ) : null}
          </PremiumWrapper>
        </Box>
      )}
    </div>
  );
};

export default WaitingRoom;
