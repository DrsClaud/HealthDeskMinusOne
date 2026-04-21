import Box from "@mui/material/Box";

const MapWrapper = ({ children, sx = {} }) => (
  <Box
    sx={{
      bgcolor: "#fff",
      position: "absolute",
      overflow: "hidden",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      height: sx?.height || "100dvh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      maxWidth: "960px",
      mx: "auto",
      ...sx,
    }}
  >
    {children}
  </Box>
);

export default MapWrapper;
