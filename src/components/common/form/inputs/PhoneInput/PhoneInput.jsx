import React from "react";
import { TextField } from "@mui/material";
import { IMaskInput } from "react-imask";
import { forwardRef, useState } from "react";

const isValidUSPhone = (phone) => {
  const digits = phone.replace(/\D/g, '');
  return digits.length === 10;
};

const PhoneMaskAdapter = forwardRef(function PhoneMaskAdapter(props, ref) {
  const { onChange, ...other } = props;
  return (
    <IMaskInput
      {...other}
      mask="000 000 0000"
      definitions={{
        0: /[0-9]/,
      }}
      inputRef={ref}
      onAccept={(value) => {
        const strippedValue = value.replace(/\s/g, "");
        onChange({
          target: { 
            name: props.name, 
            value: strippedValue,
          },
        });
      }}
      overwrite
    />
  );
});

const PhoneInput = forwardRef(function PhoneInput(props, ref) {
  const { onChange, value, onBlur: externalOnBlur, ...other } = props;
  const [touched, setTouched] = useState(false);

  const handleChange = (e) => {
    onChange?.({
      target: {
        ...e.target,
        value: e.target.value,
        isValid: isValidUSPhone(e.target.value)
      }
    });
  };

  const handleBlur = (e) => {
    setTouched(true);
    externalOnBlur?.(e);
  };

  return (
    <TextField
      {...other}
      value={value || ''}
      onChange={handleChange}
      onBlur={handleBlur}
      variant="standard"
      fullWidth
      InputProps={{
        inputComponent: PhoneMaskAdapter,
        inputProps: {
          ref: ref,
        },
      }}
    />
  );
});

export default PhoneInput;
