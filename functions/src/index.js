/**
 * Copyright 2016 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
"use strict";

const functions = require("firebase-functions");
const express = require("express");
const cors = require("cors");

const ads = require("./ads");
const auth = require("./auth");
const openai = require("./services/openai");
const mailchimp = require("./services/mailchimp");
const twilio = require("./services/twilio");
const migration = require("./migration");
const discounts = require("./services/discounts");
const accounts = require("./accounts/checkLimit");
const promotions = require("./promotions/manage");
const auctions = require("./auctions");
const kijabeAuth = require("./kijabe-auth");
const kijabeRateLimits = require("./services/kijabeRateLimits");
const triggers = require("./triggers");
const scheduled = require("./scheduled");
const nlp = require("./services/nlp");
const trials = require("./services/trials");
const subscriptions = require("./subscriptions");
const phoneVerification = require("./phoneVerification");
const medicationReminders = require("./services/medicationReminders");
const facilityAlerts = require("./services/facilityAlerts");
const aiProxyEndpoints = require("./aiProxyEndpoints");
const organizations = require("./organizations/invitations");
const queue = require("./queue");
const chartmind = require("./chartmind");
const llm = require("./llm");

// let api_server = require("../backend/server.js");

// exports.api = functions.https.onRequest(
//   api_server.CreateApiServer(admin, twilio, twilo_config)
// );

module.exports = {
  ...ads,
  ...auth,
  ...openai,
  ...mailchimp,
  ...twilio,
  ...migration,
  ...discounts,
  ...accounts,
  ...promotions,
  ...auctions,
  ...kijabeAuth,
  ...kijabeRateLimits,
  ...triggers,
  ...scheduled,
  ...nlp,
  ...trials,
  ...subscriptions,
  ...phoneVerification,
  ...medicationReminders,
  ...facilityAlerts,
  ...aiProxyEndpoints,
  ...organizations,
  ...queue,
  ...chartmind,
  ...llm,
};

exports.cleanupRateLimits = kijabeRateLimits.cleanupRateLimits;
