import React, { useState, useRef } from "react";
import { Controller } from "react-hook-form";
import AlgoliaPlaces from "algolia-places-react";
import styled from "styled-components";
import Loading from "./Loading";

const SearchWrapper = styled.div`
  position: relative;
  padding-bottom: 5px;

  .ap-input-icon {
    right: 0 !important;
  }

  button {
    visibility: ${({ error }) => (!error ? "visible" : "hidden")};
  }
`;

const Input = styled(AlgoliaPlaces)`
  display: block;
  width: 90%;
  background: transparent;
  border: 0;
  height: 40px;
  font-size: 17px;
  font-weight: 400;
  padding: 0;
`;

export default ({ register, setCoords, setAddress, control, afterChange }) => {
  let placesRef = useRef(null);
  const [error, setError] = useState(false);

  return (
    <SearchWrapper error={error}>
      <Controller
        id="address"
        name="address"
        render={({ onChange }) => (
          <Input
            placeholder="Search for an address"
            options={{
              appId: process.env.REACT_APP_ALGOLIA_APP_ID,
              apiKey: process.env.REACT_APP_ALGOLIA_API_KEY,
              countries: ["us", "au"],
            }}
            onLimit={(message) => setError(message)}
            onError={(message) => setError(message)}
            onChange={({ suggestion }) => {
              // Remove the country from the address
              let address_arr = suggestion.value.split(",");
              address_arr.pop();
              let no_country = address_arr.join(",").trim();

              onChange(suggestion.latlng);

              if (setAddress) {
                setAddress(no_country);
              }
              if (setCoords) {
                setCoords(suggestion.latlng);
              }
              if (afterChange) {
                afterChange(suggestion.latlng, no_country);
              }
            }}
            placesRef={(ref) => {
              placesRef = ref;
            }}
            onFocus={() => {
              placesRef.open();
            }}
          />
        )}
        control={control}
        rules={{ required: "Facility address is required." }}
        defaultValue=""
      />
      {error && <Loading search />}
    </SearchWrapper>
  );
};
