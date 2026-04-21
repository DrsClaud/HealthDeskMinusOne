export const POPULATION_TIERS = {
  SMALL: 10000,
  MEDIUM: 50000,
  LARGE: 100000,
};

export const getZipPrice = (population, prices) => {
  if (!prices) return null;
  if (population <= POPULATION_TIERS.SMALL) return prices[0];
  if (population <= POPULATION_TIERS.MEDIUM) return prices[1];
  if (population <= POPULATION_TIERS.LARGE) return prices[2];
  return null;
};

const priceCache = new Map();

export const getMemoizedZipPrice = (population, prices) => {
  if (!prices || !population) return null;

  const cacheKey = `${population}-${prices[0]?.id}`;
  if (priceCache.has(cacheKey)) {
    return priceCache.get(cacheKey);
  }

  const price = getZipPrice(population, prices);
  priceCache.set(cacheKey, price);
  return price;
};
