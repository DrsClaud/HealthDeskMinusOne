import React, { useState, useEffect } from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  Paper,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  LinearProgress,
  Box,
  IconButton,
  Collapse,
  Divider,
  useMediaQuery,
  Fade,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import CloseIcon from "@mui/icons-material/Close";
import AssignmentIcon from "@mui/icons-material/Assignment";
import { useAuth } from "hooks/useAuth";
import { db } from "services/firebase";

/**
 * A floating checklist component that shows facility completion status
 * and provides direct links to complete remaining tasks.
 * Positions at bottom-right on desktop and bottom center on mobile.
 *
 * Only shows when:
 * - User is a facility
 * - Onboarding dialog has been permanently dismissed
 * - Checklist itself hasn't been dismissed
 */
const FacilityChecklist = ({ locationData }) => {
  const { user, userData } = useAuth();
  const [expanded, setExpanded] = useState(true);
  const [showChecklist, setShowChecklist] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [sessionCheck, setSessionCheck] = useState(0); // Force re-evaluation when sessionStorage changes
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // Check if checklist should be visible
  useEffect(() => {
    if (!user?.uid || userData?.role !== "facility") {
      setShowChecklist(false);
      setIsLoaded(true);
      return;
    }

    // Only show if onboarding has been permanently dismissed but checklist hasn't
    const onboardingDismissed = userData?.hideFacilityOnboardingDialog || false;
    const checklistDismissed = userData?.hideFacilityChecklist || false;

    // Don't show checklist if onboarding was just dismissed in this session
    const onboardingJustDismissed =
      sessionStorage.getItem("onboardingJustDismissed") === "true";

    setShowChecklist(
      onboardingDismissed && !checklistDismissed && !onboardingJustDismissed
    );
    setIsLoaded(true);
  }, [user, userData, sessionCheck]);

  // Clear the "just dismissed" flag after component loads (for next navigation)
  useEffect(() => {
    const timer = setTimeout(() => {
      sessionStorage.removeItem("onboardingJustDismissed");
      setSessionCheck((prev) => prev + 1); // Force re-evaluation
    }, 1000); // Clear after 1 second to allow for immediate transitions to other pages

    return () => clearTimeout(timer);
  }, []);

  // Load saved expand state
  useEffect(() => {
    const savedState = localStorage.getItem("facilityChecklistExpanded");
    if (savedState !== null) {
      setExpanded(savedState === "true");
    }
  }, []);

  const toggleExpand = () => {
    const newState = !expanded;
    setExpanded(newState);
    localStorage.setItem("facilityChecklistExpanded", newState);
  };

  const handleDismiss = () => {
    setIsExiting(true);
    // Wait for fade out animation before updating state and DB
    setTimeout(() => {
      setShowChecklist(false);
      if (user?.uid) {
        db.collection("users")
          .doc(user.uid)
          .update({
            hideFacilityChecklist: true,
          })
          .catch((error) => {
            console.error("Error saving checklist preference:", error);
          });
      }
    }, 200); // Match MUI's default transition duration
  };

  // Don't render if not loaded or shouldn't show
  if (!isLoaded || !showChecklist) {
    return null;
  }

  // Determine completion status of each step
  const hasCapabilities =
    locationData?.capabilities &&
    Object.values(locationData.capabilities).some((value) => value === true);

  const hasVirtualQueue = locationData?.queueEnabled === true;

  const hasWaitTimes = locationData?.waitTimes?.length > 0;

  // Calculate completion percentage
  const completedSteps = [
    hasCapabilities,
    hasVirtualQueue,
    hasWaitTimes,
  ].filter(Boolean).length;
  const totalSteps = 3;
  const completionPercentage = Math.floor((completedSteps / totalSteps) * 100);

  // Get appropriate position styles based on screen size
  const getPositionStyles = () => {
    if (isMobile) {
      return {
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        maxWidth: "100%",
        borderRadius: `${theme.shape.borderRadius}px ${theme.shape.borderRadius}px 0 0`,
      };
    } else {
      return {
        position: "fixed",
        right: 20,
        bottom: 20,
        maxWidth: 350,
      };
    }
  };

  return (
    <Fade in={!isExiting}>
      <Paper
        elevation={4}
        sx={{
          ...getPositionStyles(),
          overflow: "hidden",
          backgroundColor: "white",
          zIndex: 1200,
          border: (theme) => `1px solid ${theme.palette.divider}`,
          borderRadius: theme.shape.borderRadius,
        }}
      >
        {/* Header */}
        <Box
          sx={{
            p: 1.5,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            cursor: "pointer",
            borderBottom: expanded
              ? `1px solid ${theme.palette.divider}`
              : "none",
          }}
          onClick={toggleExpand}
        >
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <AssignmentIcon color="primary" sx={{ mr: 1.5 }} />
            <Typography
              variant="subtitle1"
              component="div"
              sx={{ fontWeight: 500 }}
            >
              Facility Checklist
            </Typography>
          </Box>

          <Box sx={{ display: "flex", alignItems: "center" }}>
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                handleDismiss();
              }}
              sx={{ mr: 0.5 }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
            {expanded ? (
              <ExpandMoreIcon color="action" />
            ) : (
              <ExpandLessIcon color="action" />
            )}
          </Box>
        </Box>

        <Collapse in={expanded && isLoaded}>
          <Box sx={{ p: 2 }}>
            <Typography
              variant="body2"
              color="text.secondary"
              paragraph
              sx={{ mb: 1 }}
            >
              {completedSteps === totalSteps
                ? "Great job! Your facility has maximum visibility on HealthDesk."
                : "Complete these steps to improve your facility's visibility."}
            </Typography>

            <List sx={{ width: "100%", pb: 0 }} dense>
              <ListItem
                component={RouterLink}
                to="/dashboard/status"
                button
                sx={{
                  borderRadius: 1,
                  bgcolor: hasWaitTimes
                    ? "rgba(76, 175, 80, 0.08)"
                    : "transparent",
                  "&:hover": {
                    bgcolor: hasWaitTimes
                      ? "rgba(76, 175, 80, 0.15)"
                      : "rgba(0, 0, 0, 0.04)",
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  <CheckCircleOutlineIcon
                    color={hasWaitTimes ? "success" : "disabled"}
                    fontSize="small"
                  />
                </ListItemIcon>
                <ListItemText
                  primary="Update Wait Times"
                  secondary="Keep your wait times current."
                />
              </ListItem>

              <ListItem
                component={RouterLink}
                to="/dashboard/status"
                button
                sx={{
                  borderRadius: 1,
                  bgcolor: hasCapabilities
                    ? "rgba(76, 175, 80, 0.08)"
                    : "transparent",
                  "&:hover": {
                    bgcolor: hasCapabilities
                      ? "rgba(76, 175, 80, 0.15)"
                      : "rgba(0, 0, 0, 0.04)",
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  <CheckCircleOutlineIcon
                    color={hasCapabilities ? "success" : "disabled"}
                    fontSize="small"
                  />
                </ListItemIcon>
                <ListItemText
                  primary="Update Your Capabilities"
                  secondary="Complete your Status Board."
                />
              </ListItem>

              <ListItem
                component={RouterLink}
                to="/dashboard/queue"
                button
                sx={{
                  borderRadius: 1,
                  bgcolor: hasVirtualQueue
                    ? "rgba(76, 175, 80, 0.08)"
                    : "transparent",
                  "&:hover": {
                    bgcolor: hasVirtualQueue
                      ? "rgba(76, 175, 80, 0.15)"
                      : "rgba(0, 0, 0, 0.04)",
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  <CheckCircleOutlineIcon
                    color={hasVirtualQueue ? "success" : "disabled"}
                    fontSize="small"
                  />
                </ListItemIcon>
                <ListItemText
                  primary="Enable Virtual Queue"
                  secondary="Set up your waiting room."
                />
              </ListItem>
            </List>
          </Box>
        </Collapse>
      </Paper>
    </Fade>
  );
};

export default FacilityChecklist;
