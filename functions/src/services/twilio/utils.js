exports.handleTwilioError = (error) => {
  // Convert Twilio errors to user-friendly messages
  if (error.code === 21614) {
    return "Invalid phone number";
  }
  if (error.code === 21211) {
    return "Invalid phone number format";
  }
  // Add more specific error cases as needed
  return "Failed to send message";
};
