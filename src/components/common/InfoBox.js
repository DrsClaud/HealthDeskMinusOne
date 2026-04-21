import React from "react";
import { Avatar, Box, Grid, Paper, Typography } from "@mui/material";
import { ChevronRightRounded } from "@mui/icons-material";
import { LoadingButton } from "@mui/lab";

const InfoBox = ({ icon, title, subtitle, description, links }) => (
  <Paper
    sx={{
      p: 2,
      pb: 3,
      mb: 3,
      minWidth: 300,
    }}
  >
    <Grid container spacing={{ xs: 0, md: 2 }}>
      {icon ? (
        <Grid item xs={12} md={1}>
          <Avatar sx={{ bgcolor: "background.paper" }}>
            {React.cloneElement(icon, { sx: { color: "primary.main" } })}
          </Avatar>
        </Grid>
      ) : null}

      <Grid item xs={12} md={11}>
        <Typography variant="h6" sx={{ mt: { xs: 1, md: 0 } }}>
          {title}
        </Typography>
        {subtitle ? (
          <Typography
            variant="body2"
            color="primary"
            sx={{ fontWeight: "bold", mb: 1, display: "block" }}
          >
            {subtitle}
          </Typography>
        ) : null}
        <Typography variant="body2" gutterBottom>
          {description}
        </Typography>

        <Grid container gap={2} sx={{ mt: 2.5 }}>
          {links?.map((link, i) => (
            <Grid item key={i}>
              <LoadingButton
                variant="outlined"
                loading={link.loading && link.loadingCondition}
                loadingPosition="end"
                disabled={link.loading && link.loadingCondition}
                endIcon={<ChevronRightRounded />}
                onClick={link.onClick}
                sx={{ textTransform: "none" }}
              >
                {link.title}
              </LoadingButton>
            </Grid>
          ))}
        </Grid>
      </Grid>
    </Grid>
  </Paper>
);

export default InfoBox;
