import React, { useContext, useState } from "react";
import styled from "styled-components";
import { Link } from "react-router-dom";
import Search from "components/map/Search";
import Filters from "components/map/Filters";
import Columns from "components/styled/Columns";
import Logo from "components/styled/Logo";
import nm from "assets/images/branding/nm.jpg";
import wray from "assets/images/branding/wray.jpg";
import MainMenu from "components/common/layout/MainMenu";
import ColorLegend from "components/map/ColorLegend";
import ColorGradient from "../../components/dashboard/ColorGradient";
import { useNavigate } from "react-router-dom";

import { useMap } from "react-leaflet";
import {
  Button,
  Box,
  Typography,
  IconButton,
  Paper,
  Chip,
  Avatar,
  Alert,
} from "@mui/material";
import {
  Search as SearchIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  Business as BusinessIcon,
} from "@mui/icons-material";
import { AuthContext } from "context/Auth";
import FeaturedAd from "./FeaturedAd";

const LogoWrapper = styled.div`
  display: flex;
  align-items: center;
`;

const Popup = styled.p`
  margin-top: 0 !important;
  margin-bottom: 0 !important;
  font-weight: 400 !important;

  a {
    color: ${(props) => props.theme.colors.secondary};
  }
`;

const MarketingLogoWrapper = styled.div`
  text-align: center;
  padding: 0.25rem 0.5rem 0.5rem;
`;

const MarketingLogo = styled.img`
  margin: auto;
  max-height: 40px;
`;

const WaitRoomTimeWrapper = styled.div`
  /* position: absolute; */
  top: 100%;
  background-color: ${(props) => props.theme.colors.white};
  left: 0;
  right: 0;
  margin: 0 auto;
  max-width: 720px;
  padding: 0.125em 0.275em;
`;

const SearchButton = ({ onClick }) => (
  <IconButton
    onClick={onClick}
    sx={{
      position: "absolute",
      top: "calc(100% + 5px)",
      right: 5,
      backgroundColor: "background.paper",
      boxShadow: 2,
      width: 36,
      height: 36,
      "&:hover": {
        backgroundColor: "background.paper",
        boxShadow: 4,
      },
    }}
  >
    <SearchIcon color="primary" />
  </IconButton>
);

