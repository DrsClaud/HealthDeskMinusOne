import React, { useEffect } from "react";
import { Navigate } from "react-router";
import { List, Typography } from "@mui/material";
import LinkedInTag from "react-linkedin-insight";
import {
  MedicalServicesRounded,
  ForumRounded,
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

const ProfessionalRegisterPage = () => {
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

  const ProfessionalFeatures = () => (
    <List dense={true}>
      <NavListItem
        icon={<MedicalServicesRounded />}
        text="Case Review"
        secondary="Present a case, develop a management plan."
      />

      <NavListItem
        icon={<ForumRounded />}
        text="Subject Matter"
        secondary="Access Medical SuperIntelligence at a professional level."
      />

      <NavListItem
        icon={<PaidRounded />}
        text="Pay as you go"
        secondary="Sign up for $19/day, $59/month, or $489/year."
      />
    </List>
  );

  return (
    <AuthWrapper background={background}>
      <LogoLarge />

      <Box sx={{ mx: "auto", width: "100%" }}>
        <Typography variant="h5" sx={{ textAlign: "center", mb: 3 }}>
          Sign Up for an Professional Account
        </Typography>

        <RegistrationForm
          role="professional"
          features={<ProfessionalFeatures />}
        />
        <NavigationLinks />
      </Box>
    </AuthWrapper>
  );
};

export default ProfessionalRegisterPage;
