import React, { useState } from "react";
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Link,
  Typography,
} from "@mui/material";
import { StarRounded, HelpRounded } from "@mui/icons-material";

const StarRating = ({ rating }) => {
  const [helpOpen, setHelpOpen] = useState(false);

  const renderStars = () => {
    if (rating === "Not Available") {
      return (
        <Typography variant="body2">Rating Not Available from CMS</Typography>
      );
    }

    return Array.from({ length: 5 }).map((_, i) => (
      <StarRounded
        key={i}
        sx={{
          color: i < rating ? "#FFC404" : "#E1E4EB",
          width: "1.25rem",
          height: "1.25rem",
        }}
      />
    ));
  };

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        mt: "-5px",
        pb: 0,
      }}
    >
      <Box sx={{ position: "relative" }}>
        {renderStars()}
        <HelpRounded
          sx={{
            cursor: "pointer",
            position: "absolute",
            color: "#117ACA",
            width: "1rem",
            height: "1.25rem",
            right: "-2rem",
            top: 0,
          }}
          onClick={() => setHelpOpen(true)}
        />
      </Box>
      <Dialog open={helpOpen} onClose={() => setHelpOpen(false)}>
        <DialogTitle>What does this mean?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This star rating is produced by the Centers for Medicare & Medicaid
            Services (CMS), which is the government's regulatory, supervisory,
            and quality-focused authority. For more info,{" "}
            <Link
              href="https://data.cms.gov/provider-data/topics/hospitals/overall-hospital-quality-star-rating/"
              target="_blank"
              rel="noopener noreferrer"
              underline="none"
            >
              visit the official hospital quality star rating page
            </Link>
            .
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHelpOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default StarRating;
