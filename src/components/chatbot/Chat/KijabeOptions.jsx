import React, { useContext } from "react";
import { Box } from "@mui/material";
import { Button } from "@chatscope/chat-ui-kit-react";
import styled from "styled-components";
import logo from "assets/images/logos/logo-icon.png";
import kijabeLogo from "assets/images/logos/kijabe-logo.png";
import { KijabeChatContext } from "context/KijabeChat";

const OptionsWrapper = styled.div`
  left: 0;
  right: 0;
  top: 20px;
  bottom: 40px;
  text-align: center;
  z-index: 99;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 0;
  margin-bottom: 10px;

  @media screen and (max-width: 599px) {
    justify-content: flex-end;
    padding-bottom: 30px;
  }

  img {
    max-width: 64px;
    margin: 0 auto -10px;
  }

  h3 {
    text-transform: uppercase;
    margin-bottom: -15px;
  }

  div {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
  }

  .branding {
    position: absolute;
    top: 20px;
    left: 0;
    right: 0;
    margin: 0;
    display: block;

    img {
      max-height: 70px;
      max-width: 100%;
    }
  }

  .info {
    top: 60px;
    left: 0;
    right: 0;
    margin: 0;
    position: absolute;
    display: block;
  }
`;

const KijabeOptions = ({ sendMessage, setSelectedAssistant }) => {
  const { language } = useContext(KijabeChatContext);

  const options = (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "0.5rem",
        width: "100%",
        margin: "0 auto",
      }}
    >
      <Button
        onClick={() => {
          const assistantId = process.env.REACT_APP_ASSISTANT_PRESENT_A_CASE;
          console.log("Present a Case assistant ID:", assistantId);
          if (!assistantId) {
            console.error("Present a Case assistant ID is not set");
          }
          setSelectedAssistant(assistantId);
          sendMessage("Present a Case", assistantId);
        }}
        border
        style={{ fontSize: "13px" }}
      >
        Present a Case
      </Button>
      <Button
        onClick={() => {
          const assistantId =
            process.env.REACT_APP_ASSISTANT_INTERACTIVE_PATIENT;
          console.log("Interactive Patient assistant ID:", assistantId);
          if (!assistantId) {
            console.error("Interactive Patient assistant ID is not set");
          }
          setSelectedAssistant(assistantId);
          sendMessage("Interactive Patient", assistantId);
        }}
        border
        style={{ fontSize: "13px" }}
      >
        Interactive Patient
      </Button>
    </Box>
  );

  return (
    <OptionsWrapper>
      <img
        src={kijabeLogo}
        alt="Kijabe Logo"
        style={{
          maxWidth: 300,
          width: "100%",
          paddingBottom: "2rem",
          marginTop: "-5rem",
        }}
      />
      <img src={logo} alt="HealthDesk Logo" />
      <h3>HealthDesk</h3>
      <p style={{ fontWeight: "bold" }}>Health Care's Help Desk</p>

      {options}
    </OptionsWrapper>
  );
};

export default KijabeOptions;
