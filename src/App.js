import React, { useEffect } from "react";
import "@fontsource/roboto/300.css";
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import "@fontsource/roboto/700.css";
import "@fontsource/federo/400.css";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "styled-components";
import { ThemeProvider as MuiThemeProvider } from "@mui/material/styles";
import { loadReCaptcha } from "react-recaptcha-v3";
import { AuthProvider } from "context/Auth";
import { MapboxCacheProvider } from "hooks/useMapboxCache";
import { AppRoutes } from "routes/AppRoutes";
import { muiTheme } from "config/theme";
import { initSentry } from "config/sentry";
import theme from "utils/helpers/theme";

const routerFuture = { v7_startTransition: true, v7_relativeSplatPath: true };

// Initialize Sentry
initSentry();

function App() {
  useEffect(() => {
    // Skip reCAPTCHA for Kijabe pages - check BOTH path and iframe
    const isKijabeDashboard =
      window.location.pathname.includes("kijabe-dashboard");
    const isIframe = window !== window.parent;
    const isProduction = process.env.REACT_APP_ENVIRONMENT === "production";

    // Don't load reCAPTCHA if we're on kijabe-dashboard, in an iframe, or not in production
    if (!isKijabeDashboard && !isIframe && isProduction) {
      loadReCaptcha(process.env.REACT_APP_RECAPTCHA_SITE_KEY, () => {});
    }
  }, []);

  const api_regex = /^\/api\/.*/;
  if (api_regex.test(window.location.pathname)) {
    return <div />;
  }

  return (
    <MuiThemeProvider theme={muiTheme}>
      <ThemeProvider theme={theme}>
        <AuthProvider>
          <MapboxCacheProvider>
            <BrowserRouter future={routerFuture}>
              <div className="App">
                <AppRoutes />
              </div>
            </BrowserRouter>
          </MapboxCacheProvider>
        </AuthProvider>
      </ThemeProvider>
    </MuiThemeProvider>
  );
}

export default App;
