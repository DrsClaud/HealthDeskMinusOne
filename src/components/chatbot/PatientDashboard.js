import { useContext, useState } from "react";
import { MainContainer } from "@chatscope/chat-ui-kit-react";
import firebase from "firebase/compat/app";

import logo from "assets/images/logos/logo-icon.png";
import styled from "styled-components";
import { Link } from "react-router-dom";
import TextLink from "../styled/TextLink";
import Button from "../styled/Button";
import Loading from "components/Loading";
import { AuthContext } from "context/Auth";
import { ChatContext } from "context/Chat";
import ContextBox from "./ContextBox";
import { Box } from "@mui/material";

const OptionsWrapper = styled.div`
  position: absolute;
  left: 0;
  right: 0;
  top: 100px;
  bottom: 100px;
  text-align: center;
  z-index: 99;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 1rem;

  img {
    max-width: 84px;
    margin: 0 auto;
  }

  h3 {
    text-transform: uppercase;
    margin-bottom: 0;
  }

  div {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
  }
`;

const PatientDashboard = ({ userData, branding, boxRef }) => {
  const { user, subscription, userLoading } = useContext(AuthContext);
  const { messages } = useContext(ChatContext);
  const [tabs, setTabs] = useState([]);
  const [expanded, setExpanded] = useState(false);
  const [currentTab, setCurrentTab] = useState("home");
  const [loading, setLoading] = useState(false);

  const sendToPortal = async () => {
    setLoading(true);

    const functionRef = firebase
      .app()
      .functions("us-central1")
      .httpsCallable("ext-firestore-stripe-payments-createPortalLink");
    const { data } = await functionRef({
      returnUrl: window.location.href,
    });
    window.location.assign(data.url);
  };

  if (messages == null)
    return (
      <div
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        <Loading page />
      </div>
    );

  return (
    <Box>
      <ContextBox
        messages={messages}
        branding={branding}
        user={user}
        userData={userData}
        tabs={tabs}
        setTabs={setTabs}
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        expanded={expanded}
        setExpanded={setExpanded}
        boxRef={boxRef}
      />
    </Box>
  );
};

export default PatientDashboard;
