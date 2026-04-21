import React, { useState, useEffect, useRef } from "react";
import { differenceInDays } from "date-fns";
import { Controller, useForm } from "react-hook-form";
import { PhoneInput } from "components/common/form/inputs/PhoneInput";
import {
  Box,
  Checkbox,
  FormControlLabel,
  FormHelperText,
  Link,
  List,
  ListItem,
  Typography,
} from "@mui/material";
import { LoadingButton } from "@mui/lab";
import { ReCaptcha } from "react-recaptcha-v3";
import capitalize from "../../utils/helpers/capitalize";
import QueueDisplay from "./splitflap/QueueDisplay";

const QueueForm = ({
  queue,
  textSequence,
  queueEnabled,
  queueNumber,
  queueCap,
  queueLength,
  locationName,
  locationRef,
  firebase,
  db,
}) => {
  const title = locationName ? capitalize(locationName) : undefined;
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  // Track queue numbers by location
  const [queueNumbers, setQueueNumbers] = useState({});
  const currentQueueNumber = locationRef
    ? queueNumbers[locationRef] || queueNumber || 0
    : 0;

  const {
    handleSubmit,
    control,
    formState: { errors },
    reset,
  } = useForm();

  let lastSignedUp = localStorage["queueSubmitted"];

  const [recaptchaLoaded, setRecaptchaLoaded] = useState(false);
  const recaptchaRef = useRef(null);

  // Reset form state when location changes
  useEffect(() => {
    setSubmitted(false);
    reset();
  }, [locationRef, reset]);

  // Subscribe to queue number changes for the current location
  useEffect(() => {
    if (!locationRef) return;

    const unsubscribe = db
      .collection("locations")
      .doc(locationRef)
      .onSnapshot((doc) => {
        if (doc.exists) {
          setQueueNumbers((prev) => ({
            ...prev,
            [locationRef]: doc.data().queueNumber || 0,
          }));
        }
      });

    // Cleanup subscription when location changes or component unmounts
    return () => {
      unsubscribe();
    };
  }, [locationRef, db]);

  const onSubmit = async ({ phone }) => {
    if (!locationRef) return;

    setLoading(true);
    try {
      if (recaptchaRef.current && recaptchaLoaded) {
        try {
          await recaptchaRef.current.executeAsync();
        } catch (recaptchaError) {
          console.error("reCAPTCHA execution failed:", recaptchaError);
        }
      }

      const joinQueue = firebase.functions().httpsCallable("joinVirtualQueue");
      const { data } = await joinQueue({
        locationId: locationRef,
        phone,
        title: title || undefined,
        textSequenceFirstMessage: textSequence ? textSequence[0] : undefined,
      });

      setQueueNumbers((prev) => ({
        ...prev,
        [locationRef]: data.queueNumber,
      }));

      setSubmitted(true);
      localStorage["queueSubmitted"] = new Date();
    } catch (error) {
      console.error("Error submitting to queue:", error);
    } finally {
      setLoading(false);
    }
  };

  if (queueLength === undefined) {
    queueLength = 0;
  }

  // Only allow one virtual queue signup a day on production
  if (
    process.env.REACT_APP_FIREBASE_PROJECT_ID === "hlthdsk" &&
    differenceInDays(new Date(), new Date(lastSignedUp)) <= 1
  )
    return null;

  return (
    <>
      {queueEnabled && queueLength < queueCap && (
        <Box sx={{ maxWidth: 420, m: "auto", mt: 2, mb: 2 }}>
          {submitted ? (
            <Box>
              <Typography variant="h6">Success!</Typography>
              <Typography variant="body2">
                You should receive a series of texts to guide you through the
                process. If you have problems receiving texts, please proceed to{" "}
                {locationName}.
              </Typography>
              <List
                dense={true}
                sx={{ listStyleType: "disc", pl: 2, fontSize: 14 }}
              >
                <ListItem sx={{ display: "list-item" }}>
                  You won't receive a text if your phone isn't on.
                </ListItem>
                <ListItem sx={{ display: "list-item" }}>
                  You'll have a 30 minute arrival window after receiving that
                  text.
                </ListItem>
                <ListItem sx={{ display: "list-item" }}>
                  Never use this system if you have an emergency. Dial 911.
                </ListItem>
              </List>
            </Box>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)}>
              <Controller
                name="phone"
                control={control}
                rules={{
                  required: "You must enter a phone number.",
                  validate: (value) => {
                    const digits = value.replace(/\D/g, "");
                    return (
                      digits.length === 10 ||
                      "Please enter a valid 10-digit phone number."
                    );
                  },
                }}
                render={({ field, fieldState: { error } }) => (
                  <>
                    <PhoneInput
                      id="customPhone"
                      placeholder="123 456 7890"
                      {...field}
                    />
                    {error && (
                      <FormHelperText error>{error.message}</FormHelperText>
                    )}
                  </>
                )}
              />

              <Controller
                name="consent"
                control={control}
                rules={{
                  required: "You must agree to the conditions.",
                }}
                render={({ field }) => (
                  <FormControlLabel
                    control={<Checkbox {...field} />}
                    slotProps={{
                      typography: { position: "relative", fontSize: 13, mb: 1 },
                    }}
                    sx={{ alignItems: "flex-start", mt: 1, mb: 1 }}
                    label="I agree to receive customer care messaging from My HealthDesk at the phone number provided above. I understand I will receive several messages designed to decrease my time in the waiting room. Data rates may apply, reply STOP to opt out."
                  />
                )}
              />
              {errors?.consent ? (
                <FormHelperText error sx={{ mt: 0, mb: 1 }}>
                  {errors.consent.message}
                </FormHelperText>
              ) : null}
              <LoadingButton
                loading={loading}
                disabled={loading}
                variant="contained"
                fullWidth
                type="submit"
              >
                Join Virtual Queue
              </LoadingButton>

              <QueueDisplay
                queue={queue}
                compact={true}
                showClock={false}
                showHeader={false}
              />

              <Typography
                variant="body2"
                sx={{ textAlign: "center", mt: 2, mb: -1 }}
              >
                <Link href="/privacy-policy">Privacy Policy</Link> |{" "}
                <Link href="/terms-of-use">Terms of Use</Link>
              </Typography>

              {process.env.NODE_ENV !== "development" && (
                <div style={{ visibility: "hidden" }}>
                  <ReCaptcha
                    ref={recaptchaRef}
                    sitekey={process.env.REACT_APP_RECAPTCHA_SITE_KEY}
                    action="submit"
                    onLoad={() => setRecaptchaLoaded(true)}
                    onError={(err) => console.error("reCAPTCHA error:", err)}
                  />
                </div>
              )}
            </form>
          )}
        </Box>
      )}
    </>
  );
};

export default QueueForm;
