import React from "react";
import styled from "styled-components";
import logo from "assets/images/logos/logo-icon.png";

const LogoWrapper = styled.div`
  text-align: center;
  margin-top: 0.5em;
  margin-bottom: 1.5em;

  img {
    max-width: 48px;
  }
`;

const LogoLarge = () => (
  <LogoWrapper>
    <img src={logo} alt="HealthDesk" />
  </LogoWrapper>
);

export default LogoLarge;
