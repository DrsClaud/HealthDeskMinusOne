import React from "react";
import styled from "styled-components";

const Wrapper = styled.div`
  margin: 0 auto;
  font-size: 20px;
  z-index: 0;
  width: 100%;
  min-height: 100vh;
  min-height: 100dvh;
  height: 100%;
  font-size: 14px;

  .inner {
    margin-bottom: 75px;
    padding: 10px;
  }

  .patient {
    margin-top: 60px;
  }

  h1 {
    font-size: 16px;
    font-weight: 700;
    border-bottom: 1px solid #c8c7cc;
    padding-bottom: 0.25rem;
    margin-bottom: 2rem;
    /* display: none; */

    @media (min-width: 768px) {
      font-size: 36px;
    }
  }

  h2 {
    font-size: 15px;
    font-weight: 600;
    text-align: center;
    margin-top: 1em;
    margin-bottom: 1.5em;
  }

  h3 {
    font-size: 20px;
    font-weight: normal;
    margin: 0.5em 0;
  }

  h4 {
    font-size: 17px;
    font-weight: normal;
    margin-bottom: 0.5em;
  }

  @media (min-width: 768px) {
    margin: 0;
    margin-left: auto;
    width: calc(100vw - 330px);
    padding-left: 20px;
    padding-right: 20px;

    h1 {
      margin-top: 0.3em;
    }

    h3 {
      font-size: 20px;
      font-weight: normal;
      margin: 1em 0 0;
    }
  }

  @media (min-width: 1024px) {
    padding-left: 10vw;
    padding-right: 10vw;
  }

  @media (min-width: 1500px) {
    padding-left: 16vw;
    padding-right: 16vw;
  }
`;

const DashboardWrapper = ({ children }) => <Wrapper>{children}</Wrapper>;

export default DashboardWrapper;
