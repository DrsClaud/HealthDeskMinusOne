import React, { useState, useEffect, useCallback, useRef } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import { Box } from "@mui/material";
import usePosition, { FALLBACK_POSITION } from "hooks/usePosition";
import MapWrapper from "components/map/MapWrapper";
import MapUpdater from "components/map/MapUpdater";
import MapEventHandler from "components/map/MapEventHandler";
import { useLocationData } from "components/map/useLocationData";
import { CITY_COORDINATES } from "components/map/constants";
import Marker from "./Marker";
import Loading from "../Loading";
import AdCarousel from "components/map/AdCarousel";
import Modal from "components/map/Modal";
import Header from "components/map/Header";
import useZip from "hooks/useZip";
import Welcome from "components/map/Welcome";
import AuthDialog from "components/auth/AuthDialog";
import { useNavigate } from "react-router-dom";

const Map = ({
  initialFilter = { facility: "clinic", rating: 4 },
  HeaderComponent = Header,
  MapUpdaterComponent = MapUpdater,
  showModal = true,
  sx = {},
  showAds = true,
  showWelcomeDialog = true,
}) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const { latitude, longitude, error, coords, setCoords, permissionDenied } =
    usePosition();
  const { setCustomLocation, allListings, featuredListings, listingsLoaded } =
    useZip();
  const [filter, setFilter] = useState(initialFilter);
  const [searchLoaded, setSearchLoaded] = useState(true);
  const [modalOpen, setModalOpen] = useState({});
  const [modalVisible, setModalVisible] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const mapRef = useRef();

  const getLocations = useLocationData(setData, setSearchLoaded, setLoading);

  const updateMap = useCallback(
    (map, newCoords, zoomLevel) => {
      console.log("updateMap called with:", newCoords);
      setSearchLoaded(false);
      map.setView([newCoords.lat, newCoords.lng], zoomLevel || map.getZoom(), {
        animate: true,
        duration: 1,
      });
      getLocations(newCoords, zoomLevel);
    },
    [getLocations]
  );

  const preventMapInteraction = useCallback((e) => {
    e.stopPropagation();
  }, []);

  const handleLocationClick = useCallback(
    (coordinates) => {
      if (mapRef.current && coordinates) {
        const map = mapRef.current;
        updateMap(map, coordinates, 15);
      }
    },
    [updateMap]
  );

  const handleAuthSuccess = useCallback(() => {
    setAuthModalOpen(false);
    navigate("/dashboard");
  }, [navigate]);

  const handleAuthClick = useCallback(() => {
    setAuthModalOpen(true);
  }, []);

  useEffect(() => {
    const path = window.location.href.split("/").pop();
    if (CITY_COORDINATES[path]) {
      setCoords(CITY_COORDINATES[path]);
    } else if (path === "urgent") {
      setFilter((f) => ({ ...f, facility: "clinic" }));
    } else if (path === "emergency") {
      setFilter((f) => ({ ...f, facility: "emergency" }));
    } else if (path && path !== "map") {
      // Check if this is a group route (not a city, not urgent/emergency, not just "map")
      // The group name will be URL-normalized (e.g., "st-marys-medical-center")
      setFilter((f) => ({ ...f, group: path }));
    }
  }, [setCoords, setFilter]);

  useEffect(() => {
    if (latitude) {
      getLocations({ lat: latitude, lng: longitude });
    }
  }, [latitude, longitude, getLocations]);

  const isFallbackLocation =
    permissionDenied &&
    coords.lat === FALLBACK_POSITION.latitude &&
    coords.lng === FALLBACK_POSITION.longitude;

  useEffect(() => {
    if (isFallbackLocation && showWelcomeDialog) {
      setShowWelcome(true);
    }
  }, [isFallbackLocation, showWelcomeDialog]);

  if (loading && !isFallbackLocation) return <Loading page />;

  return (
    <MapWrapper sx={sx}>
      <MapContainer
        ref={mapRef}
        attributionControl={false}
        style={{
          height: sx?.height || "100dvh",
          width: "100%",
        }}
        center={[coords.lat, coords.lng]}
        zoom={13}
        zoomControl={false}
        animate={true}
        doubleClickZoom={false}
      >
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 1000,
          }}
        >
          <HeaderComponent
            data={data}
            filter={filter}
            setFilter={setFilter}
            setCoords={setCoords}
            setCustomLocation={setCustomLocation}
            updateMap={updateMap}
            searchLoaded={searchLoaded}
            ads={featuredListings}
            onLocationClick={handleLocationClick}
            onAuthClick={handleAuthClick}
            onClick={preventMapInteraction}
            onDoubleClick={preventMapInteraction}
            onWheel={preventMapInteraction}
          />
        </Box>

        <TileLayer url={`https://api.maptiler.com/maps/streets/{z}/{x}/{y}.png?key=${process.env.REACT_APP_MAPTILER_KEY || ''}`} />
        {data.map((d) => (
          <Marker
            key={d.id}
            data={d}
            filter={filter}
            setModalOpen={setModalOpen}
            setModalVisible={setModalVisible}
          />
        ))}
        <MapUpdaterComponent coords={coords} updateMap={updateMap} />
        <MapEventHandler getLocations={getLocations} />
      </MapContainer>

      {showAds && (
        <Box
          sx={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 1000,
          }}
          onClick={preventMapInteraction}
          onDoubleClick={preventMapInteraction}
          onWheel={preventMapInteraction}
        >
          <AdCarousel
            ads={allListings}
            listingsLoaded={listingsLoaded}
            onLocationClick={handleLocationClick}
            setFilter={setFilter}
          />
        </Box>
      )}

      {showModal && (
        <Modal
          modalOpen={modalOpen}
          setModalOpen={setModalOpen}
          modalVisible={modalVisible}
          setModalVisible={setModalVisible}
          userLocation={{ latitude, longitude }}
          error={error}
        />
      )}

      <Welcome
        open={showWelcome}
        close={() => setShowWelcome(false)}
        setCoords={setCoords}
        setCustomLocation={setCustomLocation}
      />

      <AuthDialog
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
      />
    </MapWrapper>
  );
};

export default Map;
