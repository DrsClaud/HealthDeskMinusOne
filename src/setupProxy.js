//This is where we can define proxy urls for our API's and
//I need to switch all the functions from cloud functions to this function//TODO
// const proxy = require("http-proxy-middleware");
// const request = require("request");
// const express = require("express");
// module.exports = (app) => {
// Parse JSON bodies (as sent by API clients)
// };

const { createProxyMiddleware } = require("http-proxy-middleware");

module.exports = function (app) {
  app.use(
    "/api", // <-- or whatever path segment precedes your server side routes
    createProxyMiddleware({
      target: "http://localhost:5000", // <-- or whatever your proxy endpoint is
      changeOrigin: true,
    })
  );
};
