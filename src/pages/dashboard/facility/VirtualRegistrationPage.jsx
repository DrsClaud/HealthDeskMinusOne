import React from "react";
import { Box } from "@mui/material";
import VirtualRegistrationSettings from "components/vaccine/queue/VirtualRegistrationSettings";
// TODO: TextSequence disabled until Twilio BAA is in place
// import TextSequence from "components/vaccine/TextSequence";
import PremiumWrapper from "components/dashboard/PremiumWrapper";
import { useAuth } from "hooks/useAuth";

const VirtualRegistrationPage = ({ data, setData }) => {
  const { hasValidSubscription } = useAuth();

  return (
    <Box>
      <VirtualRegistrationSettings data={data} setData={setData} />

      {/* TODO: Text Sequence disabled until Twilio BAA is in place */}
      {/* <PremiumWrapper disabled={!hasValidSubscription}>
        <TextSequence data={data} setData={setData} />
      </PremiumWrapper> */}
    </Box>
  );
};

export default VirtualRegistrationPage;
