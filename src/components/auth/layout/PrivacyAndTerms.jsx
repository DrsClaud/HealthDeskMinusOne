import React from "react";
import { Controller } from "react-hook-form";
import { FormControlLabel, FormHelperText, Checkbox } from "@mui/material";
import { formValidation } from "validation/formValidation";

const PrivacyAndTerms = ({ control, errors }) => (
  <>
    <Controller
      name="privacy"
      control={control}
      rules={formValidation.privacy}
      render={({ field }) => (
        <FormControlLabel
          control={<Checkbox {...field} />}
          label={
            <>
              I have read and agree to the{" "}
              <a href="/privacy-policy" target="_blank">
                Privacy Policy
              </a>
              .
            </>
          }
        />
      )}
    />

    {errors?.privacy && (
      <FormHelperText error={true} sx={{ mb: 1 }}>
        {errors?.privacy?.message}
      </FormHelperText>
    )}

    <Controller
      name="terms"
      control={control}
      rules={formValidation.terms}
      render={({ field }) => (
        <FormControlLabel
          control={<Checkbox {...field} />}
          label={
            <>
              I have read and agree to the{" "}
              <a href="/terms-of-use" target="_blank">
                Terms and Services
              </a>
              .
            </>
          }
        />
      )}
    />

    {errors?.terms && (
      <FormHelperText error={true} sx={{ mb: 1 }}>
        {errors?.terms?.message}
      </FormHelperText>
    )}
  </>
);

export default PrivacyAndTerms;
