import React, { useState, useEffect, useContext } from "react";
import { Box, Button, IconButton, Tab, Tabs } from "@mui/material";
import { MainContainer } from "@chatscope/chat-ui-kit-react";
import { useTabSizes } from "components/chatbot/ContextBox/useTabSizes";
import { useContentAnalysis } from "components/chatbot/ContextBox/useContentAnalysis";
import MiniMap from "components/chatbot/ContextBox/MiniMap";
import DiseasesBox from "components/chatbot/ContextBox/DiseasesBox";
import MedicationBox from "components/chatbot/ContextBox/MedicationBox";
import Chatbot from "components/chatbot/Chatbot";
import { useChat } from "./ContextBox/useChat";
import { ChatRounded } from "@mui/icons-material";
import { ChatContext } from "context/Chat";

const ContextBox = ({ branding, user, userData, boxRef, onNewChat = () => {} }) => {
  const {
    messages,
    tabs,
    setTabs,
    expanded,
    setExpanded,
    currentTab,
    setCurrentTab,
  } = useChat();
  const { newThread } = useContext(ChatContext);
  const [previewTab, setPreviewTab] = useState(tabs[tabs.length - 1]);
  const { medicationsList, diseasesList } = useContentAnalysis(
    userData,
    tabs,
    setTabs
  );

  const openTab = (tab) => {
    setCurrentTab(tab);
    setExpanded(true);
  };

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
    setExpanded(newValue !== "home");
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  };

  const getLabel = (tab) => {
    if (tab === "diseases") {
      return userData?.role === "professional"
        ? "Differential Diagnosis"
        : "Clinical Considerations";
    }
    if (tab === "map_urgent") return "Map";
    return tab;
  };

  const isHighlighted = (tab) =>
    previewTab === tab && !expanded ? { color: "#1B4584" } : null;

  const isVisible = (tab) =>
    currentTab === tab || (previewTab === tab && !expanded);

  useEffect(() => {
    if (tabs.length > 0) setPreviewTab(tabs[tabs.length - 1]);
  }, [tabs]);

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          display: messages.length > 0 ? "flex" : "none",
          gap: "0.5rem",
          width: "calc(100% + 50px)",
          paddingTop: "0.5rem",
          overflowX: "auto",
          marginLeft: "-25px",
          marginRight: "-50px",
          paddingLeft: "25px",
          paddingRight: "25px",
          height: "40px",
          alignItems: "flex-end",
          borderBottom: 1,
          borderColor: "divider",
          zIndex: 999,
        }}
      >
        <Box sx={{ position: "relative", width: "100%" }}>
          <Tabs
            value={currentTab}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              minHeight: "36px",
              "& .MuiTab-root": {
                minHeight: "36px",
                padding: "6px 12px",
                fontSize: 13,
              },
            }}
          >
            <Tab label="SuperIntelligence" value="home" />
            {tabs.map((tab, i) => (
              <Tab
                key={i}
                label={getLabel(tab)}
                value={tab}
                sx={{
                  ...isHighlighted(tab),
                  minHeight: "36px",
                }}
              />
            ))}
          </Tabs>
          <Button
            startIcon={<ChatRounded sx={{ fontSize: 18 }} />}
            sx={{
              position: "absolute",
              right: 0,
              top: "50%",
              transform: "translateY(-50%)",
              bgcolor: "background.paper",
              color: "text.secondary",
              minWidth: "auto",
              padding: "4px 8px",
              fontSize: 13,
              "&:hover": {
                bgcolor: "action.hover",
                color: "text.primary",
              },
            }}
            onClick={() => {
              newThread();
              setTabs([]);
              onNewChat();
            }}
          >
            New Chat
          </Button>
        </Box>
      </Box>

      <Box
        sx={{
          height: expanded ? "0" : "calc(30dvh - 55px)",
          display:
            messages?.length > 0 ? "flex" : tabs.length > 0 ? "block" : "none",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          position: "relative",
        }}
        ref={boxRef}
      >
        <Box
          sx={{
            flex: 1,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            width: "100%",
            height: "calc(100% - 40px)",
          }}
        >
          {!expanded && (
            <>
              <MiniMap
                visible={isVisible("map") || isVisible("map_urgent")}
                urgent={tabs.includes("map_urgent")}
                expanded={expanded}
              />

              <MedicationBox
                medications={medicationsList}
                visible={isVisible("medications")}
                expanded={expanded}
                openTab={openTab}
              />

              <DiseasesBox
                diseases={diseasesList}
                visible={isVisible("diseases")}
                expanded={expanded}
                openTab={openTab}
              />
            </>
          )}
        </Box>
      </Box>

      <Box
        sx={{
          height:
            tabs.length > 0
              ? expanded
                ? "calc(100dvh - 70px)"
                : "70dvh"
              : "calc(100dvh - 55px)",
          marginTop: "15px",
          display: "block",
        }}
      >
        <MainContainer style={{ border: 0 }}>
          <Chatbot
            visible={!expanded}
            branding={branding}
            user={user}
            userData={userData}
            currentTab={currentTab}
            setCurrentTab={setCurrentTab}
            expanded={expanded}
            openTab={openTab}
            tabs={tabs}
            boxRef={boxRef}
          />
          <MiniMap
            visible={currentTab === "map" || currentTab === "map_urgent"}
            urgent={tabs.includes("map_urgent")}
            expanded={expanded}
          />
          <MedicationBox
            medications={medicationsList}
            visible={currentTab === "medications"}
            expanded={expanded}
            openTab={openTab}
          />
          <DiseasesBox
            diseases={diseasesList}
            visible={currentTab === "diseases"}
            expanded={expanded}
            openTab={openTab}
          />
        </MainContainer>
      </Box>
    </Box>
  );
};

export default ContextBox;
