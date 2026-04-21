import React from "react";
import { Grid, Link } from "@mui/material";

const FooterLinks = () => {
  return (
    <Grid container sx={{ mb: 3 }}>
      <Grid item xs>
        <Link
          href="/terms-of-use"
          underline="none"
          variant="body2"
          target="_blank"
        >
          Terms of Use
        </Link>
      </Grid>
      <Grid item>
        <Link
          href="/privacy-policy"
          underline="none"
          variant="body2"
          target="_blank"
        >
          Privacy Policy
        </Link>
      </Grid>
    </Grid>
  );
};

export default FooterLinks;
