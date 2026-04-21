import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Elements } from "@stripe/react-stripe-js";
import { stripePromise } from "config/stripe";
import { LocationProvider } from "context/Location";
import { isDevEnvironment } from "utils/isDevEnvironment";

// Auth pages
import AuthPage from "pages/auth/AuthPage";
import ResetPasswordPage from "pages/auth/ResetPasswordPage";
import WPAuthHandler from "pages/auth/WPAuthHandler";

// Dashboard pages
import DashboardPage from "pages/dashboard/DashboardPage";
import KijabeDashboard from "pages/dashboard/KijabeDashboard";

// Chat pages
import KijabeChatPage from "pages/KijabeChatPage";
import ChatPageWrapper from "pages/ChatPageWrapper";
import AskMeAnythingPage from "pages/AskMeAnythingPage";

// Virtual Queue pages
import PatientRegistration from "components/vaccine/queue/PatientRegistration";

// Legal pages
import PrivacyPolicy from "components/auth/documents/PrivacyPolicy";
import TermsOfUse from "components/auth/documents/TermsOfUse";
import Baa from "components/auth/documents/baa";

// Account pages
import Verify from "components/dashboard/Verify";
import Onboarding from "components/auth/Onboarding";

// Map pages
import MapPage from "pages/map/MapPage";
import JoinPage from "pages/invitation/JoinPage";

export const AppRoutes = () => (
  <Routes>
    <Route
      path="/dashboard/*"
      element={
        <Elements stripe={stripePromise}>
          <LocationProvider>
            <DashboardPage />
          </LocationProvider>
        </Elements>
      }
    />

    <Route path="/auth" element={<AuthPage />} />
    <Route path="/login" element={<Navigate to="/auth" replace />} />
    
    {/* Organization Invitation */}
    <Route path="/join/:token" element={<JoinPage />} />

    {/* Legacy registration routes - redirect to new auth with role param */}
    <Route path="/register" element={<Navigate to="/auth?role=patient" replace />} />
    <Route path="/register/patient" element={<Navigate to="/auth?role=patient" replace />} />
    <Route path="/register/provider" element={<Navigate to="/auth?role=provider" replace />} />
    <Route path="/register/facility" element={<Navigate to="/auth?role=facility" replace />} />
    <Route path="/msi/register" element={<Navigate to="/auth?role=patient" replace />} />
    <Route path="/pro/register" element={<Navigate to="/auth?role=provider" replace />} />
    <Route path="/facility/register" element={<Navigate to="/auth?role=facility" replace />} />

    {/* Other auth routes */}
    <Route path="/reset-password" element={<ResetPasswordPage />} />
    <Route path="/wp-auth-handler" element={<WPAuthHandler />} />

    {/* Account Routes */}
    <Route path="/account" element={<Verify />} />
    <Route path="/onboarding" element={<Onboarding />} />

    {/* Chat Routes */}
    <Route path="/kijabe-dashboard" element={<KijabeDashboard />} />
    <Route path="/kijabe" element={<KijabeChatPage />} />
    <Route path="/chat" element={<ChatPageWrapper />} />

    {/* Dev-only: WP Ask Me Anything embed preview */}
    {isDevEnvironment() && (
      <Route path="/ask-me-anything" element={<AskMeAnythingPage />} />
    )}

    {/* Virtual Queue Routes */}
    <Route path="/registration/*" element={<PatientRegistration />} />

    {/* Legal Routes */}
    <Route path="/privacy-policy" element={<PrivacyPolicy />} />
    <Route path="/terms-of-use" element={<TermsOfUse />} />
    <Route path="/baa" element={<Baa />} />
    {/* <Route path="/chat" element={<PublicChatPage />} /> */}

    {/* Map Routes */}
    <Route path="/" element={<MapPage />} />
    <Route path="*" element={<MapPage />} />
  </Routes>
);
