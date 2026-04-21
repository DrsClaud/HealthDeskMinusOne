import React from "react";
import {
  Box,
  Typography,
  IconButton,
  TextField,
  CircularProgress,
  Alert,
  useTheme,
} from "@mui/material";
import MicRounded from "@mui/icons-material/MicRounded";
import StopRounded from "@mui/icons-material/StopRounded";
import TestEncountersPanel from "./TestEncountersPanel";
import LanguageSelector from "components/dashboard/chartmind/common/LanguageSelector";

const RecordingStep = ({
  isSupported,
  isRecording,
  isGeneratingChart,
  transcript,
  error,
  onMicClick,
  onClearError,
  onTranscriptChange,
  language,
  onLanguageChange,
  showTestEncounters = false,
  testEncounters = [],
  testEncountersLoading = false,
  testEncountersError = "",
  onSelectTestEncounter = () => {},
  onSaveTestEncounter = async () => {},
}) => {
  const theme = useTheme();

  return (
    <Box sx={{ width: '100%' }}>
      {/* Intro text */}
      <Box sx={{ textAlign: "center", mb: 4 }}>
        <Typography
          variant="h4"
          sx={{
            mb: { xs: 1.5, sm: 2 },
            fontWeight: 600,
          }}
        >
          {isRecording ? "Recording Encounter" : "Record Encounter"}
        </Typography>
        <Typography
          variant="body1"
          sx={{
            color: "text.secondary",
            lineHeight: 1.6,
          }}
        >
          {isRecording
            ? "Speak clearly. Click the button to stop and generate your chart."
            : "Start the patient encounter by clicking the microphone below."}
        </Typography>

        {/* Error Alert - below intro text */}
        {(error || !isSupported) && (
          <Alert
            severity="error"
            onClose={error ? onClearError : undefined}
            sx={{ width: "100%", mt: 3, textAlign: "left" }}
          >
            {error ||
              "Speech recognition is not supported in this browser. Please use Google Chrome or Microsoft Edge."}
          </Alert>
        )}
      </Box>

      {/* Microphone button */}
      <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
        <IconButton
          onClick={onMicClick}
          disabled={!isSupported || isGeneratingChart}
          sx={{
            width: 80,
            height: 80,
            backgroundColor: isRecording
              ? theme.palette.error.main
              : theme.palette.primary.main,
            color: "#ffffff",
            transition: "all 0.3s ease",
            "&:hover": {
              backgroundColor: isRecording
                ? theme.palette.error.dark
                : theme.palette.primary.dark,
              transform: "scale(1.05)",
            },
            "&:active": {
              transform: "scale(0.95)",
            },
            "&:disabled": {
              backgroundColor: theme.palette.grey[400],
              color: "#ffffff",
            },
            boxShadow: isRecording
              ? `0 0 0 0 ${theme.palette.error.main}99`
              : `0 8px 20px ${theme.palette.primary.main}40`,
            animation: isRecording ? "pulse 2s infinite" : "none",
            "@keyframes pulse": {
              "0%": {
                boxShadow: `0 0 0 0 ${theme.palette.error.main}99`,
              },
              "70%": {
                boxShadow: `0 0 0 15px ${theme.palette.error.main}00`,
              },
              "100%": {
                boxShadow: `0 0 0 0 ${theme.palette.error.main}00`,
              },
            },
          }}
        >
          {isGeneratingChart ? (
            <CircularProgress size={32} sx={{ color: "#ffffff" }} />
          ) : isRecording ? (
            <StopRounded sx={{ fontSize: 40 }} />
          ) : (
            <MicRounded sx={{ fontSize: 40 }} />
          )}
        </IconButton>
      </Box>

      {/* Language selector */}
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <LanguageSelector
          value={language || 'en-US'}
          onChange={onLanguageChange}
          disabled={isRecording || isGeneratingChart}
        />
      </Box>

      {/* Transcript area - always visible for paste support */}
      <Box sx={{ width: "100%", mt: 3 }}>
        <Typography
          variant="subtitle2"
          sx={{ mb: 1, color: "text.secondary", fontWeight: 600 }}
        >
          {isRecording ? "Live Transcript" : "Transcript"}
        </Typography>
        <TextField
          multiline
          fullWidth
          value={transcript}
          onChange={(e) => !isRecording && onTranscriptChange?.(e.target.value)}
          placeholder={
            isRecording
              ? ""
              : "Paste or type a transcript here to analyze without voice recording..."
          }
          minRows={4}
          maxRows={10}
          variant="standard"
          InputProps={{
            readOnly: isRecording,
            disableUnderline: true,
            sx: {
              fontSize: "0.95rem",
              lineHeight: 1.6,
              color: "text.primary",
              p: 0,
            },
          }}
        />
      </Box>

      {showTestEncounters ? (
        <TestEncountersPanel
          encounters={testEncounters}
          loading={testEncountersLoading}
          error={testEncountersError}
          disabled={isRecording || isGeneratingChart}
          onSelectEncounter={onSelectTestEncounter}
          onSaveEncounter={onSaveTestEncounter}
        />
      ) : null}
    </Box>
  );
};

export default RecordingStep;
