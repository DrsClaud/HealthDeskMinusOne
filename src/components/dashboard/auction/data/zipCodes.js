// Helper function to format the raw ZIP data
export const formatZipData = (rawZip) => ({
  id: String(rawZip.z),
  lat: rawZip.t,
  lng: rawZip.g,
  state: rawZip.s,
  // Default values for fields not in the raw data
  name: String(rawZip.z),
  city: "",
});

// Simple cache to avoid reloading the same data
const cache = {
  // Format: { 'lat,lng,radius': zipData }
  queries: {},
  
  // Get from cache
  get(lat, lng, radius) {
    const key = `${lat},${lng},${radius}`;
    return this.queries[key];
  },
  
  // Save to cache
  set(lat, lng, radius, data) {
    const key = `${lat},${lng},${radius}`;
    this.queries[key] = data;
    
    // Also update the static ZIP_CODES object with this data for backward compatibility
    Object.entries(data).forEach(([zipCode, zipData]) => {
      ZIP_CODES[zipCode] = zipData;
    });
  }
};

// Tracking for ZIP code loading
let zipDataLoaded = false;
let zipDataModule = null;

// Helper to load the ZIP data once
const loadZipData = async () => {
  if (zipDataLoaded && zipDataModule) {
    return zipDataModule.default;
  }
  
  try {
    zipDataModule = await import('./zips.json');
    zipDataLoaded = true;
    return zipDataModule.default;
  } catch (error) {
    console.error("Error loading ZIP code data:", error);
    return [];
  }
};

// Helper to determine appropriate radius based on zoom level
export const getRadiusForZoom = (zoomLevel) => {
  // In Leaflet, higher zoom = more zoomed in (counter-intuitive)
  // So we need larger radius for lower zoom levels
  if (!zoomLevel || zoomLevel < 1) return 500;
  
  // Map zoom levels to appropriate radii in km
  const zoomToRadius = {
    1: 500,   // Continental view
    2: 400,
    3: 350,
    4: 300,
    5: 250,   // Country view
    6: 200,
    7: 150,
    8: 120,
    9: 100,   // State/province view
    10: 80,
    11: 60,
    12: 40,   // Metro area
    13: 25,
    14: 15,   // City view
    15: 10,
    16: 5,    // District view
    17: 3,
    18: 2,    // Street view
    19: 1,
    20: 0.5   // Building view
  };
  
  // Use the closest zoom level or default to 40km
  return zoomToRadius[zoomLevel] || 40;
};

// Dynamically load ZIP codes
export const loadNearbyZipCodes = async (centerLat, centerLng, radius = 50, zoomLevel = null) => {
  // Handle invalid inputs
  if (!centerLat || !centerLng || isNaN(centerLat) || isNaN(centerLng)) {
    console.warn("Invalid coordinates for ZIP code lookup:", { centerLat, centerLng });
    return {};
  }
  
  // If zoom level is provided, determine appropriate radius
  const effectiveRadius = zoomLevel ? getRadiusForZoom(zoomLevel) : radius;
  
  // Check cache first
  const cached = cache.get(centerLat, centerLng, effectiveRadius);
  if (cached) {
    console.log("Using cached ZIP data");
    return cached;
  }
  
  try {
    // Load ZIP data
    const zipData = await loadZipData();
    
    if (!zipData || !Array.isArray(zipData) || zipData.length === 0) {
      console.error("Invalid ZIP code data format");
      return {};
    }
    
    // Filter ZIP codes based on proximity to the given coordinates
    const nearbyZips = {};
    
    // Calculate rough distance using latitude/longitude
    // (1 degree of latitude ≈ 111 km, 1 degree of longitude varies)
    const latDiff = effectiveRadius / 111; // Convert km to rough degrees of latitude
    
    zipData.forEach(zip => {
      // Skip invalid entries
      if (!zip || !zip.t || !zip.g || !zip.z) return;
      
      const latDistance = Math.abs(zip.t - centerLat);
      
      // Quick filter by latitude first (faster)
      if (latDistance > latDiff) return;
      
      // More accurate distance calculation for remaining zips
      const lngDistance = Math.abs(zip.g - centerLng);
      const lngDiff = effectiveRadius / (111 * Math.cos(centerLat * Math.PI / 180));
      
      if (lngDistance > lngDiff) return;
      
      // Calculate actual distance (Haversine formula - simplified version)
      const a = 
        Math.sin(latDistance/2 * Math.PI/180) * Math.sin(latDistance/2 * Math.PI/180) +
        Math.cos(centerLat * Math.PI/180) * Math.cos(zip.t * Math.PI/180) * 
        Math.sin(lngDistance/2 * Math.PI/180) * Math.sin(lngDistance/2 * Math.PI/180);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const distance = 6371 * c; // Earth radius in km
      
      if (distance <= effectiveRadius) {
        // Always use string ZIP codes as keys in the map
        const zipStr = String(zip.z);
        nearbyZips[zipStr] = formatZipData(zip);
      }
    });
    
    // Cache and return results
    cache.set(centerLat, centerLng, effectiveRadius, nearbyZips);
    return nearbyZips;
  } catch (error) {
    console.error("Error loading ZIP code data:", error);
    return {};
  }
};

// Keep a populated object for backwards compatibility with existing code
export const ZIP_CODES = {};

// Function to preload a single ZIP code into the ZIP_CODES object
export const preloadZipCode = async (zipCode) => {
  // If already in static object or cache, return it
  if (ZIP_CODES[zipCode]) return ZIP_CODES[zipCode];
  
  try {
    const zipCodeStr = String(zipCode);
    
    // Load ZIP data
    const allZips = await loadZipData();
    
    // Find the ZIP in the data
    const foundZip = allZips.find(zip => String(zip.z) === zipCodeStr);
    
    if (foundZip) {
      const zipData = formatZipData(foundZip);
      ZIP_CODES[zipCodeStr] = zipData;
      return zipData;
    }
    
    // If not found, create a placeholder
    const placeholderZip = {
      id: zipCodeStr,
      name: zipCodeStr,
      city: "",
      state: "",
      lat: null,
      lng: null
    };
    
    ZIP_CODES[zipCodeStr] = placeholderZip;
    return placeholderZip;
  } catch (error) {
    console.error(`Error preloading ZIP code ${zipCode}:`, error);
    return null;
  }
};

// Function to batch preload multiple ZIP codes
export const preloadZipCodes = async (zipCodes) => {
  if (!zipCodes || zipCodes.length === 0) return;
  
  try {
    // Load the data once
    const allZips = await loadZipData();
    
    // Process each ZIP code
    zipCodes.forEach(zipCode => {
      const zipCodeStr = String(zipCode);
      
      // Skip if already loaded
      if (ZIP_CODES[zipCodeStr]) return;
      
      // Find the ZIP in the data
      const foundZip = allZips.find(zip => String(zip.z) === zipCodeStr);
      
      if (foundZip) {
        ZIP_CODES[zipCodeStr] = formatZipData(foundZip);
      } else {
        // Create placeholder if not found
        ZIP_CODES[zipCodeStr] = {
          id: zipCodeStr,
          name: zipCodeStr,
          city: "",
          state: "",
          lat: null,
          lng: null
        };
      }
    });
  } catch (error) {
    console.error("Error batch preloading ZIP codes:", error);
  }
};
