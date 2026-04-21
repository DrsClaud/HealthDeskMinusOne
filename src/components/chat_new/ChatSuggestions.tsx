import React from "react";
import { Box, Button, Typography } from "@mui/material";
import SearchRounded from "@mui/icons-material/SearchRounded";
import LocalHospitalRounded from "@mui/icons-material/LocalHospitalRounded";
import QuizRounded from "@mui/icons-material/QuizRounded";
import FlashOnRounded from "@mui/icons-material/FlashOnRounded";
import CalculateRounded from "@mui/icons-material/CalculateRounded";
import WarningRounded from "@mui/icons-material/WarningRounded";
import ScienceRounded from "@mui/icons-material/ScienceRounded";
import LibraryBooksRounded from "@mui/icons-material/LibraryBooksRounded";
import PolicyRounded from "@mui/icons-material/PolicyRounded";
import PresentToAllRounded from "@mui/icons-material/PresentToAllRounded";
import MedicalInformationRounded from "@mui/icons-material/MedicalInformationRounded";
import PsychologyRounded from "@mui/icons-material/PsychologyRounded";
import HelpOutlineRounded from "@mui/icons-material/HelpOutlineRounded";
import BiotechRounded from "@mui/icons-material/BiotechRounded";
import HealthAndSafetyRounded from "@mui/icons-material/HealthAndSafetyRounded";
import ChatRounded from "@mui/icons-material/ChatRounded";
import LightbulbRounded from "@mui/icons-material/LightbulbRounded";

interface ChatSuggestion {
  buttonText: string;
  fullMessage: string;
  icon: React.ReactNode;
}

interface ChatSuggestionsProps {
  assistantType: string;
  onSuggestionClick: (message: string) => void;
}

const getSuggestions = (assistantType: string): ChatSuggestion[] => {
  const suggestions = {
    general: [
      {
        buttonText: "Analyze my symptoms",
        fullMessage:
          "I have symptoms I'd like you to analyze and provide guidance on what they might mean.",
        icon: <SearchRounded />,
      },
      {
        buttonText: "Find care options",
        fullMessage:
          "Help me determine what type of healthcare provider or care setting is appropriate for my situation.",
        icon: <LocalHospitalRounded />,
      },
      {
        buttonText: "Explain my condition",
        fullMessage:
          "I have a medical condition I'd like you to explain, including treatment options.",
        icon: <QuizRounded />,
      },
    ],
    brainflash: [
      {
        buttonText: "Calculate dosing",
        fullMessage:
          "I need quick medication dosing calculations and recommendations.",
        icon: <CalculateRounded />,
      },
      {
        buttonText: "Check contraindications",
        fullMessage:
          "What are the key contraindications and interactions for a specific medication?",
        icon: <WarningRounded />,
      },
      {
        buttonText: "Get emergency protocol",
        fullMessage:
          "I need rapid guidance on emergency protocols and immediate management steps.",
        icon: <FlashOnRounded />,
      },
    ],
    "deep-dive": [
      {
        buttonText: "Explore mechanisms",
        fullMessage:
          "I want to explore the detailed pathophysiology and mechanisms of a condition.",
        icon: <ScienceRounded />,
      },
      {
        buttonText: "Review evidence",
        fullMessage:
          "What does current research and evidence say about a treatment or clinical approach?",
        icon: <LibraryBooksRounded />,
      },
      {
        buttonText: "Get guidelines",
        fullMessage:
          "What are the current evidence-based guidelines for managing this condition?",
        icon: <PolicyRounded />,
      },
    ],
    "peer-review": [
      {
        buttonText: "Present case",
        fullMessage:
          "I'd like to present a clinical case for collaborative discussion and input.",
        icon: <PresentToAllRounded />,
      },
      {
        buttonText: "Plan treatment",
        fullMessage:
          "I have a patient case where I'd like to develop a comprehensive management plan.",
        icon: <MedicalInformationRounded />,
      },
      {
        buttonText: "Analyze reasoning",
        fullMessage:
          "Walk me through the clinical reasoning process for a complex case.",
        icon: <PsychologyRounded />,
      },
    ],
    "basic-medical-library": [
      {
        buttonText: "Understand condition",
        fullMessage:
          "Help me understand what a medical condition is and how it affects me.",
        icon: <HelpOutlineRounded />,
      },
      {
        buttonText: "Explain symptoms",
        fullMessage:
          "Can you explain what different symptoms mean and why they happen?",
        icon: <HealthAndSafetyRounded />,
      },
      {
        buttonText: "Learn about tests",
        fullMessage: "What does this medical test do and why might I need it?",
        icon: <ScienceRounded />,
      },
    ],
    "advanced-medical-library": [
      {
        buttonText: "Understand causes",
        fullMessage:
          "I want to understand what actually causes this condition and how it develops.",
        icon: <BiotechRounded />,
      },
      {
        buttonText: "Compare treatments",
        fullMessage:
          "Explain the different treatment options and how they work.",
        icon: <HealthAndSafetyRounded />,
      },
      {
        buttonText: "Research findings",
        fullMessage:
          "What does current medical research say about this condition or treatment?",
        icon: <LibraryBooksRounded />,
      },
    ],
    "virtual-md": [
      {
        buttonText: "Get perspective",
        fullMessage:
          "How would a doctor approach and think about my health concern?",
        icon: <PsychologyRounded />,
      },
      {
        buttonText: "Understand process",
        fullMessage:
          "Walk me through how doctors evaluate and diagnose health problems.",
        icon: <LightbulbRounded />,
      },
      {
        buttonText: "Ask questions",
        fullMessage:
          "I have health questions I'd like to explore from a medical perspective.",
        icon: <ChatRounded />,
      },
    ],
  };

  return suggestions[assistantType] || [];
};

const ChatSuggestions: React.FC<ChatSuggestionsProps> = ({
  assistantType,
  onSuggestionClick,
}) => {
  const suggestions = getSuggestions(assistantType);

  if (!suggestions || suggestions.length === 0) {
    return null;
  }

  return (
    <Box
      sx={{
        mt: 1,
        px: 2,
        width: "100%",
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: 1,
          width: "100%",
        }}
      >
        {suggestions.map((suggestion, index) => (
          <Button
            key={index}
            variant="outlined"
            onClick={() => onSuggestionClick(suggestion.fullMessage)}
            startIcon={suggestion.icon}
            sx={{
              py: 1,
              px: 2,
              borderRadius: 2,
              border: "1px solid #e5e7eb",
              backgroundColor: "white",
              color: "#374151",
              fontSize: "0.8rem",
              fontWeight: 500,
              textTransform: "none",
              minHeight: "40px",
              gap: 1,
              minWidth: "140px",
              whiteSpace: "nowrap",
              "&:hover": {
                backgroundColor: "#f9fafb",
                borderColor: "#d1d5db",
                transform: "translateY(-1px)",
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              },
              "& .MuiButton-startIcon": {
                color: "#6b7280",
                fontSize: "1rem",
                minWidth: "16px",
              },
              transition: "all 0.2s ease",
            }}
          >
            {suggestion.buttonText}
          </Button>
        ))}
      </Box>
    </Box>
  );
};

export default ChatSuggestions;
