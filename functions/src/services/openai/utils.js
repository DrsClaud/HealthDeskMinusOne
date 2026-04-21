exports.delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

exports.handleOpenAIError = (error) => {
  console.error("OpenAI Error:", error);

  // Extract the specific error message
  const errorMessage =
    error?.error?.message ||
    error?.message ||
    "An error occurred while processing your request";

  // Return a user-friendly message while preserving the specific error details
  return `Sorry, there was an issue: ${errorMessage}`;
};
