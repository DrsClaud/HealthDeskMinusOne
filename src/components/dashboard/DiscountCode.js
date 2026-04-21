import React, { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import styled from "styled-components";

import { FormHelperText, Grid, TextField } from "@mui/material";
import { LoadingButton } from "@mui/lab";
import firebase from "firebase/compat/app";
import "firebase/compat/functions";

const Wrapper = styled.div`
  overflow-y: hidden;
  max-height: ${({ $show }) => ($show ? "100px" : 0)};
  transition: 0.3s max-height ease-in-out;
`;

const DiscountCode = ({ show, setTrial }) => {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(false);
  const {
    handleSubmit,
    control,
    formState: { errors },
  } = useForm({ mode: "onBlur" });

  const onSubmit = async ({ code }) => {
    setLoading(true);
    setError("");
    setTrial(false);
    setSubmitted(false);

    try {
      const validateDiscount = firebase
        .functions()
        .httpsCallable("validateDiscountCode");

      const result = await validateDiscount({ code });

      if (result.data.valid) {
        setSubmitted(true);
        setTrial(true);
      } else {
        setError(result.data.message);
      }
    } catch (err) {
      setError(
        "An error occurred while validating the code. Please try again."
      );
      console.error("Discount validation error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Wrapper $show={show}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <Grid container fullWidth gap={2}>
          <Grid item>
            <Controller
              name="code"
              control={control}
              rules={{
                required: "A discount code is required.",
              }}
              render={({ field }) => (
                <TextField
                  id="code"
                  label="Discount Code"
                  type="text"
                  InputLabelProps={{ shrink: true }}
                  variant="standard"
                  fullWidth
                  error={!!errors?.code}
                  helperText={errors?.code?.message}
                  sx={{ mt: 2 }}
                  {...field}
                />
              )}
            />
          </Grid>

          <Grid item sx={{ mt: 3.5 }}>
            <LoadingButton
              loading={loading}
              type="submit"
              disabled={loading}
              autoFocus
              variant="contained"
            >
              Apply
            </LoadingButton>
          </Grid>
        </Grid>
      </form>
      <p style={{ marginTop: "0.25rem", marginBottom: "0.75rem" }}>
        {submitted && (
          <FormHelperText sx={{ color: "#1976D2" }}>
            Your code has been applied.
          </FormHelperText>
        )}

        {error ? (
          <FormHelperText error={true}>
            The code you entered is invalid or expired.
          </FormHelperText>
        ) : null}
      </p>
    </Wrapper>
  );
};

export default DiscountCode;
