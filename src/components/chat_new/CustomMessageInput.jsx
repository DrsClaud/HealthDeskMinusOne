import React, { useContext } from "react";
import {
  Box,
  TextField,
  IconButton,
  Alert,
  AlertTitle,
  Button,
  Chip,
  Collapse,
  Typography,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import BlockIcon from "@mui/icons-material/Block";
import { AuthContext } from "context/Auth";
import { useRateLimit } from "hooks/useRateLimit";
import { useNavigate } from "react-router-dom";

const CustomMessageInput = ({
  inputValue,
  setInputValue,
  handleSendRequest,
  userData = null,
  disabled = false,
  hasMessages = true,
}) => {
  const { subscription, user } = useContext(AuthContext);
  const navigate = useNavigate();
  const rateLimit = useRateLimit(userData, subscription);

  // Override rate limit state if disabled prop is provided
  const isDisabled = disabled || rateLimit.isRateLimited;

  // Clear input when user becomes rate limited so they can see the placeholder
  React.useEffect(() => {
    if (isDisabled && inputValue.trim()) {
      setInputValue("");
    }
  }, [isDisabled, inputValue, setInputValue]);

  const handleKeyPress = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (inputValue.trim() && !isDisabled) {
        handleSendRequest(inputValue);
      }
    }
  };

  const getWarningMessage = () => {
    if (rateLimit.effectivePercentage >= 95) {
      return rateLimit.messagePercentage > rateLimit.tokenPercentage
        ? "Almost out of daily messages"
        : "Almost out of monthly tokens";
    } else if (rateLimit.effectivePercentage >= 90) {
      return rateLimit.messagePercentage > rateLimit.tokenPercentage
        ? "Running low on daily messages"
        : "Running low on monthly tokens";
    }
    return "Running low on capacity";
  };

  const getErrorMessage = () => {
    const isMessageLimit = rateLimit.messagePercentage >= 100;
    const baseMessage = isMessageLimit
      ? "Out of daily messages"
      : "Out of monthly tokens";

    if (userData?.fromWordPress || subscription) {
      return `${baseMessage}. Resets ${
        isMessageLimit ? "tomorrow" : "next month"
      }.`;
    }
    return `${baseMessage}. Upgrade for ${
      isMessageLimit ? "unlimited messages" : "more tokens"
    }.`;
  };

  const handleUpgrade = () => {
    navigate("/dashboard/upgrade");
  };

  return (
    <Box sx={{ width: "100%", position: "relative" }}>
      {/* Alert Container - Position changes based on hasMessages */}
      <Box
        sx={{
          position: hasMessages ? "absolute" : "relative",
          bottom: hasMessages ? "100%" : "auto", // Position directly above the input only when hasMessages
          left: 0,
          right: 0,
          zIndex: 1000,
          mb: hasMessages ? 0 : 2, // Add margin bottom when not absolute
        }}
      >
        {/* Warning Alert - Shows at 80-99% usage */}
        <Collapse in={rateLimit.shouldShowWarning}>
          <Alert
            severity="warning"
            icon={<WarningAmberIcon />}
            sx={{
              mb: 0.5,
              mx: 0, // Remove horizontal margins to match input width
              borderRadius: 2,
              "& .MuiAlert-message": {
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                width: "100%",
              },
            }}
            action={
              rateLimit.canUpgrade ? (
                <Button
                  size="small"
                  variant="outlined"
                  color="warning"
                  onClick={handleUpgrade}
                  sx={{ ml: 1, whiteSpace: "nowrap" }}
                >
                  Upgrade
                </Button>
              ) : null
            }
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="body2">{getWarningMessage()}</Typography>
              <Chip
                label={`${Math.round(rateLimit.effectivePercentage)}% used`}
                size="small"
                color="warning"
                variant="outlined"
              />
            </Box>
          </Alert>
        </Collapse>

        {/* Error Alert - Shows at 100% usage */}
        <Collapse in={rateLimit.isRateLimited}>
          <Alert
            severity="error"
            icon={<BlockIcon />}
            sx={{
              mb: 0.5,
              mx: 0,
              borderRadius: 2,
              "& .MuiAlert-message": {
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                width: "100%",
              },
            }}
            action={
              rateLimit.canUpgrade ? (
                <Button
                  size="small"
                  variant="contained"
                  color="error"
                  onClick={handleUpgrade}
                  sx={{ ml: 1, whiteSpace: "nowrap" }}
                >
                  Upgrade
                </Button>
              ) : null
            }
          >
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {getErrorMessage()}
              </Typography>
            </Box>
          </Alert>
        </Collapse>
      </Box>

      {/* Input Area - Hide when disabled and no messages */}
      {!(isDisabled && !hasMessages) && (
        <Box
          sx={{
            position: "relative",
            width: "100%",
            display: "flex",
            alignItems: "flex-end",
            gap: 2,
            px: 0,
            py: 1,
            backgroundColor: "white",
          }}
        >
          <TextField
            autoFocus
            fullWidth
            multiline
            maxRows={6}
            size="small"
            disabled={isDisabled}
            placeholder={
              isDisabled
                ? userData?.fromWordPress
                  ? "Daily limit reached for this module. Resets tomorrow."
                  : rateLimit.canUpgrade
                  ? "Upgrade to continue messaging."
                  : "Rate limit reached."
                : "Message My HealthDesk"
            }
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            sx={{
              "& .MuiOutlinedInput-root": {
                backgroundColor: isDisabled ? "#f9f9f9" : "#f5f5f5",
                borderRadius: 2,
                minHeight: 48,
                alignItems: "center",
                padding: "12px 14px",
                "& .MuiInputBase-inputMultiline": {
                  padding: 0,
                  lineHeight: "1.4375em",
                },
                "& fieldset": {
                  border: isDisabled ? "2px dashed #d32f2f" : "none",
                },
                "&.Mui-disabled": {
                  backgroundColor: "#f9f9f9",
                  "& .MuiInputBase-input": {
                    WebkitTextFillColor: "#666",
                  },
                  "& .MuiInputBase-input::placeholder": {
                    color: isDisabled ? "#d32f2f" : "#666",
                    opacity: 1,
                  },
                },
              },
            }}
          />

          {/* Send Button */}
          <IconButton
            color="primary"
            disabled={!inputValue.trim() || isDisabled}
            onClick={() => handleSendRequest(inputValue)}
            sx={{
              width: 48,
              height: 48,
              backgroundColor: (theme) =>
                inputValue.trim() && !isDisabled
                  ? theme.palette.primary.main
                  : "none",
              color: (theme) =>
                inputValue.trim() && !isDisabled ? "white" : "#9e9e9e",
              "&:hover": {
                backgroundColor: (theme) =>
                  inputValue.trim() && !isDisabled
                    ? theme.palette.primary.dark
                    : "none",
              },
              "&.Mui-disabled": {
                backgroundColor: "none",
                color: "#9e9e9e",
              },
            }}
          >
            <SendIcon />
          </IconButton>
        </Box>
      )}
    </Box>
  );
};

export default CustomMessageInput;
