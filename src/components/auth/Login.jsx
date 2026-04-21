import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import LoginForm from "./login/LoginForm";
import AccountOptions from "./login/AccountOptions";
import FooterLinks from "./login/FooterLinks";
import LoginFormLinks from "./login/LoginFormLinks";
import { Grid, Avatar, Typography, Box, Button } from "@mui/material";
import EmailIcon from "@mui/icons-material/Email";

const Login = () => {
  const [loginFormOpen, setLoginFormOpen] = useState(false);
  const location = useLocation();

  // Automatically open login form if there's a message or prefillEmail in the navigation state
  useEffect(() => {
    if (location.state?.message || location.state?.prefillEmail) {
      setLoginFormOpen(true);
    }
  }, [location.state]);

  return (
    <>
      {!loginFormOpen && (
        <Box
          sx={{
            bgcolor: "background.paper",
            boxShadow: 1,
            borderRadius: 2,
            p: 2,
            mb: 3,
            minWidth: 300,
          }}
        >
          <Grid container spacing={2}>
            <Grid item xs={12} md={1}>
              <Avatar sx={{ bgcolor: "background.paper" }}>
                <EmailIcon fontSize="large" sx={{ color: "primary.main" }} />
              </Avatar>
            </Grid>
            <Grid item xs={12} md={11}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Already have an account?
              </Typography>

              <Button
                variant="contained"
                onClick={() => setLoginFormOpen(true)}
                size="large"
                fullWidth
                sx={{ maxWidth: 150, mb: 1 }}
              >
                Sign In
              </Button>
            </Grid>
          </Grid>
        </Box>
      )}

      {loginFormOpen && (
        <LoginForm
          loginFormOpen={loginFormOpen}
          setLoginFormOpen={setLoginFormOpen}
        />
      )}

      <LoginFormLinks
        loginFormOpen={loginFormOpen}
        setLoginFormOpen={setLoginFormOpen}
      />

      {!loginFormOpen && (
        <>
          <AccountOptions />

          <FooterLinks />
        </>
      )}
    </>
  );
};

export default Login;
