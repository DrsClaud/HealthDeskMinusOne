import React, { useRef } from "react";
import { Container } from "@mui/material";
import DashboardNav from "components/dashboard/layout/DashboardNav";
// import BetaDisclaimer from "components/dashboard/BetaDisclaimer";
import { useFacility } from "hooks/useFacility";
import { useAuth } from "hooks/useAuth";

const pageColumnSx = {
  maxWidth: "1024px",
  pt: 1.875, // 15px (theme spacing units × 8px)
  px: 1.875, // 15px horizontal
  pb: 6.25, // 50px
};

const DashboardLayout = ({ children, fullWidth = false }) => {
  const boxRef = useRef(null);
  const { data } = useFacility();
  const { userData, isVerified } = useAuth();

  // Redirect if vaccines-only facility
  const only_vaccines = data?.type === 3;
  if (
    only_vaccines &&
    window.location.pathname.replaceAll("/", "") === "dashboard"
  ) {
    window.location = "/dashboard/vaccine/queue";
    return null;
  }

  return (
    <DashboardNav boxRef={boxRef}>
      {fullWidth ? (
        <>{children}</>
      ) : (
        <Container maxWidth={false} sx={pageColumnSx}>
          {children}
        </Container>
      )}
      {/* <BetaDisclaimer /> */}
    </DashboardNav>
  );
};

export default DashboardLayout;
