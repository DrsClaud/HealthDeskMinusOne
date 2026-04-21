import React, { useState } from "react";
import styled from "styled-components";
import { Link } from "react-router-dom";
import Search from "components/map/Search";
import Filters from "components/map/Filters";
import Columns from "components/styled/Columns";
import Button from "components/styled/Button";
import Logo from "components/styled/Logo";
import nm from "assets/images/branding/nm.jpg";
import wray from "assets/images/branding/wray.jpg";
import ColorLegend from "components/map/ColorLegend";

import { FaMinus, FaPlus, FaSearch } from "react-icons/fa";

import { useMap } from "react-leaflet";

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

const LegendWrapper = styled.div`
  display: flex;
  justify-content: space-between;
  max-width: 360px;
  margin: 0 auto 0.5rem;

  div {
    display: flex;
    align-items: center;
  }

  img {
    margin-right: 0.25rem;
    max-width: 22px;
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

const SearchButtonWrapper = styled.div`
  position: absolute;
  top: calc(100% + 5px);
  right: 5px;
  background-color: ${(props) => props.theme.colors.white};
  padding: 0.5rem 0.6em 0.325rem;
  cursor: pointer;
  border-radius: 5px;
  box-shadow: 0 2px 6px 0 rgba(0, 0, 0, 0.2), 0 4px 18px 0 rgba(0, 0, 0, 0.19);
`;

const ZoomWrapper = styled.div`
  position: absolute;
  top: calc(100% + 48px);
  right: 5px;
  background-color: ${(props) => props.theme.colors.white};
  cursor: pointer;
  border-radius: 5px;
  box-shadow: 0 2px 6px 0 rgba(0, 0, 0, 0.2), 0 4px 18px 0 rgba(0, 0, 0, 0.19);
  display: flex;
  flex-direction: column;

  div:first-child {
    padding: 0.55rem 0.6em 0.225rem;
  }

  div:last-child {
    padding: 0.325rem 0.6em 0.3rem;
  }
`;

const SearchButton = ({ onClick }) => (
  <SearchButtonWrapper onClick={onClick}>
    <FaSearch size={18} color="#1B4584" />
  </SearchButtonWrapper>
);

const ZoomButton = () => {
  const map = useMap();

  return (
    <ZoomWrapper>
      <div onClick={() => map.zoomIn()}>
        <FaPlus size={12} color="#1B4584" />
      </div>
      <div onClick={() => map.zoomOut()}>
        <FaMinus size={12} color="#1B4584" />
      </div>
    </ZoomWrapper>
  );
};

const HeaderWrapper = styled.div`
  position: absolute;
  height: auto;
  padding: 5px;
  font-size: 20px;
  left: 0;
  right: 0;
  top: 0;
  background: #fff;
  font-size: 12px;
  z-index: 9999;

  @media screen and (max-width: 599px) {
    top: -12px;
  }

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

export default ({
  data,
  branding,
  filter,
  setFilter,
  setCoords,
  updateMap,
  searchLoaded,
  currentRegion,
  setRegional,
  vaccine,
  expanded,
}) => {
  const [showSearch, setShowSearch] = useState(false);

  if (!expanded) return;

  return (
    <HeaderWrapper>
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

      {branding ? (
        <MarketingLogoWrapper>
          <a href={branding.website} target="_blank" rel="noopener">
            <MarketingLogo src={branding.logo} />
          </a>
        </MarketingLogoWrapper>
      ) : (
        <h2 style={{ color: "grey" }}>
          {vaccine
            ? "Same Day Vaccine Availability"
            : "Same Day Healthcare Availability"}
        </h2>
      )}
      {currentRegion !== "wray" && (
        <Filters
          data={data}
          filter={filter}
          setFilter={setFilter}
          vaccine={vaccine}
        />
      )}

      {filter !== "healthcard" && filter !== "videocare" && (
        <WaitRoomTimeWrapper>
          {filter === "queue" &&
          !data.filter((location) => location?.queueEnabled).length ? (
            <Popup>
              Sorry...no facilities in your area have created a Virtual Queue.
              Perhaps you should suggest this to them?
            </Popup>
          ) : (
            <ColorLegend />
          )}
        </WaitRoomTimeWrapper>
      )}

      <SearchButton onClick={() => setShowSearch(!showSearch)} />
      <ZoomButton onClick={() => setShowSearch(!showSearch)} />
      <Search
        updateMap={updateMap}
        searchLoaded={searchLoaded}
        open={showSearch}
        setCoords={setCoords}
      />
    </HeaderWrapper>
  );
};
