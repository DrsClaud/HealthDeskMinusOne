import React, { useState } from "react";
import {
  Alert,
  Box,
  Checkbox,
  FormControlLabel,
  Snackbar,
  TextField,
} from "@mui/material";
import { Button } from "@chatscope/chat-ui-kit-react";
import UserProfileSettings from "./UserProfileSettings";
import logo from "assets/images/logos/logo-icon.png";
import styled from "styled-components";
import { useNavigate } from "react-router-dom";

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

  .disclaimer {
    color: #1b4584;
    display: block;
    font-size: 0.75rem;
    max-width: 480px;
    margin-left: auto;
    margin-right: auto;

    label {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 3px;
    }
  }
`;

const Options = ({
  sendMessage,
  user,
  userData,
  submitInfo,
  setSubmitInfo,
  setSelectedAssistant,
}) => {
  const [userSettingsOpen, setUserSettingsOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [questionText, setQuestionText] = useState("");
  const navigate = useNavigate();

  const openUserSettings = () => {
    setUserSettingsOpen(!userSettingsOpen);
  };

  const closeAlert = (event, reason) => {
    if (reason === "clickaway") {
      return;
    }

    setSubmitted(false);
  };

  const handleAskQuestionNavigation = () => {
    if (questionText.trim()) {
      navigate("/dashboard/chat", {
        state: {
          initiateChatWith: questionText,
          assistantId: "general",
          resetChat: true,
        },
      });
      setQuestionText("");
    }
  };

  const handleKeyPress = (event) => {
    if (event.key === "Enter") {
      handleAskQuestionNavigation();
    }
  };

  // Change the options based on the subdomain
  const subdomain = window.location.host.split(".")[0];
  let options = (
    <Box sx={{ width: "100%" }}>
      <Button
        onClick={() => sendMessage("Use a different language")}
        border
        style={{ fontSize: "13px" }}
      >
        Use a different language
      </Button>
      <Button onClick={openUserSettings} border style={{ fontSize: "13px" }}>
        Update Personal Profile
      </Button>
      <Button
        onClick={() => {
          navigate("/dashboard/chat", {
            state: {
              initiateChatWith: "Smart visit preparation",
              assistantId: "smart-visit",
            },
          });
        }}
        border
        style={{ fontSize: "13px" }}
      >
        Smart Visit Preparation
      </Button>
      <Button
        onClick={() => {
          navigate("/dashboard/chat", {
            state: {
              initiateChatWith: "Explore the (virtual) mind of a doctor",
              assistantId: "virtual-mind",
            },
          });
        }}
        border
        style={{ fontSize: "13px" }}
      >
        Explore the (virtual) mind of a doctor: medical reasoning revealed
      </Button>
    </Box>
  );

  // Queensland options
  if (subdomain === "qld")
    options = (
      <Box>
        <Button
          onClick={() => sendMessage("Crying issues")}
          border
          style={{ fontSize: "13px" }}
        >
          Crying issues
        </Button>
        <Button
          onClick={() => sendMessage("Breathing issues")}
          border
          style={{ fontSize: "13px" }}
        >
          Breathing issues
        </Button>
        <Button
          onClick={() => sendMessage("Poop issues")}
          border
          style={{ fontSize: "13px" }}
        >
          Poop issues
        </Button>
        <Button
          onClick={() => sendMessage("Eating issues")}
          border
          style={{ fontSize: "13px" }}
        >
          Eating issues
        </Button>
      </Box>
    );

  // Professional account options
  if (userData?.role === "professional")
    options = (
      <Box>
        <Button
          onClick={() => sendMessage("Use a Different Language")}
          border
          style={{ fontSize: "13px" }}
        >
          Use a Different Language
        </Button>
        <Button
          onClick={() => {
            setSelectedAssistant("brainflash");
            sendMessage("Start a Brain Flash");
          }}
          border
          style={{ fontSize: "13px" }}
        >
          Brain Flash
        </Button>
        <Button
          onClick={() => {
            setSelectedAssistant("deep-dive");
            sendMessage("Deep Dive");
          }}
          border
          style={{ fontSize: "13px" }}
        >
          Deep Dive
        </Button>
        <Button
          onClick={() => {
            sendMessage("Start a PeerView");
          }}
          border
          style={{ fontSize: "13px" }}
        >
          Virtual PeerView
        </Button>
      </Box>
    );

  return (
    <>
      <UserProfileSettings
        user={user}
        data={userData}
        visible={userSettingsOpen}
        setSubmitted={setSubmitted}
        close={() => setUserSettingsOpen(false)}
      />
      <OptionsWrapper>
        <img src={logo} alt="HealthDesk Logo" />
        <h3>HealthDesk</h3>
        <p style={{ fontWeight: "bold" }}>Health Care's Help Desk</p>

        {options}
      </OptionsWrapper>

      {/* 🍑 This is a text input box that allows the user to directly ask a question */}
      {/* <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 1, mb: 1 }}>
        <TextField
          id="ask-a-question"
          variant="outlined"
          size="small"
          placeholder="Ask a question"
          value={questionText}
          onChange={(e) => setQuestionText(e.target.value)}
          onKeyPress={handleKeyPress}
          sx={{ flexGrow: 1 }}
        />
        <Button border onClick={handleAskQuestionNavigation}>
          <svg width="20px" height="20px" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6 8L2 8L2 6L8 5.24536e-07L14 6L14 8L10 8L10 16L6 16L6 8Z" fill="#000000" />
          </svg>
        </Button>
      </Box> */}

      {userData?.profile ? (
        <Box sx={{ display: "flex", justifyContent: "center", mb: 1 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={submitInfo}
                onChange={() => setSubmitInfo(!submitInfo)}
              />
            }
            label="Your personal profile will be submitted with these queries."
            sx={{
              margin: 0,
              "& .MuiFormControlLabel-label": {
                fontSize: "0.875rem", // This is equivalent to 14px
              },
            }}
          />
        </Box>
      ) : null}

      {submitted ? (
        <Snackbar open={submitted} autoHideDuration={6000} onClose={closeAlert}>
          <Alert
            onClose={closeAlert}
            severity="success"
            variant="standard"
            sx={{ width: "100%" }}
          >
            {submitted}
          </Alert>
        </Snackbar>
      ) : null}
    </>
  );
};

export default Options;
