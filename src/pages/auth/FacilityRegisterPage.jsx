import React from "react";
import { Navigate } from "react-router";
import bgFacility from "assets/images/backgrounds/bgFacility.jpg";
import RegistrationForm from "components/auth/RegistrationForm";
import Loading from "components/Loading";
import AuthWrapper from "components/auth/layout/AuthWrapper";
import LogoLarge from "components/styled/LogoLarge";
import NavigationLinks from "components/auth/layout/NavigationLinks";
import NavListItem from "components/common/NavListItem";
import { useAuth } from "hooks/useAuth";
import { List, Typography } from "@mui/material";
import { PlaceRounded, PeopleRounded } from "@mui/icons-material";

const FacilityRegisterPage = () => {
  const { isAuthenticated, userLoading } = useAuth();

  // Show loading state while checking auth
  if (userLoading) {
    return <Loading />;
  }

  // Redirect to dashboard if already authenticated
  if (isAuthenticated) {
    return <Navigate to="/dashboard" />;
  }

  const FacilityFeatures = () => (
    <List dense={true}>
      <NavListItem
        icon={<PlaceRounded />}
        text="Manage your map listing"
        secondary="Give your visitors the info they need when looking at your facility."
      />
      <NavListItem
        icon={<PeopleRounded />}
        text="Speed up the wait time"
        secondary="Let visitors queue and register virtually before they even get to the facility."
      />
      {/* Temporarily disabled according to: KAN-683 */}
      {/* <NavListItem
        icon={<PhoneRounded />}
        text="Includes onboarding conference call"
        secondary="Make sure everything is set up without a hitch with an onboarding call."
      /> */}
    </List>
  );

  return (
    <AuthWrapper background={bgFacility} title="Get on the Map" left facility>
      <LogoLarge />

      <Typography variant="h5" sx={{ textAlign: "center", mb: 3 }}>
        Sign Up for a Organization Account
      </Typography>

      <RegistrationForm role="facility" features={<FacilityFeatures />} />

      <NavigationLinks />
    </AuthWrapper>
  );
};

export default FacilityRegisterPage;
