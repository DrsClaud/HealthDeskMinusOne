/**
 * OpenAI Pricing Calculator (Frontend)
 *
 * NOTE: Prices are estimates based on October 2025 pricing.
 * Always verify current pricing at: https://openai.com/api/pricing/
 */

// Pricing per 1M tokens (as of October 2025)
const MODEL_PRICING = {
  "gpt-4o": {
    prompt: 2.5,
    completion: 10.0,
  },
  "gpt-4o-mini": {
    prompt: 0.15,
    completion: 0.6,
  },
  "gpt-4-turbo": {
    prompt: 10.0,
    completion: 30.0,
  },
  "gpt-4": {
    prompt: 30.0,
    completion: 60.0,
  },
  "gpt-3.5-turbo": {
    prompt: 0.5,
    completion: 1.5,
  },
};

export const calculateCost = (model, promptTokens, completionTokens) => {
  const normalizedModel = model.toLowerCase().trim();
  let pricing = MODEL_PRICING[normalizedModel];

  if (!pricing) {
    for (const [key, value] of Object.entries(MODEL_PRICING)) {
      if (normalizedModel.includes(key) || key.includes(normalizedModel)) {
        pricing = value;
        break;
      }
    }
  }

  if (!pricing) {
    console.warn(`⚠️  No pricing data for model: ${model}. Returning $0.`);
    return 0;
  }

  const promptCost = (promptTokens / 1000000) * pricing.prompt;
  const completionCost = (completionTokens / 1000000) * pricing.completion;

  return promptCost + completionCost;
};

export const calculateAggregatedCost = (aggregateData) => {
  let totalCost = 0;
  const sourceBreakdown = {};
  const userBreakdown = {};

  if (aggregateData.sources) {
    for (const [sourceKey, sourceData] of Object.entries(
      aggregateData.sources
    )) {
      let sourceCost = 0;
      const modelBreakdown = {};

      if (sourceData.models) {
        for (const [modelKey, modelData] of Object.entries(sourceData.models)) {
          const cost = calculateCost(
            modelData.model,
            modelData.prompt_tokens,
            modelData.completion_tokens
          );
          modelBreakdown[modelData.model] = {
            cost,
            tokens: modelData.total_tokens,
            calls: modelData.calls_count,
          };
          sourceCost += cost;
        }
      }

      sourceBreakdown[sourceData.source] = {
        cost: sourceCost,
        tokens: sourceData.total_tokens,
        calls: sourceData.calls_count,
        models: modelBreakdown,
      };
      totalCost += sourceCost;
    }
  }

  // Calculate cost per user (using average model pricing since we don't store model per user)
  if (aggregateData.users) {
    for (const [userId, userData] of Object.entries(aggregateData.users)) {
      // Estimate cost using gpt-4o-mini pricing as default (most common)
      const cost = calculateCost(
        "gpt-4o-mini",
        userData.prompt_tokens,
        userData.completion_tokens
      );
      userBreakdown[userId] = {
        cost,
        tokens: userData.total_tokens,
        calls: userData.calls_count,
      };
    }
  }

  const userCount = Object.keys(userBreakdown).length;
  const avgCostPerUser = userCount > 0 ? totalCost / userCount : 0;

  return {
    totalCost,
    totalTokens: aggregateData.total_tokens || 0,
    totalCalls: aggregateData.calls_count || 0,
    userCount,
    avgCostPerUser,
    sources: sourceBreakdown,
    users: userBreakdown,
  };
};

export const formatCost = (cost, isLargeTotal = false) => {
  // For large totals (over $10), show only 2 decimal places
  // For very small costs (under $0.01), show up to 6 decimal places
  // For everything else, show up to 4 decimal places
  let maxDecimals;
  if (isLargeTotal && cost >= 10) {
    maxDecimals = 2;
  } else if (cost > 0 && cost < 0.01) {
    maxDecimals = 6;
  } else {
    maxDecimals = 4;
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: maxDecimals,
  }).format(cost);
};
