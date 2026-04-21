import React from "react";
import { Navigate } from "react-router";
import { useAuth } from "hooks/useAuth";
import Loading from "components/Loading";
import Login from "components/auth/Login";
import LogoLarge from "components/styled/LogoLarge";
import AuthWrapper from "components/auth/layout/AuthWrapper";
import background from "assets/images/backgrounds/bgLarge.jpg";

const LoginPage = () => {
  const { user, userLoading } = useAuth();

  // Handle authenticated users
  if (user) {
    return <Navigate to="/dashboard" />;
  }

  // Handle loading state
  if (userLoading) {
    return <Loading />;
  }

  return (
    <AuthWrapper background={background}>
      <LogoLarge />
      <Login />
    </AuthWrapper>
  );
};

export default LoginPage;
