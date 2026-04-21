import React from "react";
import { useNavigate } from "react-router-dom";
import InfoBox from "components/common/InfoBox";
import {
  ChatRounded,
  LocalHospitalRounded,
  MedicalServicesRounded,
} from "@mui/icons-material";

const AccountOptions = () => {
  const navigate = useNavigate();

  return (
    <>
      <InfoBox
        icon={<ChatRounded fontSize="large" sx={{ color: "#117aca" }} />}
        title="Create Individual Account"
        subtitle="From Crisis to Comfort"
        description="From symptoms to solutions, My HealthDesk Medical SuperIntelligence™ is designed to educate and equip you through tests, diagnosis, treatment, and help you find your way to the best care available."
        links={[
          {
            title: "Register Individual Account",
            onClick: () => navigate("/register/patient"),
          },
        ]}
      />

      <InfoBox
        icon={
          <MedicalServicesRounded fontSize="large" sx={{ color: "#117aca" }} />
        }
        title="Create Provider Account"
        subtitle="Complexity to Clarity"
        description="My HealthDesk Medical SuperIntelligence™: designed to provide fast, dependable insights that are tailored to clinical details you provide"
        links={[
          {
            title: "Register Provider Account",
            onClick: () => navigate("/register/provider"),
          },
        ]}
      />

      <InfoBox
        icon={
          <LocalHospitalRounded fontSize="large" sx={{ color: "#117aca" }} />
        }
        title="Organizational Enrollment"
        subtitle="Chaos to Coherence"
        description="You can streamline patient flow, improve visibility in the community, and demonstrate that care starts before the visit."
        links={[
          {
            title: "Register Facility Account",
            onClick: () => navigate("/register/facility"),
          },
        ]}
      />
    </>
  );
};

export default AccountOptions;