const ZoomButton = () => {
  const map = useMap();

  return (
    <Box
      sx={{
        position: "absolute",
        top: "calc(100% + 46px)",
        right: 5,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <IconButton
        onClick={() => map.zoomIn()}
        size="small"
        sx={{
          backgroundColor: "background.paper",
          boxShadow: 2,
          width: 32,
          height: 32,
          borderRadius: "4px 4px 0 0",
          "&:hover": {
            backgroundColor: "background.paper",
            boxShadow: 4,
          },
        }}
      >
        <AddIcon color="primary" fontSize="small" />
      </IconButton>
      <IconButton
        onClick={() => map.zoomOut()}
        size="small"
        sx={{
          backgroundColor: "background.paper",
          boxShadow: 2,
          width: 32,
          height: 32,
          borderRadius: "0 0 4px 4px",
          marginTop: "1px",
          "&:hover": {
            backgroundColor: "background.paper",
            boxShadow: 4,
          },
        }}
      >
        <RemoveIcon color="primary" fontSize="small" />
      </IconButton>
    </Box>
  );
};

const HeaderWrapper = styled.div`
  position: absolute;
  height: auto;
  padding: 5px 5px 0 5px;
  font-size: 20px;
  left: 0;
  right: 0;
  top: 0;
  background: #fff;
  font-size: 12px;
  z-index: 9999;
  box-shadow: 0px 2px 4px -1px rgba(0, 0, 0, 0.2),
    0px 4px 5px 0px rgba(0, 0, 0, 0.14), 0px 1px 10px 0px rgba(0, 0, 0, 0.12);

  p {
    text-align: center;
    font-weight: 700;
    color: ${(props) => props.theme.colors.primary};
    margin-top: 8px;
    margin-bottom: 8px;
    font-size: 12px;
    z-index: 99;
  }
  .center {
    text-align: center;
  }
  p {
    text-align: center;
    font-weight: 700;
    color: ${(props) => props.theme.colors.primary};
    margin-top: 8px;
    margin-bottom: 8px;
    font-size: 12px;
  }
  h2 {
    text-align: center;
    font-weight: 700;
    color: ${(props) => props.theme.colors.primary};
    margin-top: 2px;
    margin-bottom: 6px;
    font-size: 16px;
  }
`;

// Custom styled component to replace the Columns component for the header
const HeaderRow = styled.div`
  display: flex;
  position: relative;
  align-items: center;
  width: 100%;
  padding: 5px 0;
  min-height: 42px;
`;

// Style for the left side containing logo and menu
const LeftSide = styled.div`
  display: flex;
  align-items: center;
  position: absolute;
  left: 0;
`;

// Style for the right side containing login button
const RightSide = styled.div`
  display: flex;
  align-items: center;
  position: absolute;
  right: 0;
`;

export default ({
  data,
  filter,
  setFilter,
  setCoords,
  updateMap,
  searchLoaded,
  currentRegion,
  setRegional,
  setCustomLocation,
  vaccine,
  ads,
  branding,
  onLocationClick,
  onAuthClick,
  expanded = true,
  full = true,
}) => {
  const [showSearch, setShowSearch] = useState(false);
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  console.log({ ads });

  const handleSortLevelOfCare = () => {
    console.log("Current logged user:", user);

    if (user === null) {
      navigate("/chat", {
        state: {
          initiateChatWith: "Assess what level of care I need right now",
          assistantId: "general",
        },
      });
    } else {
      navigate("/dashboard/chat", {
        state: {
          initiateChatWith: "Assess what level of care I need right now",
          assistantId: "general",
        },
      });
    }
  };

  if (!full && !expanded) return;

  return (
    <HeaderWrapper>
      {full && (
        <HeaderRow>
          <LeftSide>
            <MainMenu />
            <Logo />
          </LeftSide>

          <Box
            sx={{
              display: { xs: "none", md: "flex" },
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
              position: "absolute",
              left: "50%",
              transform: "translateX(-50%)",
              pointerEvents: "none",
            }}
          >
            <Typography
              variant="h6"
              sx={{
                fontSize: "18px",
                fontWeight: "700",
                color: "#666666",
                margin: 0,
                textAlign: "center",
              }}
            >
              {filter.group
                ? `${filter.group.replace(/-/g, " ")} Facilities`
                : "Priority Healthcare Availability"}
            </Typography>
          </Box>

          <RightSide>
            {user ? (
              <Link to="/dashboard">
                <Button variant="contained" color="secondary" size="small">
                  Dashboard
                </Button>
              </Link>
            ) : (
              <Button
                variant="contained"
                color="secondary"
                size="small"
                onClick={onAuthClick}
              >
                Subscribe/Log In
              </Button>
            )}
          </RightSide>
        </HeaderRow>
      )}

      {/* Group filter indicator with action button */}
      {filter.group && (
        <Alert
          severity="info"
          action={
            <Button
              color="inherit"
              size="small"
              onClick={() => setFilter((prev) => ({ ...prev, group: "" }))}
              sx={{ fontSize: "0.75rem" }}
            >
              Show All Facilities
            </Button>
          }
          sx={{
            mt: 1,
            py: 0.5,
            fontSize: "0.875rem",
          }}
        >
          You're viewing only{" "}
          <strong>
            {filter.group
              .replace(/-/g, " ")
              .replace(/\b\w/g, (l) => l.toUpperCase())}
          </strong>{" "}
          facilities.
        </Alert>
      )}

      {/* These are temporary logos hardcoded for regional demos--when regional feature is built out these will be removed */}
      {currentRegion === "nm" && (
        <div className="center">
          <Logo src={nm} width="175px" />
        </div>
      )}
      {currentRegion === "wray" && (
        <div className="center">
          <img src={wray} width="175px" />
        </div>
      )}
      {currentRegion === "nm" && (
        <div className="center">
          <label>
            <input
              type="checkbox"
              onChange={(e) => setRegional(e.target.checked)}
            />
            Include other medical groups
          </label>
        </div>
      )}

      {currentRegion !== "wray" && (
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            justifyContent: "space-between",
            alignItems: "center",
            width: "100%",
            padding: 0,
          }}
        >
          {/* Left box */}
          <Box
            sx={{
              width: { xs: "100%", md: "50%" },
              mb: { xs: 0, md: 0 },
              padding: "0 10px",
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "100%",
              }}
            >
              <Filters
                data={data}
                filter={filter}
                setFilter={setFilter}
                onSortLevelOfCare={handleSortLevelOfCare}
                vaccine={vaccine}
                ads={ads}
                sx={{ margin: "0 !important", width: "100%" }}
              />
            </Box>
          </Box>

          {/* Right box */}
          <Box
            sx={{
              width: { xs: "100%", md: "50%" },
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0 10px",
            }}
          >
            <ColorGradient
              sx={{ width: "100%" }}
              facilityType={filter.facility}
            />
          </Box>
        </Box>
      )}

      {/* Featured Ad - Premium placement */}
      {ads?.length > 0 && ads.find((ad) => ad.featured) && (
        <Box sx={{ px: 1, pb: 1 }}>
          <FeaturedAd
            ad={ads.find((ad) => ad.featured)}
            onLocationClick={onLocationClick}
            setFilter={setFilter}
          />
        </Box>
      )}

      {/* Fallback: If no featured ad is found, use the first ad */}
      {ads?.length > 0 &&
        !ads.find((ad) => ad.featured) &&
        ads[0]?.website &&
        ads[0]?.logo && (
          <Box sx={{ px: 1, pb: 1 }}>
            <FeaturedAd
              ad={ads[0]}
              onLocationClick={onLocationClick}
              setFilter={setFilter}
            />
          </Box>
        )}

      {!user ? (
        <Link to="/register">
          <Button
            variant="contained"
            color="secondary"
            size="small"
            sx={{ position: "absolute", top: "calc(100% + 5px)", left: 5 }}
          >
            Get on the map
          </Button>
        </Link>
      ) : null}

      <SearchButton onClick={() => setShowSearch(!showSearch)} />
      <ZoomButton onClick={() => setShowSearch(!showSearch)} />
      <Search
        searchLoaded={searchLoaded}
        open={showSearch}
        setCoords={setCoords}
        setCustomLocation={setCustomLocation}
      />
    </HeaderWrapper>
  );
};
