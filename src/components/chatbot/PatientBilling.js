import React, { useState, useContext, useEffect } from "react";
import Loading from "../Loading";
import firebase from "firebase/compat/app";
import "firebase/compat/functions";
import styled from "styled-components";
import Button from "../styled/Button";
import Pricing from "components/dashboard/upgrade/Pricing";
import { AuthContext } from "context/Auth";
import PatientNav from "./PatientNav";
import { Navigate } from "react-router-dom";
import UserProfileSettings from "./UserProfileSettings";
import { Alert, Typography } from "@mui/material";
import InfoBox from "components/common/InfoBox";
import { LocalHospitalRounded, PersonRounded } from "@mui/icons-material";
import TimeRemaining from "components/common/TimeRemaining";

const PatientBilling = ({ userData }) => {
  const { user, subscription, userLoading, logout } = useContext(AuthContext);
  const [loading, setLoading] = useState();
  const [userSettingsOpen, setUserSettingsOpen] = useState(false);
  const [submitted, setSubmitted] = useState();

  const sendToPortal = async () => {
    setLoading("portal");

    const functionRef = firebase
      .app()
      .functions("us-central1")
      .httpsCallable("ext-firestore-stripe-payments-createPortalLink");
    const { data } = await functionRef({
      returnUrl: window.location.href,
    });
    window.location.assign(data.url);
  };

  const openUserSettings = () => {
    setUserSettingsOpen(!userSettingsOpen);
  };

  const handleLogout = async () => {
    setLoading("logout");
    await logout();
    return <Navigate to="/auth" />;
  };

  return (
    <div className="inner patient">
      <Typography variant="h3" sx={{ mt: { xs: 1, sm: 5 }, mb: 4 }}>
        Account
      </Typography>

      {submitted ? (
        <Alert severity="success" sx={{ mb: 3 }}>
          {submitted}
        </Alert>
      ) : null}

      <>
        <Typography variant="body1" sx={{ pb: 4, pt: 0 }}>
          You're currently logged in as <strong>{user.email}</strong>.
        </Typography>

        {/* Add Daily Pass Status */}
        {userData?.dailyPassExpiresAt && (
          <TimeRemaining expiresAt={userData.dailyPassExpiresAt} />
        )}

        {userData?.role === "professional" ? null : (
          <>
            {/* Medical profile section */}
            <InfoBox
              icon={
                <LocalHospitalRounded
                  fontSize="large"
                  sx={{ color: "#117aca" }}
                />
              }
              title="Medical Profile"
              description="Update your personal profile to help the Medical SuperIntelligence understand you better."
              links={[
                {
                  title: "Update Personal Medical Profile",
                  onClick: openUserSettings,
                },
              ]}
            />

            {/* Popups */}
            <UserProfileSettings
              user={user}
              data={userData}
              visible={userSettingsOpen}
              close={() => setUserSettingsOpen(false)}
              setSubmitted={setSubmitted}
            />
          </>
        )}

        {/* Account section */}
        {subscription && (
          <InfoBox
            icon={<PersonRounded fontSize="large" sx={{ color: "#117aca" }} />}
            title="Your Account"
            description="Manage your account and subscription."
            links={[
              {
                title: "Manage Subscription",
                onClick: sendToPortal,
                loading: loading,
                loadingCondition: loading === "portal",
              },
            ]}
          />
        )}
      </>
    </div>
  );
};

export default PatientBilling;
