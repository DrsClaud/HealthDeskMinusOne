import React from "react";
import { Box, Button } from "@mui/material";

const DocumentViewer = ({ pdf }) => {
  return (
    <Box
      sx={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        bgcolor: "background.paper",
        overflowY: "scroll",
      }}
    >
      <iframe
        src={pdf}
        style={{ width: "100%", height: "90vh" }}
        title="PDF Viewer"
      />
      <Box sx={{ display: "flex", justifyContent: "center" }}>
        <Button
          variant="contained"
          onClick={() => window.close()}
          sx={{ margin: 2 }}
        >
          Back
        </Button>
      </Box>
    </Box>
  );
};

export default DocumentViewer;
