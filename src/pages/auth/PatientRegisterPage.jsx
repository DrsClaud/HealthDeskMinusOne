import React, { useEffect } from "react";
import { Navigate } from "react-router";
import { List, Typography } from "@mui/material";
import LinkedInTag from "react-linkedin-insight";
import {
  CoronavirusRounded,
  MedicationRounded,
  PaidRounded,
} from "@mui/icons-material";
import background from "assets/images/backgrounds/bgLarge.jpg";
import Loading from "components/Loading";
import AuthWrapper from "components/auth/layout/AuthWrapper";
import LogoLarge from "components/styled/LogoLarge";
import NavigationLinks from "components/auth/layout/NavigationLinks";
import NavListItem from "components/common/NavListItem";
import RegistrationForm from "components/auth/RegistrationForm";
import { useAuth } from "hooks/useAuth";
import { Box } from "@mui/material";

const PatientRegisterPage = () => {
  const { isAuthenticated, userLoading } = useAuth();

  useEffect(() => {
    // Initialize LinkedIn tracking
    LinkedInTag.init(1439474);
  }, []);

  // Show loading state while checking auth
  if (userLoading) {
    return <Loading />;
  }

  // Redirect to dashboard if already authenticated
  if (isAuthenticated) {
    return <Navigate to="/dashboard" />;
  }

  const PatientFeatures = () => (
    <List dense={true}>
      <NavListItem
        icon={<CoronavirusRounded />}
        text="Symptom reviews"
        secondary="Learn about possible causes of your symptoms."
      />

      <NavListItem
        icon={<MedicationRounded />}
        text="Medication issues"
        secondary="Figure out your issues with your medications."
      />

      <NavListItem
        icon={<PaidRounded />}
        text="Free (and no credit card required), or opt out of ads"
        secondary="Get the option to remove ads for $19/day, $24/month, or $199/year."
      />
    </List>
  );

  return (
    <AuthWrapper background={background}>
      <LogoLarge />

      <Box sx={{ mx: "auto", width: "100%" }}>
        <Typography variant="h5" sx={{ textAlign: "center", mb: 3 }}>
          Sign Up for an Individual Account
        </Typography>

        <RegistrationForm
          role="patient"
          features={<PatientFeatures />}
          checkWorkEmail={true}
        />

        <NavigationLinks />
      </Box>
    </AuthWrapper>
  );
};

export default PatientRegisterPage;
