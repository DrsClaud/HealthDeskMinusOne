import React from "react";
import { Navigate } from "react-router";
import { useAuth } from "hooks/useAuth";
import Loading from "components/Loading";
import ResetPassword from "components/auth/ResetPassword";
import LogoLarge from "components/styled/LogoLarge";
import AuthWrapper from "components/auth/layout/AuthWrapper";
import background from "assets/images/backgrounds/bgLarge.jpg";

const ResetPasswordPage = () => {
  const { user, userLoading } = useAuth();

  if (user) {
    return <Navigate to="/dashboard" />;
  }

  if (userLoading) {
    return <Loading />;
  }

  return (
    <AuthWrapper background={background}>
      <LogoLarge />
      <ResetPassword />
    </AuthWrapper>
  );
};

export default ResetPasswordPage;
