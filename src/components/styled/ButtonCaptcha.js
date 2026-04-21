import React, { useState } from "react";
import styled from "styled-components";
import Button from "./Button";
import { ReCaptcha } from "react-recaptcha-v3";
const ButtonCaptcha = (props) => {
  return (
    <React.Fragment>
      <Button
        {...props}
        onClick={() => {
          console.log("Captcha Clicked");
        }}
      >
        {props.children}
      </Button>

      <ReCaptcha
        sitekey={process.env.REACT_APP_RECAPTCHA_SITE_KEY}
        action="submit"
      />
    </React.Fragment>
  );
};

export default ButtonCaptcha;
