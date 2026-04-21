import React from "react";
import {
  Box,
  Paper,
  ListItemButton,
  Typography,
  Chip,
  IconButton,
  Tooltip,
} from "@mui/material";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import RadioButtonCheckedIcon from "@mui/icons-material/RadioButtonChecked";
import CheckBoxOutlineBlankIcon from "@mui/icons-material/CheckBoxOutlineBlank";
import CheckBoxIcon from "@mui/icons-material/CheckBox";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";

// ============================================================================
// Types
// ============================================================================

interface SelectableCardProps {
  title: string;
  rationale?: string;

  // Drives the decorative affordance icon on the left
  selectionVariant?: "radio" | "checkbox" | "none";

  selected?: boolean;
  disabled?: boolean;
  dimmed?: boolean; // "group full" or other soft-disabled state

  // Strike through title text when disabled (e.g. treatment exclusions)
  strikethrough?: boolean;

  onClick?: () => void;

  // When provided, renders a hover-reveal action icon button
  onToggleDisabled?: () => void;
  // Tooltip labels for the action button (defaults: "Exclude" / "Restore")
  hideTooltip?: string;
  restoreTooltip?: string;

  // When provided, renders a secondary hover-reveal edit icon button
  onEdit?: () => void;
  editTooltip?: string;

  chips?: Array<{
    label: string;
    color?:
      | "default"
      | "primary"
      | "secondary"
      | "error"
      | "info"
      | "success"
      | "warning";
    variant?: "filled" | "outlined";
  }>;

  additionalContent?: React.ReactNode;
}

// ============================================================================
// Component
// ============================================================================

const SelectableCard: React.FC<SelectableCardProps> = ({
  title,
  rationale,
  selectionVariant = "none",
  selected = false,
  disabled = false,
  dimmed = false,
  strikethrough = false,
  onClick,
  onToggleDisabled,
  hideTooltip = "Exclude",
  restoreTooltip = "Restore",
  onEdit,
  editTooltip = "Edit",
  chips = [],
  additionalContent,
}) => {
  // Card is interactable for selection only if not disabled/dimmed and onClick provided
  const isClickable = !disabled && !dimmed && !!onClick;
  const opacity = disabled ? 0.4 : dimmed ? 0.5 : 1;

  const handleToggleDisabled = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleDisabled?.();
  };

  const SelectionIcon = () => {
    if (selectionVariant === "radio") {
      return selected ? (
        <RadioButtonCheckedIcon color="primary" fontSize="small" />
      ) : (
        <RadioButtonUncheckedIcon sx={{ color: "text.disabled" }} fontSize="small" />
      );
    }
    if (selectionVariant === "checkbox") {
      return selected ? (
        <CheckBoxIcon color="primary" fontSize="small" />
      ) : (
        <CheckBoxOutlineBlankIcon sx={{ color: "text.disabled" }} fontSize="small" />
      );
    }
    return null;
  };

  return (
    <Paper
      variant="outlined"
      sx={{
        position: "relative",
        mb: 1.5,
        opacity,
        borderColor: selected && !disabled ? "primary.main" : "divider",
        // Reveal action button on hover; always show on touch devices
        "& .card-action": {
          opacity: 0,
          transition: "opacity 0.15s",
        },
        "&:hover .card-action": {
          opacity: 1,
        },
        "@media (hover: none)": {
          "& .card-action": {
            opacity: 1,
          },
        },
      }}
    >
      <ListItemButton
        selected={selected}
        disableRipple={!isClickable}
        onClick={isClickable ? onClick : undefined}
        sx={{
          p: 2,
          // Pad right to avoid content sliding under the action button
          pr: onToggleDisabled && onEdit ? 9 : onToggleDisabled || onEdit ? 5.5 : 2,
          alignItems: "flex-start",
          gap: 1.5,
          cursor: isClickable ? "pointer" : "default",
          // Suppress hover highlight when card is not interactable
          ...(!isClickable && {
            "&:hover": { backgroundColor: "transparent" },
            "&.Mui-selected:hover": {
              backgroundColor: (theme: any) =>
                theme.palette.primary.main + "0A",
            },
          }),
        }}
      >
        {/* Decorative selection icon */}
        {selectionVariant !== "none" && (
          <Box sx={{ pt: "2px", flexShrink: 0, pointerEvents: "none" }}>
            <SelectionIcon />
          </Box>
        )}

        {/* Main content */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {/* Title + chips row */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              mb: rationale || additionalContent ? 0.5 : 0,
              flexWrap: "wrap",
            }}
          >
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 700,
                color:
                  selected && !disabled && !dimmed ? "primary.main" : "inherit",
                textDecoration:
                  disabled && strikethrough ? "line-through" : "none",
              }}
            >
              {title}
            </Typography>

            {chips.map((chip, idx) => (
              <Chip
                key={idx}
                label={chip.label}
                size="small"
                color={chip.color || "default"}
                variant={chip.variant || "outlined"}
                sx={{ fontSize: "0.7rem", height: 20 }}
              />
            ))}
          </Box>

          {rationale && (
            <Typography
              variant="body2"
              sx={{
                color: "text.secondary",
                mb: additionalContent ? 0.5 : 0,
              }}
            >
              {rationale}
            </Typography>
          )}

          {additionalContent}
        </Box>
      </ListItemButton>

      {/* Action buttons — live outside ListItemButton so they're always clickable */}
      <Box
        sx={{
          position: "absolute",
          top: 8,
          right: 8,
          display: "flex",
          gap: 0.5,
        }}
        className="card-action"
      >
        {onEdit && (
          <Tooltip title={editTooltip}>
            <IconButton
              size="small"
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              sx={{ color: "text.secondary" }}
            >
              <EditOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
        {onToggleDisabled && (
          <Tooltip title={disabled ? restoreTooltip : hideTooltip}>
            <IconButton
              size="small"
              onClick={handleToggleDisabled}
              sx={{ color: "text.secondary" }}
            >
              {disabled ? (
                <VisibilityOutlinedIcon fontSize="small" />
              ) : (
                <VisibilityOffOutlinedIcon fontSize="small" />
              )}
            </IconButton>
          </Tooltip>
        )}
      </Box>
    </Paper>
  );
};

export default SelectableCard;
