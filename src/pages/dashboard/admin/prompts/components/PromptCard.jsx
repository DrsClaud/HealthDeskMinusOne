import React from "react";
import {
  Card,
  CardActions,
  CardContent,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { LoadingButton } from "@mui/lab";

const PromptCard = ({ prompt, onEdit }) => {
  const title = prompt.featureName || prompt.id;

  return (
    <Card
      sx={{
        height: "100%",
        bgcolor: (theme) =>
          theme.palette.mode === "dark"
            ? alpha(theme.palette.common.white, 0.06)
            : alpha(theme.palette.grey[500], 0.08),
        border: "1px solid",
        borderColor: "divider",
        boxShadow: "none",
      }}
    >
      <CardContent>
        <Typography variant="subtitle1" fontWeight={700}>
          {title}
        </Typography>
        <Typography
          variant="caption"
          color="text.secondary"
          component="p"
          sx={{
            mt: 0.25,
            fontFamily: "ui-monospace, monospace",
            letterSpacing: "0.02em",
          }}
        >
          {prompt.id}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1.25 }}>
          {prompt.featureDescription || "No description provided."}
        </Typography>
      </CardContent>
      <CardActions>
        <LoadingButton size="small" onClick={() => onEdit(prompt)}>
          Edit Prompt
        </LoadingButton>
      </CardActions>
    </Card>
  );
};

export default PromptCard;
