import React from "react";
import { Box, Typography } from "@mui/material";

/**
 * Page title + intro for views inside DashboardLayout (non-full-width main column).
 *
 * **Primary actions:** Put the page’s main CTA(s) in `actions` so they sit on the
 * same row as the title block, right-aligned (e.g. one “New …” or “Invite …”
 * button). For several controls, pass a fragment or `Stack`/`Box` with `gap`.
 */
const DashboardPageHeader = ({
  title,
  titleComponent = "h2",
  subtitle,
  actions,
  sx,
}) => {
  const hasSubtitle = subtitle != null && subtitle !== false;

  const titleBlock = (
    <>
      <Typography
        variant="h4"
        component={titleComponent}
        fontWeight={700}
        sx={{
          fontSize: { xs: "1.5rem", sm: "2.125rem" },
          mb: hasSubtitle ? 2 : 0,
        }}
      >
        {title}
      </Typography>
      {hasSubtitle ? (
        <Box sx={{ mb: 4 }}>
          {typeof subtitle === "string" ? (
            <Typography>{subtitle}</Typography>
          ) : (
            subtitle
          )}
        </Box>
      ) : null}
    </>
  );

  if (actions) {
    return (
      <Box
        sx={{
          mt: { xs: 1, sm: 5 },
          mb: 4,
          ...sx,
        }}
      >
        <Box
          sx={{
            display: { sm: "flex", xs: "block" },
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 2,
          }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>{titleBlock}</Box>
          {actions}
        </Box>
      </Box>
    );
  }

  return (
    <Box component="header" sx={{ mt: { xs: 1, sm: 5 }, ...sx }}>
      {titleBlock}
    </Box>
  );
};

export default DashboardPageHeader;
