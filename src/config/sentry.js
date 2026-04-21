import * as Sentry from "@sentry/browser";

export const initSentry = () => {
  if (process.env.NODE_ENV === "production") {
    Sentry.init({
      dsn: "https://e60e858a354a42d88a5d71f742e1e77e@o384246.ingest.sentry.io/5215159",
    });
  }
};
