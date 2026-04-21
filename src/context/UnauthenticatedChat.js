import React, { createContext, useState } from "react";

export const UnauthenticatedChatContext = createContext();

export const UnauthenticatedChatProvider = ({ children }) => {
  const [messages, setMessages] = useState([]);
  const [tabs, setTabs] = useState([]);
  const [expanded, setExpanded] = useState(false);
  const [currentTab, setCurrentTab] = useState("home");

  return (
    <UnauthenticatedChatContext.Provider
      value={{
        messages,
        setMessages,
        tabs,
        setTabs,
        expanded,
        setExpanded,
        currentTab,
        setCurrentTab,
      }}
    >
      {children}
    </UnauthenticatedChatContext.Provider>
  );
};
