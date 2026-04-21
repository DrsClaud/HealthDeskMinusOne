import React from "react";
import { Grid, Link } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

const LoginFormLinks = ({ loginFormOpen, setLoginFormOpen }) => {
  return (
    <Grid container sx={{ mb: 3 }}>
      <Grid item xs>
        <Link component={RouterLink} to="/" underline="none" variant="body2">
          Return to Map
        </Link>
      </Grid>

      {loginFormOpen && (
        <Grid item>
          <Link
            onClick={() => setLoginFormOpen(false)}
            underline="none"
            variant="body2"
            sx={{ cursor: "pointer" }}
          >
            Don't have an account? Sign up
          </Link>
        </Grid>
      )}

      {/*       {loginFormOpen && (
        <Grid item>
          <Link
            component={RouterLink}
            to="/reset-password"
            underline="none"
            variant="body2"
          >
            Reset password
          </Link>
        </Grid>
      )} */}
    </Grid>
  );
};

export default LoginFormLinks;
