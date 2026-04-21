const getAddress = ({ address, properties, text }) => {
  // Validate input object to avoid runtime errors
  if (!properties && !address) {
    return undefined;
  }

  // Get the explicit address if Mapbox returns it
  if (properties?.address) {
    return properties.address;
  }

  // Otherwise, get the address by piecing it together
  if (address && text) {
    return `${address} ${text}`.trim();
  }

  return undefined;
};

export { getAddress };
