import { useState, useContext } from "react";
import { ChatContext } from "context/Chat";

export const useChat = () => {
  const { messages } = useContext(ChatContext);
  const [tabs, setTabs] = useState([]);
  const [expanded, setExpanded] = useState(false);
  const [currentTab, setCurrentTab] = useState("home");

  return {
    messages: messages || [],
    tabs,
    setTabs,
    expanded,
    setExpanded,
    currentTab,
    setCurrentTab,
  };
};
