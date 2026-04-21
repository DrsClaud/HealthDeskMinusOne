import {
  Box,
  Button,
  Fade,
  Link,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import React, { useState } from "react";

const BetaDisclaimer = () => {
  const [bannerOpen, setBannerOpen] = useState(true);

  const closeBanner = () => setBannerOpen(false);

  return (
    <Fade appear={false} in={bannerOpen}>
      <Paper
        role="dialog"
        aria-modal="false"
        aria-label="Cookie banner"
        square
        variant="outlined"
        tabIndex={-1}
        sx={{
          position: "static",
          width: "100%",
          m: 0,
          p: 1,
          pl: 2,
          pr: 2,
          borderWidth: 0,
          borderTopWidth: 1,
          zIndex: 1,
        }}
      >
        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          gap={2}
        >
          <Box
            sx={{
              flexShrink: 1,
              alignSelf: { xs: "flex-start", sm: "center" },
            }}
          >
            <Typography variant="body2">
              <strong>My HealthDesk is currently in beta.</strong> If you have
              any problems, questions, or suggestions, please contact us at{" "}
              <Link href="mailto:support@hlthdsk.com">support@hlthdsk.com</Link>
              .
            </Typography>
          </Box>
          <Stack
            gap={2}
            direction={{
              xs: "row-reverse",
              sm: "row",
            }}
            sx={{
              flexShrink: 0,
              alignSelf: { xs: "flex-end", sm: "center" },
            }}
          >
            <Button size="small" onClick={closeBanner}>
              Close
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Fade>
  );
};

export default BetaDisclaimer;
