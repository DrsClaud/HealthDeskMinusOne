import React from "react";
import { List, ListItem, ListItemText, Typography } from "@mui/material";
import { CheckRounded, ClearRounded } from "@mui/icons-material";
import { grey } from "@mui/material/colors";

const getFeatureText = (feature) => {
  const featureMap = {
    lab: "Lab",
    xray: "Xray (plain films)",
    ultrasound: "Ultrasound",
    ct: "CT",
    mri: "MRI",
  };
  return featureMap[feature] || "";
};

const FacilityFeatures = ({ features }) => {
  if (!Object.values(features).some(Boolean)) return null;

  return (
    <>
      <Typography
        variant="subtitle1"
        color="primary"
        sx={{
          fontWeight: 500,
          mt: 2,
          mb: 0,
          textAlign: "center",
          fontSize: {
            xs: "0.9rem",
            sm: "1rem",
          },
        }}
      >
        On-Site Capabilities
      </Typography>
      <List dense sx={{ width: "100%", maxWidth: 380, margin: "auto" }}>
        {Object.entries(features).map(([name, value], i) => {
          if (!value) return null;

          return (
            <ListItem
              key={i}
              disableGutters
              disablePadding
              secondaryAction={
                value === "yes" || value === true ? (
                  <CheckRounded color="primary" />
                ) : (
                  <ClearRounded sx={{ color: grey[500] }} />
                )
              }
            >
              <ListItemText primary={getFeatureText(name)} />
            </ListItem>
          );
        })}
      </List>
    </>
  );
};

export default FacilityFeatures;
