import Map from "components/map/Map";
import { Box } from "@mui/material";
import usePosition from "hooks/usePosition";
import useZip from "hooks/useZip";

export default function MapPage() {
  const { coords } = usePosition();
  const { setCustomLocation } = useZip();

  return (
    <Box
      sx={{
        background: "#fff",
        position: "absolute",
        overflowY: "hidden",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        height: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        maxWidth: "960px",
        margin: "0 auto",
      }}
    >
      <Map initialCoords={coords} />
    </Box>
  );
}
