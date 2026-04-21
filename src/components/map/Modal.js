import React, { useContext, forwardRef } from "react";
import {
  Dialog,
  DialogContent,
  IconButton,
  Typography,
  Box,
  Link,
  Divider,
  Slide,
} from "@mui/material";
import { CloseRounded } from "@mui/icons-material";
import firebase from "firebase/compat/app";
import { AuthContext } from "context/Auth";
import { db } from "services/firebase";
import { formatDistanceToNow } from "date-fns";

import StarRating from "components/map/Modal/StarRating";
import FacilityFeatures from "components/map/Modal/FacilityFeatures";
import SeatData from "components/map/SeatData";
import QueueForm from "components/queue/QueueForm";
import { getActiveWaitTime } from "utils/locationProcessing";

const Transition = forwardRef((props, ref) => {
  return <Slide direction="up" ref={ref} {...props} />;
});

// Helper function to get current occupancy state description
const getWaitingStateText = (waitTime) => {
  if (!waitTime) return "Status unknown";

  const waitTimeNum =
    typeof waitTime === "string" ? parseInt(waitTime, 10) : waitTime;

  if (waitTimeNum <= 30) return "Currently empty";
  if (waitTimeNum <= 120) return "Currently half-full";
  if (waitTimeNum <= 240) return "Currently full";
  return "Currently overflowing";
};

