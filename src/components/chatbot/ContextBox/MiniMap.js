import React from "react";
import { Box } from "@mui/material";
import Map from "components/map/Map";
import MiniMapHeader from "components/chatbot/ContextBox/MiniMapHeader";
import MiniMapUpdater from "components/chatbot/ContextBox/MiniMapUpdater";
import Header from "components/map/Header";

const MiniMapWrapper = ({ visible, expanded, urgent }) => {
  console.log("Urgent:", urgent);
  const initialFilter = {
    facility: urgent ? "clinic" : "emergency",
  };

  // Custom map header specific to MiniMap
  const CustomHeader = ({
    data,
    filter,
    setFilter,
    setCoords,
    updateMap,
    searchLoaded,
  }) => (
    <Header
      data={data}
      filter={filter}
      setFilter={setFilter}
      setCoords={setCoords}
      updateMap={updateMap}
      searchLoaded={searchLoaded}
      expanded={expanded}
      full={false}
    />
  );

  return (
    <Box
      sx={{
        height: "100%",
        width: "100%",
        display: visible ? "block" : "none",
        overflowY: "hidden",
      }}
    >
      <Map
        initialFilter={initialFilter}
        HeaderComponent={CustomHeader}
        MapUpdaterComponent={({ coords, updateMap }) => (
          <MiniMapUpdater
            coords={coords}
            updateMap={updateMap}
            visible={visible}
          />
        )}
        showModal={expanded}
        showAds={false}
        showWelcomeDialog={false}
        sx={{
          height: "100%",
          position: "relative",
        }}
      />
    </Box>
  );
};

export default MiniMapWrapper;
