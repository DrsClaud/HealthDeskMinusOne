import React from "react";
import styled from "styled-components";
import defaultBg from "assets/images/backgrounds/bg.jpg";
import defaultBgLarge from "assets/images/backgrounds/bgLarge.jpg";

const OuterWrapper = styled.div`
  @media (min-width: 480px) {
    background-image: ${({ $background }) =>
      $background ? `url(${$background})` : `url(${defaultBgLarge})`};
  }

  @media (max-width: 480px) {
    background-image: ${({ $background }) =>
      $background ? `url(${$background})` : `url(${defaultBg})`};
  }

  background-size: cover;
  background-position: center;
  background-attachment: fixed;
  padding-top: 18px;
  padding-bottom: 18px;
  height: 100%;
  min-height: 100vh;
  min-height: 100dvh;
  width: 100vw;
  display: flex;
  justify-content: center;
  align-items: center;
`;

const Gradient = styled.div`
  position: absolute;
  z-index: 1;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 70%;
  background: linear-gradient(to bottom, rgba(0, 0, 0, 0), rgba(0, 0, 0, 0.7));
`;

const InnerWrapper = styled.div`
  position: relative;
  margin: 0 auto;
  font-size: 20px;
  background-color: rgba(255, 255, 255, 0.9);
  border-radius: 5px;
  z-index: 999;
  width: 90%;
  min-width: 300px;
  max-width: 350px;
  -webkit-box-shadow: 0 2px 6px 0 rgba(0, 0, 0, 0.2),
    0 4px 18px 0 rgba(0, 0, 0, 0.19);
  box-shadow: 0 2px 6px 0 rgba(0, 0, 0, 0.2), 0 4px 18px 0 rgba(0, 0, 0, 0.19);
  font-size: 14px;

  padding: 10px;

  h1 {
    font-size: 17px;
    font-weight: 600;
    text-align: center;
    margin-top: 1em;
    margin-bottom: 1.5em;
  }

  h2 {
    font-size: 15px;
    font-weight: 600;
    text-align: center;
    margin-top: 1em;
    margin-bottom: 1.5em;
  }
`;

const PageWrapper = ({ children, background }) => (
  <OuterWrapper $background={background}>
    <InnerWrapper>{children}</InnerWrapper>
    <Gradient />
  </OuterWrapper>
);

export default PageWrapper;
