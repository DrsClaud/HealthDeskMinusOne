import React from "react";
import {
  Box,
  Paper,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  CircularProgress,
} from "@mui/material";

/**
 * Large tappable option for onboarding-style flows.
 * Defaults: `Paper` (outlined) + `ListItemButton` (`selected`, hover, focus from the theme).
 * Optional `loading`: disables the control, hides label copy (layout preserved), shows centered spinner.
 */
const SelectableChoiceCard = ({
  icon = null,
  title,
  description,
  onClick,
  selected = false,
  disabled = false,
  loading = false,
  orientation = "horizontal",
  sx: sxProp,
}) => {
  const vertical = orientation === "vertical";

  return (
    <Paper
      variant="outlined"
      sx={{ borderColor: selected ? "primary.main" : "divider" }}
    >
      <ListItemButton
        selected={selected}
        onClick={onClick}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        sx={[
          { position: "relative", width: "100%", p: 2 },
          ...(sxProp ? (Array.isArray(sxProp) ? sxProp : [sxProp]) : []),
        ]}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: vertical ? "column" : "row",
            alignItems: vertical ? "center" : "flex-start",
            width: "100%",
            visibility: loading ? "hidden" : "visible",
          }}
        >
          {icon ? (
            <ListItemIcon
              sx={{
                color: "primary.main",
                ...(vertical && { minWidth: 0, justifyContent: "center" }),
              }}
            >
              {icon}
            </ListItemIcon>
          ) : null}
          <ListItemText
            primary={title}
            secondary={description || undefined}
            primaryTypographyProps={{
              variant: "subtitle1",
              fontWeight: 700,
              ...(vertical && { textAlign: "center" }),
            }}
            secondaryTypographyProps={
              vertical ? { textAlign: "center" } : undefined
            }
            sx={{ margin: 0 }}
          />
        </Box>
        {loading ? (
          <Box
            aria-hidden
            sx={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "none",
            }}
          >
            <CircularProgress size={28} color="primary" />
          </Box>
        ) : null}
      </ListItemButton>
    </Paper>
  );
};

export default SelectableChoiceCard;