const Modal = ({
  modalOpen,
  modalVisible,
  setModalVisible,
  userLocation,
  error,
}) => {
  const { user } = useContext(AuthContext);

  // Debug logs to understand what waitTime is being used
  if (modalOpen) {
    console.log("Modal data:", {
      title: modalOpen.title,
      waitScore: modalOpen.waitScore,
      averageWaitTime: modalOpen.averageWaitTime,
      lastUpdated: modalOpen.lastUpdated,
      waitTimes: modalOpen.waitTimes
        ? modalOpen.waitTimes.slice(0, 5).map((wt) => ({
            date: new Date(wt.date).toLocaleString(),
            waitTime: wt.waitTime,
            scheduled: !!wt.scheduled,
            admin: !!wt.admin,
          }))
        : [],
    });
  }

  // Get the active wait time using the same function as other components
  const activeWaitTime = modalOpen?.waitTimes
    ? getActiveWaitTime(modalOpen)
    : null;

  // Use activeWaitTime for consistency with other components, fall back to averageWaitTime or waitScore
  const waitTimeToDisplay =
    activeWaitTime?.waitTime !== undefined
      ? activeWaitTime.waitTime
      : modalOpen?.averageWaitTime !== undefined
      ? modalOpen.averageWaitTime
      : modalOpen?.waitScore;

  const hasTime = waitTimeToDisplay !== undefined;
  const locationName = modalOpen?.title;
  const locationRef = modalOpen?.id?.toString();

  const capitalize = (string) => {
    if (!string) return "";
    return string
      .toLowerCase()
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.substring(1))
      .join(" ");
  };

  // Get a human-readable time ago string
  const getTimeAgo = (timestamp) => {
    if (!timestamp) return null;

    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch (error) {
      console.error("Error formatting time ago:", error);
      return null;
    }
  };


  // Get capabilities from the dedicated field or fall back to direct properties
  const getCapabilities = () => {
    if (modalOpen?.capabilities) {
      return modalOpen.capabilities;
    }

    // Fallback to direct properties for backward compatibility
    return {
      lab: modalOpen?.lab || false,
      xray: modalOpen?.xray || false,
      ultrasound: modalOpen?.ultrasound || false,
      ct: modalOpen?.ct || false,
      mri: modalOpen?.mri || false,
    };
  };

  return (
    <Dialog
      open={modalVisible}
      onClose={() => setModalVisible(false)}
      maxWidth="md"
      TransitionComponent={Transition}
      PaperProps={{
        sx: {
          position: "relative",
          p: 2,
          m: 2,
          minHeight: "200px",
          width: "100%",
          maxWidth: {
            xs: "420px", // Default/mobile width
            sm: "600px", // Tablet and up
            md: "800px", // Desktop and up
          },
          borderRadius: "12px",
        },
      }}
      sx={{
        "& .MuiDialog-paper": {
          margin: 0,
          position: "fixed",
          bottom: 0,
          mx: "auto",
          left: "50%",
          transform: "translateX(-50%)",
        },
      }}
    >
      <IconButton
        onClick={() => setModalVisible(false)}
        sx={{
          position: "absolute",
          right: 8,
          top: 8,
          zIndex: 1,
        }}
      >
        <CloseRounded />
      </IconButton>

      <DialogContent sx={{ p: 0 }}>
        <Box sx={{ textAlign: "center", mt: 2, mb: 2 }}>
          {modalOpen?.title && (
            <Typography
              variant="h5"
              color="primary"
              sx={{
                fontWeight: 500,
                mb: 1,
                fontSize: {
                  xs: "1.15rem",
                  sm: "1.3rem",
                  md: "1.5rem",
                },
              }}
            >
              {capitalize(modalOpen.title)}
            </Typography>
          )}

          <Typography
            variant="subtitle1"
            color="text.secondary"
            sx={{
              mb: 2,
              fontSize: {
                xs: "0.875rem",
                sm: "1rem",
              },
            }}
          >
            {modalOpen?.type === "Clinic"
              ? "Clinic / Immediate Care"
              : "Emergency Department"}
          </Typography>

          {modalOpen?.rating ? <StarRating rating={modalOpen.rating} /> : null}

          <Typography
            variant="subtitle1"
            color="primary"
            sx={{
              fontWeight: 500,
              mt: 2,
              mb: 1,
              fontSize: {
                xs: "0.9rem",
                sm: "1rem",
              },
            }}
          >
            {activeWaitTime?.waitTime === undefined
              ? "Anticipated Waiting Room Experience"
              : "Waiting Time Estimate"}
          </Typography>

          {hasTime ? (
            <SeatData waitTime={waitTimeToDisplay} hideStatus={true} />
          ) : null}

          {!hasTime ? (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                mb: 2,
                fontSize: {
                  xs: "0.75rem",
                  sm: "0.875rem",
                },
              }}
            >
              No current estimated waiting room time.
            </Typography>
          ) : null}

          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 0.5,
              mb: 1,
              fontSize: {
                xs: "0.7rem",
                sm: "0.75rem",
              },
            }}
          >
            {activeWaitTime?.date ? (
              <>
                <Box component="span" sx={{ fontWeight: 500 }}>
                  {getWaitingStateText(waitTimeToDisplay)}
                </Box>
                <Box component="span" sx={{ mx: 0.3 }}>
                  •
                </Box>
                <Box component="span">
                  updated {getTimeAgo(activeWaitTime.date)}
                </Box>
              </>
            ) : modalOpen?.lastUpdated ? (
              <>
                <Box component="span" sx={{ fontWeight: 500 }}>
                  {waitTimeToDisplay
                    ? getWaitingStateText(waitTimeToDisplay)
                    : "Status unknown"}
                </Box>
                <Box component="span" sx={{ mx: 0.3 }}>
                  •
                </Box>
                <Box component="span">
                  updated {getTimeAgo(modalOpen.lastUpdated)}
                </Box>
              </>
            ) : hasTime ? (
              <>
                <Box component="span" sx={{ fontWeight: 500 }}>
                  {getWaitingStateText(waitTimeToDisplay)}
                </Box>
                <Box component="span" sx={{ mx: 0.3 }}>
                  •
                </Box>
                <Box component="span">updated March 8, 2024*</Box>
                {!user && (
                  <Link
                    href="/register"
                    sx={{
                      ml: 1,
                      color: "primary.main",
                      fontSize: {
                        xs: "0.75rem",
                        sm: "0.875rem",
                      },
                    }}
                  >
                    Claim this Facility
                  </Link>
                )}
              </>
            ) : null}
          </Typography>
        </Box>

        <FacilityFeatures features={getCapabilities()} />

        <QueueForm
          queue={modalOpen?.queue}
          queueEnabled={modalOpen?.queueEnabled}
          queueNumber={modalOpen?.queueNumber}
          queueCap={modalOpen?.queueCap}
          queueLength={modalOpen?.queueLength}
          locationName={locationName}
          locationRef={locationRef}
          firebase={firebase}
          db={db}
          textSequence={modalOpen?.textSequence}
        />

      </DialogContent>
    </Dialog>
  );
};

export default Modal;
