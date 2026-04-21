const getStateCode = (location) => {
  if (!location?.context) return undefined;

  // Find the region object in context
  const region = location.context.find((c) => c.id.startsWith("region"));

  // Extract the state code from the short_code (e.g., "US-NY" -> "NY")
  return region?.short_code?.split("-")[1];
};

export { getStateCode };
