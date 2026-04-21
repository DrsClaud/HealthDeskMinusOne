import React from "react";
import { Box, Paper, Typography, IconButton, Tooltip } from "@mui/material";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";

// ============================================================================
// Types
// ============================================================================

interface SectionCardProps {
  title: string;
  // Content to display (truncated to maxPreviewLength)
  content?: string;
  // Shown when content is absent
  placeholder?: string;
  maxPreviewLength?: number;
  // 4px left accent border color — use theme palette values or hex
  accentColor?: string;
  // When provided, renders a hover-reveal edit icon button
  onEdit?: () => void;
}

// ============================================================================
// Component
// ============================================================================

const SectionCard: React.FC<SectionCardProps> = ({
  title,
  content = "",
  placeholder = "Not documented",
  maxPreviewLength = 600,
  accentColor,
  onEdit,
}) => {
  const preview =
    content.length > maxPreviewLength
      ? content.substring(0, maxPreviewLength) + "…"
      : content;

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        mb: 2,
        position: "relative",
        ...(accentColor && { borderLeft: `4px solid ${accentColor}` }),
        // Hover-reveal edit button — consistent with SelectableCard action pattern
        "& .section-action": {
          opacity: 0,
          transition: "opacity 0.15s",
        },
        "&:hover .section-action": {
          opacity: 1,
        },
        "@media (hover: none)": {
          "& .section-action": {
            opacity: 1,
          },
        },
      }}
    >
      {/* Title row */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1 }}>
        <Typography
          variant="subtitle1"
          sx={{
            fontWeight: 600,
            color: accentColor ?? "text.primary",
          }}
        >
          {title}
        </Typography>

        {onEdit && (
          <Tooltip title="Edit">
            <IconButton
              className="section-action"
              size="small"
              onClick={onEdit}
              sx={{ color: "text.secondary", ml: 1, flexShrink: 0 }}
            >
              <EditOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {/* Content preview */}
      <Typography
        variant="body2"
        sx={{
          color: content ? "text.primary" : "text.disabled",
          whiteSpace: "pre-wrap",
        }}
      >
        {preview || placeholder}
      </Typography>
    </Paper>
  );
};

export default SectionCard;
