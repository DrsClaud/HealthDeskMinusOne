/**
 * Hook for handling location search functionality using Mapbox's geocoding API.
 *
 * This hook manages the search input state and provides autocomplete suggestions
 * for location searches. It integrates with the shared Mapbox cache to store
 * location data (coordinates and ZIP codes) as it's retrieved from search results.
 *
 * Features:
 * - Debounced search input to prevent excessive API calls
 * - Autocomplete suggestions from Mapbox Places API
 * - Caches ZIP codes and coordinates from search results
 * - Restricted to US and AU locations
 * - Loading state management
 *
 * @param {string} initialValue - Initial search input value
 * @param {string} [types='address'] - Comma-separated list of place types to search for (e.g. 'address,place,postcode')
 * @returns {Object} Search state and handlers
 */

import { useEffect, useState } from "react";
import useDebounce from "hooks/useDebounce";
import { useMapboxCache } from "./useMapboxCache";

const useSearch = (initialValue, types = "address") => {
  const [value, setValue] = useState(initialValue);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const query = useDebounce(value, 1000);
  const cache = useMapboxCache();

  useEffect(() => {
    if (query && loading) getSuggestions();

    async function getSuggestions() {
      try {
        const endpoint = `https://api.mapbox.com/geocoding/v5/mapbox.places/${value}.json?access_token=${process.env.REACT_APP_MAPBOX_API}&country=US,AU&autocomplete=true&types=${types}&proximity=-95.7129,37.0902`;
        const response = await fetch(endpoint);
        const results = await response.json();

        // Cache coordinates and ZIP codes from search results
        results?.features?.forEach((feature) => {
          const [lng, lat] = feature.center;
          const zipCode = feature.context?.find((c) =>
            c.id.startsWith("postcode")
          )?.text;

          if (zipCode) {
            cache.setZipCode(lat, lng, zipCode);
          }
          cache.setCoords(feature.id, { latitude: lat, longitude: lng });
        });

        setSuggestions(results?.features);
        setLoading(false);
      } catch (error) {
        console.log("Error fetching data, ", error);
      }
    }
  }, [query, cache]);

  const handleChange = (event) => {
    setLoading(true);
    setValue(event.target.value);
  };

  return {
    value,
    onChange: handleChange,
    setValue,
    loading,
    suggestions,
    setSuggestions,
  };
};

export default useSearch;
