import React, { useState, useEffect } from "react";
import capitalize from "../../../utils/helpers/capitalize";
import firebaseApp, { db } from "services/firebase";
import Forms from "./Forms";
import { FormControlLabel, Switch, Alert, Link, Box } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import PremiumAlert from "components/dashboard/PremiumAlert";
import PremiumWrapper from "components/dashboard/PremiumWrapper";
import DashboardPageHeader from "components/common/DashboardPageHeader";
import { useAuth } from "hooks/useAuth";

const VirtualRegistrationSettings = ({ data, setData, vaccine }) => {
  const { hasValidSubscription } = useAuth();

  let currentQueue = vaccine ? data.virtual_que : data.healthcare_que;

  const title = data.title ? capitalize(data.title) : undefined;
  const [uploaded, setUploaded] = useState(false);

  const locationRef = db.collection("locations").doc(String(data.id));

  const onChangeCheckbox = (event) => {
    const name = event.target.name;
    const value = event.target.checked;

    currentQueue[name] = value;

    const document = vaccine
      ? { virtual_que: currentQueue }
      : { healthcare_que: currentQueue };

    db.collection("locations")
      .doc(String(data.id))
      .update(document)
      .then(function () {
        console.log("success");
      });
  };

  if (currentQueue === undefined) {
    vaccine ? (data.virtual_que = {}) : (data.healthcare_que = {});
    currentQueue = vaccine ? data.virtual_que : data.healthcare_que;
  }

  const enabledChanged = (event) => {
    if (!hasValidSubscription) return;
    if (facilityStatus !== "approved") return;

    currentQueue.enabled = event.target.checked;
    setData(data);

    const document = vaccine
      ? { virtual_que: currentQueue }
      : { healthcare_que: currentQueue };

    db.collection("locations")
      .doc(String(data.id))
      .update(document)
      .then(function () {
        console.log("success");
      });
  };

  // Get facility status using the new string-based enum
  const facilityStatus = data.status || "approved";
  const isNotApproved = facilityStatus !== "approved";

  return (
    <div>
      <DashboardPageHeader
        title="Virtual Registrations"
        subtitle="Allow users to get notified by text message when it's their turn to be seen in your waiting room."
      />

      {!hasValidSubscription && <PremiumAlert feature="Virtual registration" />}

      {isNotApproved && (
        <Alert
          severity={facilityStatus === "pending" ? "warning" : "error"}
          sx={{ mb: 4 }}
        >
          {facilityStatus === "pending"
            ? "Virtual registration is disabled until your facility is approved. This usually takes 1-2 days."
            : "Your facility has been rejected. Virtual registration is disabled."}
        </Alert>
      )}

      <PremiumWrapper disabled={!hasValidSubscription}>
        <FormControlLabel
          value="start"
          control={
            <Switch
              color="primary"
              onChange={enabledChanged}
              defaultChecked={
                currentQueue !== undefined ? currentQueue?.enabled : false
              }
              disabled={!hasValidSubscription || isNotApproved}
            />
          }
          label="Use virtual registration?"
          labelPlacement="start"
          sx={{ ml: 0, mb: 2 }}
        />

        {currentQueue?.enabled ? (
          <>
            <Forms data={data} vaccine={vaccine} />
          </>
        ) : null}
      </PremiumWrapper>
    </div>
  );
};

export default VirtualRegistrationSettings;
