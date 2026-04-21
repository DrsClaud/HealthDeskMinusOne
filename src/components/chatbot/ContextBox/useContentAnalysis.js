import { useEffect, useState, useContext } from "react";
import { ChatContext } from "context/Chat";
import { medications, diseases } from "../data";

export const useContentAnalysis = (userData, tabs, setTabs) => {
  const { messages } = useContext(ChatContext);
  const [medicationsList, setMedicationsList] = useState([]);
  const [diseasesList, setDiseasesList] = useState([]);

  // Effect for analyzing content
  useEffect(() => {
    if (!messages?.length) {
      setMedicationsList([]);
      setDiseasesList([]);
      return;
    }

    const analyzedContent = messages.reduce(
      (acc, { message, sender }) => {
        if (!message || sender !== "My HealthDesk") return acc;

        const medicationsFound = medications.filter((s) =>
          message?.toLowerCase().includes(s?.toLowerCase())
        );

        const diseasesFound = diseases.filter((s) =>
          s.length > 4
            ? message?.toLowerCase().includes(s?.toLowerCase())
            : message?.includes(s)
        );

        return {
          medications: [...acc.medications, ...medicationsFound],
          diseases: [...acc.diseases, ...diseasesFound],
        };
      },
      { medications: [], diseases: [] }
    );

    setMedicationsList(analyzedContent.medications);
    setDiseasesList(analyzedContent.diseases);
  }, [messages]);

  // Separate effect for updating tabs based on content
  useEffect(() => {
    if (!messages?.length) return;

    let newTabs = [];

    if (medicationsList.length > 0 && !tabs.includes("medications")) {
      newTabs.push("medications");
    }

    if (diseasesList.length > 0 && !tabs.includes("diseases")) {
      newTabs.push("diseases");
    }

    if (newTabs.length > 0) {
      setTabs((prev) => [...prev, ...newTabs]);
    }
  }, [medicationsList, diseasesList, tabs, setTabs]);

  // Separate effect for emergency/urgent care triggers
  useEffect(() => {
    if (!messages?.length || !userData) return;

    const lastMessage = messages[messages.length - 1];
    if (!lastMessage?.message || lastMessage.sender !== "My HealthDesk") return;

    if (
      !tabs.includes("map") &&
      !tabs.includes("map_urgent") &&
      userData?.role !== "professional"
    ) {
      const emergencyTriggers = [
        "healthcare provider",
        "seek appropriate medical care",
        "Emergency",
        "emergency",
        "911",
      ];
      const urgentTriggers = ["urgent care", "Urgent care", "Urgent Care"];

      if (
        urgentTriggers.some((trigger) => lastMessage.message.includes(trigger))
      ) {
        setTabs((prev) => [...prev, "map_urgent"]);
        return;
      }

      if (
        emergencyTriggers.some((trigger) =>
          lastMessage.message.includes(trigger)
        )
      ) {
        setTabs((prev) => [...prev, "map"]);
      }
    }
  }, [messages, userData, tabs, setTabs]);

  return { medicationsList, diseasesList };
};
