import React from "react";
import { List, ListItem, ListItemIcon, ListItemText } from "@mui/material";
import {
  AdsClickRounded,
  CalendarMonthRounded,
  GroupsRounded,
  ScheduleRounded,
  SmartphoneRounded,
  PsychologyRounded,
  MedicationRounded,
  MonitorHeartRounded,
  PeopleRounded,
  SchoolRounded,
} from "@mui/icons-material";

const facilityFeatures = [
  {
    icon: <ScheduleRounded color="primary" />,
    text: "Set your current waiting room volume",
  },
  {
    icon: <CalendarMonthRounded color="primary" />,
    text: "Schedule your estimated waiting room volume days and weeks in advance",
  },
  // TODO: Re-enable once Twilio BAA is in place
  // { icon: <GroupsRounded color="primary" />, text: "Manage your virtual queue" },
  // { icon: <SmartphoneRounded color="primary" />, text: "Send your patients a text when you're ready to see them" },
];

const patientFeatures = [
  {
    icon: <PsychologyRounded color="primary" />,
    text: "Unlock targeted exploration—Medical SuperIntelligence elevates the way you discover medical insights",
  },
  {
    icon: <MonitorHeartRounded color="primary" />,
    text: "Receive detailed medical overviews of your symptoms with actionable insights",
  },
  {
    icon: <MedicationRounded color="primary" />,
    text: "Get personalized assistance with medication management and potential interactions",
  },
];

const professionalFeatures = [
  {
    icon: <PeopleRounded color="primary" />,
    text: "Get unlimited case review assistance to develop comprehensive management plans",
  },
  {
    icon: <SchoolRounded color="primary" />,
    text: "Access professional-level Medical SuperIntelligence for clinical decision support",
  },
  {
    icon: <PsychologyRounded color="primary" />,
    text: "Utilize AI assistance for complex medical cases and rare conditions",
  },
];

export const getFeaturesForRole = (role) => {
  switch (role) {
    case "patient":
      return patientFeatures;
    case "professional":
      return professionalFeatures;
    default:
      return facilityFeatures;
  }
};

const UpgradeFeatures = ({ role, dense = false, sx }) => {
  const features = getFeaturesForRole(role);

  return (
    <List dense={dense} sx={{ mb: 2, ...sx }}>
      {features.map((feature, index) => (
        <ListItem key={index}>
          <ListItemIcon>{feature.icon}</ListItemIcon>
          <ListItemText primary={feature.text} />
        </ListItem>
      ))}
    </List>
  );
};

export default UpgradeFeatures;
