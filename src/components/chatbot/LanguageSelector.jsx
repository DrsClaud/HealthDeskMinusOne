import React, { useContext } from "react";
import { Box, Select, MenuItem, FormControl, InputLabel } from "@mui/material";
import { KijabeChatContext } from "context/KijabeChat";

const LanguageSelector = () => {
  const { language, setLanguage, messages } = useContext(KijabeChatContext);

  const handleChange = (event) => {
    setLanguage(event.target.value);
  };

  // Only show when there are no messages
  const shouldDisplay = messages.length === 0;

  return (
    <Box
      sx={{
        position: "absolute",
        top: "15px",
        right: "15px",
        zIndex: 1000,
        backgroundColor: "background.paper",
        borderRadius: "4px",
        display: shouldDisplay ? "block" : "none",
      }}
    >
      <FormControl size="small" sx={{ minWidth: 120 }}>
        <InputLabel id="language-select-label">Language</InputLabel>
        <Select
          labelId="language-select-label"
          id="language-select"
          value={language}
          label="Language"
          onChange={handleChange}
        >
          <MenuItem value="english">English</MenuItem>
          <MenuItem value="swahili">Swahili</MenuItem>
        </Select>
      </FormControl>
    </Box>
  );
};

export default LanguageSelector;
