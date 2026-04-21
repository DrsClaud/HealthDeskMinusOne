import React, { useState, useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { db } from "services/firebase";
import capitalize from "../../utils/helpers/capitalize";
import { useAuth } from "hooks/useAuth";

import Loading from "../Loading";
import Text from "../styled/Text";
import TextAnchor from "../styled/TextAnchor";
import Textarea from "../styled/Textarea";
import {
  Alert,
  Box,
  Button,
  Divider,
  TextField,
  Typography,
} from "@mui/material";
import { LoadingButton } from "@mui/lab";

const TextSequence = ({ data, vaccine }) => {
  const { hasValidSubscription } = useAuth();
  const title = data.title ? capitalize(data.title) : undefined;
  const address = data.address ? capitalize(data.address) : undefined;
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const facilityStatus = data.status || "approved";
  const isNotApproved = facilityStatus !== "approved";

  const defaultValues = {
    text1: `Thank you for joining the Virtual Queue at ${title}. You should expect several more texts to guide you through this process.  If your phone dies (they do that), proceed directly to ${title} to check in, and tell them your patient number in the Virtual Queue.`,
    text2: `Please go to this link to complete the virtual registration sequence.`,
    text3: `It's almost your turn.  Please come in to ${title} and show this text to the welcome desk.  Note: it's not realistic to think you'll avoid the waiting room entirely…that's not how most facilities work.  Still, you've saved yourself some time.`,
    text4: `${title} is ready for you to come in. The address is ${address}. Show this text to the welcome desk.`,
  };

  const values = vaccine
    ? data.vaccineTextSequence
      ? {
          text1: data.vaccineTextSequence[0],
          text2: data.vaccineTextSequence[1],
          text3: data.vaccineTextSequence[2],
          text4: data.vaccineTextSequence[3],
        }
      : defaultValues
    : data.textSequence
    ? {
        text1: data.textSequence[0],
        text2: data.textSequence[1],
        text3: data.textSequence[2],
        text4: data.textSequence[3],
      }
    : defaultValues;

  const { control, errors, handleSubmit, reset, register } = useForm();

  const saveSequence = ({ text1, text2, text3, text4 }) => {
    // Don't save if no premium access (preview mode)
    if (!hasValidSubscription) return;

    setLoading(true);
    setSubmitted(false);

    const document = vaccine
      ? { vaccineTextSequence: [text1, text2, text3, text4] }
      : { textSequence: [text1, text2, text3, text4] };

    db.collection("locations")
      .doc(String(data.id))
      .update(document)
      .then(function () {
        setLoading(false);
        setSubmitted(true);
      });
  };

  useEffect(() => {
    reset(values);
  }, [title, vaccine]);

  // Don't render anything if facility is not approved
  if (isNotApproved || !title) {
    return null;
  }

  return (
    <>
      <Divider sx={{ mt: 2, mb: 4 }} />
      <Box
        sx={{
          maxWidth: 520,
          width: "100%",
        }}
      >
        <Typography variant="h5" sx={{ mb: 2 }}>
          {vaccine && "Vaccine "}Text Sequence
        </Typography>

        {submitted ? (
          <Alert severity="success" sx={{ mb: 3 }}>
            The text sequence has been saved.
          </Alert>
        ) : null}

        <form onSubmit={handleSubmit(saveSequence)}>
          {[
            "On Virtual Queue Signup",
            "On Registration",
            "Next in Queue",
            "Ready for Patient",
          ].map((label, i) => {
            const id = `text${i + 1}`;

            return (
              <Controller
                key={id}
                name={id}
                control={control}
                defaultValue={""}
                rules={{
                  required: "This field is required.",
                }}
                render={({ field }) => (
                  <TextField
                    id={id}
                    label={label}
                    type="text"
                    multiline
                    InputLabelProps={{ shrink: true }}
                    variant="standard"
                    fullWidth
                    error={!!errors?.[id]}
                    helperText={errors?.[id]?.message}
                    sx={{ pb: 3, display: "block" }}
                    disabled={!hasValidSubscription}
                    {...field}
                  />
                )}
              />
            );
          })}

          <LoadingButton
            loading={loading}
            type="submit"
            variant="contained"
            size="large"
            sx={{ mb: 2 }}
            disabled={!hasValidSubscription}
          >
            Save Text Sequence
          </LoadingButton>
        </form>

        <Button
          color="secondary"
          variant="contained"
          size="large"
          onClick={() => reset(defaultValues)}
          sx={{ mb: 2 }}
          disabled={!hasValidSubscription}
        >
          Reset to Defaults
        </Button>
      </Box>
    </>
  );
};

export default TextSequence;
