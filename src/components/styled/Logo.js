import React from "react";
import styled from "styled-components";
import logo from "assets/images/logos/myhealthdesk-logo.png";
const LogoWrapper = styled.div`
  height: 32px;

  img {
    height: 32px;
    width: auto;
  }
`;

const Logo = () => (
  <LogoWrapper>
    <img src={logo} alt="HealthDesk" />
  </LogoWrapper>
);

export default Logo;
